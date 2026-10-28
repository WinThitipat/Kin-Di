import { INGREDIENTS_CATALOG, INITIAL_RECIPES } from "@/data/recipes-seed";
import {
  getMergedIngredientsCatalog,
  loadSharedRecipes,
  loadCustomIngredients,
  saveCustomIngredient,
  saveSharedRecipe,
} from "@/lib/user-storage";
import {
  CommunityRecipeSubmissionInput,
  CommunityRecipeSubmissionSchema,
  Recipe,
  RecipeIdSchema,
} from "@/types/recipe";

export interface FetchRecipesResult {
  recipes: Recipe[];
  source: "supabase" | "local-seed";
  error: string | null;
  databaseRecipeIds?: string[];
}

function cacheIngredientNames(recipes: Recipe[]) {
  const saved = new Map(loadCustomIngredients().map((item) => [item.id, item]));
  for (const recipe of recipes)
    for (const ingredient of recipe.ingredient_catalog ?? []) {
      if (
        !INGREDIENTS_CATALOG[ingredient.id] &&
        JSON.stringify(saved.get(ingredient.id)) !== JSON.stringify(ingredient)
      ) {
        saveCustomIngredient(ingredient);
        saved.set(ingredient.id, ingredient);
      }
    }
}

export async function fetchApprovedRecipes(): Promise<FetchRecipesResult> {
  const local = [...loadSharedRecipes(), ...INITIAL_RECIPES].filter(
    (recipe) => recipe.status === "approved",
  );
  if (typeof window === "undefined")
    return { recipes: local, source: "local-seed", error: null };
  try {
    const response = await fetch("/api/recipes", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok || !Array.isArray(body.recipes))
      throw new Error(body.error || "โหลดเมนูจากฐานข้อมูลไม่สำเร็จ");
    const remote = body.recipes as Recipe[];
    const deletedIds = new Set<string>(body.deletedIds ?? []);
    const merged = new Map(
      local
        .filter((recipe) => !deletedIds.has(recipe.id))
        .map((recipe) => [recipe.id, recipe]),
    );
    remote.forEach((recipe) => merged.set(recipe.id, recipe));
    const recipes = [...merged.values()];
    cacheIngredientNames(recipes);
    return {
      recipes,
      source: "supabase",
      error: null,
      databaseRecipeIds: remote.map((recipe) => recipe.id),
    };
  } catch {
    return {
      recipes: local,
      source: "supabase",
      error: "ยังโหลดเมนูจากฐานข้อมูลไม่ได้ กรุณาลองใหม่อีกครั้ง",
    };
  }
}

export async function fetchApprovedRecipeById(
  rawId: string,
): Promise<Recipe | null> {
  const id = RecipeIdSchema.safeParse(rawId);
  if (!id.success) return null;
  return (
    (await fetchApprovedRecipes()).recipes.find(
      (recipe) => recipe.id === id.data,
    ) ?? null
  );
}

// Reuse the same ID after a network failure. The database insert is idempotent
// and cannot overwrite an existing recipe with the same ID.
let retryKey: { signature: string; id: string } | null = null;
export async function submitCommunityRecipeForModeration(
  input: CommunityRecipeSubmissionInput,
  legacyRecipeId?: string,
): Promise<{ success: boolean; message: string; submittedRecipe?: Recipe }> {
  const catalog = getMergedIngredientsCatalog();
  const customNames = [...(input.customIngredientNames ?? [])];
  const ingredientIds = input.ingredientIds.filter((id) => {
    if (INGREDIENTS_CATALOG[id] || !catalog[id]) return true;
    customNames.push(catalog[id].name_th);
    return false;
  });
  const parsed = CommunityRecipeSubmissionSchema.safeParse({
    ...input,
    ingredientIds,
    customIngredientNames: [...new Set(customNames)],
  });
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0].message };
  const signature = JSON.stringify({ data: parsed.data, legacyRecipeId });
  if (retryKey?.signature !== signature)
    retryKey = { signature, id: crypto.randomUUID() };
  try {
    const response = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...parsed.data,
        submissionId: retryKey.id,
        legacyRecipeId,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.recipe?.id)
      return {
        success: false,
        message:
          result.error ||
          "บันทึกลงฐานข้อมูลไม่สำเร็จ ข้อมูลในฟอร์มยังอยู่ กรุณาลองใหม่",
      };
    const recipe = result.recipe as Recipe;
    // This is only a backward-compatible cache. Database commit has already
    // succeeded, so a full/disabled browser store must not lose the recipe.
    saveSharedRecipe(recipe);
    cacheIngredientNames([recipe]);
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event("kindi-recipes-updated"));
    retryKey = null;
    return {
      success: true,
      message: "บันทึกเมนูลงฐานข้อมูลเรียบร้อยแล้ว พร้อมเปิดดูจากอุปกรณ์อื่น",
      submittedRecipe: recipe,
    };
  } catch {
    return {
      success: false,
      message: "เชื่อมต่อฐานข้อมูลไม่สำเร็จ ข้อมูลในฟอร์มยังอยู่ กรุณาลองใหม่",
    };
  }
}

export async function importLocalRecipe(recipe: Recipe) {
  return submitCommunityRecipeForModeration(
    {
      name: recipe.name,
      description: recipe.description,
      external_recipe_url: recipe.external_recipe_url ?? "",
      image_url: recipe.image_url ?? "",
      category: recipe.category,
      meal_types: recipe.meal_types,
      cooking_time: recipe.cooking_time,
      difficulty: recipe.difficulty,
      ingredientIds: (recipe.ingredients ?? []).map(
        (item) => item.ingredient_id,
      ),
      customIngredientNames: recipe.custom_ingredients ?? [],
      dietary_tags: recipe.dietary_tags ?? [],
      allergens: Object.values(recipe.allergen_assessments ?? {})
        .filter((item) => item.status === "contains")
        .map((item) => item.allergen),
      instructionsText: recipe.instructions.join("\n"),
      submitted_by: recipe.submitted_by,
    },
    recipe.id,
  );
}

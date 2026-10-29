import { INGREDIENTS_CATALOG } from "@/data/recipes-seed";
import {
  getMergedIngredientsCatalog,
  loadCustomIngredients,
  saveCustomIngredient,
} from "@/lib/user-storage";
import {
  CommunityRecipeSubmissionInput,
  CommunityRecipeSubmissionSchema,
  Recipe,
  RecipeIdSchema,
  IngredientRecord,
} from "@/types/recipe";

export interface FetchRecipesResult {
  recipes: Recipe[];
  source: "supabase";
  deletedIds?: string[];
  error: string | null;
  databaseRecipeIds?: string[];
}

function cacheIngredientNames(recipes: Recipe[]) {
  const saved = new Map(loadCustomIngredients().map(item => [item.id, item]));
  const merged = new Map<string, IngredientRecord>();
  for (const recipe of recipes) for (const ingredient of recipe.ingredient_catalog ?? []) {
    if (INGREDIENTS_CATALOG[ingredient.id]) continue;
    const previous = merged.get(ingredient.id);
    merged.set(ingredient.id, previous ? {
      ...previous,
      allergens: [...new Set([...previous.allergens, ...ingredient.allergens])].sort(),
      dietary_compatible: previous.dietary_compatible.filter(diet => ingredient.dietary_compatible.includes(diet)),
      composition_known: previous.composition_known && ingredient.composition_known,
    } : {...ingredient, allergens: [...ingredient.allergens].sort()});
  }
  // A shared ingredient can have different recipe snapshots. Persist it once,
  // after merging, so repeated reads cannot alternate between those snapshots.
  for (const ingredient of merged.values()) {
    if (JSON.stringify(saved.get(ingredient.id)) !== JSON.stringify(ingredient)) saveCustomIngredient(ingredient);
  }
}

export async function fetchApprovedRecipes(): Promise<FetchRecipesResult> {
  if (typeof window === "undefined")
    return { recipes: [], source: "supabase", error: null };
  try {
    const response = await fetch("/api/recipes", { cache: "no-store", signal: AbortSignal.timeout(20_000) });
    const body = await response.json();
    if (!response.ok || !Array.isArray(body.recipes))
      throw new Error(body.error || "โหลดเมนูจากฐานข้อมูลไม่สำเร็จ");
    const remote = body.recipes as Recipe[];
    const recipes = remote.filter(recipe => recipe.status === "approved");
    cacheIngredientNames(recipes);
    return {
      recipes,
      source: "supabase",
      error: null,
      databaseRecipeIds: recipes.map((recipe) => recipe.id),
      deletedIds: body.deletedIds ?? [],
    };
  } catch {
    return {
      recipes: [],
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
  const result = await fetchApprovedRecipes();
  if (result.error) throw new Error(result.error);
  return (
    result.recipes.find(
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
      signal: AbortSignal.timeout(50_000),
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

export function recipeToSubmission(
  recipe: Recipe,
): CommunityRecipeSubmissionInput {
  return {
    name: recipe.name,
    description: recipe.description,
    external_recipe_url: recipe.external_recipe_url ?? "",
    image_url: recipe.image_url ?? "",
    category: recipe.category,
    meal_types: recipe.meal_types,
    cooking_time: recipe.cooking_time,
    difficulty: recipe.difficulty,
    ingredientIds: (recipe.ingredients ?? [])
      .filter((item) => !!INGREDIENTS_CATALOG[item.ingredient_id])
      .map((item) => item.ingredient_id),
    customIngredientNames: [
      ...new Set([
        ...(recipe.custom_ingredients ?? []),
        ...(recipe.ingredient_catalog ?? [])
          .filter((item) => !INGREDIENTS_CATALOG[item.id])
          .map((item) => item.name_th),
      ]),
    ],
    dietary_tags: recipe.dietary_tags ?? [],
    allergens: Object.values(recipe.allergen_assessments ?? {})
      .filter((item) => item.status === "contains")
      .map((item) => item.allergen),
    instructionsText: recipe.instructions.join("\n"),
    submitted_by: recipe.submitted_by,
  };
}
export async function importLocalRecipe(recipe: Recipe) {
  return submitCommunityRecipeForModeration(
    recipeToSubmission(recipe),
    recipe.id,
  );
}
export async function updateCommunityRecipe(
  input: CommunityRecipeSubmissionInput,
  recipeId: string,
  pin: string,
  expectedVersion: string,
) {
  try {
    const response = await fetch("/api/admin/update-recipe", {
      signal: AbortSignal.timeout(50_000),
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, recipeId, pin, expectedVersion }),
    });
    const body = await response.json();
    if (!response.ok)
      return { success: false, message: body.error || "บันทึกไม่สำเร็จ" };
    cacheIngredientNames([body.recipe]);
    window.dispatchEvent(new Event("kindi-recipes-updated"));
    return {
      success: true,
      message: "บันทึกการแก้ไขแล้ว",
      submittedRecipe: body.recipe as Recipe,
    };
  } catch {
    return { success: false, message: "เชื่อมต่อไม่ได้ ข้อมูลการแก้ไขยังอยู่" };
  }
}

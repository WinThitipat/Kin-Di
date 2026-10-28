import { buildAllergenAssessments, INITIAL_RECIPES } from '@/data/recipes-seed';
import { inferExternalSourceName } from '@/lib/external-recipes';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase';
import {
  getMergedIngredientsCatalog,
  loadSharedRecipes,
  saveCustomIngredient,
  saveSharedRecipe,
} from '@/lib/user-storage';
import {
  AllergenId,
  CommunityRecipeSubmissionInput,
  CommunityRecipeSubmissionSchema,
  IngredientRecord,
  Recipe,
  RecipeAllergenAssessment,
  RecipeIdSchema,
} from '@/types/recipe';

const PUBLIC_RECIPE_SELECT_COLUMNS = `
  id,
  name,
  description,
  category,
  meal_types,
  cooking_time,
  estimated_cost,
  difficulty,
  image_url,
  external_recipe_url,
  external_source_name,
  status,
  dietary_tags,
  instructions,
  safety_metadata_complete,
  cross_contact_risk,
  submitted_by,
  created_at,
  recipe_ingredients (
    ingredient_id,
    quantity,
    role,
    is_optional,
    composition_verified
  ),
  recipe_allergen_assessments (
    allergen,
    status,
    cross_contact_risk,
    notes
  )
`;

export interface FetchRecipesResult {
  recipes: Recipe[];
  source: 'supabase' | 'local-seed';
  error: string | null;
}

/**
 * Fetches publicly visible, approved recipes from Supabase when configured,
 * merged with user-shared recipes stored in localStorage (`loadSharedRecipes()`).
 * Note: `INITIAL_RECIPES` is empty (`[]`) as requested, so only user-shared or Supabase-approved recipes appear.
 */
export async function fetchApprovedRecipes(): Promise<FetchRecipesResult> {
  const supabase = getSupabaseBrowserClient();
  const localShared = loadSharedRecipes().filter((r) => r.status === 'approved');

  if (!isSupabaseConfigured || !supabase) {
    const approvedSeed = INITIAL_RECIPES.filter((r) => r.status === 'approved');
    return {
      recipes: [...localShared, ...approvedSeed],
      source: 'local-seed',
      error: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from('recipes')
      .select(PUBLIC_RECIPE_SELECT_COLUMNS)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      return {
        recipes: localShared,
        source: 'supabase',
        error: 'ไม่สามารถโหลดข้อมูลเมนูอาหารจากระบบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
      };
    }

    if (!data || data.length === 0) {
      return {
        recipes: localShared,
        source: 'supabase',
        error: null,
      };
    }

    const mapped: Recipe[] = data.map((row: Record<string, unknown>) => {
      const rawAssessments = Array.isArray(row.recipe_allergen_assessments)
        ? row.recipe_allergen_assessments
        : [];
      let assessmentMap: Record<AllergenId, RecipeAllergenAssessment> | null = null;

      if (rawAssessments.length > 0) {
        assessmentMap = {} as Record<AllergenId, RecipeAllergenAssessment>;
        for (const item of rawAssessments as RecipeAllergenAssessment[]) {
          if (item && item.allergen) {
            assessmentMap[item.allergen] = {
              allergen: item.allergen,
              status: item.status ?? 'unknown',
              cross_contact_risk: item.cross_contact_risk ?? 'unknown',
              notes: item.notes,
            };
          }
        }
      }

      return {
        id: String(row.id ?? ''),
        name: String(row.name ?? ''),
        description: String(row.description ?? ''),
        category: row.category as Recipe['category'],
        meal_types: Array.isArray(row.meal_types) ? (row.meal_types as Recipe['meal_types']) : [],
        cooking_time: Number(row.cooking_time ?? 15),
        estimated_cost: typeof row.estimated_cost === 'number' ? row.estimated_cost : undefined,
        difficulty: (row.difficulty as Recipe['difficulty']) ?? 'easy',
        image_url: typeof row.image_url === 'string' ? row.image_url : null,
        external_recipe_url:
          typeof row.external_recipe_url === 'string' ? row.external_recipe_url : null,
        external_source_name:
          typeof row.external_source_name === 'string' ? row.external_source_name : null,
        status: 'approved',
        dietary_tags: Array.isArray(row.dietary_tags)
          ? (row.dietary_tags as Recipe['dietary_tags'])
          : [],
        instructions: Array.isArray(row.instructions) ? (row.instructions as string[]) : [],
        safety_metadata_complete: Boolean(row.safety_metadata_complete),
        cross_contact_risk: (row.cross_contact_risk as Recipe['cross_contact_risk']) ?? 'unknown',
        ingredients: Array.isArray(row.recipe_ingredients)
          ? (row.recipe_ingredients as Recipe['ingredients'])
          : [],
        allergen_assessments: assessmentMap,
        submitted_by: typeof row.submitted_by === 'string' ? row.submitted_by : undefined,
        created_at: String(row.created_at ?? new Date().toISOString()),
      };
    });

    return {
      recipes: [...localShared, ...mapped.filter((r) => r.status === 'approved')],
      source: 'supabase',
      error: null,
    };
  } catch {
    return {
      recipes: localShared,
      source: 'supabase',
      error: 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล กรุณาตรวจสอบสัญญาณอินเทอร์เน็ตแล้วลองใหม่',
    };
  }
}

/**
 * Retrieves a single approved recipe by ID after validating the ID with Zod.
 */
export async function fetchApprovedRecipeById(rawId: string): Promise<Recipe | null> {
  const parsedId = RecipeIdSchema.safeParse(rawId);
  if (!parsedId.success) {
    return null;
  }

  const validId = parsedId.data;
  const { recipes } = await fetchApprovedRecipes();
  const found = recipes.find((r) => r.id === validId && r.status === 'approved');
  return found ?? null;
}

/**
 * Shares a recipe via "แบ่งปันสูตรอาหาร" (/community).
 * Validates external link (any website/platform), food image, cooking time range,
 * ingredients (including custom "อื่นๆ" ingredients), and food safety metadata.
 */
export async function submitCommunityRecipeForModeration(
  input: CommunityRecipeSubmissionInput
): Promise<{ success: boolean; message: string; submittedRecipe?: Recipe }> {
  const parsed = CommunityRecipeSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      message: firstIssue?.message ?? 'ข้อมูลเมนูไม่ครบถ้วน กรุณาตรวจสอบอีกครั้ง',
    };
  }

  const data = parsed.data;
  const instructions = (data.instructionsText ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const catalog = getMergedIngredientsCatalog();

  // Register any custom ingredients ("อื่นๆ") into the local catalog so Fridge Mode & Roulette recognize them
  const customIngredientIds: string[] = [];
  for (const rawCustomName of data.customIngredientNames ?? []) {
    const cleanName = rawCustomName.trim();
    if (!cleanName) continue;
    const slugId = `custom_${cleanName.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '_')}`;
    const record: IngredientRecord = {
      id: slugId,
      name_th: cleanName,
      category: 'other',
      allergens: data.allergens ?? [],
      dietary_compatible: data.dietary_tags ?? [],
      composition_known: true,
    };
    saveCustomIngredient(record);
    catalog[slugId] = record;
    customIngredientIds.push(slugId);
  }

  const allIngredientIds = Array.from(new Set([...data.ingredientIds, ...customIngredientIds]));

  // Combine declared allergens with any catalog ingredient allergens
  const combinedAllergens = new Set<AllergenId>(data.allergens ?? []);
  for (const ingId of allIngredientIds) {
    const item = catalog[ingId];
    if (item && Array.isArray(item.allergens)) {
      for (const alg of item.allergens) {
        combinedAllergens.add(alg);
      }
    }
  }

  const allergenOverrides: Partial<Record<AllergenId, { status: 'contains' | 'free'; notes?: string }>> = {};
  for (const alg of combinedAllergens) {
    allergenOverrides[alg] = { status: 'contains', notes: 'ระบุจากส่วนผสมของสูตรอาหาร' };
  }

  const externalUrl = data.external_recipe_url.trim();
  const sourceName = inferExternalSourceName(externalUrl);

  const sharedRecipe: Recipe = {
    id: `shared-${Date.now()}`,
    name: data.name,
    description: data.description,
    category: data.category,
    meal_types: data.meal_types,
    cooking_time: data.cooking_time,
    difficulty: data.difficulty,
    image_url: data.image_url.trim(),
    external_recipe_url: externalUrl,
    external_source_name: sourceName,
    status: 'approved',
    dietary_tags: data.dietary_tags ?? [],
    safety_metadata_complete: true,
    cross_contact_risk: 'low',
    ingredients: allIngredientIds.map((id) => ({
      ingredient_id: id,
      quantity: 'ตามสูตรต้นฉบับ',
      role: 'main',
      is_optional: false,
      composition_verified: true,
    })),
    custom_ingredients: data.customIngredientNames ?? [],
    allergen_assessments: buildAllergenAssessments(allergenOverrides, 'low'),
    instructions:
      instructions.length > 0
        ? instructions
        : [`ดูขั้นตอนวิธีทำอย่างละเอียดได้ที่ลิงก์สูตรอาหาร (${sourceName})`],
    submitted_by: data.submitted_by || 'เพื่อนนักกิน KIN DI',
    created_at: new Date().toISOString(),
  };

  // Persist to localStorage so it immediately appears in Roulette, Fridge Mode, and Browse All Recipes
  saveSharedRecipe(sharedRecipe);

  const supabase = getSupabaseBrowserClient();
  if (isSupabaseConfigured && supabase) {
    await supabase.from('recipes').insert({
      id: sharedRecipe.id,
      name: sharedRecipe.name,
      description: sharedRecipe.description,
      category: sharedRecipe.category,
      meal_types: sharedRecipe.meal_types,
      cooking_time: sharedRecipe.cooking_time,
      difficulty: sharedRecipe.difficulty,
      image_url: sharedRecipe.image_url,
      external_recipe_url: sharedRecipe.external_recipe_url,
      external_source_name: sharedRecipe.external_source_name,
      status: 'approved',
      dietary_tags: sharedRecipe.dietary_tags,
      instructions: sharedRecipe.instructions,
      safety_metadata_complete: true,
      cross_contact_risk: 'low',
      submitted_by: sharedRecipe.submitted_by,
    });
  }

  return {
    success: true,
    message:
      'แบ่งปันสูตรอาหารเรียบร้อยแล้ว! เมนูของคุณพร้อมให้สุ่มไพ่ ค้นหาในโหมดตู้เย็น และดูในรวมเมนูทั้งหมดได้ทันที',
    submittedRecipe: sharedRecipe,
  };
}

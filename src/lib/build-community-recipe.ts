import { INGREDIENTS_CATALOG, ALL_ALLERGEN_IDS } from "@/data/recipes-seed";
import { inferExternalSourceName } from "@/lib/external-recipes";
import {
  CommunityRecipeSubmissionInput,
  IngredientRecord,
  Recipe,
  AllergenId,
  RecipeAllergenAssessment,
} from "@/types/recipe";

/** Build from validated fields on the server, never trust client safety flags. */
export function buildCommunityRecipe(
  data: CommunityRecipeSubmissionInput,
  id: string,
): Recipe {
  const catalog: Record<string, IngredientRecord> = { ...INGREDIENTS_CATALOG };
  const customIds: string[] = [];
  for (const name of data.customIngredientNames ?? []) {
    const clean = name.trim();
    if (!clean) continue;
    const customId = `custom_${clean.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, "_")}`;
    customIds.push(customId);
    catalog[customId] = {
      id: customId,
      name_th: clean,
      category: "other",
      allergens: data.allergens ?? [],
      dietary_compatible: [],
      composition_known: false,
    };
  }
  const ids = [...new Set([...data.ingredientIds, ...customIds])];
  if (ids.some((ingredient) => !catalog[ingredient]))
    throw new Error(
      "พบวัตถุดิบที่ไม่รู้จัก กรุณาเพิ่มชื่อผ่านช่องวัตถุดิบอื่นๆ",
    );
  const contains = new Set<AllergenId>(data.allergens ?? []);
  ids.forEach((ingredient) =>
    catalog[ingredient].allergens.forEach((allergen) => contains.add(allergen)),
  );
  const assessments = Object.fromEntries(
    ALL_ALLERGEN_IDS.map((allergen) => [
      allergen,
      {
        allergen,
        status: contains.has(allergen) ? "contains" : "unknown",
        cross_contact_risk: "unknown",
      },
    ]),
  ) as Record<AllergenId, RecipeAllergenAssessment>;
  const source = inferExternalSourceName(data.external_recipe_url);
  const instructions = (data.instructionsText ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    id,
    name: data.name,
    description: data.description,
    category: data.category,
    meal_types: data.meal_types,
    cooking_time: data.cooking_time,
    difficulty: data.difficulty,
    image_url: data.image_url,
    external_recipe_url: data.external_recipe_url,
    external_source_name: source,
    status: "approved",
    dietary_tags: data.dietary_tags ?? [],
    instructions: instructions.length
      ? instructions
      : [`ดูวิธีทำจากลิงก์สูตรอาหาร (${source})`],
    ingredients: ids.map((ingredient) => ({
      ingredient_id: ingredient,
      quantity: "ตามสูตรต้นฉบับ",
      role: "main",
      is_optional: false,
      composition_verified: catalog[ingredient].composition_known,
    })),
    ingredient_catalog: ids.map((ingredient) => catalog[ingredient]),
    custom_ingredients: data.customIngredientNames ?? [],
    allergen_assessments: assessments,
    safety_metadata_complete: false,
    cross_contact_risk: "unknown",
    submitted_by: data.submitted_by || "เพื่อนนักกิน KIN DI",
    created_at: new Date().toISOString(),
  };
}

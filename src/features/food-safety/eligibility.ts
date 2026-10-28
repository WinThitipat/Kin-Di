import { INGREDIENTS_CATALOG } from '@/data/recipes-seed';
import {
  IngredientRecord,
  Recipe,
  RouletteQuickFilters,
  UserFoodRestrictions,
} from '@/types/recipe';

/**
 * Maps a parent avoided ingredient ID to derivative/related ingredient IDs
 * (such as stocks, crispy variants, or derived sauces) so avoiding e.g. 'beef'
 * also excludes recipes using 'beef_stock', and avoiding 'pork' excludes 'crispy_pork'.
 */
export const INGREDIENT_DERIVATIVE_MAP: Record<string, string[]> = {
  beef: ['beef', 'beef_stock'],
  pork: ['pork', 'crispy_pork'],
  crispy_pork: ['crispy_pork'],
  fish: ['salmon', 'mackerel', 'canned_tuna', 'fish_sauce'],
  shrimp: ['shrimp', 'oyster_sauce'],
  milk: ['milk', 'butter', 'cheese'],
  soy_sauce: ['soy_sauce', 'tamari_sauce'],
};

export const DEFAULT_USER_RESTRICTIONS: UserFoodRestrictions = {
  allergens: [],
  customAllergens: [],
  avoidedIngredients: [],
  customAvoidedTerms: [],
  dietaryPreference: 'unrestricted',
};

export const DEFAULT_ROULETTE_FILTERS: RouletteQuickFilters = {
  mealType: 'all',
  category: 'all',
  maxCookingTime: null,
};

/**
 * Expands a list of avoided ingredient IDs to include all known derivatives/stocks/sauces.
 */
export function expandAvoidedIngredients(avoidedIds: string[]): Set<string> {
  const expanded = new Set<string>();
  for (const rawId of avoidedIds) {
    const id = rawId.trim();
    if (!id) continue;
    expanded.add(id);
    const derivatives = INGREDIENT_DERIVATIVE_MAP[id];
    if (derivatives) {
      for (const d of derivatives) {
        expanded.add(d);
      }
    }
  }
  return expanded;
}

/**
 * Evaluates whether a single recipe satisfies public visibility and the user's
 * food safety restrictions (steps 1–6 of the eligibility pipeline), including
 * custom allergens and custom avoided ingredients ("อื่นๆ").
 */
export function isRecipeSafeForUser(
  recipe: Recipe,
  restrictions: UserFoodRestrictions = DEFAULT_USER_RESTRICTIONS,
  catalog: Record<string, IngredientRecord> = INGREDIENTS_CATALOG
): boolean {
  // 1. Exclude unapproved or non-public recipes
  if (!recipe || recipe.status !== 'approved' || !recipe.id || !recipe.name) {
    return false;
  }

  const customAllergens = (restrictions.customAllergens ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const customAvoidedTerms = (restrictions.customAvoidedTerms ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const hasAllergenRestrictions = restrictions.allergens.length > 0;
  const hasCustomAllergenRestrictions = customAllergens.length > 0;
  const hasAvoidedIngredients = restrictions.avoidedIngredients.length > 0;
  const hasCustomAvoidedTerms = customAvoidedTerms.length > 0;
  const hasDietaryRestriction = restrictions.dietaryPreference !== 'unrestricted';

  const hasAnySafetyRestriction =
    hasAllergenRestrictions ||
    hasCustomAllergenRestrictions ||
    hasAvoidedIngredients ||
    hasCustomAvoidedTerms ||
    hasDietaryRestriction;

  // 2. Validate that required recipe and safety data is sufficiently complete
  if (hasAnySafetyRestriction) {
    if (recipe.safety_metadata_complete === false) {
      return false;
    }
    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      return false;
    }
    for (const item of recipe.ingredients) {
      if (!item || !item.ingredient_id || item.composition_verified === false) {
        return false;
      }
      const catalogItem = catalog[item.ingredient_id];
      if (!catalogItem || catalogItem.composition_known === false) {
        return false;
      }
    }
  }

  // 3 & 4. Fail-closed allergen & cross-contact filtering
  if (hasAllergenRestrictions) {
    const recipeCrossContact = recipe.cross_contact_risk ?? 'low';
    if (recipeCrossContact !== 'low') {
      return false;
    }

    if (!recipe.allergen_assessments || typeof recipe.allergen_assessments !== 'object') {
      return false;
    }

    for (const selectedAllergen of restrictions.allergens) {
      const assessment = recipe.allergen_assessments[selectedAllergen];
      if (!assessment) {
        return false;
      }
      if (assessment.status !== 'free') {
        return false;
      }
      if (assessment.cross_contact_risk !== 'low') {
        return false;
      }

      for (const item of recipe.ingredients!) {
        const catalogItem = catalog[item.ingredient_id];
        if (!catalogItem || catalogItem.allergens.includes(selectedAllergen)) {
          return false;
        }
      }
    }
  }

  // 5. Exclude recipes containing avoided ingredients (including stocks, sauces, condiments)
  if (hasAvoidedIngredients) {
    const expandedAvoided = expandAvoidedIngredients(restrictions.avoidedIngredients);
    for (const item of recipe.ingredients!) {
      if (expandedAvoided.has(item.ingredient_id)) {
        return false;
      }
    }
  }

  // 5b. Exclude recipes matching any custom allergen or custom avoided term ("อื่นๆ")
  if (hasCustomAllergenRestrictions || hasCustomAvoidedTerms) {
    const allCustomForbidden = [...customAllergens, ...customAvoidedTerms];
    const searchableTokens: string[] = [
      recipe.name.toLowerCase(),
      (recipe.description ?? '').toLowerCase(),
      ...(recipe.custom_ingredients ?? []).map((c) => c.toLowerCase()),
    ];

    for (const item of recipe.ingredients ?? []) {
      searchableTokens.push(item.ingredient_id.toLowerCase());
      const catalogItem = catalog[item.ingredient_id];
      if (catalogItem) {
        searchableTokens.push(catalogItem.name_th.toLowerCase());
      }
    }

    const combinedText = searchableTokens.join(' ');
    for (const term of allCustomForbidden) {
      if (combinedText.includes(term)) {
        return false;
      }
    }
  }

  // 6. Apply dietary requirements using explicit metadata only (never infer from name)
  if (hasDietaryRestriction) {
    const requiredDiet = restrictions.dietaryPreference as Exclude<
      UserFoodRestrictions['dietaryPreference'],
      'unrestricted'
    >;

    if (!Array.isArray(recipe.dietary_tags) || !recipe.dietary_tags.includes(requiredDiet)) {
      return false;
    }

    for (const item of recipe.ingredients!) {
      const catalogItem = catalog[item.ingredient_id];
      if (
        !catalogItem ||
        !Array.isArray(catalogItem.dietary_compatible) ||
        !catalogItem.dietary_compatible.includes(requiredDiet)
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Checks whether a recipe matches optional Food Roulette quick filters (Step 7).
 */
export function matchesRouletteQuickFilters(
  recipe: Recipe,
  filters: RouletteQuickFilters = DEFAULT_ROULETTE_FILTERS
): boolean {
  if (filters.mealType !== 'all') {
    if (!Array.isArray(recipe.meal_types) || !recipe.meal_types.includes(filters.mealType)) {
      return false;
    }
  }

  if (filters.category !== 'all') {
    if (recipe.category !== filters.category) {
      return false;
    }
  }

  if (filters.maxCookingTime !== null && filters.maxCookingTime !== undefined) {
    if (typeof recipe.cooking_time !== 'number' || recipe.cooking_time > filters.maxCookingTime) {
      return false;
    }
  }

  return true;
}

/**
 * Deduplicates a recipe list by `recipe.id`, keeping the first valid occurrence (Step 8).
 */
export function deduplicateRecipes(recipes: Recipe[]): Recipe[] {
  const seenIds = new Set<string>();
  const unique: Recipe[] = [];

  for (const recipe of recipes) {
    if (!recipe || !recipe.id) continue;
    if (seenIds.has(recipe.id)) continue;
    seenIds.add(recipe.id);
    unique.push(recipe);
  }

  return unique;
}

/**
 * Complete shared eligibility pipeline for Food Roulette (Steps 1–8).
 * Never silently disables any restriction or filter when the result set is empty.
 */
export function getEligibleRouletteRecipes(
  candidates: Recipe[],
  restrictions: UserFoodRestrictions = DEFAULT_USER_RESTRICTIONS,
  filters: RouletteQuickFilters = DEFAULT_ROULETTE_FILTERS,
  catalog: Record<string, IngredientRecord> = INGREDIENTS_CATALOG
): Recipe[] {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return [];
  }

  const filtered = candidates.filter(
    (recipe) =>
      isRecipeSafeForUser(recipe, restrictions, catalog) &&
      matchesRouletteQuickFilters(recipe, filters)
  );

  return deduplicateRecipes(filtered);
}

/**
 * Shared Fridge Mode matching logic using the exact same food safety & eligibility rules.
 */
export const BASIC_PANTRY_CONDIMENT_IDS = [
  'fish_sauce',
  'oyster_sauce',
  'soy_sauce',
  'tamari_sauce',
  'sea_salt',
  'olive_oil',
  'garlic',
  'chili',
] as const;

export interface FridgeMatchResult {
  recipe: Recipe;
  matchedRequiredIds: string[];
  matchedOptionalIds: string[];
}

export interface FridgeNearMatchResult {
  recipe: Recipe;
  matchedRequiredIds: string[];
  missingRequiredIds: string[];
  matchedOptionalIds: string[];
}

export function getEligibleFridgeRecipes(
  candidates: Recipe[],
  availableIngredientIds: string[],
  restrictions: UserFoodRestrictions = DEFAULT_USER_RESTRICTIONS,
  options: { assumeBasicPantryCondiments?: boolean } = { assumeBasicPantryCondiments: false },
  catalog: Record<string, IngredientRecord> = INGREDIENTS_CATALOG
): FridgeMatchResult[] {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return [];
  }

  const availableSet = new Set(availableIngredientIds);
  if (options.assumeBasicPantryCondiments) {
    for (const condimentId of BASIC_PANTRY_CONDIMENT_IDS) {
      availableSet.add(condimentId);
    }
  }

  if (availableSet.size === 0) {
    return [];
  }

  const safeUniqueRecipes = deduplicateRecipes(
    candidates.filter((recipe) => isRecipeSafeForUser(recipe, restrictions, catalog))
  );

  const results: FridgeMatchResult[] = [];

  for (const recipe of safeUniqueRecipes) {
    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      continue;
    }

    const requiredEntries = recipe.ingredients.filter((ing) => !ing.is_optional);
    if (requiredEntries.length === 0) {
      continue;
    }

    const allRequiredPresent = requiredEntries.every((ing) =>
      availableSet.has(ing.ingredient_id)
    );

    if (!allRequiredPresent) {
      continue;
    }

    const matchedRequiredIds = requiredEntries.map((ing) => ing.ingredient_id);
    const matchedOptionalIds = recipe.ingredients
      .filter((ing) => ing.is_optional && availableSet.has(ing.ingredient_id))
      .map((ing) => ing.ingredient_id);

    results.push({
      recipe,
      matchedRequiredIds,
      matchedOptionalIds,
    });
  }

  return results;
}

/**
 * Returns safe recipes that are "ขาดอีกนิดเดียว!" (Near-Match in Fridge Mode):
 * - Passes `isRecipeSafeForUser(recipe, restrictions, catalog)` (100% food-safe).
 * - Has at least 1 matched required ingredient in the user's selection.
 * - Is missing between 1 and `maxMissing` (default 2) required ingredients.
 * - Sorted by fewest missing ingredients first.
 */
export function getNearMatchFridgeRecipes(
  candidates: Recipe[],
  availableIngredientIds: string[],
  restrictions: UserFoodRestrictions = DEFAULT_USER_RESTRICTIONS,
  options: { assumeBasicPantryCondiments?: boolean; maxMissing?: number } = {
    assumeBasicPantryCondiments: false,
    maxMissing: 2,
  },
  catalog: Record<string, IngredientRecord> = INGREDIENTS_CATALOG
): FridgeNearMatchResult[] {
  if (!Array.isArray(candidates) || candidates.length === 0 || availableIngredientIds.length === 0) {
    return [];
  }

  const maxMissing = options.maxMissing ?? 2;
  const availableSet = new Set(availableIngredientIds);
  if (options.assumeBasicPantryCondiments) {
    for (const condimentId of BASIC_PANTRY_CONDIMENT_IDS) {
      availableSet.add(condimentId);
    }
  }

  const safeUniqueRecipes = deduplicateRecipes(
    candidates.filter((recipe) => isRecipeSafeForUser(recipe, restrictions, catalog))
  );

  const nearMatches: FridgeNearMatchResult[] = [];

  for (const recipe of safeUniqueRecipes) {
    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      continue;
    }

    const requiredEntries = recipe.ingredients.filter((ing) => !ing.is_optional);
    if (requiredEntries.length === 0) {
      continue;
    }

    const matchedRequiredIds = requiredEntries
      .filter((ing) => availableSet.has(ing.ingredient_id))
      .map((ing) => ing.ingredient_id);
    const missingRequiredIds = requiredEntries
      .filter((ing) => !availableSet.has(ing.ingredient_id))
      .map((ing) => ing.ingredient_id);

    // Must match at least 1 ingredient from what the user actually has and be missing 1..maxMissing
    if (
      matchedRequiredIds.length > 0 &&
      missingRequiredIds.length >= 1 &&
      missingRequiredIds.length <= maxMissing
    ) {
      const matchedOptionalIds = recipe.ingredients
        .filter((ing) => ing.is_optional && availableSet.has(ing.ingredient_id))
        .map((ing) => ing.ingredient_id);

      nearMatches.push({
        recipe,
        matchedRequiredIds,
        missingRequiredIds,
        matchedOptionalIds,
      });
    }
  }

  return nearMatches.sort((a, b) => a.missingRequiredIds.length - b.missingRequiredIds.length);
}

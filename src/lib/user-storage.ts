import { INGREDIENTS_CATALOG } from '@/data/recipes-seed';
import { DEFAULT_USER_RESTRICTIONS } from '@/features/food-safety/eligibility';
import {
  AllergenId,
  DietaryPreference,
  IngredientRecord,
  Recipe,
  RouletteHistoryEntry,
  UserFoodRestrictions,
} from '@/types/recipe';

const RESTRICTIONS_STORAGE_KEY = 'kindi:food-restrictions:v1';
const FAVORITES_STORAGE_KEY = 'kindi:favorites:v1';
const HISTORY_STORAGE_KEY = 'kindi:roulette-history:v1';
const SHARED_RECIPES_STORAGE_KEY = 'kindi:shared-recipes:v1';
const CUSTOM_INGREDIENTS_STORAGE_KEY = 'kindi:custom-ingredients:v1';
const PENDING_SUBMISSIONS_KEY = 'kindi:pending-submissions:v1';

const VALID_ALLERGENS = new Set<AllergenId>([
  'peanuts',
  'tree_nuts',
  'shellfish',
  'fish',
  'eggs',
  'dairy',
  'soy',
  'wheat_gluten',
  'sesame',
]);

const VALID_DIETS = new Set<DietaryPreference>([
  'unrestricted',
  'vegetarian',
  'vegan',
  'halal',
]);

export function loadUserRestrictions(): UserFoodRestrictions {
  if (typeof window === 'undefined') {
    return DEFAULT_USER_RESTRICTIONS;
  }
  try {
    const raw = window.localStorage.getItem(RESTRICTIONS_STORAGE_KEY);
    if (!raw) return DEFAULT_USER_RESTRICTIONS;
    const parsed = JSON.parse(raw);
    const allergens = Array.isArray(parsed?.allergens)
      ? (parsed.allergens.filter(
          (a: unknown) => typeof a === 'string' && VALID_ALLERGENS.has(a as AllergenId)
        ) as AllergenId[])
      : [];
    const customAllergens = Array.isArray(parsed?.customAllergens)
      ? parsed.customAllergens
          .filter((a: unknown): a is string => typeof a === 'string')
          .map((a: string) => a.trim())
          .filter(Boolean)
      : [];
    const avoidedIngredients = Array.isArray(parsed?.avoidedIngredients)
      ? parsed.avoidedIngredients.filter((i: unknown): i is string => typeof i === 'string')
      : [];
    const customAvoidedTerms = Array.isArray(parsed?.customAvoidedTerms)
      ? parsed.customAvoidedTerms
          .filter((t: unknown): t is string => typeof t === 'string')
          .map((t: string) => t.trim())
          .filter(Boolean)
      : [];
    const dietaryPreference: DietaryPreference =
      typeof parsed?.dietaryPreference === 'string' &&
      VALID_DIETS.has(parsed.dietaryPreference as DietaryPreference)
        ? (parsed.dietaryPreference as DietaryPreference)
        : 'unrestricted';

    return {
      allergens,
      customAllergens,
      avoidedIngredients,
      customAvoidedTerms,
      dietaryPreference,
    };
  } catch {
    return DEFAULT_USER_RESTRICTIONS;
  }
}

export function saveUserRestrictions(restrictions: UserFoodRestrictions): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RESTRICTIONS_STORAGE_KEY, JSON.stringify(restrictions));
    window.dispatchEvent(new CustomEvent('kindi-restrictions-updated'));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadFavoriteRecipeIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id: unknown): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteRecipeId(recipeId: string): string[] {
  if (typeof window === 'undefined') return [];
  const current = loadFavoriteRecipeIds();
  const exists = current.includes(recipeId);
  const next = exists ? current.filter((id) => id !== recipeId) : [recipeId, ...current];
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('kindi-favorites-updated'));
  } catch {
    // Ignore storage errors
  }
  return next;
}

export function loadRouletteHistory(): RouletteHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch {
    return [];
  }
}

/**
 * Records a completed Food Roulette result ONLY after a card is actually revealed.
 * Never records unrevealed rounds.
 */
export function recordRouletteRevealHistory(entry: RouletteHistoryEntry): RouletteHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  const current = loadRouletteHistory();
  const withoutSameRound = current.filter((item) => item.roundId !== entry.roundId);
  const next = [entry, ...withoutSameRound].slice(0, 8);
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors
  }
  return next;
}

export function clearRouletteHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * User-shared recipes saved via "แบ่งปันสูตรอาหาร" (/community).
 */
export function loadSharedRecipes(): Recipe[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SHARED_RECIPES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Recipe[]) : [];
  } catch {
    return [];
  }
}

export function saveSharedRecipe(recipe: Recipe): Recipe[] {
  if (typeof window === 'undefined') return [recipe];
  const current = loadSharedRecipes();
  const withoutDuplicate = current.filter((item) => item.id !== recipe.id);
  const next = [recipe, ...withoutDuplicate];
  try {
    window.localStorage.setItem(SHARED_RECIPES_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('kindi-recipes-updated'));
  } catch {
    // Ignore storage quota errors
  }
  return next;
}

export function deleteSharedRecipe(recipeId: string): Recipe[] {
  if (typeof window === 'undefined') return [];
  const current = loadSharedRecipes();
  const next = current.filter((item) => item.id !== recipeId);
  try {
    window.localStorage.setItem(SHARED_RECIPES_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('kindi-recipes-updated'));
  } catch {
    // Ignore
  }
  return next;
}

export function clearSharedRecipes(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SHARED_RECIPES_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('kindi-recipes-updated'));
  } catch {
    // Ignore
  }
}

/**
 * Custom ingredients added by the user via "อื่นๆ" in "แบ่งปันสูตรอาหาร" or Fridge Mode.
 */
export function loadCustomIngredients(): IngredientRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_INGREDIENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as IngredientRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomIngredient(record: IngredientRecord): IngredientRecord[] {
  if (typeof window === 'undefined') return [record];
  const current = loadCustomIngredients();
  const withoutSame = current.filter((item) => item.id !== record.id && item.name_th !== record.name_th);
  const next = [...withoutSame, record];
  try {
    window.localStorage.setItem(CUSTOM_INGREDIENTS_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('kindi-ingredients-updated'));
  } catch {
    // Ignore
  }
  return next;
}

/**
 * Returns the merged ingredient catalog combining the built-in catalog and user-added custom ingredients.
 */
export function getMergedIngredientsCatalog(): Record<string, IngredientRecord> {
  const merged: Record<string, IngredientRecord> = { ...INGREDIENTS_CATALOG };
  const custom = loadCustomIngredients();
  for (const item of custom) {
    if (item && item.id) {
      merged[item.id] = item;
    }
  }
  return merged;
}

export interface LocalPendingSubmissionSummary {
  id: string;
  name: string;
  category: string;
  submitted_by: string;
  created_at: string;
  status: 'approved' | 'pending';
  external_recipe_url?: string | null;
  image_url?: string | null;
}

export function loadPendingSubmissions(): LocalPendingSubmissionSummary[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PENDING_SUBMISSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePendingSubmission(item: LocalPendingSubmissionSummary): LocalPendingSubmissionSummary[] {
  if (typeof window === 'undefined') return [];
  const current = loadPendingSubmissions();
  const next = [item, ...current].slice(0, 20);
  try {
    window.localStorage.setItem(PENDING_SUBMISSIONS_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}

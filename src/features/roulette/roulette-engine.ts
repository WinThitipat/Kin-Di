import {
  DEFAULT_ROULETTE_FILTERS,
  DEFAULT_USER_RESTRICTIONS,
  getEligibleRouletteRecipes,
} from '@/features/food-safety/eligibility';
import {
  CardCountOption,
  IngredientRecord,
  MysteryCardAssignment,
  Recipe,
  RouletteQuickFilters,
  RouletteRoundState,
  UserFoodRestrictions,
} from '@/types/recipe';

/**
 * Unbiased Fisher–Yates shuffle on a copy of the array.
 * Accepts an optional RNG function (defaults to Math.random) for deterministic testing.
 */
export function fisherYatesShuffle<T>(
  items: readonly T[],
  rng: () => number = Math.random
): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const raw = rng();
    const clamped = Math.max(0, Math.min(0.999999999, raw));
    const j = Math.floor(clamped * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

export interface CreateRouletteRoundOptions {
  candidates: Recipe[];
  requestedCardCount: CardCountOption;
  restrictions?: UserFoodRestrictions;
  filters?: RouletteQuickFilters;
  previousRevealedRecipeId?: string | null;
  previousRoundRecipeIds?: string[];
  recentRevealedRecipeIds?: string[];
  catalog?: Record<string, IngredientRecord>;
  rng?: () => number;
  roundIdGenerator?: () => string;
}

function defaultRoundIdGenerator(): string {
  return `round-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generates a complete, immutable initial round state with stable card-to-recipe assignments.
 *
 * Guarantees:
 * 1. Only approved, safety-verified recipes matching user restrictions and quick filters are eligible.
 * 2. Duplicate recipe IDs in the input never produce duplicate cards.
 * 3. Card count is at most `requestedCardCount` (3, 5, or 7) and at most `eligible.length`.
 * 4. When starting a new round and enough alternative eligible recipes exist, avoids
 *    immediately repeating the previously revealed recipe or identical ordering.
 */
export function createRouletteRound({
  candidates,
  requestedCardCount,
  restrictions = DEFAULT_USER_RESTRICTIONS,
  filters = DEFAULT_ROULETTE_FILTERS,
  previousRevealedRecipeId = null,
  previousRoundRecipeIds = [],
  recentRevealedRecipeIds = [],
  catalog,
  rng = Math.random,
  roundIdGenerator = defaultRoundIdGenerator,
}: CreateRouletteRoundOptions): RouletteRoundState {
  const roundId = roundIdGenerator();

  const eligible = getEligibleRouletteRecipes(candidates, restrictions, filters, catalog);
  const totalEligibleCount = eligible.length;

  if (totalEligibleCount === 0) {
    return {
      roundId,
      requestedCardCount,
      cards: [],
      totalEligibleCount: 0,
      selectedCardId: null,
      isRevealed: false,
      isTransitioning: false,
    };
  }

  const targetCount = Math.min(requestedCardCount, totalEligibleCount);

  // If we have strictly more eligible recipes than requested cards and there was a previously
  // revealed recipe, prioritize fresh candidates first while still keeping everything randomized.
  let pool = fisherYatesShuffle(eligible, rng);
  // Prefer unseen dishes, then reintroduce the oldest recent results only if needed.
  const recent = [...new Set(recentRevealedRecipeIds)].slice(0, 5);
  pool = [
    ...pool.filter(recipe => !recent.includes(recipe.id)),
    ...pool.filter(recipe => recent.includes(recipe.id)).sort((a, b) => recent.indexOf(b.id) - recent.indexOf(a.id)),
  ];

  if (previousRevealedRecipeId && totalEligibleCount > targetCount) {
    const withoutPrevRevealed = pool.filter((r) => r.id !== previousRevealedRecipeId);
    const prevRevealed = pool.filter((r) => r.id === previousRevealedRecipeId);
    pool = [...withoutPrevRevealed, ...prevRevealed];
  } else if (
    previousRoundRecipeIds.length > 1 &&
    totalEligibleCount >= targetCount &&
    pool.slice(0, targetCount).every((r, idx) => r.id === previousRoundRecipeIds[idx])
  ) {
    // Rotate by 1 if the random shuffle happened to land on the exact same sequence
    pool = [...pool.slice(1), pool[0]];
  }

  const selectedRecipes = pool.slice(0, targetCount);

  const cards: MysteryCardAssignment[] = selectedRecipes.map((recipe, index) => ({
    cardId: `${roundId}-card-${index + 1}`,
    cardIndex: index + 1,
    recipe,
  }));

  return {
    roundId,
    requestedCardCount,
    cards,
    totalEligibleCount,
    selectedCardId: null,
    isRevealed: false,
    isTransitioning: false,
  };
}

/**
 * Pure state transition when a user clicks/activates a mystery card.
 *
 * - Ignores interaction if a card is already selected, transitioning, or revealed
 *   (prevents rapid-click race conditions).
 * - Ignores invalid cardIds that do not belong to the current round.
 * - Never mutates or reassigns `round.cards`.
 */
export function selectCardInRound(
  round: RouletteRoundState,
  cardId: string,
  options: { immediateReveal?: boolean } = {}
): RouletteRoundState {
  if (round.selectedCardId !== null || round.isTransitioning || round.isRevealed) {
    return round;
  }

  const targetCard = round.cards.find((c) => c.cardId === cardId);
  if (!targetCard) {
    return round;
  }

  if (options.immediateReveal) {
    return {
      ...round,
      selectedCardId: cardId,
      isTransitioning: false,
      isRevealed: true,
    };
  }

  return {
    ...round,
    selectedCardId: cardId,
    isTransitioning: true,
    isRevealed: false,
  };
}

/**
 * Pure state transition when the card flip animation finishes.
 * Preserves the exact `selectedCardId` and `cards` mapping.
 */
export function completeCardFlipInRound(round: RouletteRoundState): RouletteRoundState {
  if (!round.selectedCardId) {
    return round;
  }
  if (round.isRevealed && !round.isTransitioning) {
    return round;
  }
  return {
    ...round,
    isTransitioning: false,
    isRevealed: true,
  };
}

/**
 * Returns the assigned recipe for the currently selected card in the round, or null.
 */
export function getRevealedRecipeFromRound(round: RouletteRoundState | null): Recipe | null {
  if (!round || !round.selectedCardId) {
    return null;
  }
  const found = round.cards.find((c) => c.cardId === round.selectedCardId);
  return found ? found.recipe : null;
}

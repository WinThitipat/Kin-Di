import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCommunityRecipe } from '@/lib/build-community-recipe';
afterEach(() => vi.restoreAllMocks());
import {
  ALL_ALLERGEN_IDS,
  buildAllergenAssessments,
  INITIAL_RECIPES,
} from '@/data/recipes-seed';
import {
  DEFAULT_USER_RESTRICTIONS,
  getEligibleFridgeRecipes,
  getEligibleRouletteRecipes,
  getNearMatchFridgeRecipes,
  isRecipeSafeForUser,
} from '@/features/food-safety/eligibility';
import {
  completeCardFlipInRound,
  createRouletteRound,
  getRevealedRecipeFromRound,
  selectCardInRound,
} from '@/features/roulette/roulette-engine';
import {
  fetchApprovedRecipeById,
  fetchApprovedRecipes,
  submitCommunityRecipeForModeration,
} from '@/lib/recipes-repository';
import { getExternalRecipeLinks, inferExternalSourceName, isSafeHttpUrl } from '@/lib/external-recipes';
import { CardCountOption, Recipe, RecipeIdSchema, UserFoodRestrictions } from '@/types/recipe';

function makeTestRecipe(overrides: Partial<Recipe> & { id: string; name: string }): Recipe {
  return {
    description: 'เมนูทดสอบระบบความปลอดภัย',
    category: 'thai',
    meal_types: ['lunch', 'dinner'],
    cooking_time: 15,
    difficulty: 'easy',
    image_url: 'https://example.com/food.jpg',
    external_recipe_url: 'https://www.wongnai.com/recipes/pad-kaprao-minced-pork',
    external_source_name: 'Wongnai Cooking',
    status: 'approved',
    dietary_tags: ['vegetarian', 'vegan', 'halal'],
    safety_metadata_complete: true,
    cross_contact_risk: 'low',
    ingredients: [
      {
        ingredient_id: 'jasmine_rice',
        quantity: '1 จาน',
        role: 'main',
        is_optional: false,
        composition_verified: true,
      },
      {
        ingredient_id: 'morning_glory',
        quantity: '100 กรัม',
        role: 'main',
        is_optional: false,
        composition_verified: true,
      },
    ],
    allergen_assessments: buildAllergenAssessments({}),
    instructions: ['ขั้นตอนที่ 1', 'ขั้นตอนที่ 2'],
    created_at: '2026-10-28T00:00:00Z',
    ...overrides,
  };
}

const TEST_POOL: Recipe[] = [
  makeTestRecipe({ id: 'r1', name: 'เมนูที่ 1', meal_types: ['breakfast'], cooking_time: 10 }),
  makeTestRecipe({ id: 'r2', name: 'เมนูที่ 2', meal_types: ['lunch'], cooking_time: 15 }),
  makeTestRecipe({ id: 'r3', name: 'เมนูที่ 3', meal_types: ['dinner'], cooking_time: 20 }),
  makeTestRecipe({ id: 'r4', name: 'เมนูที่ 4', meal_types: ['lunch'], cooking_time: 25 }),
  makeTestRecipe({ id: 'r5', name: 'เมนูที่ 5', meal_types: ['dinner'], cooking_time: 30 }),
  makeTestRecipe({ id: 'r6', name: 'เมนูที่ 6', meal_types: ['snack'], cooking_time: 10 }),
  makeTestRecipe({ id: 'r7', name: 'เมนูที่ 7', meal_types: ['breakfast'], cooking_time: 10 }),
  makeTestRecipe({ id: 'r8', name: 'เมนูที่ 8', meal_types: ['lunch'], cooking_time: 15 }),
];

describe('KIN DI Initial Seed & Data Cleanup Verification', () => {
  it('0. Pre-seeded recipes are cleared (`INITIAL_RECIPES` is empty) so only user-shared recipes appear', async () => {
    expect(INITIAL_RECIPES).toEqual([]);
    const { recipes, error } = await fetchApprovedRecipes();
    expect(error).toBeNull();
    expect(recipes).toEqual([]);
  });
});

describe('KIN DI Food Roulette — Card Assignment & Round State Engine (Scenarios 1–10)', () => {
  const fiveSafeRecipes = TEST_POOL.slice(0, 5);
  const eightSafeRecipes = TEST_POOL;

  it('1. Five eligible recipes produce five distinct cards', () => {
    const round = createRouletteRound({
      candidates: fiveSafeRecipes,
      requestedCardCount: 5,
    });

    expect(round.cards).toHaveLength(5);
    const assignedRecipeIds = round.cards.map((c) => c.recipe.id);
    expect(new Set(assignedRecipeIds).size).toBe(5);
    const cardIds = round.cards.map((c) => c.cardId);
    expect(new Set(cardIds).size).toBe(5);
  });

  it('2. Three requested cards produce at most three cards', () => {
    const round = createRouletteRound({
      candidates: eightSafeRecipes,
      requestedCardCount: 3,
    });

    expect(round.cards).toHaveLength(3);
    expect(new Set(round.cards.map((c) => c.recipe.id)).size).toBe(3);
  });

  it('3. Seven requested cards produce at most seven cards', () => {
    const round = createRouletteRound({
      candidates: eightSafeRecipes,
      requestedCardCount: 7,
    });

    expect(round.cards).toHaveLength(7);
    expect(new Set(round.cards.map((c) => c.recipe.id)).size).toBe(7);
  });

  it('4. Duplicate recipe IDs in database/candidate list do not produce duplicate cards', () => {
    const duplicatedInput: Recipe[] = [
      fiveSafeRecipes[0],
      fiveSafeRecipes[0],
      fiveSafeRecipes[1],
      fiveSafeRecipes[1],
      fiveSafeRecipes[2],
      fiveSafeRecipes[2],
    ];

    const round = createRouletteRound({
      candidates: duplicatedInput,
      requestedCardCount: 5,
    });

    expect(round.totalEligibleCount).toBe(3);
    expect(round.cards).toHaveLength(3);
    expect(new Set(round.cards.map((c) => c.recipe.id)).size).toBe(3);
  });

  it('5. Fewer eligible recipes than requested count produce fewer cards without errors', () => {
    const twoRecipes = fiveSafeRecipes.slice(0, 2);
    const round = createRouletteRound({
      candidates: twoRecipes,
      requestedCardCount: 7,
    });

    expect(round.requestedCardCount).toBe(7);
    expect(round.totalEligibleCount).toBe(2);
    expect(round.cards).toHaveLength(2);
  });

  it('6. Zero eligible recipes produce a valid empty state', () => {
    const round = createRouletteRound({
      candidates: [],
      requestedCardCount: 5,
    });

    expect(round.totalEligibleCount).toBe(0);
    expect(round.cards).toEqual([]);
    expect(round.selectedCardId).toBeNull();
    expect(round.isRevealed).toBe(false);
    expect(getRevealedRecipeFromRound(round)).toBeNull();
  });

  it('7. A selected card always reveals its exact pre-assigned recipe', () => {
    const round = createRouletteRound({
      candidates: fiveSafeRecipes,
      requestedCardCount: 5,
    });

    const thirdCard = round.cards[2];
    const preAssignedRecipeId = thirdCard.recipe.id;

    const transitioningRound = selectCardInRound(round, thirdCard.cardId);
    expect(transitioningRound.selectedCardId).toBe(thirdCard.cardId);
    expect(transitioningRound.isTransitioning).toBe(true);
    expect(transitioningRound.isRevealed).toBe(false);

    const revealedRound = completeCardFlipInRound(transitioningRound);
    expect(revealedRound.isTransitioning).toBe(false);
    expect(revealedRound.isRevealed).toBe(true);

    const revealedRecipe = getRevealedRecipeFromRound(revealedRound);
    expect(revealedRecipe?.id).toBe(preAssignedRecipeId);
  });

  it('8. Rerendering / reading state does not change card assignment', () => {
    const round = createRouletteRound({
      candidates: fiveSafeRecipes,
      requestedCardCount: 5,
    });

    const snapshotBefore = round.cards.map((c) => ({ cardId: c.cardId, recipeId: c.recipe.id }));
    const afterSelect = selectCardInRound(round, round.cards[0].cardId);
    const afterFlip = completeCardFlipInRound(afterSelect);
    const snapshotAfter = afterFlip.cards.map((c) => ({
      cardId: c.cardId,
      recipeId: c.recipe.id,
    }));

    expect(snapshotAfter).toEqual(snapshotBefore);
  });

  it('9. Starting a new round resets the previous reveal state and generates a fresh round ID', () => {
    const firstRound = completeCardFlipInRound(
      selectCardInRound(
        createRouletteRound({
          candidates: eightSafeRecipes,
          requestedCardCount: 5,
          roundIdGenerator: () => 'round-1',
        }),
        'round-1-card-2'
      )
    );

    expect(firstRound.isRevealed).toBe(true);
    expect(firstRound.selectedCardId).toBe('round-1-card-2');

    const prevRevealed = getRevealedRecipeFromRound(firstRound);
    const secondRound = createRouletteRound({
      candidates: eightSafeRecipes,
      requestedCardCount: 5,
      previousRevealedRecipeId: prevRevealed?.id,
      previousRoundRecipeIds: firstRound.cards.map((c) => c.recipe.id),
      roundIdGenerator: () => 'round-2',
    });

    expect(secondRound.roundId).toBe('round-2');
    expect(secondRound.selectedCardId).toBeNull();
    expect(secondRound.isRevealed).toBe(false);
    expect(secondRound.isTransitioning).toBe(false);
    expect(secondRound.cards).toHaveLength(5);
  });

  it('10. Repeated rapid clicks do not overwrite the first selected card or cause inconsistent states', () => {
    const round = createRouletteRound({
      candidates: fiveSafeRecipes,
      requestedCardCount: 5,
    });

    const card1 = round.cards[0];
    const card2 = round.cards[1];
    const card3 = round.cards[2];

    const click1 = selectCardInRound(round, card1.cardId);
    const click2 = selectCardInRound(click1, card2.cardId);
    const click3 = selectCardInRound(click2, card3.cardId);

    expect(click3.selectedCardId).toBe(card1.cardId);
    expect(getRevealedRecipeFromRound(completeCardFlipInRound(click3))?.id).toBe(card1.recipe.id);
  });
});

describe('KIN DI Shared Food Safety & Fail-Closed Eligibility Rules (Scenarios 11–18)', () => {
  it('11. Recipes with unapproved status (pending or rejected) are strictly excluded', () => {
    const pendingRecipe = makeTestRecipe({
      id: 'pending-1',
      name: 'เมนูรออนุมัติ',
      status: 'pending',
    });
    const rejectedRecipe = makeTestRecipe({
      id: 'rejected-1',
      name: 'เมนูไม่อนุมัติ',
      status: 'rejected',
    });
    const approvedRecipe = makeTestRecipe({
      id: 'approved-1',
      name: 'เมนูอนุมัติแล้ว',
      status: 'approved',
    });

    const eligible = getEligibleRouletteRecipes([pendingRecipe, rejectedRecipe, approvedRecipe]);
    expect(eligible.map((r) => r.id)).toEqual(['approved-1']);
  });

  it('12. Recipes containing or may_contain a selected allergen or custom allergen ("อื่นๆ") are excluded', () => {
    const containsPeanut = makeTestRecipe({
      id: 'has-peanut',
      name: 'ผัดไทยใส่ถั่ว',
      allergen_assessments: buildAllergenAssessments({
        peanuts: { status: 'contains' },
      }),
    });
    const mayContainPeanut = makeTestRecipe({
      id: 'may-peanut',
      name: 'ซอสอาจมีถั่ว',
      allergen_assessments: buildAllergenAssessments({
        peanuts: { status: 'may_contain' },
      }),
    });
    const customAllergenDish = makeTestRecipe({
      id: 'has-msg',
      name: 'ยำวุ้นเส้นใส่ผงชูรส',
      custom_ingredients: ['ผงชูรส'],
    });
    const safeDish = makeTestRecipe({
      id: 'free-peanut',
      name: 'ข้าวสวยผัดผักบุ้งล้วน',
      allergen_assessments: buildAllergenAssessments({
        peanuts: { status: 'free', cross_contact_risk: 'low' },
      }),
    });

    const restrictions: UserFoodRestrictions = {
      ...DEFAULT_USER_RESTRICTIONS,
      allergens: ['peanuts'],
      customAllergens: ['ผงชูรส'],
    };

    const eligible = getEligibleRouletteRecipes(
      [containsPeanut, mayContainPeanut, customAllergenDish, safeDish],
      restrictions
    );
    expect(eligible.map((r) => r.id)).toEqual(['free-peanut']);
  });

  it('13. Fail-closed: Recipes with missing or unknown allergen assessments are excluded when allergen is selected', () => {
    const unknownAssessment = makeTestRecipe({
      id: 'unknown-peanut',
      name: 'ไม่ทราบข้อมูลถั่ว',
      allergen_assessments: buildAllergenAssessments({
        peanuts: { status: 'unknown' },
      }),
    });
    const nullAssessments = makeTestRecipe({
      id: 'null-assessments',
      name: 'ไม่มีตารางประเมินภูมิแพ้',
      allergen_assessments: null,
    });
    const incompleteIngredients = makeTestRecipe({
      id: 'incomplete-ing',
      name: 'ไม่มีรายการวัตถุดิบ',
      ingredients: [],
    });

    const restrictions: UserFoodRestrictions = {
      ...DEFAULT_USER_RESTRICTIONS,
      allergens: ['peanuts'],
    };

    expect(isRecipeSafeForUser(unknownAssessment, restrictions)).toBe(false);
    expect(isRecipeSafeForUser(nullAssessments, restrictions)).toBe(false);
    expect(isRecipeSafeForUser(incompleteIngredients, restrictions)).toBe(false);
  });

  it('14. Recipes with unknown or possible cross-contact risk are excluded when an allergen is selected', () => {
    const possibleCrossContact = makeTestRecipe({
      id: 'possible-cc',
      name: 'กระทะรวมเสี่ยงปนเปื้อน',
      allergen_assessments: buildAllergenAssessments({
        shellfish: { status: 'free', cross_contact_risk: 'possible' },
      }),
    });
    const unknownRecipeLevelCC = makeTestRecipe({
      id: 'unknown-recipe-cc',
      name: 'ความเสี่ยงปนเปื้อนไม่ชัดเจน',
      cross_contact_risk: 'unknown',
    });

    const restrictions: UserFoodRestrictions = {
      ...DEFAULT_USER_RESTRICTIONS,
      allergens: ['shellfish'],
    };

    expect(isRecipeSafeForUser(possibleCrossContact, restrictions)).toBe(false);
    expect(isRecipeSafeForUser(unknownRecipeLevelCC, restrictions)).toBe(false);
  });

  it('15. Recipes containing avoided ingredients (including stocks, sauces, derivatives, or custom "อื่นๆ" terms) are excluded', () => {
    const beefSoup = makeTestRecipe({
      id: 'beef-stock-soup',
      name: 'ซุปใสใช้น้ำสต็อกเนื้อ',
      ingredients: [
        {
          ingredient_id: 'beef_stock',
          quantity: '1 ถ้วย',
          role: 'stock',
          is_optional: false,
          composition_verified: true,
        },
      ],
    });
    const corianderDish = makeTestRecipe({
      id: 'coriander-dish',
      name: 'ต้มจืดโรยผักชีเยอะๆ',
      custom_ingredients: ['ผักชี'],
    });
    const safeVeg = makeTestRecipe({
      id: 'safe-veg',
      name: 'ผัดผักบุ้งไฟแดง',
    });

    const restrictionsAvoidBeefAndCoriander: UserFoodRestrictions = {
      ...DEFAULT_USER_RESTRICTIONS,
      avoidedIngredients: ['beef'],
      customAvoidedTerms: ['ผักชี'],
    };

    const eligible = getEligibleRouletteRecipes(
      [beefSoup, corianderDish, safeVeg],
      restrictionsAvoidBeefAndCoriander
    );
    expect(eligible.map((r) => r.id)).toEqual(['safe-veg']);
  });

  it('16. Dietary restrictions are applied using explicit metadata only', () => {
    const porkFreeButUnverifiedHalal = makeTestRecipe({
      id: 'unverified-chicken',
      name: 'ไก่ย่างทั่วไปไม่ได้รับรองฮาลาล',
      dietary_tags: [],
      ingredients: [
        {
          ingredient_id: 'chicken',
          quantity: '150 กรัม',
          role: 'main',
          is_optional: false,
          composition_verified: true,
        },
      ],
    });

    const halalRestrictions: UserFoodRestrictions = {
      ...DEFAULT_USER_RESTRICTIONS,
      dietaryPreference: 'halal',
    };
    expect(isRecipeSafeForUser(porkFreeButUnverifiedHalal, halalRestrictions)).toBe(false);
  });

  it('17. Optional filters (mealType, category, maxCookingTime) are applied before card assignment', () => {
    const round = createRouletteRound({
      candidates: TEST_POOL,
      requestedCardCount: 5,
      filters: {
        mealType: 'breakfast',
        category: 'all',
        maxCookingTime: 10,
      },
    });

    expect(round.cards.length).toBe(2);
    for (const card of round.cards) {
      expect(card.recipe.meal_types).toContain('breakfast');
      expect(card.recipe.cooking_time).toBeLessThanOrEqual(10);
    }
  });

  it('18. No filter or restriction is silently disabled when results are empty', () => {
    const round = createRouletteRound({
      candidates: TEST_POOL,
      requestedCardCount: 5,
      restrictions: {
        allergens: ALL_ALLERGEN_IDS,
        customAllergens: [],
        avoidedIngredients: ['morning_glory'],
        customAvoidedTerms: [],
        dietaryPreference: 'vegan',
      },
      filters: {
        mealType: 'snack',
        category: 'noodles',
        maxCookingTime: 5,
      },
    });

    expect(round.totalEligibleCount).toBe(0);
    expect(round.cards).toHaveLength(0);
  });
});

describe('KIN DI UI State, Share Recipe Form ("แบ่งปันสูตรอาหาร"), Near-Match Fridge & Unrestricted External Links (Scenarios 19–27)', () => {
  it('21. Card count changes (3, 5, 7) regenerate the round with the requested count', () => {
    const counts: CardCountOption[] = [3, 5, 7];
    for (const count of counts) {
      const round = createRouletteRound({
        candidates: TEST_POOL,
        requestedCardCount: count,
      });
      expect(round.requestedCardCount).toBe(count);
      expect(round.cards).toHaveLength(count);
    }
  });

  it('22 & 26. Card flipping state machine works for both standard 3D transition and reduced-motion immediate reveal', () => {
    const round = createRouletteRound({
      candidates: TEST_POOL,
      requestedCardCount: 5,
    });
    const targetCardId = round.cards[1].cardId;

    const flipping = selectCardInRound(round, targetCardId, { immediateReveal: false });
    expect(flipping.isTransitioning).toBe(true);
    expect(flipping.isRevealed).toBe(false);
    const completed = completeCardFlipInRound(flipping);
    expect(completed.isTransitioning).toBe(false);
    expect(completed.isRevealed).toBe(true);

    const reducedMotionState = selectCardInRound(round, targetCardId, { immediateReveal: true });
    expect(reducedMotionState.isTransitioning).toBe(false);
    expect(reducedMotionState.isRevealed).toBe(true);
    expect(getRevealedRecipeFromRound(reducedMotionState)?.id).toBe(round.cards[1].recipe.id);
  });

  it('23. Malformed / injection-attempt ID fails Zod validation', async () => {
    expect(RecipeIdSchema.safeParse('<script>alert(1)</script>').success).toBe(false);
    const invalidLookup = await fetchApprovedRecipeById('<script>alert(1)</script>');
    expect(invalidLookup).toBeNull();
  });

  it('24 & 25. "แบ่งปันสูตรอาหาร" enforces required external link (unrestricted platform), food image, cooking time range, and supports custom "อื่นๆ" ingredients', async () => {
    const missingLinkAndImage = await submitCommunityRecipeForModeration({
      name: 'ข้าวต้มปลาทู',
      description: 'ข้าวต้มร้อนๆ หอมขิงซอยสด',
      external_recipe_url: '',
      image_url: '',
      category: 'rice',
      meal_types: ['breakfast'],
      cooking_time: 15,
      difficulty: 'easy',
      ingredientIds: ['jasmine_rice'],
      customIngredientNames: [],
      dietary_tags: [],
      allergens: [],
    });
    expect(missingLinkAndImage.success).toBe(false);

    // Sharing a recipe with an arbitrary platform link (e.g. YouTube or TikTok) and custom ingredient ("อื่นๆ")
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const payload = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ recipe: buildCommunityRecipe(payload, 'shared-test') }), { status: 201 });
    });
    const validShare = await submitCommunityRecipeForModeration({
      name: 'ยำแหนมข้าวทอดสูตรเด็ด',
      description: 'ยำแหนมรสจัดจ้าน หอมพริกมะนาวสด ทำตามง่ายมาก',
      external_recipe_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1',
      category: 'thai',
      meal_types: ['dinner', 'snack'],
      cooking_time: 25,
      difficulty: 'easy',
      ingredientIds: [],
      customIngredientNames: ['แหนมสด', 'ขิงซอย'],
      dietary_tags: [],
      allergens: ['peanuts'],
      submitted_by: 'เชฟหอใน',
    });

    expect(validShare.success).toBe(true);
    expect(validShare.submittedRecipe?.external_source_name).toBe('YouTube');
    expect(validShare.submittedRecipe?.custom_ingredients).toEqual(['แหนมสด', 'ขิงซอย']);
  });

  it('Fridge Mode supports both 100% exact matches and "ขาดอีกนิดเดียว!" (Near-Match missing 1–2 ingredients)', () => {
    const omeletteRecipe = makeTestRecipe({
      id: 'omelette-rice',
      name: 'ข้าวไข่เจียว',
      ingredients: [
        {
          ingredient_id: 'egg',
          quantity: '2 ฟอง',
          role: 'main',
          is_optional: false,
          composition_verified: true,
        },
        {
          ingredient_id: 'jasmine_rice',
          quantity: '1 จาน',
          role: 'main',
          is_optional: false,
          composition_verified: true,
        },
      ],
    });

    const krapaoRecipe = makeTestRecipe({
      id: 'krapao-pork',
      name: 'ข้าวกะเพราหมูสับไข่ดาว',
      ingredients: [
        {
          ingredient_id: 'egg',
          quantity: '1 ฟอง',
          role: 'main',
          is_optional: false,
          composition_verified: true,
        },
        {
          ingredient_id: 'jasmine_rice',
          quantity: '1 จาน',
          role: 'main',
          is_optional: false,
          composition_verified: true,
        },
        {
          ingredient_id: 'pork',
          quantity: '100 กรัม',
          role: 'main',
          is_optional: false,
          composition_verified: true,
        },
      ],
    });

    const available = ['egg', 'jasmine_rice'];
    const exactMatches = getEligibleFridgeRecipes(
      [omeletteRecipe, krapaoRecipe],
      available,
      DEFAULT_USER_RESTRICTIONS
    );
    expect(exactMatches.map((m) => m.recipe.id)).toEqual(['omelette-rice']);

    const nearMatches = getNearMatchFridgeRecipes(
      [omeletteRecipe, krapaoRecipe],
      available,
      DEFAULT_USER_RESTRICTIONS
    );
    expect(nearMatches).toHaveLength(1);
    expect(nearMatches[0].recipe.id).toBe('krapao-pork');
    expect(nearMatches[0].missingRequiredIds).toEqual(['pork']);
  });

  it('27. External recipe links accept any platform/domain (unrestricted) and reject unsafe javascript: URLs', () => {
    expect(inferExternalSourceName('https://www.tiktok.com/@chef/video/123')).toBe('TikTok');
    expect(inferExternalSourceName('https://www.youtube.com/watch?v=abc')).toBe('YouTube');
    expect(inferExternalSourceName('https://myfoodblog.example.com/recipe-1')).toBe(
      'myfoodblog.example.com'
    );

    const tiktokRecipe = makeTestRecipe({
      id: 'tiktok-test',
      name: 'มาม่าต้มยำชีส',
      external_recipe_url: 'https://www.tiktok.com/@chef/video/123',
      external_source_name: null,
    });
    const resolved = getExternalRecipeLinks(tiktokRecipe);
    expect(resolved.primaryUrl).toBe('https://www.tiktok.com/@chef/video/123');
    expect(resolved.primarySourceName).toBe('TikTok');

    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('recent revealed dishes across rounds', () => {
  it('avoids five recent dishes when enough eligible alternatives exist', () => {
    const recent = TEST_POOL.slice(0,5).map(recipe=>recipe.id);
    const round = createRouletteRound({candidates:TEST_POOL,requestedCardCount:3,recentRevealedRecipeIds:recent,rng:()=>0});
    expect(round.cards).toHaveLength(3);
    expect(round.cards.every(card=>!recent.includes(card.recipe.id))).toBe(true);
  });
  it('fills a small pool without duplicates and never bypasses restrictions', () => {
    const recent=TEST_POOL.map(recipe=>recipe.id);
    const round=createRouletteRound({candidates:TEST_POOL.slice(0,2),requestedCardCount:7,recentRevealedRecipeIds:recent,rng:()=>0});
    expect(round.cards).toHaveLength(2);
    expect(new Set(round.cards.map(card=>card.recipe.id)).size).toBe(2);
    const rejected=createRouletteRound({candidates:TEST_POOL,requestedCardCount:3,recentRevealedRecipeIds:recent,restrictions:{...DEFAULT_USER_RESTRICTIONS,avoidedIngredients:['jasmine_rice']}});
    expect(rejected.cards).toHaveLength(0);
  });
});

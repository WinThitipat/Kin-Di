'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  ChefHat,
  Clock,
  ExternalLink,
  Filter,
  Heart,
  History,
  Layers,
  PlusCircle,
  Refrigerator,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import { useKinDiApp } from '@/components/AppShell';
import { RecipeImage } from '@/components/RecipeImage';
import {
  DEFAULT_ROULETTE_FILTERS,
  getEligibleRouletteRecipes,
  isRecipeSafeForUser,
} from '@/features/food-safety/eligibility';
import { FoodRouletteModal } from '@/features/roulette/components/FoodRouletteModal';
import {
  completeCardFlipInRound,
  createRouletteRound,
  getRevealedRecipeFromRound,
  selectCardInRound,
} from '@/features/roulette/roulette-engine';
import { getExternalRecipeLinks } from '@/lib/external-recipes';
import { fetchApprovedRecipes } from '@/lib/recipes-repository';
import {
  clearRouletteHistory,
  getMergedIngredientsCatalog,
  loadRouletteHistory,
  recordRouletteRevealHistory,
} from '@/lib/user-storage';
import {
  ALLERGEN_LABELS,
  CardCountOption,
  DIETARY_PREFERENCE_LABELS,
  DIFFICULTY_LABELS,
  FOOD_CATEGORY_LABELS,
  FoodCategory,
  MEAL_TYPE_LABELS,
  MealType,
  Recipe,
  RouletteHistoryEntry,
  RouletteQuickFilters,
  RouletteRoundState,
} from '@/types/recipe';

const COOKING_TIME_PRESETS: { value: number | null; label: string }[] = [
  { value: null, label: 'ไม่จำกัดเวลา' },
  { value: 10, label: 'ไม่เกิน 10 นาที' },
  { value: 15, label: 'ไม่เกิน 15 นาที' },
  { value: 30, label: 'ไม่เกิน 30 นาที' },
];

const CARD_COUNT_OPTIONS: CardCountOption[] = [3, 5, 7];

export function FoodRoulettePage() {
  const { restrictions, openRestrictionsModal, favoriteIds, toggleFavorite } = useKinDiApp();

  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [filters, setFilters] = useState<RouletteQuickFilters>(DEFAULT_ROULETTE_FILTERS);
  const [cardCount, setCardCount] = useState<CardCountOption>(5);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [round, setRound] = useState<RouletteRoundState | null>(null);
  const [history, setHistory] = useState<RouletteHistoryEntry[]>([]);

  // "รวมเมนูทั้งหมด" (Browse & Search All Recipes) state
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<FoodCategory | 'all'>('all');

  const loadCandidates = useCallback(async () => {
    setIsLoadingRecipes(true);
    setLoadError(null);
    const result = await fetchApprovedRecipes();
    if (result.error) {
      setLoadError(result.error);
      setAllRecipes([]);
    } else {
      setAllRecipes(result.recipes);
    }
    setIsLoadingRecipes(false);
    return result;
  }, []);

  useEffect(() => {
    loadCandidates();
    setHistory(loadRouletteHistory());

    const handleRecipesUpdated = () => {
      loadCandidates();
    };
    window.addEventListener('kindi-recipes-updated', handleRecipesUpdated);
    return () => {
      window.removeEventListener('kindi-recipes-updated', handleRecipesUpdated);
    };
  }, [loadCandidates]);

  const catalog = useMemo(() => getMergedIngredientsCatalog(), [allRecipes]);

  // Compute current eligible pool count for the main page preview
  const eligiblePreview = useMemo(() => {
    return getEligibleRouletteRecipes(allRecipes, restrictions, filters, catalog);
  }, [allRecipes, restrictions, filters, catalog]);

  // Compute filtered list for "รวมเมนูทั้งหมด" (Browse & Search All Recipes)
  const browsableRecipes = useMemo(() => {
    const safeRecipes = allRecipes.filter((r) => isRecipeSafeForUser(r, restrictions, catalog));
    const q = catalogSearchQuery.trim().toLowerCase();

    return safeRecipes.filter((recipe) => {
      if (catalogCategoryFilter !== 'all' && recipe.category !== catalogCategoryFilter) {
        return false;
      }
      if (!q) return true;
      const inName = recipe.name.toLowerCase().includes(q);
      const inDesc = (recipe.description ?? '').toLowerCase().includes(q);
      const inCustomIng = (recipe.custom_ingredients ?? []).some((c) =>
        c.toLowerCase().includes(q)
      );
      const inCatalogIng = (recipe.ingredients ?? []).some((ing) => {
        const nameTh = catalog[ing.ingredient_id]?.name_th ?? '';
        return nameTh.toLowerCase().includes(q);
      });
      return inName || inDesc || inCustomIng || inCatalogIng;
    });
  }, [allRecipes, restrictions, catalog, catalogSearchQuery, catalogCategoryFilter]);

  const hasOptionalFilters =
    filters.mealType !== 'all' ||
    filters.category !== 'all' ||
    filters.maxCookingTime !== null;

  // Start or regenerate a round
  const generateNewRound = useCallback(
    (
      requestedCount: CardCountOption,
      candidatesPool: Recipe[],
      activeFilters: RouletteQuickFilters,
      prevRound: RouletteRoundState | null
    ) => {
      const prevRevealed = getRevealedRecipeFromRound(prevRound);
      const prevRoundIds = prevRound ? prevRound.cards.map((c) => c.recipe.id) : [];

      const nextRound = createRouletteRound({
        candidates: candidatesPool,
        requestedCardCount: requestedCount,
        restrictions,
        filters: activeFilters,
        previousRevealedRecipeId: prevRevealed?.id ?? null,
        previousRoundRecipeIds: prevRoundIds,
        catalog,
      });

      setRound(nextRound);
    },
    [restrictions, catalog]
  );

  // Open modal and deal mystery cards
  const handleOpenRouletteModal = async () => {
    setIsModalOpen(true);
    if (allRecipes.length === 0 && !loadError) {
      const res = await loadCandidates();
      if (!res.error) {
        generateNewRound(cardCount, res.recipes, filters, round);
      }
    } else {
      generateNewRound(cardCount, allRecipes, filters, round);
    }
  };

  // Change card count before revealing a card -> immediately regenerate round with new count
  const handleChangeCardCount = (nextCount: CardCountOption) => {
    setCardCount(nextCount);
    if (isModalOpen && (!round || !round.selectedCardId)) {
      generateNewRound(nextCount, allRecipes, filters, round);
    }
  };

  // Select a mystery card
  const handleSelectCard = (cardId: string) => {
    setRound((prev) => {
      if (!prev) return prev;
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

      return selectCardInRound(prev, cardId, { immediateReveal: prefersReducedMotion });
    });
  };

  // Complete flip animation and record revealed recipe in history
  const handleFlipComplete = useCallback(() => {
    setRound((prev) => {
      if (!prev || !prev.selectedCardId) return prev;
      return completeCardFlipInRound(prev);
    });
  }, []);

  // Record history ONLY when `round.isRevealed` becomes true
  useEffect(() => {
    if (!round || !round.isRevealed || !round.selectedCardId) return;
    const revealed = getRevealedRecipeFromRound(round);
    if (!revealed) return;

    const updatedHistory = recordRouletteRevealHistory({
      roundId: round.roundId,
      recipeId: revealed.id,
      recipeName: revealed.name,
      category: revealed.category,
      cookingTime: revealed.cooking_time,
      revealedAt: new Date().toISOString(),
    });
    setHistory(updatedHistory);
  }, [round]);

  const handleStartNewRoundInModal = () => {
    generateNewRound(cardCount, allRecipes, filters, round);
  };

  const handleResetOptionalFilters = () => {
    const cleanFilters = DEFAULT_ROULETTE_FILTERS;
    setFilters(cleanFilters);
    if (isModalOpen) {
      generateNewRound(cardCount, allRecipes, cleanFilters, round);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const favoriteRecipes = useMemo(() => {
    return allRecipes.filter((r) => favoriteIds.includes(r.id));
  }, [allRecipes, favoriteIds]);

  const activeRestrictionBadges: string[] = [];
  if (restrictions.dietaryPreference !== 'unrestricted') {
    activeRestrictionBadges.push(DIETARY_PREFERENCE_LABELS[restrictions.dietaryPreference].label);
  }
  for (const alg of restrictions.allergens) {
    activeRestrictionBadges.push(`แพ้: ${ALLERGEN_LABELS[alg].label.split(' ')[0]}`);
  }
  for (const customAlg of restrictions.customAllergens ?? []) {
    activeRestrictionBadges.push(`แพ้: ${customAlg}`);
  }
  for (const ingId of restrictions.avoidedIngredients) {
    const name = catalog[ingId]?.name_th ?? ingId;
    activeRestrictionBadges.push(`เลี่ยง: ${name}`);
  }
  for (const customAvoid of restrictions.customAvoidedTerms ?? []) {
    activeRestrictionBadges.push(`เลี่ยง: ${customAvoid}`);
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ASYMMETRIC BENTO HERO GRID (7 cols Editorial + 5 cols Tactile Card Stage) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Bento Card: Editorial Intro & Primary Actions */}
        <div className="lg:col-span-7 kindi-surface-card p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Top Status & Mode Row */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FEF9C3] border border-[#EAE5D9] text-[#141413] text-xs font-extrabold">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>สุ่มไพ่เมนูอาหาร</span>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F2EA] border border-[#EAE5D9] text-xs font-bold text-[#57534E] tabular-nums">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                <span>
                  พร้อมสุ่ม{' '}
                  <strong className="font-extrabold text-[#141413]">
                    {isLoadingRecipes ? '...' : `${eligiblePreview.length} เมนู`}
                  </strong>
                </span>
              </span>
            </div>

            <h1 className="text-[clamp(2rem,1.5rem+2.2vw,3.1rem)] font-extrabold text-[#141413] tracking-tight leading-[1.12]">
              คิดไม่ออก ก็สุ่มดิ!
            </h1>

            <p className="text-sm sm:text-base text-[#57534E] font-medium max-w-xl leading-relaxed">
              เปิดไพ่ปริศนา 1 ใบให้ช่วยตัดสินใจมื้อนี้ ระบบคัดเฉพาะเมนูที่ปลอดภัยและตรงกับสิ่งที่คุณกินได้ไว้ให้แล้ว
            </p>

            {/* Primary CTA & Secondary Mode Links */}
            <div className="pt-1 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleOpenRouletteModal}
                className="kindi-btn-primary min-h-12 inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl font-extrabold text-sm sm:text-base cursor-pointer"
              >
                <Sparkles className="w-5 h-5" aria-hidden="true" />
                <span>เปิดไพ่สุ่มเมนู</span>
              </button>

              <Link
                href="/fridge"
                className="kindi-btn-secondary min-h-12 inline-flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm"
              >
                <Refrigerator className="w-4 h-4 text-[#57534E]" aria-hidden="true" />
                <span>มีอะไรในตู้ ก็กินดิ!</span>
              </Link>

              <Link
                href="/community"
                className="kindi-btn-secondary min-h-12 inline-flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm"
              >
                <PlusCircle className="w-4 h-4 text-[#57534E]" aria-hidden="true" />
                <span>เพิ่มเมนูอาหาร</span>
              </Link>
            </div>
          </div>

          {/* Dietary Restriction Status Footer inside Hero Bento */}
          <div className="pt-4 border-t border-[#EAE5D9] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#57534E]">
              <span className="font-semibold">
                {activeRestrictionBadges.length > 0
                  ? `กรองตามข้อจำกัดทางอาหารของคุณอยู่ (${activeRestrictionBadges.length} รายการ)`
                  : 'ยังไม่ได้ระบุอาหารที่แพ้หรือเลี่ยง (แสดงทุกเมนู)'}
              </span>
              <button
                type="button"
                onClick={openRestrictionsModal}
                className="font-bold text-[#141413] underline underline-offset-4 hover:text-[#57534E] cursor-pointer"
              >
                แก้ไขข้อจำกัดทางอาหาร
              </button>
            </div>

            {activeRestrictionBadges.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeRestrictionBadges.map((badge, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-[#F5F2EA] border border-[#EAE5D9] text-xs font-bold text-[#141413]"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Bento Card: Tactile Mystery Card Stage & Deck Count Switcher */}
        <div className="lg:col-span-5 kindi-stage-surface p-6 sm:p-7 flex flex-col justify-between gap-5">
          {/* Stage Top Bar: Label + Inline Deck Size Switcher */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FCFBF7]/80">
              <Layers className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
              <span>ขนาดสำรับไพ่</span>
            </div>

            <div
              role="group"
              aria-label="เลือกจำนวนไพ่ก่อนสุ่ม"
              className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/8 border border-white/10"
            >
              {CARD_COUNT_OPTIONS.map((count) => {
                const active = cardCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => handleChangeCardCount(count)}
                    aria-pressed={active}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold tabular-nums transition-all cursor-pointer ${
                      active
                        ? 'bg-[#FACC15] text-[#141413]'
                        : 'text-[#FCFBF7]/75 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {count} ใบ
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center Interactive 3-Card Fan */}
          <div className="my-auto py-2 flex justify-center">
            <button
              type="button"
              onClick={handleOpenRouletteModal}
              aria-label={`เปิดสำรับไพ่ปริศนา ${cardCount} ใบ`}
              className="relative w-40 sm:w-44 aspect-[3/4] cursor-pointer group select-none text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FACC15] rounded-2xl"
            >
              {/* Left Fanned Card */}
              <div className="absolute inset-0 rounded-2xl bg-[#292826] border border-white/15 rotate-[-8deg] translate-x-[-16px] translate-y-[6px] transition-transform duration-200 group-hover:rotate-[-13deg] group-hover:translate-x-[-22px]" />
              {/* Right Fanned Card */}
              <div className="absolute inset-0 rounded-2xl bg-[#292826] border border-white/15 rotate-[8deg] translate-x-[16px] translate-y-[6px] transition-transform duration-200 group-hover:rotate-[13deg] group-hover:translate-x-[22px]" />
              {/* Center Active Mystery Card */}
              <div className="relative w-full h-full rounded-2xl bg-[#141413] text-[#FCFBF7] border border-[#FACC15]/45 shadow-[0_14px_30px_rgba(0,0,0,0.45)] p-2.5 flex flex-col justify-between transition-transform duration-200 group-hover:-translate-y-1.5">
                <div className="w-full h-full rounded-xl border border-[#FACC15]/20 p-3 flex flex-col items-center justify-center text-center">
                  <div className="w-11 h-11 rounded-2xl bg-[#FACC15] text-[#141413] flex items-center justify-center mb-2.5 shadow-xs group-hover:scale-105 transition-transform">
                    <UtensilsCrossed className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-extrabold text-[#FACC15] tracking-tight">
                    ไพ่ปริศนามื้อนี้
                  </span>
                  <span className="text-[11px] text-[#FCFBF7]/75 mt-1 tabular-nums">
                    แตะเพื่อสับไพ่ {cardCount} ใบ
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Stage Footer Caption */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10 text-xs text-[#FCFBF7]/70">
            <span>สุ่มแบบไม่ซ้ำเมนูเดิมในรอบก่อน</span>
            <button
              type="button"
              onClick={handleOpenRouletteModal}
              className="font-bold text-[#FACC15] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>สับไพ่เลย</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* COMPACT BENTO FILTER DOCK ("ตัวกรองด่วนก่อนเปิดไพ่") */}
      <section
        aria-labelledby="quick-filters-heading"
        className="kindi-surface-card p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE5D9] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FEF9C3] border border-[#EAE5D9] flex items-center justify-center">
              <Filter className="w-4 h-4 text-[#141413]" aria-hidden="true" />
            </div>
            <div>
              <h2 id="quick-filters-heading" className="text-sm sm:text-base font-extrabold text-[#141413]">
                ตัวกรองด่วนก่อนเปิดไพ่
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {hasOptionalFilters && (
              <button
                type="button"
                onClick={handleResetOptionalFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F2EA] text-xs font-bold text-[#141413] hover:bg-[#EAE5D9] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ล้างตัวกรองด่วน</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Meal Type Filter */}
          <div className="p-3.5 rounded-2xl bg-[#FCFBF7] border border-[#EAE5D9] space-y-2">
            <span className="block text-xs font-extrabold text-[#57534E]">
              มื้ออาหาร
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, mealType: 'all' }))}
                aria-pressed={filters.mealType === 'all'}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  filters.mealType === 'all'
                    ? 'bg-[#141413] text-[#FACC15] border-[#141413]'
                    : 'bg-white text-[#141413] border-[#EAE5D9] hover:border-[#D8D1C2]'
                }`}
              >
                ทุกมื้อ
              </button>
              {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map((mt) => (
                <button
                  key={mt}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, mealType: mt }))}
                  aria-pressed={filters.mealType === mt}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    filters.mealType === mt
                      ? 'bg-[#141413] text-[#FACC15] border-[#141413]'
                      : 'bg-white text-[#141413] border-[#EAE5D9] hover:border-[#D8D1C2]'
                  }`}
                >
                  {MEAL_TYPE_LABELS[mt]}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Food Category Filter */}
          <div className="p-3.5 rounded-2xl bg-[#FCFBF7] border border-[#EAE5D9] space-y-2">
            <span className="block text-xs font-extrabold text-[#57534E]">
              หมวดหมู่อาหาร
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, category: 'all' }))}
                aria-pressed={filters.category === 'all'}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  filters.category === 'all'
                    ? 'bg-[#141413] text-[#FACC15] border-[#141413]'
                    : 'bg-white text-[#141413] border-[#EAE5D9] hover:border-[#D8D1C2]'
                }`}
              >
                ทุกหมวดหมู่
              </button>
              {(Object.keys(FOOD_CATEGORY_LABELS) as FoodCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, category: cat }))}
                  aria-pressed={filters.category === cat}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    filters.category === cat
                      ? 'bg-[#141413] text-[#FACC15] border-[#141413]'
                      : 'bg-white text-[#141413] border-[#EAE5D9] hover:border-[#D8D1C2]'
                  }`}
                >
                  {FOOD_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Cooking Time Limit Filter */}
          <div className="p-3.5 rounded-2xl bg-[#FCFBF7] border border-[#EAE5D9] space-y-2">
            <span className="block text-xs font-extrabold text-[#57534E]">
              เวลาในการทำอาหาร
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COOKING_TIME_PRESETS.map((preset) => {
                const isSelected = filters.maxCookingTime === preset.value;
                return (
                  <button
                    key={String(preset.value)}
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, maxCookingTime: preset.value }))
                    }
                    aria-pressed={isSelected}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#141413] text-[#FACC15] border-[#141413]'
                        : 'bg-white text-[#141413] border-[#EAE5D9] hover:border-[#D8D1C2]'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* "รวมเมนูทั้งหมด" (BROWSE & SEARCH ALL RECIPES SECTION) */}
      <section
        aria-labelledby="browse-all-recipes-heading"
        className="kindi-surface-card p-5 sm:p-7 space-y-5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EAE5D9] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FEF9C3] border border-[#EAE5D9] flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-[#141413]" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="browse-all-recipes-heading"
                className="text-lg sm:text-xl font-extrabold text-[#141413] tabular-nums"
              >
                รวมเมนูทั้งหมด ({browsableRecipes.length} เมนู)
              </h2>
              <p className="text-xs text-[#57534E]">
                ค้นหาเมนูที่อยากกิน หรือกดเปิดดูวิธีทำจากเว็บต้นทางได้ทันที
              </p>
            </div>
          </div>

          {/* Semantic <search> Landmark */}
          <search className="w-full md:w-72">
            <div className="relative kindi-input-group">
              <input
                type="search"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={catalogSearchQuery}
                onChange={(e) => setCatalogSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อเมนู หรือวัตถุดิบ..."
                aria-label="ค้นหาเมนูอาหาร"
                className="kindi-input-field w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm font-medium"
              />
              <Search
                className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
            </div>
          </search>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCatalogCategoryFilter('all')}
            aria-pressed={catalogCategoryFilter === 'all'}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              catalogCategoryFilter === 'all'
                ? 'bg-[#141413] text-[#FACC15] border-[#141413]'
                : 'bg-[#FCFBF7] text-[#141413] border-[#EAE5D9] hover:border-[#D8D1C2]'
            }`}
          >
            ทั้งหมด
          </button>
          {(Object.keys(FOOD_CATEGORY_LABELS) as FoodCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCatalogCategoryFilter(cat)}
              aria-pressed={catalogCategoryFilter === cat}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                catalogCategoryFilter === cat
                  ? 'bg-[#141413] text-[#FACC15] border-[#141413]'
                  : 'bg-[#FCFBF7] text-[#141413] border-[#EAE5D9] hover:border-[#D8D1C2]'
              }`}
            >
              {FOOD_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {browsableRecipes.length === 0 ? (
          <div className="p-8 sm:p-10 rounded-2xl bg-[#FCFBF7] border border-dashed border-[#D8D1C2] text-center space-y-3">
            <p className="text-base font-extrabold text-[#141413]">
              {allRecipes.length === 0
                ? 'ยังไม่มีเมนูอาหารในระบบ มาเพิ่มเมนูอาหารจานแรกกัน!'
                : 'ไม่พบเมนูที่ตรงกับคำค้นหาหรือข้อจำกัดทางอาหารของคุณ'}
            </p>
            <p className="text-xs sm:text-sm text-[#57534E] max-w-md mx-auto">
              คุณสามารถเพิ่มเมนูโปรดพร้อมแปะลิงก์สูตรจากเว็บไหนก็ได้ที่หน้า &ldquo;เพิ่มเมนูอาหาร&rdquo;
            </p>
            <div className="pt-1">
              <Link
                href="/community"
                className="kindi-btn-primary min-h-11 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm"
              >
                <PlusCircle className="w-4 h-4" aria-hidden="true" />
                <span>ไปหน้าเพิ่มเมนูอาหาร</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {browsableRecipes.map((recipe) => {
              const ext = getExternalRecipeLinks(recipe);
              const isFav = favoriteIds.includes(recipe.id);
              return (
                <div
                  key={recipe.id}
                  className="kindi-recipe-card overflow-hidden flex flex-col justify-between"
                >
                  <div className="relative h-44 w-full bg-[#F5F2EA] border-b border-[#EAE5D9]">
                    <RecipeImage
                      src={recipe.image_url}
                      alt={recipe.name}
                      category={recipe.category}
                      className="w-full h-full"
                    />
                    <button
                      type="button"
                      onClick={() => toggleFavorite(recipe.id)}
                      aria-label={isFav ? 'ลบออกจากเมนูโปรด' : 'บันทึกเป็นเมนูโปรด'}
                      aria-pressed={isFav}
                      className={`absolute top-3 right-3 w-9 h-9 rounded-xl border border-[#EAE5D9] shadow-xs flex items-center justify-center transition-colors cursor-pointer ${
                        isFav ? 'bg-rose-50 text-rose-600' : 'bg-white/95 text-[#141413] hover:bg-white'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${isFav ? 'fill-current text-rose-600' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#FEF9C3] border border-[#EAE5D9] text-[#141413]">
                          {FOOD_CATEGORY_LABELS[recipe.category]}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#57534E] tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-[#141413]" aria-hidden="true" />
                          {recipe.cooking_time} นาที
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-[#141413] line-clamp-1 pt-0.5">
                        {recipe.name}
                      </h3>
                      <p className="text-xs text-[#57534E] line-clamp-2 leading-relaxed">
                        {recipe.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#EAE5D9] flex items-center justify-between gap-2">
                      <a
                        href={ext.primaryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="kindi-btn-primary flex-1 min-h-10 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                      >
                        <span>ลิงก์สูตรอาหาร</span>
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                      </a>
                      <Link
                        href={`/recipes/${encodeURIComponent(recipe.id)}`}
                        className="kindi-btn-secondary min-h-10 inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-bold"
                      >
                        ส่วนผสม
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* RECENT REVEALED RESULTS & FAVORITES */}
      {(history.length > 0 || favoriteRecipes.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent History */}
          {history.length > 0 && (
            <section
              aria-labelledby="recent-roulette-heading"
              className="kindi-surface-card p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-[#141413]" aria-hidden="true" />
                  <h2 id="recent-roulette-heading" className="text-base font-extrabold text-[#141413]">
                    เมนูที่เปิดไพ่ได้ล่าสุด
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearRouletteHistory();
                    setHistory([]);
                  }}
                  className="text-xs font-bold text-[#57534E] hover:text-[#141413] underline cursor-pointer"
                >
                  ล้างประวัติ
                </button>
              </div>

              <div className="space-y-2.5">
                {history.slice(0, 4).map((item) => (
                  <Link
                    key={item.roundId}
                    href={`/recipes/${encodeURIComponent(item.recipeId)}`}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#FCFBF7] border border-[#EAE5D9] hover:border-[#D8D1C2] transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-extrabold text-[#141413] group-hover:underline">
                        {item.recipeName}
                      </p>
                      <span className="text-xs text-[#57534E] tabular-nums">
                        {FOOD_CATEGORY_LABELS[item.category]}
                        {item.cookingTime ? ` · ${item.cookingTime} นาที` : ''}
                      </span>
                    </div>
                    <ArrowRight
                      className="w-4 h-4 text-[#141413] shrink-0 group-hover:translate-x-0.5 transition-transform"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Favorites */}
          {favoriteRecipes.length > 0 && (
            <section
              aria-labelledby="favorites-heading"
              className="kindi-surface-card p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-600 fill-current" aria-hidden="true" />
                <h2 id="favorites-heading" className="text-base font-extrabold text-[#141413] tabular-nums">
                  เมนูโปรดที่บันทึกไว้ ({favoriteRecipes.length})
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {favoriteRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="kindi-recipe-card overflow-hidden flex flex-col justify-between"
                  >
                    <div className="h-28 w-full relative bg-[#F5F2EA]">
                      <RecipeImage
                        src={recipe.image_url}
                        alt={recipe.name}
                        category={recipe.category}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="p-3.5 space-y-1.5">
                      <Link
                        href={`/recipes/${encodeURIComponent(recipe.id)}`}
                        className="text-sm font-extrabold text-[#141413] hover:underline line-clamp-1 block"
                      >
                        {recipe.name}
                      </Link>
                      <div className="flex items-center justify-between text-xs font-medium text-[#57534E] tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                          {recipe.cooking_time} นาที
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ChefHat className="w-3.5 h-3.5" aria-hidden="true" />
                          {DIFFICULTY_LABELS[recipe.difficulty]}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* FOOD ROULETTE MODAL */}
      <FoodRouletteModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        round={round}
        cardCount={cardCount}
        onChangeCardCount={handleChangeCardCount}
        onSelectCard={handleSelectCard}
        onFlipComplete={handleFlipComplete}
        onStartNewRound={handleStartNewRoundInModal}
        isLoading={isLoadingRecipes}
        error={loadError}
        onRetryLoad={loadCandidates}
        hasOptionalFilters={hasOptionalFilters}
        onResetOptionalFilters={handleResetOptionalFilters}
        favoriteIds={favoriteIds}
        onToggleFavorite={toggleFavorite}
      />
    </div>
  );
}

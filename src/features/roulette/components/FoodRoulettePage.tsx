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
  Refrigerator,
  RotateCcw,
  Search,
  Share2,
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
  { value: 10, label: 'ด่วนจี๋ (≤ 10 นาที)' },
  { value: 15, label: 'กำลังไว (≤ 15 นาที)' },
  { value: 30, label: 'ทำชิลๆ (≤ 30 นาที)' },
];

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
    <div className="space-y-8 sm:space-y-10">
      {/* HERO SECTION */}
      <section className="relative rounded-3xl bg-[#F8D84A] border-2 border-[#171717] shadow-[6px_6px_0px_#171717] p-6 sm:p-10 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#171717] text-[#F8D84A] text-xs font-extrabold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>กินดิ! — KIN DI · FOOD ROULETTE</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#171717] tracking-tight leading-tight">
              คิดไม่ออก ก็สุ่มดิ!
            </h1>

            <p className="text-base sm:text-lg text-[#171717]/90 font-semibold max-w-xl leading-relaxed">
              เลือกไพ่ แล้วมาดูกันว่ามื้อนี้จะได้กินอะไร — หยุดเสียเวลาไถจอนานๆ
              แล้วให้ไพ่ปริศนาคัดเมนูที่ปลอดภัยและตรงใจมาเสิร์ฟถึงที่
            </p>

            {/* Primary CTA & Secondary Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleOpenRouletteModal}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-[#171717] text-[#F8D84A] font-extrabold text-base sm:text-lg border-2 border-[#171717] shadow-[4px_4px_0px_#FFF9EC] hover:translate-y-[-2px] active:translate-y-[0px] transition-transform cursor-pointer"
              >
                <Sparkles className="w-5 h-5" aria-hidden="true" />
                <span>เปิดไพ่สุ่มเมนู</span>
              </button>

              <Link
                href="/fridge"
                className="inline-flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-white text-[#171717] border-2 border-[#171717] shadow-[3px_3px_0px_#171717] font-bold text-sm hover:bg-[#FFF9EC] transition-colors"
              >
                <Refrigerator className="w-4 h-4" aria-hidden="true" />
                <span>มีอะไรในตู้ ก็กินดิ!</span>
              </Link>

              <Link
                href="/community"
                className="inline-flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-[#FFF9EC] text-[#171717] border-2 border-[#171717] shadow-[3px_3px_0px_#171717] font-bold text-sm hover:bg-white transition-colors"
              >
                <Share2 className="w-4 h-4" aria-hidden="true" />
                <span>เพิ่มเมนูอาหาร</span>
              </Link>
            </div>

            {/* Automatic Dietary Restrictions Notice */}
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm font-bold text-[#171717]">
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                ข้อจำกัดทางอาหารที่บันทึกไว้จะถูกนำไปใช้กรองเมนูอัตโนมัติ (พร้อมสุ่ม{' '}
                {isLoadingRecipes ? '...' : `${eligiblePreview.length} เมนู`})
              </span>
              <button
                type="button"
                onClick={openRestrictionsModal}
                className="underline decoration-2 underline-offset-2 font-extrabold hover:text-[#171717]/75 cursor-pointer"
              >
                ตั้งค่าข้อจำกัดทางอาหาร
              </button>
            </div>

            {activeRestrictionBadges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeRestrictionBadges.map((badge, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-white/90 border border-[#171717] text-xs font-extrabold text-[#171717]"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Decorative Mystery Card Stack Preview on Hero */}
          <div className="lg:col-span-4 flex justify-center">
            <div
              onClick={handleOpenRouletteModal}
              role="presentation"
              className="relative w-44 sm:w-48 aspect-[3/4] cursor-pointer group select-none"
            >
              <div className="absolute inset-0 rounded-2xl bg-white border-2 border-[#171717] rotate-[-6deg] translate-x-[-10px] translate-y-[4px] transition-transform group-hover:rotate-[-10deg]" />
              <div className="absolute inset-0 rounded-2xl bg-[#EAE5DA] border-2 border-[#171717] rotate-[5deg] translate-x-[10px] translate-y-[2px] transition-transform group-hover:rotate-[9deg]" />
              <div className="relative w-full h-full rounded-2xl bg-[#171717] text-[#FFF9EC] border-2 border-[#171717] shadow-[4px_4px_0px_#171717] p-3 flex flex-col justify-between">
                <div className="w-full h-full rounded-xl border border-[#F8D84A]/40 p-3 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#F8D84A] text-[#171717] flex items-center justify-center mb-2.5 shadow-md">
                    <UtensilsCrossed className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-extrabold text-[#F8D84A]">ไพ่ปริศนามื้อนี้</span>
                  <span className="text-[11px] text-[#FFF9EC]/80 mt-1">
                    กดเพื่อสับไพ่ {cardCount} ใบ
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OPTIONAL QUICK FILTERS SECTION (Without Budget) */}
      <section
        aria-labelledby="quick-filters-heading"
        className="rounded-3xl bg-white border-2 border-[#171717] shadow-[4px_4px_0px_#171717] p-5 sm:p-7 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE5DA] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F8D84A] border-2 border-[#171717] flex items-center justify-center">
              <Filter className="w-4 h-4 text-[#171717]" aria-hidden="true" />
            </div>
            <div>
              <h2 id="quick-filters-heading" className="text-base sm:text-lg font-extrabold">
                ตัวกรองด่วนก่อนเปิดไพ่ (ไม่บังคับ)
              </h2>
              <p className="text-xs text-[#77736B]">
                ข้ามไปกด &ldquo;เปิดไพ่สุ่มเมนู&rdquo; ได้เลย หรือเลือกมื้ออาหาร หมวดหมู่ และเวลาทำก่อนก็ได้
              </p>
            </div>
          </div>

          {hasOptionalFilters && (
            <button
              type="button"
              onClick={handleResetOptionalFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EAE5DA] text-xs font-extrabold text-[#171717] hover:bg-[#F8D84A] border border-[#171717] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>ล้างตัวกรองด่วน</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Meal Type Filter */}
          <div>
            <label className="block text-xs sm:text-sm font-extrabold text-[#171717] mb-2">
              มื้ออาหาร
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, mealType: 'all' }))}
                aria-pressed={filters.mealType === 'all'}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-colors cursor-pointer ${
                  filters.mealType === 'all'
                    ? 'bg-[#171717] text-[#F8D84A] border-[#171717]'
                    : 'bg-[#FFF9EC] text-[#171717] border-[#171717]/25 hover:border-[#171717]'
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-colors cursor-pointer ${
                    filters.mealType === mt
                      ? 'bg-[#171717] text-[#F8D84A] border-[#171717]'
                      : 'bg-[#FFF9EC] text-[#171717] border-[#171717]/25 hover:border-[#171717]'
                  }`}
                >
                  {MEAL_TYPE_LABELS[mt]}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Food Category Filter */}
          <div>
            <label className="block text-xs sm:text-sm font-extrabold text-[#171717] mb-2">
              หมวดหมู่อาหาร
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, category: 'all' }))}
                aria-pressed={filters.category === 'all'}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-colors cursor-pointer ${
                  filters.category === 'all'
                    ? 'bg-[#171717] text-[#F8D84A] border-[#171717]'
                    : 'bg-[#FFF9EC] text-[#171717] border-[#171717]/25 hover:border-[#171717]'
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-colors cursor-pointer ${
                    filters.category === cat
                      ? 'bg-[#171717] text-[#F8D84A] border-[#171717]'
                      : 'bg-[#FFF9EC] text-[#171717] border-[#171717]/25 hover:border-[#171717]'
                  }`}
                >
                  {FOOD_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Cooking Time Limit Filter */}
          <div>
            <label className="block text-xs sm:text-sm font-extrabold text-[#171717] mb-2">
              เวลาในการทำอาหาร
            </label>
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#171717] text-[#F8D84A] border-[#171717]'
                        : 'bg-[#FFF9EC] text-[#171717] border-[#171717]/25 hover:border-[#171717]'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Filter Summary Bar */}
        <div className="pt-3 border-t border-[#EAE5DA] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs sm:text-sm font-bold text-[#171717]">
            เมนูที่ผ่านข้อจำกัดทางอาหารพร้อมเข้าสำรับไพ่:{' '}
            <span className="px-2 py-0.5 rounded-lg bg-[#F8D84A] border border-[#171717] font-extrabold">
              {isLoadingRecipes ? 'กำลังคำนวณ...' : `${eligiblePreview.length} เมนู`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenRouletteModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F8D84A] text-[#171717] border-2 border-[#171717] shadow-[2px_2px_0px_#171717] font-extrabold text-xs sm:text-sm hover:bg-[#F2CC22] cursor-pointer"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>เปิดไพ่สุ่มเมนูเลย!</span>
          </button>
        </div>
      </section>

      {/* "รวมเมนูทั้งหมด" (BROWSE & SEARCH ALL RECIPES SECTION) */}
      <section
        aria-labelledby="browse-all-recipes-heading"
        className="rounded-3xl bg-white border-2 border-[#171717] shadow-[4px_4px_0px_#171717] p-5 sm:p-7 space-y-5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EAE5DA] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#F8D84A] border-2 border-[#171717] flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-[#171717]" aria-hidden="true" />
            </div>
            <div>
              <h2 id="browse-all-recipes-heading" className="text-lg sm:text-xl font-extrabold">
                รวมเมนูทั้งหมด ({browsableRecipes.length} เมนู)
              </h2>
              <p className="text-xs text-[#77736B]">
                ค้นหาและเลือกดูสูตรอาหารทั้งหมดที่ผ่านข้อจำกัดทางอาหารของคุณ หรือกดดูสูตรจากเว็บต้นทางได้ทันที
              </p>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <input
              type="search"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={catalogSearchQuery}
              onChange={(e) => setCatalogSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อเมนู หรือวัตถุดิบ..."
              aria-label="ค้นหาเมนูอาหาร"
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#FFF9EC] border-2 border-[#171717] text-xs sm:text-sm font-semibold focus:outline-none"
            />
            <Search
              className="w-4 h-4 text-[#77736B] absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCatalogCategoryFilter('all')}
            aria-pressed={catalogCategoryFilter === 'all'}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 cursor-pointer ${
              catalogCategoryFilter === 'all'
                ? 'bg-[#171717] text-[#F8D84A] border-[#171717]'
                : 'bg-[#FFF9EC] text-[#171717] border-[#171717]/25 hover:border-[#171717]'
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 cursor-pointer ${
                catalogCategoryFilter === cat
                  ? 'bg-[#171717] text-[#F8D84A] border-[#171717]'
                  : 'bg-[#FFF9EC] text-[#171717] border-[#171717]/25 hover:border-[#171717]'
              }`}
            >
              {FOOD_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {browsableRecipes.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#FFF9EC] border-2 border-dashed border-[#171717]/30 text-center space-y-3">
            <p className="text-base font-extrabold text-[#171717]">
              {allRecipes.length === 0
                ? 'ยังไม่มีเมนูอาหารในระบบ มาเพิ่มเมนูอาหารจานแรกกัน!'
                : 'ไม่พบเมนูที่ตรงกับคำค้นหาหรือข้อจำกัดทางอาหารของคุณ'}
            </p>
            <p className="text-xs sm:text-sm text-[#77736B] max-w-md mx-auto">
              คุณสามารถเพิ่มเมนูใหม่พร้อมลิงก์สูตรอาหารไม่จำกัดค่ายได้ที่หน้า &ldquo;เพิ่มเมนูอาหาร&rdquo;
            </p>
            <div className="pt-1">
              <Link
                href="/community"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#171717] text-[#F8D84A] border-2 border-[#171717] font-extrabold text-xs sm:text-sm hover:bg-[#171717]/90"
              >
                <Share2 className="w-4 h-4" aria-hidden="true" />
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
                  className="rounded-2xl bg-[#FFF9EC] border-2 border-[#171717] shadow-[3px_3px_0px_#171717] overflow-hidden flex flex-col justify-between"
                >
                  <div className="relative h-40 w-full bg-[#FFF3C4] border-b-2 border-[#171717]">
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
                      className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-xl border-2 border-[#171717] flex items-center justify-center cursor-pointer ${
                        isFav ? 'bg-[#FFE4E6] text-red-600' : 'bg-white text-[#171717]'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${isFav ? 'fill-current text-red-600' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#F8D84A] border border-[#171717]">
                          {FOOD_CATEGORY_LABELS[recipe.category]}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#77736B]">
                          <Clock className="w-3 h-3 text-[#171717]" aria-hidden="true" />
                          {recipe.cooking_time} นาที
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-[#171717] line-clamp-1 pt-0.5">
                        {recipe.name}
                      </h3>
                      <p className="text-xs text-[#77736B] line-clamp-2">{recipe.description}</p>
                    </div>

                    <div className="pt-2 border-t border-[#EAE5DA] flex items-center justify-between gap-2">
                      <a
                        href={ext.primaryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#171717] text-[#F8D84A] text-xs font-extrabold hover:bg-[#171717]/90"
                      >
                        <span>ดูสูตรอาหาร ({ext.primarySourceName})</span>
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                      </a>
                      <Link
                        href={`/recipes/${encodeURIComponent(recipe.id)}`}
                        className="px-2.5 py-2 rounded-xl bg-white border border-[#171717] text-xs font-bold text-[#171717] hover:bg-[#EAE5DA]"
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
              className="rounded-3xl bg-white border-2 border-[#171717] shadow-[4px_4px_0px_#171717] p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-[#171717]" aria-hidden="true" />
                  <h2 id="recent-roulette-heading" className="text-base font-extrabold">
                    เมนูที่เปิดไพ่ได้ล่าสุด
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearRouletteHistory();
                    setHistory([]);
                  }}
                  className="text-xs font-bold text-[#77736B] hover:text-[#171717] underline cursor-pointer"
                >
                  ล้างประวัติ
                </button>
              </div>

              <div className="space-y-2.5">
                {history.slice(0, 4).map((item) => (
                  <Link
                    key={item.roundId}
                    href={`/recipes/${encodeURIComponent(item.recipeId)}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#FFF9EC] border border-[#171717]/25 hover:border-[#171717] transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-extrabold text-[#171717] group-hover:underline">
                        {item.recipeName}
                      </p>
                      <span className="text-xs text-[#77736B]">
                        {FOOD_CATEGORY_LABELS[item.category]}
                        {item.cookingTime ? ` · ${item.cookingTime} นาที` : ''}
                      </span>
                    </div>
                    <ArrowRight
                      className="w-4 h-4 text-[#171717] shrink-0 group-hover:translate-x-0.5 transition-transform"
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
              className="rounded-3xl bg-white border-2 border-[#171717] shadow-[4px_4px_0px_#171717] p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-600 fill-current" aria-hidden="true" />
                <h2 id="favorites-heading" className="text-base font-extrabold">
                  เมนูโปรดที่บันทึกไว้ ({favoriteRecipes.length})
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {favoriteRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="rounded-2xl bg-[#FFF9EC] border border-[#171717]/30 overflow-hidden flex flex-col justify-between"
                  >
                    <div className="h-24 w-full relative">
                      <RecipeImage
                        src={recipe.image_url}
                        alt={recipe.name}
                        category={recipe.category}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="p-3 space-y-2">
                      <Link
                        href={`/recipes/${encodeURIComponent(recipe.id)}`}
                        className="text-xs sm:text-sm font-extrabold text-[#171717] hover:underline line-clamp-1 block"
                      >
                        {recipe.name}
                      </Link>
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#77736B]">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {recipe.cooking_time} นาที
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ChefHat className="w-3 h-3" aria-hidden="true" />
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

      {/* MYSTERY CARD MODAL */}
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

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  ExternalLink,
  Heart,
  Refrigerator,
  RotateCcw,
  Search,
  ShieldCheck,
  UtensilsCrossed,
} from "lucide-react";
import { useKinDiApp } from "@/components/AppShell";
import { RecipeImage } from "@/components/RecipeImage";
import {
  DEFAULT_ROULETTE_FILTERS,
  getEligibleRouletteRecipes,
  isRecipeSafeForUser,
} from "@/features/food-safety/eligibility";
import { FoodRouletteModal } from "@/features/roulette/components/FoodRouletteModal";
import {
  completeCardFlipInRound,
  createRouletteRound,
  getRevealedRecipeFromRound,
  selectCardInRound,
} from "@/features/roulette/roulette-engine";
import { getExternalRecipeLinks } from "@/lib/external-recipes";
import { fetchApprovedRecipes } from "@/lib/recipes-repository";
import {
  clearRouletteHistory,
  getMergedIngredientsCatalog,
  loadRouletteHistory,
  recordRouletteRevealHistory,
} from "@/lib/user-storage";
import {
  ALLERGEN_LABELS,
  CardCountOption,
  DIETARY_PREFERENCE_LABELS,
  FOOD_CATEGORY_LABELS,
  FoodCategory,
  MEAL_TYPE_LABELS,
  MealType,
  Recipe,
  RouletteHistoryEntry,
  RouletteQuickFilters,
  RouletteRoundState,
} from "@/types/recipe";

export function FoodRoulettePage() {
  const { restrictions, openRestrictionsModal, favoriteIds, toggleFavorite } =
    useKinDiApp();

  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [filters, setFilters] = useState<RouletteQuickFilters>(
    DEFAULT_ROULETTE_FILTERS,
  );
  const [cardCount, setCardCount] = useState<CardCountOption>(5);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [round, setRound] = useState<RouletteRoundState | null>(null);
  const [history, setHistory] = useState<RouletteHistoryEntry[]>([]);

  // "รวมเมนูทั้งหมด" (Browse & Search All Recipes) state
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>("");
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<
    FoodCategory | "all" | "favorites"
  >("all");

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
    window.addEventListener("kindi-recipes-updated", handleRecipesUpdated);
    return () => {
      window.removeEventListener("kindi-recipes-updated", handleRecipesUpdated);
    };
  }, [loadCandidates]);

  const catalog = useMemo(() => getMergedIngredientsCatalog(), [allRecipes]);

  // Compute filtered list for "รวมเมนูทั้งหมด" (Browse & Search All Recipes)
  const browsableRecipes = useMemo(() => {
    const safeRecipes = allRecipes.filter((r) =>
      isRecipeSafeForUser(r, restrictions, catalog),
    );
    const q = catalogSearchQuery.trim().toLowerCase();

    return safeRecipes.filter((recipe) => {
      if (
        catalogCategoryFilter !== "all" && catalogCategoryFilter !== "favorites" &&
        recipe.category !== catalogCategoryFilter
      ) {
        return false;
      }
      if (catalogCategoryFilter === "favorites" && !favoriteIds.includes(recipe.id)) return false;
      if (!q) return true;
      const inName = recipe.name.toLowerCase().includes(q);
      const inDesc = (recipe.description ?? "").toLowerCase().includes(q);
      const inCustomIng = (recipe.custom_ingredients ?? []).some((c) =>
        c.toLowerCase().includes(q),
      );
      const inCatalogIng = (recipe.ingredients ?? []).some((ing) => {
        const nameTh = catalog[ing.ingredient_id]?.name_th ?? "";
        return nameTh.toLowerCase().includes(q);
      });
      return inName || inDesc || inCustomIng || inCatalogIng;
    });
  }, [
    allRecipes,
    restrictions,
    catalog,
    catalogSearchQuery,
    catalogCategoryFilter,
    favoriteIds,
  ]);

  const hasOptionalFilters =
    filters.mealType !== "all" ||
    filters.category !== "all" ||
    filters.maxCookingTime !== null;

  // Start or regenerate a round
  const generateNewRound = useCallback(
    (
      requestedCount: CardCountOption,
      candidatesPool: Recipe[],
      activeFilters: RouletteQuickFilters,
      prevRound: RouletteRoundState | null,
    ) => {
      const prevRevealed = getRevealedRecipeFromRound(prevRound);
      const prevRoundIds = prevRound
        ? prevRound.cards.map((c) => c.recipe.id)
        : [];

      const nextRound = createRouletteRound({
        candidates: candidatesPool,
        requestedCardCount: requestedCount,
        restrictions,
        filters: activeFilters,
        previousRevealedRecipeId: prevRevealed?.id ?? null,
        previousRoundRecipeIds: prevRoundIds,
        recentRevealedRecipeIds: history.map(entry => entry.recipeId),
        catalog,
      });

      setRound(nextRound);
    },
    [restrictions, catalog, history],
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

  // Select a mystery card
  const handleSelectCard = (cardId: string) => {
    setRound((prev) => {
      if (!prev) return prev;
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      return selectCardInRound(prev, cardId, {
        immediateReveal: prefersReducedMotion,
      });
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



  const activeRestrictionBadges: string[] = [];
  if (restrictions.dietaryPreference !== "unrestricted") {
    activeRestrictionBadges.push(
      DIETARY_PREFERENCE_LABELS[restrictions.dietaryPreference].label,
    );
  }
  for (const alg of restrictions.allergens) {
    activeRestrictionBadges.push(
      `แพ้: ${ALLERGEN_LABELS[alg].label.split(" ")[0]}`,
    );
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
    <div className="home-page">
      <section className="meal-hero hero-banner" aria-labelledby="meal-hero-title">
        <div className="hero-copy">
          <h1 id="meal-hero-title">
            มื้อนี้
            <span>
              กินอะไร<span className="question-mark">?</span>
            </span>
          </h1>
          <p className="hero-intro">
            เปิดไพ่สักใบ ให้เราช่วยเลือกมื้อนี้
          </p>
          <div className="hero-actions">
            <button
              onClick={handleOpenRouletteModal}
              className="action-primary"
              disabled={isLoadingRecipes}
            >
              เลือกไพ่มื้อนี้ <ArrowRight size={21} aria-hidden="true" />
            </button>
            <a href="#recipes" className="text-link">
              ขอเลือกเองก่อน <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
          <div className="hero-note">
            <ShieldCheck size={17} aria-hidden="true" />
            <button onClick={openRestrictionsModal}>
              {activeRestrictionBadges.length > 0
                ? "ใช้ข้อจำกัดทางอาหารของคุณแล้ว · ดูหรือแก้ไข"
                : "มีอาหารที่แพ้? บอกเราได้เลย"}
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <img
            className="hero-food"
            src="/images/thai-table.jpg"
            alt="ข้าวกะเพราไข่ดาว พร้อมพริก มะนาว และใบกะเพราบนโต๊ะอาหาร"
            fetchPriority="high"
            width="1200"
            height="1000"
          />
        </div>
      </section>
      <Link href="/fridge" className="pantry-banner">
        <div className="pantry-symbol">
          <Refrigerator size={33} strokeWidth={1.3} aria-hidden="true" />
        </div>
        <div>
          <h2>ของในตู้ ก็เป็นมื้ออร่อยได้</h2>
          <p>บอกวัตถุดิบที่มี แล้วมาดูว่าทำอะไรกินได้บ้าง</p>
        </div>
        <span>
          ลองค้นตู้เย็น <ArrowUpRight size={22} aria-hidden="true" />
        </span>
      </Link>
      <section
        id="recipes"
        className="recipe-collection"
        aria-labelledby="browse-all-recipes-heading"
      >
        <div className="collection-heading">
          <div>
            <h2 id="browse-all-recipes-heading">
              เผื่อวันนี้มีจานที่ใช่
              <span className="collection-count">
                {browsableRecipes.length}
              </span>
            </h2>
            <p>เมนูที่เลือกดูเองได้ ในวันที่อยากตามใจตัวเอง</p>
          </div>
          <search className="recipe-search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              aria-label="ค้นหาเมนูอาหาร"
              placeholder="ค้นหาเมนู หรือวัตถุดิบ"
              value={catalogSearchQuery}
              onChange={(e) => setCatalogSearchQuery(e.target.value)}
            />
          </search>
        </div>
        <div className="category-tabs" role="group" aria-label="หมวดหมู่เมนู">
          <button
            onClick={() => setCatalogCategoryFilter("all")}
            aria-pressed={catalogCategoryFilter === "all"}
          >
            ทั้งหมด
          </button>
          <button onClick={() => setCatalogCategoryFilter('favorites')} aria-pressed={catalogCategoryFilter === 'favorites'}>
            เมนูโปรด
          </button>
          {(Object.keys(FOOD_CATEGORY_LABELS) as FoodCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCatalogCategoryFilter(cat)}
              aria-pressed={catalogCategoryFilter === cat}
            >
              {FOOD_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
        {isLoadingRecipes ? (
          <p className="catalog-status" role="status">
            กำลังเปิดสมุดเมนู…
          </p>
        ) : loadError ? (
          <div className="catalog-empty">
            <h3>เปิดสมุดเมนูไม่สำเร็จ</h3>
            <p>{loadError}</p>
            <button className="action-primary" onClick={loadCandidates}>
              ลองโหลดอีกครั้ง <RotateCcw size={17} />
            </button>
          </div>
        ) : browsableRecipes.length === 0 ? (
          <div className="catalog-empty">
            <div className="empty-plate" aria-hidden="true">
              <UtensilsCrossed size={35} strokeWidth={1.2} />
            </div>
            <div>
              <h3>
                {catalogCategoryFilter === 'favorites' ? 'ยังไม่พบเมนูโปรดที่ตรงเงื่อนไข' : allRecipes.length === 0
                  ? "สมุดเมนูเล่มนี้ รอจานแรกจากคุณ"
                  : "ยังไม่เจอจานที่ตรงใจ"}
              </h3>
              <p>
                {catalogCategoryFilter === 'favorites' ? 'กดหัวใจบนการ์ดอาหารเพื่อเก็บไว้ เมนูโปรดยังคงกรองตามคำค้นและข้อจำกัดทางอาหารของคุณ' : allRecipes.length === 0
                  ? "มีสูตรที่ชอบอยู่แล้ว? เก็บไว้ที่นี่ แล้วให้มื้อถัดไปเลือกง่ายขึ้น"
                  : "ลองเปลี่ยนคำค้น หมวดหมู่ หรือข้อจำกัดทางอาหาร"}
              </p>
              {catalogCategoryFilter === 'favorites' ? <button type="button" className="text-link" onClick={() => { setCatalogCategoryFilter('all'); setCatalogSearchQuery(''); }}>ดูเมนูทั้งหมด →</button> : <Link href="/community" className="text-link">
                เพิ่มเมนูอาหาร <ArrowUpRight size={18} aria-hidden="true" />
              </Link>}
            </div>
          </div>
        ) : (
          <div className="recipe-grid">
            {browsableRecipes.map((recipe) => (
              <article className="editorial-recipe" key={recipe.id}>
                <div className="recipe-photo">
                  <Link href={`/recipes/${encodeURIComponent(recipe.id)}`}>
                    <RecipeImage
                      src={recipe.image_url}
                      alt={recipe.name}
                      category={recipe.category}
                      className="w-full h-full"
                    />
                  </Link>
                  <button
                    className="favorite-button"
                    aria-label={
                      favoriteIds.includes(recipe.id)
                        ? "ลบออกจากเมนูโปรด"
                        : "บันทึกเป็นเมนูโปรด"
                    }
                    aria-pressed={favoriteIds.includes(recipe.id)}
                    onClick={() => toggleFavorite(recipe.id)}
                  >
                    <Heart
                      size={20}
                      fill={
                        favoriteIds.includes(recipe.id)
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>
                </div>
                <div className="recipe-meta">
                  <span>{FOOD_CATEGORY_LABELS[recipe.category]}</span>
                  <span>
                    <Clock size={14} /> {recipe.cooking_time} นาที
                  </span>
                </div>
                <h3>
                  <Link href={`/recipes/${encodeURIComponent(recipe.id)}`}>
                    {recipe.name}
                  </Link>
                </h3>
                <p>{recipe.description}</p>
                <div className="recipe-links">
                  <Link href={`/recipes/${encodeURIComponent(recipe.id)}`}>
                    ดูส่วนผสม <ArrowRight size={16} />
                  </Link>
                  <a
                    href={getExternalRecipeLinks(recipe).primaryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ดูสูตรต้นทาง <ExternalLink size={14} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {(history.length > 0) && (
        <div className="saved-sections">
          {history.length > 0 && (
            <section>
              <div className="saved-heading">
                <h2>มื้อที่โชคเลือกให้</h2>
                <button
                  onClick={() => {
                    clearRouletteHistory();
                    setHistory([]);
                  }}
                >
                  ล้างประวัติ
                </button>
              </div>
              {history.slice(0, 4).map((item) => (
                <Link
                  className="saved-row"
                  key={item.roundId}
                  href={`/recipes/${encodeURIComponent(item.recipeId)}`}
                >
                  <span>
                    {item.recipeName}
                    <small>
                      {FOOD_CATEGORY_LABELS[item.category]} · {item.cookingTime}{" "}
                      นาที
                    </small>
                  </span>
                  <ArrowUpRight size={20} />
                </Link>
              ))}
            </section>
          )}

        </div>
      )}
      <FoodRouletteModal
        emptyExplanation={allRecipes.length === 0 ? 'ยังไม่มีเมนูในฐานข้อมูล เพิ่มสูตรอาหารก่อนเริ่มสุ่มได้' :
          getEligibleRouletteRecipes(allRecipes, restrictions, DEFAULT_ROULETTE_FILTERS, catalog).length === 0 ?
          'ยังไม่มีเมนูที่ผ่านข้อจำกัดทางอาหารของคุณ อาจมีส่วนผสมที่ขัดกัน หรือข้อมูลส่วนผสมและภูมิแพ้ยังไม่ครบ ระบบจึงไม่นำมาสุ่ม' :
          `มีเมนูที่ผ่านข้อจำกัดทางอาหาร แต่ไม่ตรงตัวกรองที่เลือก: ${filters.mealType === 'all' ? 'ทุกมื้อ' : MEAL_TYPE_LABELS[filters.mealType]} · ${filters.category === 'all' ? 'ทุกหมวด' : FOOD_CATEGORY_LABELS[filters.category]} · ${filters.maxCookingTime === null ? 'ไม่จำกัดเวลา' : `ไม่เกิน ${filters.maxCookingTime} นาที`}`}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        round={round}
        cardCount={cardCount}
        filters={filters}
        onApplyOptions={(nextFilters, count) => { setFilters(nextFilters); setCardCount(count); generateNewRound(count, allRecipes, nextFilters, round); }}
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

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChefHat,
  Clock,
  ExternalLink,
  Plus,
  Refrigerator,
  RotateCcw,
  Share2,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useKinDiApp } from '@/components/AppShell';
import { RecipeImage } from '@/components/RecipeImage';
import { INGREDIENT_LIST } from '@/data/recipes-seed';
import {
  getEligibleFridgeRecipes,
  getNearMatchFridgeRecipes,
} from '@/features/food-safety/eligibility';
import { getExternalRecipeLinks } from '@/lib/external-recipes';
import { fetchApprovedRecipes } from '@/lib/recipes-repository';
import {
  getMergedIngredientsCatalog,
  loadCustomIngredients,
  saveCustomIngredient,
} from '@/lib/user-storage';
import {
  DIFFICULTY_LABELS,
  FOOD_CATEGORY_LABELS,
  IngredientCategory,
  IngredientRecord,
  Recipe,
} from '@/types/recipe';

const INGREDIENT_CATEGORY_LABELS: Record<IngredientCategory, string> = {
  meat: 'เนื้อสัตว์',
  seafood: 'อาหารทะเล / ปลา',
  egg_dairy: 'ไข่ นม เนย ชีส',
  vegetable: 'ผักและสมุนไพร',
  carb: 'ข้าว เส้น ขนมปัง',
  nut_seed: 'ถั่วและธัญพืช',
  condiment: 'เครื่องปรุง ซอส น้ำสต็อก',
  other: 'เต้าหู้และวัตถุดิบอื่นๆ',
};

export default function FridgeModePage() {
  const { restrictions, openRestrictionsModal } = useKinDiApp();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [customIngredients, setCustomIngredients] = useState<IngredientRecord[]>([]);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>([
    'egg',
    'jasmine_rice',
    'pork',
    'holy_basil',
  ]);
  const [assumeBasicCondiments, setAssumeBasicCondiments] = useState<boolean>(true);
  const [activeIngredientCategory, setActiveIngredientCategory] = useState<IngredientCategory | 'all'>('all');
  const [showOtherInput, setShowOtherInput] = useState<boolean>(false);
  const [otherDraft, setOtherDraft] = useState<string>('');
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => {
    const loadAll = () => {
      fetchApprovedRecipes().then((res) => {
        setLoadError(res.error);
        setRecipes(res.recipes);
      });
      setCustomIngredients(loadCustomIngredients());
    };
    const syncIngredients = () => setCustomIngredients(loadCustomIngredients());
    loadAll();

    window.addEventListener('kindi-recipes-updated', loadAll);
    window.addEventListener('kindi-ingredients-updated', syncIngredients);
    return () => {
      window.removeEventListener('kindi-recipes-updated', loadAll);
      window.removeEventListener('kindi-ingredients-updated', syncIngredients);
    };
  }, [reloadKey]);

  const catalog = useMemo(
    () => getMergedIngredientsCatalog(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customIngredients, recipes]
  );

  const toggleIngredient = (id: string) => {
    setSelectedIngredientIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddOtherIngredient = () => {
    const clean = otherDraft.trim();
    if (!clean) return;
    const slugId = `custom_${clean.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '_')}`;
    const newRecord: IngredientRecord = {
      id: slugId,
      name_th: clean,
      category: 'other',
      allergens: [],
      dietary_compatible: ['vegetarian', 'vegan', 'halal'],
      composition_known: true,
    };
    const updated = saveCustomIngredient(newRecord);
    setCustomIngredients(updated);
    setSelectedIngredientIds((prev) => (prev.includes(slugId) ? prev : [...prev, slugId]));
    setOtherDraft('');
  };

  const matchedRecipes = useMemo(() => {
    return getEligibleFridgeRecipes(
      recipes,
      selectedIngredientIds,
      restrictions,
      {
        assumeBasicPantryCondiments: assumeBasicCondiments,
      },
      catalog
    );
  }, [recipes, selectedIngredientIds, restrictions, assumeBasicCondiments, catalog]);

  const nearMatchRecipes = useMemo(() => {
    return getNearMatchFridgeRecipes(
      recipes,
      selectedIngredientIds,
      restrictions,
      {
        assumeBasicPantryCondiments: assumeBasicCondiments,
        maxMissing: 2,
      },
      catalog
    );
  }, [recipes, selectedIngredientIds, restrictions, assumeBasicCondiments, catalog]);

  const groupedIngredients = useMemo(() => {
    const groups: Record<IngredientCategory, IngredientRecord[]> = {
      meat: [],
      seafood: [],
      egg_dairy: [],
      vegetable: [],
      carb: [],
      other: [],
      nut_seed: [],
      condiment: [],
    };
    const mergedList = [
      ...INGREDIENT_LIST,
      ...customIngredients.filter((c) => !INGREDIENT_LIST.some((b) => b.id === c.id)),
    ];
    for (const item of mergedList) {
      groups[item.category]?.push(item);
    }
    return groups;
  }, [customIngredients]);

  return (
    <div className="interior-page fridge-page">
      {loadError && <div role="alert" className="step-error">{loadError} <button type="button" className="text-link min-h-11" onClick={() => setReloadKey(key => key + 1)}>ลองอีกครั้ง</button></div>}
      {/* Editorial Bento Header */}
      <section className="interior-header fridge-header">
        <div><h1>เปิดตู้เย็น<br /><span>เจอมื้อถัดไป</span></h1><p>ของที่มีอยู่ อาจอร่อยกว่าที่คิด เลือกวัตถุดิบในบ้าน<br className="hidden sm:block" /> แล้วค้นหาเมนูที่ทำได้ หรือขาดอีกแค่นิดเดียว</p></div>
        <div className="interior-header-actions"><Refrigerator size={64} strokeWidth={1} aria-hidden="true" /><button onClick={openRestrictionsModal} className="text-link"><ShieldCheck size={17} aria-hidden="true" /> ตั้งค่าข้อจำกัดทางอาหาร</button></div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Ingredient Picker */}
        <section
          aria-labelledby="fridge-picker-heading"
          className="kindi-surface-card lg:col-span-6 p-5 sm:p-6 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DDD2C2] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="fridge-picker-heading"
                  className="text-lg font-semibold text-[#302923] tabular-nums"
                >
                  เลือกวัตถุดิบที่มีในบ้าน
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#302923] text-[#FBF0DC] text-xs font-semibold tabular-nums">
                  {selectedIngredientIds.length} อย่าง
                </span>
              </div>
              <p className="text-xs text-[#6E5D50] mt-0.5">
                แตะเพื่อเลือกหรือเพิ่มวัตถุดิบ ระบบจะคำนวณเมนูที่ทำได้แบบเรียลไทม์
              </p>
            </div>
            {selectedIngredientIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIngredientIds([])}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F1EADF] text-xs font-bold text-[#302923] hover:bg-[#DDD2C2] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ล้างที่เลือก</span>
              </button>
            )}
          </div>

          {/* Active Selected Tray */}
          {selectedIngredientIds.length > 0 && (
            <div className="p-3.5 rounded-lg bg-[#FBF7EF] border border-[#DDD2C2] space-y-2">
              <span className="block text-xs font-semibold text-[#6E5D50]">
                วัตถุดิบที่คุณเลือกไว้แล้ว ({selectedIngredientIds.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedIngredientIds.map((id) => {
                  const name = catalog[id]?.name_th ?? id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleIngredient(id)}
                      title={`แตะเพื่อเอา ${name} ออก`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#302923] text-[#FBF7EF] text-xs font-bold hover:bg-[#4A352B] transition-colors cursor-pointer group shadow-xs"
                    >
                      <span>{name}</span>
                      <X className="w-3.5 h-3.5 text-[#FBF0DC] group-hover:scale-110 transition-transform" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => { setActiveIngredientCategory('all'); setLibraryOpen(true); }}
              aria-pressed={activeIngredientCategory === 'all'}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                activeIngredientCategory === 'all'
                  ? 'bg-[#302923] text-[#FBF0DC] border-[#302923] shadow-xs'
                  : 'bg-white text-[#302923] border-[#DDD2C2] hover:border-[#C6B7A5]'
              }`}
            >
              ทั้งหมด
            </button>
            {(Object.keys(INGREDIENT_CATEGORY_LABELS) as IngredientCategory[]).map((catKey) => {
              const active = activeIngredientCategory === catKey;
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => { setActiveIngredientCategory(catKey); setLibraryOpen(true); }}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#302923] text-[#FBF0DC] border-[#302923] shadow-xs'
                      : 'bg-white text-[#302923] border-[#DDD2C2] hover:border-[#C6B7A5]'
                  }`}
                >
                  {INGREDIENT_CATEGORY_LABELS[catKey]}
                </button>
              );
            })}
          </div>

          {/* Basic Pantry Condiments Toggle */}
          <label className="flex items-center justify-between gap-3 p-4 rounded-lg bg-[#FBF7EF] border border-[#DDD2C2] hover:border-[#C6B7A5] transition-colors cursor-pointer select-none">
            <div>
              <span className="text-xs sm:text-sm font-semibold text-[#302923] block">
                มีเครื่องปรุงพื้นฐานติดครัวอยู่แล้ว
              </span>
              <span className="text-xs text-[#6E5D50] mt-0.5 block">
                (น้ำปลา, ซีอิ๊ว, ซอสหอยนางรม, เกลือ, น้ำมัน, พริกกระเทียม)
              </span>
            </div>
            <input
              type="checkbox"
              checked={assumeBasicCondiments}
              onChange={(e) => setAssumeBasicCondiments(e.target.checked)}
              className="w-5 h-5 accent-[#302923] shrink-0 cursor-pointer"
            />
          </label>

          {/* Ingredient Groups */}
          <div>
            <label htmlFor="fridge-ingredient-search" className="block text-sm mb-2">ค้นหาวัตถุดิบที่มี</label>
            <input id="fridge-ingredient-search" type="search" value={ingredientSearch}
              onChange={event => setIngredientSearch(event.target.value)} placeholder="เช่น ไข่ ไก่ กะหล่ำปลี"
              className="kindi-input-field w-full min-h-11 px-3" />
          </div>
          <details className="ingredient-library" open={libraryOpen || !!ingredientSearch.trim()} onToggle={event => setLibraryOpen(event.currentTarget.open)}>
          <summary className="min-h-11 cursor-pointer font-medium">เลือกจากรายการวัตถุดิบทั้งหมด</summary>
          <div className="space-y-4">
            {(Object.keys(groupedIngredients) as IngredientCategory[]).map((catKey) => {
              if (!ingredientSearch.trim() && activeIngredientCategory !== 'all' && activeIngredientCategory !== catKey) {
                return null;
              }
              const items = groupedIngredients[catKey].filter(item => item.name_th.includes(ingredientSearch.trim()));
              if ((!items || items.length === 0) && catKey !== 'other') return null;
              return (
                <div key={catKey} className="ingredient-group space-y-2.5">
                  <h3 className="text-xs font-semibold text-[#6E5D50]">
                    {INGREDIENT_CATEGORY_LABELS[catKey]}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {items.map((ing) => {
                      const isSelected = selectedIngredientIds.includes(ing.id);
                      return (
                        <button
                          key={ing.id}
                          type="button"
                          onClick={() => toggleIngredient(ing.id)}
                          aria-pressed={isSelected}
                          className={`min-h-9 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-[#302923] text-[#FBF0DC] border-[#302923] shadow-xs'
                              : 'bg-white text-[#302923] border-[#DDD2C2] hover:border-[#C6B7A5]'
                          }`}
                        >
                          <span>{ing.name_th}</span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
                          )}
                        </button>
                      );
                    })}

                    {catKey === 'other' && (
                      <button
                        type="button"
                        onClick={() => setShowOtherInput((prev) => !prev)}
                        className="min-h-9 px-3 py-1.5 rounded-xl text-xs font-semibold border border-dashed border-[#C6B7A5] bg-white text-[#302923] hover:border-[#302923] inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
                        <span>อื่นๆ (พิมพ์เพิ่มเอง)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {showOtherInput && (
              <div className="kindi-input-group p-4 rounded-lg bg-[#FBF7EF] border border-[#DDD2C2] space-y-2">
                <label
                  htmlFor="fridge-other-ing"
                  className="block text-xs font-semibold text-[#302923]"
                >
                  เพิ่มวัตถุดิบอื่นๆ ที่มีในตู้เย็น:
                </label>
                <div className="flex gap-2">
                  <input
                    id="fridge-other-ing"
                    type="text"
                    value={otherDraft}
                    onChange={(e) => setOtherDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        handleAddOtherIngredient();
                      }
                    }}
                    placeholder="เช่น แหนม, หมูยอ, วุ้นเส้น, ผักกาดขาว..."
                    className="kindi-input-field flex-1 px-3.5 py-2.5 rounded-xl bg-white text-xs sm:text-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAddOtherIngredient}
                    className="kindi-btn-primary px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer shrink-0"
                  >
                    + เพิ่ม
                  </button>
                </div>
              </div>
            )}
          </div>
          </details>
        </section>

        {/* Right: Matched Recipes + Near-Match ("ขาดอีกนิดเดียว!") */}
        <div className="lg:col-span-6 space-y-6">
          {/* 100% Exact Matches */}
          <section
            aria-labelledby="fridge-results-heading"
            className="kindi-surface-card p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#DDD2C2] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center justify-center">
                  <Check className="w-4 h-4 stroke-[3]" aria-hidden="true" />
                </div>
                <div>
                  <h2
                    id="fridge-results-heading"
                    className="text-base sm:text-lg font-semibold text-[#302923] tabular-nums"
                  >
                    เมนูที่ทำได้ทันที ({matchedRecipes.length} เมนู)
                  </h2>
                </div>
              </div>
            </div>

            {matchedRecipes.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-3 bg-[#FBF7EF] rounded-lg border border-dashed border-[#C6B7A5]">
                <p className="text-sm sm:text-base font-semibold text-[#302923]">
                  {recipes.length === 0
                    ? 'ยังไม่มีสูตรอาหารในระบบ'
                    : 'ยังไม่มีเมนูที่ทำได้ครบ 100% จากวัตถุดิบที่เลือก'}
                </p>
                <p className="text-xs sm:text-sm text-[#6E5D50] leading-relaxed max-w-sm mx-auto">
                  {recipes.length === 0
                    ? 'ไปที่หน้า "เพิ่มเมนูอาหาร" เพื่อเพิ่มเมนูแรกเข้าสู่ระบบกันเลย!'
                    : 'ลองเลือกวัตถุดิบเพิ่ม หรือดูหมวด "ขาดอีกนิดเดียว!" ด้านล่างได้เลย'}
                </p>
                {recipes.length === 0 && (
                  <div className="pt-1">
                    <Link
                      href="/community"
                      className="kindi-btn-primary min-h-11 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold"
                    >
                      <Share2 className="w-4 h-4" aria-hidden="true" />
                      <span>ไปหน้าเพิ่มเมนูอาหาร</span>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {matchedRecipes.map(({ recipe }) => {
                  const ext = getExternalRecipeLinks(recipe);
                  return (
                    <div
                      key={recipe.id}
                      className="kindi-recipe-card rounded-lg overflow-hidden flex flex-col sm:flex-row group"
                    >
                      <div className="sm:w-40 h-40 sm:h-auto shrink-0 bg-[#F1EADF] border-b sm:border-b-0 sm:border-r border-[#DDD2C2]">
                        <RecipeImage
                          src={recipe.image_url}
                          alt={recipe.name}
                          category={recipe.category}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4 sm:p-5 flex-1 min-w-0 flex flex-col justify-between gap-3.5">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#F3E3D2] border border-[#DDD2C2] text-[#302923] whitespace-nowrap">
                              {FOOD_CATEGORY_LABELS[recipe.category]}
                            </span>

                            <div className="flex items-center gap-2.5 text-xs font-semibold text-[#6E5D50] tabular-nums whitespace-nowrap">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-[#302923]" aria-hidden="true" />
                                {recipe.cooking_time} นาที
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <ChefHat className="w-3.5 h-3.5 text-[#302923]" aria-hidden="true" />
                                {DIFFICULTY_LABELS[recipe.difficulty]}
                              </span>
                            </div>
                          </div>

                          <h3 className="text-base sm:text-lg font-semibold text-[#302923] leading-relaxed break-words">
                            {recipe.name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2.5 pt-3 border-t border-[#DDD2C2]">
                          <a
                            href={ext.primaryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="kindi-btn-primary flex-1 min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer"
                          >
                            <span>ลิงก์สูตรอาหาร</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          </a>
                          <Link
                            href={`/recipes/${encodeURIComponent(recipe.id)}`}
                            className="kindi-btn-secondary min-h-11 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#302923] whitespace-nowrap cursor-pointer"
                          >
                            <span>ดูส่วนผสม</span>
                            <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* "ขาดอีกนิดเดียว!" (Near-Match Section) */}
          <section
            aria-labelledby="fridge-nearmatch-heading"
            className="kindi-surface-card p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#DDD2C2] pb-3">
              <div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold mb-1">
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>ขาดวัตถุดิบอีกแค่ 1–2 อย่าง</span>
                </div>
                <h2
                  id="fridge-nearmatch-heading"
                  className="text-base sm:text-lg font-semibold text-[#302923] tabular-nums"
                >
                  ขาดอีกนิดเดียว! ({nearMatchRecipes.length} เมนู)
                </h2>
              </div>
            </div>

            {nearMatchRecipes.length === 0 ? (
              <p className="text-xs sm:text-sm text-[#6E5D50] py-6 text-center bg-[#FBF7EF] rounded-lg border border-dashed border-[#C6B7A5]">
                ยังไม่มีเมนูที่ขาดวัตถุดิบเพียง 1–2 อย่างจากรายการที่คุณเลือก
              </p>
            ) : (
              <div className="space-y-4">
                {nearMatchRecipes.map(({ recipe, missingRequiredIds }) => {
                  const ext = getExternalRecipeLinks(recipe);
                  const missingNames = missingRequiredIds.map(
                    (id) => catalog[id]?.name_th ?? id
                  );
                  return (
                    <div
                      key={recipe.id}
                      className="p-4 sm:p-5 rounded-lg bg-[#FBF7EF] border border-[#DDD2C2] space-y-3.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#F1EADF] text-[#302923] tabular-nums whitespace-nowrap">
                            {FOOD_CATEGORY_LABELS[recipe.category]} · {recipe.cooking_time} นาที
                          </span>
                          <h3 className="text-base sm:text-lg font-semibold text-[#302923] mt-1.5 leading-relaxed">
                            {recipe.name}
                          </h3>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-200 text-xs font-semibold shrink-0 tabular-nums whitespace-nowrap">
                          ขาดอีก {missingRequiredIds.length} อย่าง
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-bold text-[#6E5D50]">วัตถุดิบที่ต้องหาเพิ่ม:</span>
                        {missingNames.map((mName) => (
                          <span
                            key={mName}
                            className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD2C2] text-xs font-semibold text-amber-900 shadow-xs"
                          >
                            + {mName}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2.5 pt-3 border-t border-[#DDD2C2]">
                        <a
                          href={ext.primaryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="kindi-btn-primary flex-1 min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer"
                        >
                          <span>ลิงก์สูตรอาหาร</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        </a>
                        <Link
                          href={`/recipes/${encodeURIComponent(recipe.id)}`}
                          className="kindi-btn-secondary min-h-11 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#302923] whitespace-nowrap cursor-pointer"
                        >
                          <span>ดูส่วนผสม</span>
                          <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

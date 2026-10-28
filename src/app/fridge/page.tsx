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
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [customIngredients, setCustomIngredients] = useState<IngredientRecord[]>([]);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>([
    'egg',
    'jasmine_rice',
    'pork',
    'holy_basil',
  ]);
  const [assumeBasicCondiments, setAssumeBasicCondiments] = useState<boolean>(true);
  const [showOtherInput, setShowOtherInput] = useState<boolean>(false);
  const [otherDraft, setOtherDraft] = useState<string>('');

  useEffect(() => {
    const loadAll = () => {
      fetchApprovedRecipes().then((res) => {
        if (!res.error) {
          setRecipes(res.recipes);
        }
      });
      setCustomIngredients(loadCustomIngredients());
    };
    loadAll();

    window.addEventListener('kindi-recipes-updated', loadAll);
    window.addEventListener('kindi-ingredients-updated', loadAll);
    return () => {
      window.removeEventListener('kindi-recipes-updated', loadAll);
      window.removeEventListener('kindi-ingredients-updated', loadAll);
    };
  }, []);

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
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="rounded-3xl bg-[#F8D84A] border-2 border-[#171717] shadow-[6px_6px_0px_#171717] p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171717] text-[#F8D84A] text-xs font-extrabold">
              <Refrigerator className="w-3.5 h-3.5" aria-hidden="true" />
              <span>FRIDGE MODE · ค้นตู้เย็น</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#171717]">
              มีอะไรในตู้ ก็กินดิ!
            </h1>
            <p className="text-sm sm:text-base text-[#171717]/85 font-semibold max-w-2xl">
              ติ๊กวัตถุดิบที่มีในตู้เย็น ระบบจะแสดงเมนูที่มีวัตถุดิบครบทำได้ทันที
              พร้อมแยกหมวด &ldquo;ขาดอีกนิดเดียว!&rdquo; สำหรับเมนูที่ขาดวัตถุดิบแค่ 1–2 อย่าง
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              onClick={openRestrictionsModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-[#171717] border-2 border-[#171717] shadow-[3px_3px_0px_#171717] text-xs sm:text-sm font-extrabold cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>ข้อจำกัดทางอาหาร</span>
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#171717] text-[#F8D84A] border-2 border-[#171717] text-xs sm:text-sm font-extrabold"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>ไปสุ่มไพ่เมนูแทน</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Ingredient Picker */}
        <section
          aria-labelledby="fridge-picker-heading"
          className="lg:col-span-7 rounded-3xl bg-white border-2 border-[#171717] shadow-[4px_4px_0px_#171717] p-5 sm:p-6 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE5DA] pb-4">
            <div>
              <h2 id="fridge-picker-heading" className="text-lg font-extrabold text-[#171717]">
                เลือกวัตถุดิบที่มีในบ้าน ({selectedIngredientIds.length} รายการ)
              </h2>
              <p className="text-xs text-[#77736B]">
                กดเลือกวัตถุดิบที่มีอยู่จริง หรือกด &ldquo;อื่นๆ&rdquo; เพื่อเพิ่มวัตถุดิบของคุณเอง
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedIngredientIds([])}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#EAE5DA] text-xs font-bold text-[#171717] hover:bg-[#F8D84A] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>ล้างที่เลือก</span>
            </button>
          </div>

          {/* Basic Pantry Condiments Toggle */}
          <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#FFF9EC] border-2 border-[#171717] cursor-pointer">
            <div>
              <span className="text-xs sm:text-sm font-extrabold text-[#171717] block">
                มีเครื่องปรุงพื้นฐานติดครัวอยู่แล้ว (น้ำปลา, ซีอิ๊ว, ซอสหอยนางรม, เกลือ, น้ำมัน, พริกกระเทียม)
              </span>
              <span className="text-[11px] text-[#77736B]">
                หมายเหตุ: หากคุณตั้งค่าข้อจำกัดทางอาหาร ระบบจะยังคงตัดเมนูที่มีเครื่องปรุงที่แพ้ออกเสมอ
              </span>
            </div>
            <input
              type="checkbox"
              checked={assumeBasicCondiments}
              onChange={(e) => setAssumeBasicCondiments(e.target.checked)}
              className="w-5 h-5 accent-[#171717] shrink-0"
            />
          </label>

          {/* Ingredient Groups */}
          <div className="space-y-4">
            {(Object.keys(groupedIngredients) as IngredientCategory[]).map((catKey) => {
              const items = groupedIngredients[catKey];
              if ((!items || items.length === 0) && catKey !== 'other') return null;
              return (
                <div key={catKey} className="space-y-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#77736B]">
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
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-[#F8D84A] text-[#171717] border-[#171717] shadow-[2px_2px_0px_#171717]'
                              : 'bg-white text-[#171717] border-[#171717]/25 hover:border-[#171717]'
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
                        className="px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 border-dashed border-[#171717] bg-[#FFF9EC] text-[#171717] hover:bg-[#F8D84A] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
                        <span>อื่นๆ (เพิ่มวัตถุดิบเพิ่ม)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {showOtherInput && (
              <div className="p-3.5 rounded-2xl bg-[#FFF9EC] border-2 border-[#171717] space-y-2">
                <label
                  htmlFor="fridge-other-ing"
                  className="block text-xs font-extrabold text-[#171717]"
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
                    className="flex-1 px-3 py-2 rounded-xl bg-white border-2 border-[#171717] text-xs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={handleAddOtherIngredient}
                    className="px-4 py-2 rounded-xl bg-[#171717] text-[#F8D84A] text-xs font-extrabold cursor-pointer shrink-0"
                  >
                    + เพิ่ม
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right: Matched Recipes + Near-Match ("ขาดอีกนิดเดียว!") */}
        <div className="lg:col-span-5 space-y-6">
          {/* 100% Exact Matches */}
          <section
            aria-labelledby="fridge-results-heading"
            className="rounded-3xl bg-white border-2 border-[#171717] shadow-[4px_4px_0px_#171717] p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#EAE5DA] pb-3">
              <h2 id="fridge-results-heading" className="text-lg font-extrabold text-[#171717]">
                เมนูที่ทำได้ทันที ({matchedRecipes.length} เมนู)
              </h2>
            </div>

            {matchedRecipes.length === 0 ? (
              <div className="py-8 px-4 text-center space-y-3 bg-[#FFF9EC] rounded-2xl border border-[#171717]/20">
                <p className="text-sm font-extrabold text-[#171717]">
                  {recipes.length === 0
                    ? 'ยังไม่มีสูตรอาหารในระบบ'
                    : 'ยังไม่มีเมนูที่ทำได้ครบ 100% จากวัตถุดิบที่เลือก'}
                </p>
                <p className="text-xs text-[#77736B] leading-relaxed">
                  {recipes.length === 0
                    ? 'ไปที่หน้า "แบ่งปันสูตรอาหาร" เพื่อเพิ่มเมนูแรกเข้าสู่ระบบกันเลย!'
                    : 'ลองเลือกวัตถุดิบเพิ่ม หรือดูหมวด "ขาดอีกนิดเดียว!" ด้านล่างได้เลย'}
                </p>
                {recipes.length === 0 && (
                  <Link
                    href="/community"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#171717] text-[#F8D84A] text-xs font-extrabold"
                  >
                    <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>ไปหน้าแบ่งปันสูตรอาหาร</span>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {matchedRecipes.map(({ recipe }) => {
                  const ext = getExternalRecipeLinks(recipe);
                  return (
                    <div
                      key={recipe.id}
                      className="rounded-2xl bg-[#FFF9EC] border-2 border-[#171717] shadow-[3px_3px_0px_#171717] overflow-hidden flex flex-col sm:flex-row"
                    >
                      <div className="sm:w-32 h-32 sm:h-auto shrink-0 bg-[#FFF3C4] border-b sm:border-b-0 sm:border-r border-[#171717]">
                        <RecipeImage
                          src={recipe.image_url}
                          alt={recipe.name}
                          category={recipe.category}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                        <div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#F8D84A] border border-[#171717]">
                            {FOOD_CATEGORY_LABELS[recipe.category]}
                          </span>
                          <h3 className="text-sm font-extrabold text-[#171717] mt-1">
                            {recipe.name}
                          </h3>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#EAE5DA]">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#77736B]">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" aria-hidden="true" />
                              {recipe.cooking_time} นาที
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <ChefHat className="w-3 h-3" aria-hidden="true" />
                              {DIFFICULTY_LABELS[recipe.difficulty]}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={ext.primaryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#171717] text-[#F8D84A] text-xs font-extrabold hover:bg-[#171717]/90"
                            >
                              <span>ดูสูตรอาหาร</span>
                              <ExternalLink className="w-3 h-3" aria-hidden="true" />
                            </a>
                            <Link
                              href={`/recipes/${encodeURIComponent(recipe.id)}`}
                              className="inline-flex items-center gap-0.5 text-xs font-bold text-[#171717] hover:underline"
                            >
                              <span>ส่วนผสม</span>
                              <ArrowRight className="w-3 h-3" aria-hidden="true" />
                            </Link>
                          </div>
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
            className="rounded-3xl bg-white border-2 border-[#171717] shadow-[4px_4px_0px_#171717] p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#EAE5DA] pb-3">
              <div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-400 text-[10px] font-extrabold mb-1">
                  <AlertCircle className="w-3 h-3" aria-hidden="true" />
                  <span>NEAR MATCH · ขาดวัตถุดิบอีกแค่ 1–2 อย่าง</span>
                </div>
                <h2
                  id="fridge-nearmatch-heading"
                  className="text-base sm:text-lg font-extrabold text-[#171717]"
                >
                  ขาดอีกนิดเดียว! ({nearMatchRecipes.length} เมนู)
                </h2>
              </div>
            </div>

            {nearMatchRecipes.length === 0 ? (
              <p className="text-xs text-[#77736B] py-4 text-center bg-[#FFF9EC] rounded-2xl border border-[#171717]/15">
                ยังไม่มีเมนูที่ขาดวัตถุดิบเพียง 1–2 อย่างจากรายการที่คุณเลือก
              </p>
            ) : (
              <div className="space-y-3">
                {nearMatchRecipes.map(({ recipe, missingRequiredIds }) => {
                  const ext = getExternalRecipeLinks(recipe);
                  const missingNames = missingRequiredIds.map(
                    (id) => catalog[id]?.name_th ?? id
                  );
                  return (
                    <div
                      key={recipe.id}
                      className="p-3.5 rounded-2xl bg-[#FFF9EC] border-2 border-[#171717]/40 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#EAE5DA] text-[#171717]">
                            {FOOD_CATEGORY_LABELS[recipe.category]} · {recipe.cooking_time} นาที
                          </span>
                          <h3 className="text-sm font-extrabold text-[#171717] mt-1">
                            {recipe.name}
                          </h3>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 border border-[#171717] text-[11px] font-extrabold shrink-0">
                          ขาดอีก {missingRequiredIds.length} อย่าง
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-bold text-[#77736B]">วัตถุดิบที่ต้องหาเพิ่ม:</span>
                        {missingNames.map((mName) => (
                          <span
                            key={mName}
                            className="px-2 py-0.5 rounded-md bg-white border border-[#171717] text-[11px] font-extrabold text-[#171717]"
                          >
                            + {mName}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#EAE5DA]">
                        <a
                          href={ext.primaryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#171717] text-[#F8D84A] text-xs font-extrabold hover:bg-[#171717]/90"
                        >
                          <span>ดูสูตรอาหาร</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                        <Link
                          href={`/recipes/${encodeURIComponent(recipe.id)}`}
                          className="inline-flex items-center gap-0.5 text-xs font-bold text-[#171717] hover:underline"
                        >
                          <span>ส่วนผสม</span>
                          <ArrowRight className="w-3 h-3" aria-hidden="true" />
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

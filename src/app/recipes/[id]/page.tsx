'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ShareRecipeButton } from '@/components/ShareRecipeButton';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  ExternalLink,
  Heart,
  ListChecks,
  Pencil,
  Refrigerator,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import { useKinDiApp } from '@/components/AppShell';
import { RecipeImage } from '@/components/RecipeImage';
import { ALL_ALLERGEN_IDS } from '@/data/recipes-seed';
import { isRecipeSafeForUser } from '@/features/food-safety/eligibility';
import { getExternalRecipeLinks } from '@/lib/external-recipes';
import { fetchApprovedRecipeById } from '@/lib/recipes-repository';
import { getMergedIngredientsCatalog } from '@/lib/user-storage';
import {
  ALLERGEN_LABELS,
  DIETARY_PREFERENCE_LABELS,
  DIFFICULTY_LABELS,
  FOOD_CATEGORY_LABELS,
  MEAL_TYPE_LABELS,
  Recipe,
  SAFETY_DISCLAIMER_TH,
} from '@/types/recipe';

const ROLE_LABELS: Record<string, string> = {
  main: 'วัตถุดิบหลัก',
  sauce: 'ซอสปรุงรส',
  stock: 'น้ำซุป / เบส',
  dressing: 'น้ำสลัด / น้ำยำ',
  condiment: 'เครื่องปรุง / สมุนไพร',
  garnish: 'โรยหน้า / เครื่องเคียง',
};

interface ChecklistItem {
  id: string;
  name: string;
  roleText: string;
  isOptional: boolean;
  quantity: string;
}

export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const rawId = typeof params?.id === 'string' ? params.id : '';

  const { restrictions, favoriteIds, toggleFavorite } = useKinDiApp();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Interactive ingredient checklist tracking
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  // Interactive cooking steps tracking
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    fetchApprovedRecipeById(rawId).then((res) => {
      if (active) {
        setRecipe(res);
        setIsLoading(false);
      }
    }).catch(error => {
      if (active) { setRecipe(null); setLoadError(error.message); setIsLoading(false); }
    });
    return () => { active = false; };
  }, [rawId, retry]);

  const catalog = useMemo(() => getMergedIngredientsCatalog(), [recipe]);

  // Assemble full checklist items (catalog ingredients + custom ingredients)
  const checklistItems = useMemo<ChecklistItem[]>(() => {
    if (!recipe) return [];

    const items: ChecklistItem[] = [];

    (recipe.ingredients ?? []).forEach((item, index) => {
      const entry = catalog[item.ingredient_id];
      const name = entry?.name_th || item.ingredient_id;
      const roleText = ROLE_LABELS[item.role] || item.role;
      items.push({
        id: `ing-${item.ingredient_id}-${index}`,
        name,
        roleText,
        isOptional: Boolean(item.is_optional),
        quantity: item.quantity,
      });
    });

    (recipe.custom_ingredients ?? []).forEach((customName, index) => {
      items.push({
        id: `custom-${index}-${customName}`,
        name: customName,
        roleText: 'วัตถุดิบเพิ่มเติม',
        isOptional: false,
        quantity: 'ตามชอบ',
      });
    });

    return items;
  }, [recipe, catalog]);

  const toggleIngredient = useCallback((id: string) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const checkAllIngredients = useCallback(() => {
    setCheckedIngredients(new Set(checklistItems.map((item) => item.id)));
  }, [checklistItems]);

  const clearCheckedIngredients = useCallback(() => {
    setCheckedIngredients(new Set());
  }, []);

  const toggleStep = useCallback((stepIndex: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepIndex)) {
        next.delete(stepIndex);
      } else {
        next.add(stepIndex);
      }
      return next;
    });
  }, []);

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-10 space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-11 w-36 rounded-xl bg-[#DDD2C2]" />
          <div className="h-11 w-44 rounded-xl bg-[#DDD2C2]" />
        </div>
        <div className="h-96 w-full rounded-xl bg-white border border-[#DDD2C2]" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-5 h-80 rounded-xl bg-white border border-[#DDD2C2]" />
          <div className="md:col-span-7 h-80 rounded-xl bg-white border border-[#DDD2C2]" />
        </div>
      </div>
    );
  }

  // Not found state
  if (!recipe) {
    return (
      <div className="kindi-surface-card max-w-lg mx-auto my-14 p-8 sm:p-10 text-center space-y-4">
        <div className="w-16 h-16 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-700">
          <AlertTriangle className="w-8 h-8" aria-hidden="true" />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-[#302923]">
          {loadError ? "โหลดสูตรอาหารไม่สำเร็จ" : "ไม่พบสูตรอาหารนี้ในระบบ"}
        </h1>
        <p className="text-sm text-[#6E5D50] leading-relaxed max-w-sm mx-auto">
          {loadError || "เมนูนี้อาจถูกลบไปแล้ว หรือรหัสสูตรอาหารไม่ถูกต้อง"}
        </p>
        {loadError && <button type="button" className="kindi-btn-secondary min-h-11 px-4" onClick={() => setRetry(value => value + 1)}>ลองอีกครั้ง</button>}
        <div className="pt-2 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="kindi-btn-primary min-h-11 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#FBF0DC]" aria-hidden="true" />
            <span>กลับไปสุ่มไพ่เมนู</span>
          </Link>
        </div>
      </div>
    );
  }

  const isSafeForCurrentUser = isRecipeSafeForUser(recipe, restrictions, catalog);
  const isFavorite = favoriteIds.includes(recipe.id);
  const externalLinks = getExternalRecipeLinks(recipe);
  const presentAllergens = ALL_ALLERGEN_IDS.filter(
    (alg) => recipe.allergen_assessments?.[alg]?.status !== 'free'
  );

  const checkedCount = checkedIngredients.size;
  const totalCount = checklistItems.length;
  const isAllChecked = totalCount > 0 && checkedCount === totalCount;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <article className="recipe-detail-page space-y-6 sm:space-y-8 pb-12">
      {/* Top Action & Navigation Bar */}
      <nav aria-label="แถบนำทางหน้ารายละเอียดสูตรอาหาร" className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="kindi-btn-secondary min-h-11 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 shrink-0 text-[#302923]" aria-hidden="true" />
          <span>กลับไปหน้าสุ่มไพ่</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/community?edit=${encodeURIComponent(recipe.id)}#recipe-share-form`}
            className="kindi-btn-secondary min-h-11 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap"
          >
            <Pencil className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>แก้ไขสูตร</span>
          </Link>
          <Link
            href="/fridge"
            className="kindi-btn-secondary min-h-11 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap cursor-pointer"
          >
            <Refrigerator className="w-4 h-4 shrink-0 text-[#6E5D50]" aria-hidden="true" />
            <span className="hidden xs:inline">โหมดค้นตู้เย็น</span>
            <span className="xs:hidden">ค้นตู้เย็น</span>
          </Link>

          <button
            type="button"
            onClick={() => toggleFavorite(recipe.id)}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? 'ลบออกจากเมนูโปรด' : 'บันทึกเป็นเมนูโปรด'}
            className={`min-h-11 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              isFavorite
                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/70 shadow-xs'
                : 'kindi-btn-secondary'
            }`}
          >
            <Heart
              className={`w-4 h-4 shrink-0 ${isFavorite ? 'fill-current text-rose-600' : 'text-[#302923]'}`}
              aria-hidden="true"
            />
            <span>{isFavorite ? 'บันทึกแล้ว' : 'เพิ่มเป็นเมนูโปรด'}</span>
          </button>
        </div>
      </nav>

      {/* Food Safety & Dietary Allergen Warning Banner */}
      {!isSafeForCurrentUser ? (
        <div
          role="alert"
          className="p-4 sm:p-5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-3.5 shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-white border border-rose-200 flex items-center justify-center shrink-0 text-rose-700">
            <ShieldAlert className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="text-xs sm:text-sm text-[#302923] space-y-1">
            <p className="font-semibold text-rose-900 text-sm sm:text-base">
              คำเตือน: เมนูนี้ไม่ตรงกับ &ldquo;ข้อจำกัดทางอาหาร&rdquo; ที่คุณตั้งค่าไว้ในปัจจุบัน
            </p>
            <p className="text-[#6E5D50] leading-relaxed">
              ระบบสุ่มไพ่จะคัดเมนูนี้ออกโดยอัตโนมัติ โปรดตรวจสอบรายการวัตถุดิบและสารก่อภูมิแพ้ด้านล่างอย่างละเอียดก่อนรับประทาน
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3.5 text-xs sm:text-sm text-emerald-950 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-white border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-700">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="leading-relaxed">
            <span className="font-semibold text-[#302923]">ปลอดภัยสำหรับคุณ:</span>{' '}
            <span className="font-medium text-emerald-900">
              เมนูนี้ผ่านเกณฑ์ข้อจำกัดทางอาหารและสารก่อภูมิแพ้ที่คุณตั้งค่าไว้ทั้งหมด
            </span>
          </div>
        </div>
      )}

      {/* Recipe Hero Bento Card */}
      <section aria-labelledby="recipe-title" className="kindi-surface-card rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Hero Image */}
          <div className="md:col-span-5 relative min-h-[260px] md:min-h-[360px] bg-[#F1EADF] border-b md:border-b-0 md:border-r border-[#DDD2C2]">
            <RecipeImage
              src={recipe.image_url}
              alt={recipe.name}
              category={recipe.category}
              className="w-full h-full min-h-[260px] md:min-h-full object-cover"
            />
          </div>

          {/* Hero Content Details */}
          <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Category & Meal Type Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-[#F3E3D2] border border-[#DDD2C2] text-xs font-semibold text-[#302923] whitespace-nowrap">
                  {FOOD_CATEGORY_LABELS[recipe.category]}
                </span>
                {recipe.meal_types.map((mt) => (
                  <span
                    key={mt}
                    className="px-2.5 py-1 rounded-xl bg-[#F1EADF] border border-[#DDD2C2] text-xs font-bold text-[#302923] whitespace-nowrap"
                  >
                    {MEAL_TYPE_LABELS[mt]}
                  </span>
                ))}
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h1
                  id="recipe-title"
                  className="text-[clamp(1.6rem,1.3rem+1.5vw,2.35rem)] font-semibold text-[#302923] leading-relaxed tracking-tight"
                >
                  {recipe.name}
                </h1>
                <p className="text-sm sm:text-base text-[#6E5D50] leading-relaxed">
                  {recipe.description}
                </p>
              </div>

              <ShareRecipeButton id={recipe.id} name={recipe.name} />
              {recipe.id === 'shared-1793208511753' && (
                <p className="text-xs text-[#6E5D50] leading-relaxed">
                  ภาพประกอบหมูทอดกระเทียม: <a href="https://commons.wikimedia.org/wiki/File:Mu_thot_krathiam.jpg" target="_blank" rel="noopener noreferrer" className="underline">Takeaway / Wikimedia Commons</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer" className="underline">CC BY-SA 3.0</a> · ย่อขนาดและแปลงเป็น WebP
                </p>
              )}
              {/* Verified Dietary Badges */}
              {Array.isArray(recipe.dietary_tags) && recipe.dietary_tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {recipe.dietary_tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-950 border border-emerald-200 text-xs font-semibold whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      <span>{DIETARY_PREFERENCE_LABELS[tag]?.label ?? tag}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Metrics Bento Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-lg bg-[#FBF7EF] border border-[#DDD2C2]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#6E5D50]">
                  <Clock className="w-4 h-4 text-[#302923]" aria-hidden="true" />
                  <span>เวลาทำ</span>
                </div>
                <p className="text-base sm:text-lg font-semibold text-[#302923] mt-1 tabular-nums whitespace-nowrap">
                  {recipe.cooking_time} นาที
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#FBF7EF] border border-[#DDD2C2]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#6E5D50]">
                  <ChefHat className="w-4 h-4 text-[#302923]" aria-hidden="true" />
                  <span>ระดับความยาก</span>
                </div>
                <p className="text-base sm:text-lg font-semibold text-[#302923] mt-1 whitespace-nowrap">
                  {DIFFICULTY_LABELS[recipe.difficulty]}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#FBF7EF] border border-[#DDD2C2] col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#6E5D50]">
                  <UtensilsCrossed className="w-4 h-4 text-[#302923]" aria-hidden="true" />
                  <span>วัตถุดิบ</span>
                </div>
                <p className="text-base sm:text-lg font-semibold text-[#302923] mt-1 tabular-nums whitespace-nowrap">
                  {totalCount} รายการ
                </p>
              </div>
            </div>

            {/* External Recipe Link Button (Direct single button, labeled: ลิงก์สูตรอาหาร) */}
            <div className="pt-4 border-t border-[#DDD2C2] space-y-2">
              <span className="text-xs font-semibold text-[#302923] block">
                เปิดดูสูตรอาหารและวิธีทำฉบับเต็มจากต้นทาง:
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={externalLinks.primaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kindi-btn-primary min-h-11 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors"
                >
                  <span>ลิงก์สูตรอาหาร</span>
                  <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
                </a>

                {recipe.external_source_name && (
                  <span className="text-xs text-[#76685C] font-semibold whitespace-nowrap">
                    แหล่งที่มา: {recipe.external_source_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Interactive Checklist & Step-by-Step Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Column: Interactive Ingredient Checklist */}
        <section
          aria-labelledby="ingredients-checklist-heading"
          className="kindi-surface-card md:col-span-5 rounded-xl p-6 sm:p-7 space-y-5"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-[#302923]" aria-hidden="true" />
                <h2
                  id="ingredients-checklist-heading"
                  className="text-lg font-semibold text-[#302923]"
                >
                  เช็กลิสต์วัตถุดิบ
                </h2>
              </div>

              <span className="text-xs font-semibold text-[#6E5D50] tabular-nums whitespace-nowrap">
                {checkedCount}/{totalCount}
              </span>
            </div>

            {/* Subtle Progress Bar */}
            <div
              className="w-full h-2 rounded-full bg-[#F1EADF] overflow-hidden"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="ความคืบหน้าในการเตรียมวัตถุดิบ"
            >
              <div
                className="h-full bg-[#302923] transition-colors duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Quick Action Toggle Buttons */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs text-[#76685C] font-medium">
                {isAllChecked
                  ? 'เตรียมวัตถุดิบครบถ้วนแล้ว!'
                  : 'แตะที่รายการเพื่อทำเครื่องหมาย'}
              </span>

              <div className="flex items-center gap-1.5">
                {checkedCount > 0 ? (
                  <button
                    type="button"
                    onClick={clearCheckedIngredients}
                    className="min-h-8 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[#6E5D50] hover:text-[#302923] hover:bg-[#F1EADF] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" aria-hidden="true" />
                    <span>ล้าง</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={checkAllIngredients}
                    className="min-h-8 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[#302923] hover:bg-[#F1EADF] transition-colors cursor-pointer"
                  >
                    <Check className="w-3 h-3" aria-hidden="true" />
                    <span>เลือกหมด</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Checklist Rows */}
          <ul className="divide-y divide-[#DDD2C2] border-t border-[#DDD2C2]">
            {checklistItems.map((item) => {
              const isChecked = checkedIngredients.has(item.id);
              return (
                <li key={item.id} className="py-2.5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isChecked}
                    onClick={() => toggleIngredient(item.id)}
                    className="w-full min-h-11 flex items-center justify-between gap-3 text-left p-2 rounded-xl transition-colors hover:bg-[#FBF7EF] cursor-pointer group"
                  >
                    {/* Checkbox box & Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-[#302923] border-[#302923] text-[#FBF0DC]'
                            : 'bg-white border-[#C6B7A5] group-hover:border-[#302923] text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                      </div>

                      <div className="min-w-0">
                        <p
                          className={`text-sm font-bold transition-colors line-clamp-1 ${
                            isChecked
                              ? 'text-[#76685C] line-through'
                              : 'text-[#302923]'
                          }`}
                        >
                          {item.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#F1EADF] text-[#6E5D50] border border-[#DDD2C2] whitespace-nowrap">
                            {item.roleText}
                          </span>
                          {item.isOptional && (
                            <span className="text-[11px] font-medium text-[#76685C] whitespace-nowrap">
                              (ไม่บังคับ)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quantity Badge */}
                    <span
                      className={`text-xs sm:text-sm font-semibold shrink-0 tabular-nums whitespace-nowrap transition-colors ${
                        isChecked ? 'text-[#76685C]' : 'text-[#302923]'
                      }`}
                    >
                      {item.quantity}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Right Column: Step-by-Step Cooking Steps */}
        <section
          aria-labelledby="cooking-steps-heading"
          className="kindi-surface-card md:col-span-7 rounded-xl p-6 sm:p-7 space-y-5"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 id="cooking-steps-heading" className="text-lg font-semibold text-[#302923]">
                ขั้นตอนวิธีทำ
              </h2>
              <p className="text-xs text-[#6E5D50] mt-0.5">
                แตะเพื่อทำเครื่องหมายขั้นตอนที่ทำเสร็จแล้ว
              </p>
            </div>

            <span className="text-xs font-semibold text-[#6E5D50] tabular-nums whitespace-nowrap">
              {completedSteps.size}/{recipe.instructions.length} ขั้นตอน
            </span>
          </div>

          <ol className="space-y-3.5">
            {recipe.instructions.map((stepText, index) => {
              const isStepDone = completedSteps.has(index);
              const stepNumber = index + 1;
              return (
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => toggleStep(index)}
                    aria-pressed={isStepDone}
                    className={`w-full min-h-11 text-left p-4 sm:p-5 rounded-lg border transition-colors cursor-pointer flex items-start gap-4 ${
                      isStepDone
                        ? 'bg-[#F1EADF]/60 border-[#C6B7A5]'
                        : 'bg-[#FBF7EF] border-[#DDD2C2] hover:border-[#C6B7A5]'
                    }`}
                  >
                    {/* Step Number Badge */}
                    <div
                      className={`w-8 h-8 rounded-xl font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5 tabular-nums border transition-colors ${
                        isStepDone
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-[#F3E3D2] text-[#302923] border-[#DDD2C2]'
                      }`}
                    >
                      {isStepDone ? (
                        <Check className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                      ) : (
                        stepNumber
                      )}
                    </div>

                    {/* Step Instruction Text */}
                    <div className="min-w-0 flex-1 space-y-1 break-words">
                      <span className="text-xs font-bold text-[#6E5D50] block">
                        ขั้นตอนที่ {stepNumber}
                      </span>
                      <p
                        className={`text-sm sm:text-base leading-relaxed font-medium transition-colors ${
                          isStepDone ? 'text-[#76685C] line-through' : 'text-[#302923]'
                        }`}
                      >
                        {stepText}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      {/* Allergen & Food Safety Assessment Section */}
      <section
        aria-labelledby="allergen-assessment-heading"
        className="kindi-surface-card rounded-xl p-6 sm:p-8 space-y-5"
      >
        <div className="space-y-1">
          <h2
            id="allergen-assessment-heading"
            className="text-base sm:text-lg font-semibold text-[#302923]"
          >
            ข้อมูลประเมินสารก่อภูมิแพ้และความปลอดภัยของเมนูนี้
          </h2>
          <p className="text-xs sm:text-sm text-[#6E5D50]">
            ประเมินจากรายการวัตถุดิบหลัก 9 หมวดหมู่อาหารและสารก่อภูมิแพ้สากล
          </p>
        </div>

        {presentAllergens.length === 0 ? (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs sm:text-sm font-bold text-emerald-950">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
            <span>
              เมนูนี้ไม่มีส่วนผสมของสารก่อภูมิแพ้หลักทั้ง 9 ชนิดตามรายการวัตถุดิบที่ระบุในสูตร
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {presentAllergens.map((alg) => {
              const assessment = recipe.allergen_assessments?.[alg];
              return (
                <div
                  key={alg}
                  className="p-3.5 rounded-lg bg-rose-50/80 border border-rose-200 flex flex-col justify-between space-y-1"
                >
                  <span className="text-xs sm:text-sm font-semibold text-rose-950">
                    มีส่วนผสมของ: {ALLERGEN_LABELS[alg].label}
                  </span>
                  {assessment?.notes && (
                    <span className="text-xs text-[#6E5D50] leading-relaxed">
                      {assessment.notes}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Safety Disclaimer */}
        <div className="p-4 rounded-lg bg-[#F1EADF] text-xs font-medium text-[#6E5D50] leading-relaxed border border-[#DDD2C2]">
          {SAFETY_DISCLAIMER_TH}
        </div>
      </section>
    </article>
  );
}

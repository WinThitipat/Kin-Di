'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  Clock,
  ExternalLink,
  Heart,
  Refrigerator,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
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

export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const rawId = typeof params?.id === 'string' ? decodeURIComponent(params.id) : '';

  const { restrictions, favoriteIds, toggleFavorite } = useKinDiApp();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchApprovedRecipeById(rawId).then((res) => {
      if (active) {
        setRecipe(res);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [rawId]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 space-y-4">
        <div className="h-10 w-44 rounded-xl bg-[#171717]/10 animate-pulse" />
        <div className="h-80 w-full rounded-3xl bg-[#171717]/10 border-2 border-[#171717]/20 animate-pulse" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 rounded-3xl bg-white border-2 border-[#171717] shadow-[5px_5px_0px_#171717] text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#FFE4E6] border-2 border-[#171717] flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-[#171717]" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-extrabold text-[#171717]">
          ไม่พบสูตรอาหารนี้ในระบบ
        </h1>
        <p className="text-sm text-[#77736B]">
          เมนูนี้อาจถูกลบ หรือรหัสไม่ถูกต้อง
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F8D84A] text-[#171717] border-2 border-[#171717] font-extrabold text-sm"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>กลับไปสุ่มไพ่เมนู</span>
          </Link>
        </div>
      </div>
    );
  }

  const catalog = getMergedIngredientsCatalog();
  const isSafeForCurrentUser = isRecipeSafeForUser(recipe, restrictions, catalog);
  const isFavorite = favoriteIds.includes(recipe.id);
  const externalLinks = getExternalRecipeLinks(recipe);
  const presentAllergens = ALL_ALLERGEN_IDS.filter(
    (alg) => recipe.allergen_assessments?.[alg]?.status !== 'free'
  );

  return (
    <article className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
      {/* Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border-2 border-[#171717] shadow-[2px_2px_0px_#171717] text-xs sm:text-sm font-extrabold text-[#171717] hover:bg-[#EAE5DA]"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>กลับไปหน้าสุ่มไพ่ (Food Roulette)</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/fridge"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border-2 border-[#171717] text-xs sm:text-sm font-bold text-[#171717] hover:bg-[#EAE5DA]"
          >
            <Refrigerator className="w-4 h-4" aria-hidden="true" />
            <span>โหมดค้นตู้เย็น</span>
          </Link>

          <button
            type="button"
            onClick={() => toggleFavorite(recipe.id)}
            aria-pressed={isFavorite}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-[#171717] shadow-[2px_2px_0px_#171717] text-xs sm:text-sm font-extrabold cursor-pointer ${
              isFavorite ? 'bg-[#FFE4E6] text-red-700' : 'bg-white text-[#171717] hover:bg-[#EAE5DA]'
            }`}
          >
            <Heart
              className={`w-4 h-4 ${isFavorite ? 'fill-current text-red-600' : ''}`}
              aria-hidden="true"
            />
            <span>{isFavorite ? 'บันทึกเป็นเมนูโปรดแล้ว' : 'เพิ่มเป็นเมนูโปรด'}</span>
          </button>
        </div>
      </div>

      {/* Compatibility Banner with Current User Restrictions */}
      {!isSafeForCurrentUser ? (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-[#FFE4E6] border-2 border-[#171717] shadow-[3px_3px_0px_#171717] flex items-start gap-3"
        >
          <ShieldAlert className="w-5 h-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs sm:text-sm text-[#171717]">
            <p className="font-extrabold text-red-900">
              คำเตือน: เมนูนี้ไม่ตรงกับ &ldquo;ข้อจำกัดทางอาหาร&rdquo; ที่คุณตั้งค่าไว้ในปัจจุบัน
            </p>
            <p className="mt-0.5 text-[#171717]/85">
              ระบบสุ่มไพ่จะคัดเมนูนี้ออกโดยอัตโนมัติ โปรดตรวจสอบรายการวัตถุดิบและสารก่อภูมิแพ้ด้านล่างอย่างละเอียด
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-100 border-2 border-[#171717] flex items-center gap-2.5 text-xs sm:text-sm font-bold text-emerald-950">
          <ShieldCheck className="w-5 h-5 text-emerald-800 shrink-0" aria-hidden="true" />
          <span>เมนูนี้ผ่านเกณฑ์ข้อจำกัดทางอาหารและสารก่อภูมิแพ้ที่คุณตั้งค่าไว้</span>
        </div>
      )}

      {/* Recipe Hero Card */}
      <div className="rounded-3xl bg-white border-2 border-[#171717] shadow-[6px_6px_0px_#171717] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-5 min-h-[240px] md:min-h-[320px] bg-[#FFF3C4] border-b-2 md:border-b-0 md:border-r-2 border-[#171717]">
            <RecipeImage
              src={recipe.image_url}
              alt={recipe.name}
              category={recipe.category}
              className="w-full h-full min-h-[240px] md:min-h-full"
            />
          </div>

          <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-[#F8D84A] border border-[#171717] text-xs font-extrabold text-[#171717]">
                  {FOOD_CATEGORY_LABELS[recipe.category]}
                </span>
                {recipe.meal_types.map((mt) => (
                  <span
                    key={mt}
                    className="px-2.5 py-1 rounded-xl bg-[#EAE5DA] text-xs font-bold text-[#171717]"
                  >
                    {MEAL_TYPE_LABELS[mt]}
                  </span>
                ))}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] leading-tight">
                {recipe.name}
              </h1>

              <p className="text-sm sm:text-base text-[#77736B] leading-relaxed">
                {recipe.description}
              </p>
            </div>

            {/* Metadata Metrics (Time & Difficulty, without Budget) */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-[#FFF9EC] border-2 border-[#171717]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#77736B]">
                  <Clock className="w-4 h-4 text-[#171717]" aria-hidden="true" />
                  <span>เวลาทำ</span>
                </div>
                <p className="text-base sm:text-lg font-extrabold text-[#171717] mt-1">
                  {recipe.cooking_time} นาที
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FFF9EC] border-2 border-[#171717]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#77736B]">
                  <ChefHat className="w-4 h-4 text-[#171717]" aria-hidden="true" />
                  <span>ความยาก</span>
                </div>
                <p className="text-base sm:text-lg font-extrabold text-[#171717] mt-1">
                  {DIFFICULTY_LABELS[recipe.difficulty]}
                </p>
              </div>
            </div>

            {/* Verified Dietary Tags */}
            {Array.isArray(recipe.dietary_tags) && recipe.dietary_tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {recipe.dietary_tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-500 text-xs font-extrabold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{DIETARY_PREFERENCE_LABELS[tag]?.label ?? tag}</span>
                  </span>
                ))}
              </div>
            )}

            {/* External Recipe Website Links */}
            <div className="pt-2 border-t border-[#EAE5DA] space-y-2">
              <span className="text-xs font-extrabold text-[#171717] block">
                เปิดดูสูตรอาหารและวิธีทำฉบับเต็มบนเว็บไซต์ต้นทาง:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {externalLinks.sources.map((src, idx) => (
                  <a
                    key={src.name}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold border-2 border-[#171717] transition-colors ${
                      idx === 0
                        ? 'bg-[#171717] text-[#F8D84A] shadow-[2px_2px_0px_#F8D84A]'
                        : 'bg-[#FFF9EC] text-[#171717] hover:bg-[#F8D84A]'
                    }`}
                  >
                    <span>ดูสูตรบน {src.name}</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ingredients & Cooking Instructions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Ingredients Column */}
        <section
          aria-labelledby="ingredients-heading"
          className="md:col-span-5 rounded-3xl bg-white border-2 border-[#171717] shadow-[4px_4px_0px_#171717] p-6 space-y-4"
        >
          <h2 id="ingredients-heading" className="text-lg font-extrabold text-[#171717]">
            วัตถุดิบและปริมาณ ({recipe.ingredients?.length ?? 0} รายการ)
          </h2>

          <ul className="divide-y divide-[#EAE5DA]">
            {(recipe.ingredients ?? []).map((item, idx) => {
              const catalogEntry = catalog[item.ingredient_id];
              return (
                <li key={`${item.ingredient_id}-${idx}`} className="py-3 flex justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#171717]">
                      {catalogEntry?.name_th ?? item.ingredient_id}
                    </p>
                    <span className="text-[11px] font-semibold text-[#77736B]">
                      {ROLE_LABELS[item.role] ?? item.role}
                      {item.is_optional ? ' (ไม่บังคับ)' : ''}
                    </span>
                  </div>
                  <span className="text-sm font-extrabold text-[#171717] shrink-0">
                    {item.quantity}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Cooking Instructions Column */}
        <section
          aria-labelledby="instructions-heading"
          className="md:col-span-7 rounded-3xl bg-white border-2 border-[#171717] shadow-[4px_4px_0px_#171717] p-6 space-y-4"
        >
          <h2 id="instructions-heading" className="text-lg font-extrabold text-[#171717]">
            ขั้นตอนวิธีทำ
          </h2>

          <ol className="space-y-3.5">
            {recipe.instructions.map((step, index) => (
              <li
                key={index}
                className="p-4 rounded-2xl bg-[#FFF9EC] border border-[#171717]/25 flex items-start gap-3.5"
              >
                <span className="w-7 h-7 rounded-xl bg-[#F8D84A] border-2 border-[#171717] text-[#171717] font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <p className="text-sm text-[#171717] leading-relaxed font-medium">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Allergen & Safety Information Section */}
      <section
        aria-labelledby="allergen-info-heading"
        className="rounded-3xl bg-white border-2 border-[#171717] shadow-[4px_4px_0px_#171717] p-6 space-y-4"
      >
        <h2 id="allergen-info-heading" className="text-base sm:text-lg font-extrabold text-[#171717]">
          ข้อมูลประเมินสารก่อภูมิแพ้และความปลอดภัยของเมนูนี้
        </h2>

        {presentAllergens.length === 0 ? (
          <p className="text-sm font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 rounded-xl p-3">
            เมนูนี้ไม่มีส่วนผสมของสารก่อภูมิแพ้หลักทั้ง 9 ชนิดตามรายการวัตถุดิบที่ระบุ
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {presentAllergens.map((alg) => {
              const assessment = recipe.allergen_assessments?.[alg];
              return (
                <div
                  key={alg}
                  className="p-3 rounded-xl bg-[#FFE4E6]/70 border border-red-300 flex flex-col justify-between"
                >
                  <span className="text-xs sm:text-sm font-extrabold text-[#171717]">
                    มีส่วนผสมของ: {ALLERGEN_LABELS[alg].label}
                  </span>
                  {assessment?.notes && (
                    <span className="text-xs text-[#77736B] mt-0.5">{assessment.notes}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="p-3.5 rounded-2xl bg-[#EAE5DA] text-xs font-medium text-[#171717] leading-relaxed">
          {SAFETY_DISCLAIMER_TH}
        </div>
      </section>
    </article>
  );
}

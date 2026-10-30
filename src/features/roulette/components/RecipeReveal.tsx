'use client';

import React, { useEffect, useState } from 'react';
import { readPantry, FridgePantry } from '@/lib/fridge-pantry';
import { BASIC_PANTRY_CONDIMENT_IDS } from '@/features/food-safety/eligibility';
import { INGREDIENTS_CATALOG } from '@/data/recipes-seed';
import Link from 'next/link';
import {
  ChefHat,
  Clock,
  ExternalLink,
  FileText,
  Heart,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { RecipeImage } from '@/components/RecipeImage';
import { getExternalRecipeLinks } from '@/lib/external-recipes';
import {
  DIETARY_PREFERENCE_LABELS,
  DIFFICULTY_LABELS,
  FOOD_CATEGORY_LABELS,
  MEAL_TYPE_LABELS,
  Recipe,
} from '@/types/recipe';

interface RecipeRevealProps {
  recipe: Recipe;
  cardIndex?: number;
  isFavorite: boolean;
  onToggleFavorite: (recipeId: string) => void;
  onNewRound: () => void;
  onCloseModal: () => void;
}

export function RecipeReveal({
  recipe,
  cardIndex,
  isFavorite,
  onToggleFavorite,
  onNewRound,
  onCloseModal,
}: RecipeRevealProps) {
  const verifiedDietaryTags = Array.isArray(recipe.dietary_tags) ? recipe.dietary_tags : [];
  const externalLinks = getExternalRecipeLinks(recipe);
  const [pantry, setPantry] = useState<FridgePantry | null>(null);
  useEffect(() => { const sync = () => setPantry(readPantry()); sync(); window.addEventListener('storage', sync); window.addEventListener('kindi-pantry-updated', sync); return () => { window.removeEventListener('storage', sync); window.removeEventListener('kindi-pantry-updated', sync); }; }, []);
  const available = new Set(pantry?.ingredientIds ?? []);
  if (pantry?.assumeBasicCondiments) BASIC_PANTRY_CONDIMENT_IDS.forEach(id => available.add(id));
  const required = recipe.ingredients?.filter(entry => !entry.is_optional) ?? [];
  const missing = [...new Set(required.filter(entry => !available.has(entry.ingredient_id)).map(entry => entry.ingredient_id))];
  const ingredientName = (id: string) => recipe.ingredient_catalog?.find(item => item.id === id)?.name_th || INGREDIENTS_CATALOG[id]?.name_th || id.replace(/^custom_/, '').replaceAll('_', ' ');

  return (
    <div
      aria-live="polite"
      className="kindi-reveal-panel kindi-surface-card w-full max-w-2xl mx-auto rounded-xl overflow-hidden"
    >
      {/* Top Celebration Banner */}
      <div className="bg-[#F3E3D2] border-b border-[#DDD2C2] px-5 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2">
          <span className="w-7 h-7 rounded-xl bg-[#302923] text-[#FBF0DC] flex items-center justify-center">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
          </span>
          <span className="font-semibold text-sm sm:text-base text-[#302923]">
            ได้เมนูนี้แล้ว วันนี้กินดิ!
          </span>
        </div>
        {cardIndex !== undefined && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-[#DDD2C2] text-[#302923] tabular-nums">
            จากไพ่ใบที่ #{cardIndex}
          </span>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-12">
        {/* Recipe Image Column */}
        <div className="sm:col-span-5 relative min-h-[200px] sm:min-h-[260px] bg-[#F1EADF] border-b sm:border-b-0 sm:border-r border-[#DDD2C2]">
          <RecipeImage
            src={recipe.image_url}
            alt={recipe.name}
            category={recipe.category}
            className="w-full h-full min-h-[200px] sm:min-h-full"
          />

          <button
            type="button"
            onClick={() => onToggleFavorite(recipe.id)}
            aria-label={isFavorite ? 'ลบออกจากเมนูโปรด' : 'บันทึกเป็นเมนูโปรด'}
            aria-pressed={isFavorite}
            className={`absolute top-3 right-3 w-10 h-10 rounded-lg border border-[#DDD2C2] shadow-xs flex items-center justify-center transition-colors cursor-pointer ${
              isFavorite ? 'bg-rose-50 text-rose-600' : 'bg-white/95 text-[#302923] hover:bg-white'
            }`}
          >
            <Heart
              className={`w-5 h-5 ${isFavorite ? 'fill-current text-rose-600' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Recipe Details Column */}
        <div className="sm:col-span-7 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            {/* Category & Meal Type Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-lg bg-[#302923] text-[#FBF0DC] text-xs font-bold">
                {FOOD_CATEGORY_LABELS[recipe.category]}
              </span>
              {Array.isArray(recipe.meal_types) &&
                recipe.meal_types.map((mt) => (
                  <span
                    key={mt}
                    className="px-2 py-0.5 rounded-lg bg-[#F1EADF] border border-[#DDD2C2] text-[#302923] text-xs font-semibold"
                  >
                    {MEAL_TYPE_LABELS[mt]}
                  </span>
                ))}
            </div>

            {/* Recipe Name */}
            <h3 className="text-xl sm:text-2xl font-semibold text-[#302923] leading-relaxed break-words tracking-tight">
              {recipe.name}
            </h3>

            {/* Description */}
            <p className="text-xs sm:text-sm text-[#6E5D50] leading-relaxed">
              {recipe.description}
            </p>

            {/* Key Metrics (Time & Difficulty, no Budget) */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <div className="p-2.5 rounded-xl bg-[#FBF7EF] border border-[#DDD2C2]">
                <div className="flex items-center gap-1 text-xs font-semibold text-[#6E5D50]">
                  <Clock className="w-3.5 h-3.5 text-[#302923]" aria-hidden="true" />
                  <span>เวลาทำ</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#302923] mt-0.5 tabular-nums">
                  {recipe.cooking_time} นาที
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FBF7EF] border border-[#DDD2C2]">
                <div className="flex items-center gap-1 text-xs font-semibold text-[#6E5D50]">
                  <ChefHat className="w-3.5 h-3.5 text-[#302923]" aria-hidden="true" />
                  <span>ความยาก</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#302923] mt-0.5">
                  {DIFFICULTY_LABELS[recipe.difficulty]}
                </p>
              </div>
            </div>

            {/* Verified Dietary Tags */}
            {verifiedDietaryTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {verifiedDietaryTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold"
                  >
                    <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                    <span>{DIETARY_PREFERENCE_LABELS[tag]?.label ?? tag}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Primary & Secondary Actions */}
          <div className="reveal-pantry text-sm leading-relaxed" aria-label="วัตถุดิบจากตู้เย็นของคุณ">
            {!pantry || pantry.ingredientIds.length === 0 ? <Link href="/fridge" onClick={onCloseModal} className="text-link">เลือกของในตู้เย็น เพื่อดูว่าขาดอะไร →</Link> : <>
              <strong>{required.length === 0 ? 'สูตรนี้ยังไม่มีรายการวัตถุดิบครบ' : missing.length === 0 ? 'มีครบตามรายการที่เลือกไว้' : `ยังไม่ได้เลือก ${missing.length} อย่าง`}</strong>
              {missing.length > 0 && <p>{missing.map(ingredientName).join(' · ')}</p>}
              <p className="text-xs text-[#6E5D50]">เทียบเฉพาะรายการวัตถุดิบ ไม่ได้ตรวจปริมาณหรือรับรองความปลอดภัย</p>
              <Link href="/fridge" onClick={onCloseModal} className="text-link">แก้ไขของในตู้เย็น →</Link>
            </>}
          </div>
          <div className="pt-3 border-t border-[#DDD2C2] space-y-2">
            {/* Primary Action: Open External Recipe Website directly in New Tab */}
            <a
              href={externalLinks.primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="kindi-btn-primary min-h-11 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm"
            >
              <span>ดูสูตรและวิธีทำ</span>
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
            <p className="text-xs text-[#6E5D50]">เปิด {externalLinks.primarySourceName} ในแท็บใหม่</p>

            {/* Secondary Actions: KIN DI Safety/Ingredient Summary + New Round */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Link
                href={`/recipes/${encodeURIComponent(recipe.id)}`}
                onClick={onCloseModal}
                className="kindi-btn-secondary min-h-10 flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm"
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ข้อมูลส่วนผสม & ภูมิแพ้</span>
              </Link>

              <button
                type="button"
                onClick={onNewRound}
                className="kindi-btn-accent min-h-10 flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ลองเมนูอื่น</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

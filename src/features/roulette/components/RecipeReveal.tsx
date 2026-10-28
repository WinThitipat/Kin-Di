'use client';

import React from 'react';
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

  return (
    <div
      aria-live="polite"
      className="kindi-reveal-panel kindi-surface-card w-full max-w-2xl mx-auto rounded-3xl overflow-hidden"
    >
      {/* Top Celebration Banner */}
      <div className="kindi-hero-surface border-0 border-b border-[#171717]/20 rounded-none shadow-none px-5 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2">
          <span className="w-7 h-7 rounded-xl bg-[#171717] text-[#F8D84A] flex items-center justify-center">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
          </span>
          <span className="font-extrabold text-sm sm:text-base text-[#171717]">
            ได้เมนูนี้แล้ว วันนี้กินดิ!
          </span>
        </div>
        {cardIndex !== undefined && (
          <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-white border border-[#171717]/30 text-[#171717]">
            จากไพ่ใบที่ #{cardIndex}
          </span>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-12">
        {/* Recipe Image Column */}
        <div className="sm:col-span-5 relative min-h-[200px] sm:min-h-[260px] bg-[#FFF3C4] border-b sm:border-b-0 sm:border-r border-[#171717]/15">
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
            className={`absolute top-3 right-3 w-10 h-10 rounded-2xl border border-[#171717]/25 shadow-sm flex items-center justify-center transition-colors cursor-pointer ${
              isFavorite ? 'bg-[#FFE4E6] text-red-600' : 'bg-white/95 text-[#171717] hover:bg-[#EAE5DA]'
            }`}
          >
            <Heart
              className={`w-5 h-5 ${isFavorite ? 'fill-current text-red-600' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Recipe Details Column */}
        <div className="sm:col-span-7 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            {/* Category & Meal Type Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-lg bg-[#171717] text-[#F8D84A] text-xs font-bold">
                {FOOD_CATEGORY_LABELS[recipe.category]}
              </span>
              {Array.isArray(recipe.meal_types) &&
                recipe.meal_types.map((mt) => (
                  <span
                    key={mt}
                    className="px-2 py-0.5 rounded-lg bg-[#EAE5DA] text-[#171717] text-xs font-semibold"
                  >
                    {MEAL_TYPE_LABELS[mt]}
                  </span>
                ))}
            </div>

            {/* Recipe Name */}
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#171717] leading-snug break-words tracking-tight">
              {recipe.name}
            </h3>

            {/* Description */}
            <p className="text-xs sm:text-sm text-[#77736B] leading-relaxed">
              {recipe.description}
            </p>

            {/* Key Metrics (Time & Difficulty, no Budget) */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <div className="p-2.5 rounded-xl bg-[#FFF9EC] border border-[#171717]/15">
                <div className="flex items-center gap-1 text-xs font-semibold text-[#77736B]">
                  <Clock className="w-3.5 h-3.5 text-[#171717]" aria-hidden="true" />
                  <span>เวลาทำ</span>
                </div>
                <p className="text-xs sm:text-sm font-extrabold text-[#171717] mt-0.5">
                  {recipe.cooking_time} นาที
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FFF9EC] border border-[#171717]/15">
                <div className="flex items-center gap-1 text-xs font-semibold text-[#77736B]">
                  <ChefHat className="w-3.5 h-3.5 text-[#171717]" aria-hidden="true" />
                  <span>ความยาก</span>
                </div>
                <p className="text-xs sm:text-sm font-extrabold text-[#171717] mt-0.5">
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
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 text-xs font-bold"
                  >
                    <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                    <span>{DIETARY_PREFERENCE_LABELS[tag]?.label ?? tag}</span>
                  </span>
                ))}
              </div>
            )}

            {/* External Recipe Sources */}
            <div className="pt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-[#77736B]">เว็บสูตรอาหาร:</span>
              {externalLinks.sources.map((src) => (
                <a
                  key={src.name}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#FFF9EC] border border-[#171717]/20 hover:border-[#171717] hover:bg-[#F8D84A]/40 text-xs font-bold text-[#171717] transition-colors"
                >
                  <span>{src.name}</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Primary & Secondary Actions */}
          <div className="pt-3 border-t border-[#EAE5DA] space-y-2">
            {/* Primary Action: Open External Recipe Website directly in New Tab */}
            <a
              href={externalLinks.primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="kindi-btn-primary w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-extrabold text-sm"
            >
              <span>ดูสูตรอาหาร ({externalLinks.primarySourceName})</span>
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>

            {/* Secondary Actions: KIN DI Safety/Ingredient Summary + New Round */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Link
                href={`/recipes/${encodeURIComponent(recipe.id)}`}
                onClick={onCloseModal}
                className="kindi-btn-secondary flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm"
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ข้อมูลส่วนผสม & ภูมิแพ้</span>
              </Link>

              <button
                type="button"
                onClick={onNewRound}
                className="kindi-btn-accent flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>สุ่มรอบใหม่ (เอาอีกใบไหม?)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

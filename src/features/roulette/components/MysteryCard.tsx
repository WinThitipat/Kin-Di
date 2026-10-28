'use client';

import React from 'react';
import { CheckCircle2, ChefHat, Clock, Sparkles, UtensilsCrossed } from 'lucide-react';
import { RecipeImage } from '@/components/RecipeImage';
import { DIFFICULTY_LABELS, FOOD_CATEGORY_LABELS, MysteryCardAssignment } from '@/types/recipe';

interface MysteryCardProps {
  assignment: MysteryCardAssignment;
  isSelected: boolean;
  isOtherSelected: boolean;
  isTransitioning: boolean;
  isRevealed: boolean;
  onSelect: (cardId: string) => void;
  onFlipTransitionEnd?: () => void;
}

export function MysteryCard({
  assignment,
  isSelected,
  isOtherSelected,
  isTransitioning,
  isRevealed,
  onSelect,
  onFlipTransitionEnd,
}: MysteryCardProps) {
  const { cardId, cardIndex, recipe } = assignment;
  const isFlipped = isSelected && (isTransitioning || isRevealed);
  const isDisabled = isTransitioning || isRevealed || isOtherSelected;

  return (
    <div className="kindi-card-scene w-full aspect-[3/4] max-w-[200px] mx-auto">
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => onSelect(cardId)}
        aria-label={
          isSelected
            ? `ไพ่ใบที่ ${cardIndex} เลือกแล้ว: ${recipe.name}`
            : `ไพ่ปริศนาใบที่ ${cardIndex} กดเพื่อเปิดไพ่`
        }
        aria-pressed={isSelected}
        className={`kindi-card-btn group relative w-full h-full rounded-2xl text-left focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#171717] cursor-pointer disabled:cursor-default ${
          isOtherSelected ? 'opacity-45 grayscale-[35%]' : 'opacity-100'
        }`}
      >
        <div
          onTransitionEnd={(e) => {
            if (e.target === e.currentTarget && isSelected && isTransitioning) {
              onFlipTransitionEnd?.();
            }
          }}
          className={`kindi-card-inner ${isFlipped ? 'is-flipped' : ''}`}
        >
          {/* FRONT FACE: Face-down Mystery Card */}
          <div
            aria-hidden={isFlipped}
            className="kindi-card-face kindi-card-face-front bg-[#171717] text-[#FFF9EC] border border-[#171717] shadow-[0_8px_20px_rgba(23,23,23,0.18)] group-hover:shadow-[0_14px_28px_rgba(23,23,23,0.26)] p-2.5 sm:p-3 flex flex-col justify-between overflow-hidden transition-shadow"
          >
            {/* Inner ornamental card frame */}
            <div className="w-full h-full rounded-xl border border-[#F8D84A]/25 p-2.5 flex flex-col justify-between relative">
              {/* Top corner badge */}
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-[#F8D84A] text-[#171717] text-xs font-extrabold tracking-wide">
                  #{cardIndex}
                </span>
                <Sparkles className="w-4 h-4 text-[#F8D84A]" aria-hidden="true" />
              </div>

              {/* Center Mystery Brand Emblem */}
              <div className="my-auto flex flex-col items-center text-center py-1">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#F8D84A] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <UtensilsCrossed className="w-6 h-6 sm:w-7 sm:h-7 text-[#171717]" aria-hidden="true" />
                </div>
                <span className="mt-2.5 text-xs sm:text-sm font-extrabold tracking-tight text-[#F8D84A]">
                  กินดิ!
                </span>
                <span className="text-xs text-[#FFF9EC]/80 font-medium leading-tight mt-0.5">
                  กดเพื่อเปิดไพ่
                </span>
              </div>

              {/* Bottom corner label */}
              <div className="flex items-center justify-between text-xs font-bold text-[#F8D84A]/75 tracking-wide">
                <span>KIN DI</span>
                <span>ใบที่ {cardIndex}</span>
              </div>
            </div>
          </div>

          {/* BACK FACE: Revealed Recipe Card */}
          <div
            aria-hidden={!isFlipped}
            className="kindi-card-face kindi-card-face-back bg-white text-[#171717] border border-[#171717]/15 shadow-[0_10px_24px_rgba(23,23,23,0.14)] flex flex-col overflow-hidden"
          >
            {/* Non-color-only selected indicator header */}
            <div className="bg-[#F8D84A] px-2.5 py-1.5 border-b border-[#171717]/15 flex items-center justify-between gap-1">
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#171717]">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>ใบที่ #{cardIndex}</span>
              </span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-[#171717] text-[#F8D84A] truncate">
                {FOOD_CATEGORY_LABELS[recipe.category]}
              </span>
            </div>

            {/* Recipe Thumbnail */}
            <div className="relative w-full h-24 sm:h-28 overflow-hidden bg-[#FFF3C4] shrink-0">
              <RecipeImage
                src={recipe.image_url}
                alt={recipe.name}
                category={recipe.category}
                className="w-full h-full"
              />
            </div>

            {/* Recipe Summary on Card Face */}
            <div className="p-2.5 flex-1 flex flex-col justify-between bg-white">
              <h3 className="text-xs sm:text-sm font-extrabold text-[#171717] line-clamp-2 leading-snug">
                {recipe.name}
              </h3>

              <div className="flex items-center justify-between gap-1 text-xs font-bold text-[#6E6A63] pt-1 border-t border-[#EAE5DA]">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#171717]" aria-hidden="true" />
                  <span>{recipe.cooking_time} นาที</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[#171717]">
                  <ChefHat className="w-3 h-3" aria-hidden="true" />
                  <span>{DIFFICULTY_LABELS[recipe.difficulty]}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

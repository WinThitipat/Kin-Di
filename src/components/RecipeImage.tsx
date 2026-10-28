'use client';

import React, { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { FOOD_CATEGORY_LABELS, FoodCategory } from '@/types/recipe';

interface RecipeImageProps {
  src?: string | null;
  alt: string;
  category?: FoodCategory;
  className?: string;
}

/**
 * Displays a recipe's real image URL when available, or a clean branded KIN DI
 * fallback when no image exists or if the remote image fails to load.
 * Never displays broken image icons.
 */
export function RecipeImage({ src, alt, category, className = '' }: RecipeImageProps) {
  const [hasError, setHasError] = useState(false);

  const showFallback = !src || hasError;

  if (showFallback) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#FFF3C4] text-[#171717] border-b border-[#EAE5DA] select-none p-4 ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="w-12 h-12 rounded-2xl bg-[#F8D84A] border border-[#171717]/15 flex items-center justify-center shadow-xs mb-2">
          <UtensilsCrossed className="w-6 h-6 text-[#171717]" aria-hidden="true" />
        </div>
        <span className="text-xs font-bold tracking-wide text-[#171717]">
          กินดิ! — KIN DI
        </span>
        {category && (
          <span className="text-xs text-[#6E6A63] mt-0.5">
            {FOOD_CATEGORY_LABELS[category]}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setHasError(true)}
      className={`object-cover ${className}`}
    />
  );
}

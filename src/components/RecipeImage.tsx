"use client";

import React, { useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { FOOD_CATEGORY_LABELS, FoodCategory } from "@/types/recipe";

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
export function RecipeImage({
  src,
  alt,
  category,
  className = "",
}: RecipeImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const showFallback = !src || src === failedSrc;

  if (showFallback) {
    return (
      <div
        className={`recipe-image-fallback flex flex-col items-center justify-center select-none p-4 ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="fallback-plate">
          <UtensilsCrossed
            className="w-6 h-6"
            strokeWidth={1.2}
            aria-hidden="true"
          />
        </div>
        <span className="text-xs font-medium">ยังไม่มีรูปจานนี้</span>
        {category && (
          <span className="text-xs mt-0.5">
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
      onError={() => setFailedSrc(src)}
      className={`object-cover ${className}`}
    />
  );
}

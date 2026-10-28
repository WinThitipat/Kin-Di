'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import { CardCountOption } from '@/types/recipe';

interface CardCountSelectorProps {
  selectedCount: CardCountOption;
  onSelectCount: (count: CardCountOption) => void;
  disabled?: boolean;
}

const CARD_COUNT_OPTIONS: CardCountOption[] = [3, 5, 7];

export function CardCountSelector({
  selectedCount,
  onSelectCount,
  disabled = false,
}: CardCountSelectorProps) {
  return (
    <div
      role="group"
      aria-label="เลือกจำนวนไพ่ปริศนา"
      className="inline-flex items-center gap-1 bg-white p-1 rounded-lg border border-[#DDD2C2] shadow-xs"
    >
      <span className="inline-flex items-center gap-1.5 px-2.5 text-xs font-bold text-[#6E5D50]">
        <Layers className="w-3.5 h-3.5 text-[#302923]" aria-hidden="true" />
        <span>จำนวนไพ่:</span>
      </span>
      {CARD_COUNT_OPTIONS.map((count) => {
        const isActive = selectedCount === count;
        return (
          <button
            key={count}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (count !== selectedCount) {
                onSelectCount(count);
              }
            }}
            aria-pressed={isActive}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold tabular-nums transition-colors cursor-pointer ${
              isActive
                ? 'bg-[#302923] text-[#FBF0DC] shadow-xs'
                : 'bg-transparent text-[#6E5D50] hover:bg-[#F1EADF] hover:text-[#302923]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {count} ใบ
          </button>
        );
      })}
    </div>
  );
}

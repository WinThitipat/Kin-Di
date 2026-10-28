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
      className="inline-flex items-center gap-1 bg-white p-1 rounded-2xl border border-[#EAE5D9] shadow-xs"
    >
      <span className="inline-flex items-center gap-1.5 px-2.5 text-xs font-bold text-[#57534E]">
        <Layers className="w-3.5 h-3.5 text-[#141413]" aria-hidden="true" />
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
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold tabular-nums transition-all cursor-pointer ${
              isActive
                ? 'bg-[#141413] text-[#FACC15] shadow-xs'
                : 'bg-transparent text-[#57534E] hover:bg-[#F5F2EA] hover:text-[#141413]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {count} ใบ
          </button>
        );
      })}
    </div>
  );
}

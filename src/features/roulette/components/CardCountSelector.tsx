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
      className="inline-flex items-center gap-1 bg-white/95 p-1 rounded-2xl border border-[#171717]/12 shadow-xs"
    >
      <span className="inline-flex items-center gap-1.5 px-2.5 text-xs font-bold text-[#6E6A63]">
        <Layers className="w-3.5 h-3.5 text-[#171717]" aria-hidden="true" />
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
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              isActive
                ? 'bg-[#F8D84A] text-[#171717] border border-[#171717]/20 shadow-xs'
                : 'bg-transparent text-[#171717]/75 border border-transparent hover:bg-[#EAE5DA]/60 hover:text-[#171717]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {count} ใบ
          </button>
        );
      })}
    </div>
  );
}

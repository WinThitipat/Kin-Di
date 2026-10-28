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
      className="inline-flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border-2 border-[#171717] shadow-[2px_2px_0px_#171717]"
    >
      <span className="inline-flex items-center gap-1.5 px-2.5 text-xs font-bold text-[#77736B]">
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
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-colors cursor-pointer ${
              isActive
                ? 'bg-[#F8D84A] text-[#171717] border-2 border-[#171717]'
                : 'bg-transparent text-[#171717] border-2 border-transparent hover:bg-[#EAE5DA]/60'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {count} ใบ
          </button>
        );
      })}
    </div>
  );
}

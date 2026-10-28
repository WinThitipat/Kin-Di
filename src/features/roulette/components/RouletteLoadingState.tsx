'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

export function RouletteLoadingState({ cardCount = 5 }: { cardCount?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full py-8 flex flex-col items-center justify-center space-y-5"
    >
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F8D84A] border border-[#171717]/15 shadow-xs text-xs sm:text-sm font-extrabold text-[#171717]">
        <Sparkles className="w-4 h-4 animate-pulse" aria-hidden="true" />
        <span>กำลังสับไพ่เมนูสำหรับคุณ...</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 w-full max-w-3xl mx-auto px-2">
        {Array.from({ length: Math.min(cardCount, 5) }).map((_, idx) => (
          <div
            key={idx}
            className="w-full aspect-[3/4] max-w-[180px] mx-auto rounded-2xl bg-[#171717]/10 border border-[#171717]/15 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

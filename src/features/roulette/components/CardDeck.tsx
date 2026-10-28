'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { MysteryCard } from '@/features/roulette/components/MysteryCard';
import { RouletteRoundState } from '@/types/recipe';

interface CardDeckProps {
  round: RouletteRoundState;
  onSelectCard: (cardId: string) => void;
  onFlipTransitionEnd?: () => void;
}

export function CardDeck({ round, onSelectCard, onFlipTransitionEnd }: CardDeckProps) {
  const { cards, requestedCardCount, selectedCardId, isTransitioning, isRevealed } = round;
  const hasFewerThanRequested = cards.length > 0 && cards.length < requestedCardCount;

  // Responsive grid columns tailored to card count
  const gridColsClass =
    cards.length <= 3
      ? 'grid-cols-2 sm:grid-cols-3 max-w-2xl'
      : cards.length <= 5
        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 max-w-4xl'
        : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 max-w-4xl';

  return (
    <div className="w-full space-y-4">
      {hasFewerThanRequested && (
        <div
          role="status"
          className="mx-auto max-w-xl px-4 py-2.5 rounded-2xl bg-[#FFF3C4] border-2 border-[#171717] flex items-center gap-2.5 text-xs sm:text-sm text-[#171717] font-semibold"
        >
          <Info className="w-4 h-4 shrink-0 text-[#171717]" aria-hidden="true" />
          <span>
            คุณเลือกไว้ {requestedCardCount} ใบ แต่ตอนนี้มีเมนูที่ตรงเงื่อนไขทั้งหมด{' '}
            <strong>{cards.length} เมนู</strong> ระบบจึงจัดไพ่ให้ {cards.length} ใบแบบไม่ซ้ำกัน!
          </span>
        </div>
      )}

      <div className={`grid ${gridColsClass} gap-3 sm:gap-4 mx-auto items-center justify-center`}>
        {cards.map((assignment) => {
          const isSelected = selectedCardId === assignment.cardId;
          const isOtherSelected = selectedCardId !== null && selectedCardId !== assignment.cardId;

          return (
            <MysteryCard
              key={assignment.cardId}
              assignment={assignment}
              isSelected={isSelected}
              isOtherSelected={isOtherSelected}
              isTransitioning={isTransitioning}
              isRevealed={isRevealed}
              onSelect={onSelectCard}
              onFlipTransitionEnd={onFlipTransitionEnd}
            />
          );
        })}
      </div>
    </div>
  );
}

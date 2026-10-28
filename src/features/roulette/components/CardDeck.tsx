'use client';

import React, { useLayoutEffect, useRef } from 'react';
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
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Before first paint of a new round, measure where each card sits relative to the
  // centre of the table. The deal-in keyframes start every card from that centre
  // point, so the hand fans out of a single stacked deck.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const gridRect = grid.getBoundingClientRect();
    const centerX = gridRect.left + gridRect.width / 2;
    const centerY = gridRect.top + gridRect.height / 2;
    const cardEls = grid.querySelectorAll<HTMLElement>('[data-deal-card]');

    cardEls.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const cardCenterY = rect.top + rect.height / 2;
      // Small, uneven rotations so the starting pile looks hand-stacked, not perfectly aligned
      const rotation = (index % 2 === 0 ? -1 : 1) * (1.5 + ((index * 7) % 5));

      el.style.setProperty('--from-x', `${(centerX - cardCenterX).toFixed(1)}px`);
      el.style.setProperty('--from-y', `${(centerY - cardCenterY).toFixed(1)}px`);
      el.style.setProperty('--from-rot', `${rotation}deg`);
      el.style.setProperty('--deal-index', String(index));
    });
  }, [round.roundId, cards.length]);

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
          className="mx-auto max-w-xl px-4 py-2.5 rounded-2xl bg-[#FEF9C3]/85 border border-[#EAE5D9] flex items-center gap-2.5 text-xs sm:text-sm text-[#141413] font-medium"
        >
          <Info className="w-4 h-4 shrink-0 text-[#141413]" aria-hidden="true" />
          <span>
            คุณเลือกไว้ {requestedCardCount} ใบ แต่ตอนนี้มีเมนูที่ตรงเงื่อนไข{' '}
            <strong>{cards.length} เมนู</strong> จึงจัดไพ่ให้ {cards.length} ใบแบบไม่ซ้ำกัน
          </span>
        </div>
      )}

      {/* Keyed by roundId so every new shuffle remounts the hand and replays the deal */}
      <div
        key={round.roundId}
        ref={gridRef}
        className={`grid ${gridColsClass} gap-3 sm:gap-4 mx-auto items-center justify-center py-3`}
      >
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

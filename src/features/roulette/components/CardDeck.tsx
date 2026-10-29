'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
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
  const [readyRoundId, setReadyRoundId] = useState<string | null>(null);
  const isDealing = readyRoundId !== round.roundId;
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Once the native dialog is visible, measure each card relative to the
  // centre of the table. The deal-in keyframes start every card from that centre
  // point, so the hand fans out of a single stacked deck.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) {
      setReadyRoundId(round.roundId);
      return;
    }
    const frame = window.requestAnimationFrame(() => {
    const cardEls = grid.querySelectorAll<HTMLElement>('[data-deal-card]');
    // Measure the untransformed layout, not an in-flight animation frame.
    cardEls.forEach(el => { el.style.animation = 'none'; });
    const gridRect = grid.getBoundingClientRect();
    const centerX = gridRect.left + gridRect.width / 2;
    const centerY = gridRect.top + gridRect.height / 2;
    cardEls.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const cardCenterY = rect.top + rect.height / 2;
      // Small, uneven rotations so the starting pile looks hand-stacked, not perfectly aligned
      const rotation = (index % 2 === 0 ? -1 : 1) * .7;

      el.style.setProperty('--from-x', `${(centerX - cardCenterX).toFixed(1)}px`);
      el.style.setProperty('--from-y', `${(centerY - cardCenterY).toFixed(1)}px`);
      el.style.setProperty('--from-rot', `${rotation}deg`);
      el.style.setProperty('--deal-index', String(index));
      el.style.setProperty('--shuffle-x', `${(index % 2 === 0 ? -1 : 1) * rect.width * .55}px`);
    });
    cardEls.forEach(el => { el.style.animation = ''; });
    });
    const finish = () => setReadyRoundId(round.roundId);
    const timer = window.setTimeout(finish, 860);
    const onMotionChange = () => { if (reducedMotion.matches) finish(); };
    reducedMotion.addEventListener('change', onMotionChange);
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(timer); reducedMotion.removeEventListener('change', onMotionChange); };
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
          className="mx-auto max-w-xl px-4 py-2.5 rounded-lg bg-[#F3E3D2]/85 border border-[#DDD2C2] flex items-center gap-2.5 text-xs sm:text-sm text-[#302923] font-medium"
        >
          <Info className="w-4 h-4 shrink-0 text-[#302923]" aria-hidden="true" />
          <span>
            คุณเลือกไว้ {requestedCardCount} ใบ แต่ตอนนี้มีเมนูที่ตรงเงื่อนไข{' '}
            <strong>{cards.length} เมนู</strong> จึงจัดไพ่ให้ {cards.length} ใบแบบไม่ซ้ำกัน
          </span>
        </div>
      )}

      {!isRevealed && <p role="status" className="deck-instruction">{isDealing ? 'กำลังสับและแจกไพ่…' : isTransitioning ? 'กำลังเปิดไพ่ของคุณ…' : 'เลือกไพ่ที่ใช่ แล้วเปิดเลย!'}</p>}
      {/* Keyed by roundId so every new shuffle remounts the hand and replays the deal */}
      <div
        key={round.roundId}
        ref={gridRef}
        aria-busy={isDealing}
        onAnimationEnd={event => {
          const target = event.target as HTMLElement;
          if (event.animationName === 'card-deal' && target.dataset.dealIndex === String(cards.length - 1)) setReadyRoundId(round.roundId);
        }}
        className={`kindi-deck-grid grid ${gridColsClass} gap-3 sm:gap-4 mx-auto items-center justify-center py-3`}
      >
        {cards.map((assignment) => {
          const isSelected = selectedCardId === assignment.cardId;
          const isOtherSelected = selectedCardId !== null && selectedCardId !== assignment.cardId;

          return (
            <MysteryCard
              key={assignment.cardId}
              assignment={assignment}
              isDealing={isDealing}
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

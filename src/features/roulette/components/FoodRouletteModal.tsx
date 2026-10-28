'use client';

import React, { useEffect, useRef } from 'react';
import { RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react';
import { CardCountSelector } from '@/features/roulette/components/CardCountSelector';
import { CardDeck } from '@/features/roulette/components/CardDeck';
import { RecipeReveal } from '@/features/roulette/components/RecipeReveal';
import {
  RouletteEmptyState,
  RouletteErrorState,
} from '@/features/roulette/components/RouletteEmptyState';
import { RouletteLoadingState } from '@/features/roulette/components/RouletteLoadingState';
import { getRevealedRecipeFromRound } from '@/features/roulette/roulette-engine';
import { CardCountOption, RouletteRoundState, SAFETY_DISCLAIMER_TH } from '@/types/recipe';

interface FoodRouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  round: RouletteRoundState | null;
  cardCount: CardCountOption;
  onChangeCardCount: (count: CardCountOption) => void;
  onSelectCard: (cardId: string) => void;
  onFlipComplete: () => void;
  onStartNewRound: () => void;
  isLoading: boolean;
  error: string | null;
  onRetryLoad: () => void;
  hasOptionalFilters: boolean;
  onResetOptionalFilters: () => void;
  favoriteIds: string[];
  onToggleFavorite: (recipeId: string) => void;
}

export function FoodRouletteModal({
  isOpen,
  onClose,
  round,
  cardCount,
  onChangeCardCount,
  onSelectCard,
  onFlipComplete,
  onStartNewRound,
  isLoading,
  error,
  onRetryLoad,
  hasOptionalFilters,
  onResetOptionalFilters,
  favoriteIds,
  onToggleFavorite,
}: FoodRouletteModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Sync open state with native <dialog>.showModal() / .close()
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Native close listener + fallback for browsers without native `closedby="any"` support
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleNativeClose = () => {
      dialog.returnValue = '';
      onClose();
    };

    dialog.addEventListener('close', handleNativeClose);

    let cleanupLightDismiss: (() => void) | undefined;
    if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
      const handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;

        if (!isDialogContent) {
          dialog.close();
        }
      };

      dialog.addEventListener('click', handleBackdropClick);
      cleanupLightDismiss = () => dialog.removeEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('close', handleNativeClose);
      cleanupLightDismiss?.();
    };
  }, [onClose]);

  // Failsafe timer for card flip completion so reduced-motion or interrupted CSS transitions always settle cleanly
  useEffect(() => {
    if (!round || !round.isTransitioning) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const delayMs = prefersReducedMotion ? 100 : 540;
    const timer = window.setTimeout(() => {
      onFlipComplete();
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [round, onFlipComplete]);

  const revealedRecipe = getRevealedRecipeFromRound(round);
  const selectedAssignment = round?.cards.find((c) => c.cardId === round.selectedCardId);
  const isCardChosen = Boolean(round?.selectedCardId);

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby="roulette-dialog-title"
      aria-describedby="roulette-dialog-desc"
      className="kindi-modal m-auto w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-4xl max-h-[92dvh] rounded-3xl bg-[#FFF9EC] text-[#171717] p-0 overflow-hidden"
    >
      {/* Modal Header */}
      <div className="kindi-hero-surface border-0 border-b border-[#171717]/10 rounded-none shadow-none px-5 py-4 sm:px-6 sm:py-5 flex items-start justify-between gap-3 shrink-0">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#171717] text-[#F8D84A] text-xs font-bold mb-1.5">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>เปิดไพ่สุ่มเมนู · กินดิ!</span>
          </div>
          <h2
            id="roulette-dialog-title"
            className="text-lg sm:text-2xl font-extrabold text-[#171717] leading-tight tracking-tight"
          >
            เลือกไพ่ของคุณ
          </h2>
          <p id="roulette-dialog-desc" className="text-xs sm:text-sm text-[#171717]/80 mt-0.5">
            เลือกไพ่ 1 ใบ แล้วมาดูกันว่ามื้อนี้จะกินอะไรดี
          </p>
        </div>

        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="ปิดหน้าต่างสุ่มไพ่"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/90 border border-[#171717]/15 flex items-center justify-center hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717] shrink-0 cursor-pointer"
        >
          <X className="w-5 h-5 text-[#171717]" aria-hidden="true" />
        </button>
      </div>

      {/* Controls Bar (Card Count Selector & Available Pool Indicator) */}
      <div className="px-5 py-3 sm:px-6 bg-[#EAE5DA]/55 border-b border-[#171717]/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <CardCountSelector
          selectedCount={cardCount}
          onSelectCount={onChangeCardCount}
          disabled={isLoading || isCardChosen}
        />

        <div className="flex items-center gap-2.5">
          {round && !isLoading && !error && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#171717] bg-white/90 px-3 py-1.5 rounded-xl border border-[#171717]/12">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
              <span>พร้อมสุ่ม {round.totalEligibleCount} เมนู</span>
            </span>
          )}

          {round && round.cards.length > 0 && !isLoading && (
            <button
              type="button"
              onClick={onStartNewRound}
              disabled={round.isTransitioning}
              className="kindi-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>สับไพ่รอบใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Modal Body */}
      <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
        {isLoading ? (
          <RouletteLoadingState cardCount={cardCount} />
        ) : error ? (
          <RouletteErrorState
            message={error}
            onRetry={onRetryLoad}
            onCloseModal={() => dialogRef.current?.close()}
          />
        ) : !round || round.cards.length === 0 ? (
          <RouletteEmptyState
            hasOptionalFilters={hasOptionalFilters}
            onResetOptionalFilters={onResetOptionalFilters}
            onCloseModal={() => dialogRef.current?.close()}
          />
        ) : (
          <div className="space-y-6">
            {/* Step Instruction Banner before reveal */}
            {!round.isRevealed && (
              <div className="text-center">
                <span className="inline-block px-3.5 py-1 rounded-full bg-[#171717] text-[#F8D84A] text-xs sm:text-sm font-extrabold">
                  {round.isTransitioning
                    ? 'กำลังเปิดไพ่ของคุณ...'
                    : 'เลือกไพ่ที่ใช่ แล้วเปิดเลย!'}
                </span>
              </div>
            )}

            {/* Revealed Recipe Reward Panel (shown once flip completes) */}
            {round.isRevealed && revealedRecipe && (
              <RecipeReveal
                recipe={revealedRecipe}
                cardIndex={selectedAssignment?.cardIndex}
                isFavorite={favoriteIds.includes(revealedRecipe.id)}
                onToggleFavorite={onToggleFavorite}
                onNewRound={onStartNewRound}
                onCloseModal={() => dialogRef.current?.close()}
              />
            )}

            {/* Mystery Card Deck Grid */}
            <CardDeck
              round={round}
              onSelectCard={onSelectCard}
              onFlipTransitionEnd={onFlipComplete}
            />
          </div>
        )}
      </div>

      {/* Modal Footer */}
      <div className="px-4 py-2.5 sm:px-6 bg-white border-t border-[#171717]/15 flex items-center justify-between gap-2 text-xs text-[#77736B] shrink-0">
        <span className="truncate">{SAFETY_DISCLAIMER_TH}</span>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="px-3 py-1 rounded-lg font-bold text-[#171717] hover:bg-[#EAE5DA] shrink-0 cursor-pointer"
        >
          ปิด (Esc)
        </button>
      </div>
    </dialog>
  );
}

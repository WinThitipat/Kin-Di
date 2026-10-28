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

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

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
      className="kindi-modal m-auto w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-4xl max-h-[92dvh] rounded-3xl bg-[#FCFBF7] text-[#141413] p-0 overflow-hidden"
    >
      {/* Clean Editorial Modal Header */}
      <div className="bg-white border-b border-[#EAE5D9] px-5 py-4 sm:px-6 sm:py-5 flex items-start justify-between gap-3 shrink-0">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FEF9C3] border border-[#EAE5D9] flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5 text-[#141413]" aria-hidden="true" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F5F2EA] border border-[#EAE5D9] text-[#57534E] text-xs font-bold mb-1">
              <span>เปิดไพ่สุ่มเมนู · กินดิ!</span>
            </div>
            <h2
              id="roulette-dialog-title"
              className="text-lg sm:text-2xl font-extrabold text-[#141413] leading-tight tracking-tight"
            >
              เลือกไพ่ของคุณ
            </h2>
            <p id="roulette-dialog-desc" className="text-xs sm:text-sm text-[#57534E] mt-0.5">
              เลือกไพ่ 1 ใบ แล้วมาดูกันว่ามื้อนี้จะกินอะไรดี
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="ปิดหน้าต่างสุ่มไพ่"
          className="w-10 h-10 rounded-xl bg-[#F5F2EA] border border-[#EAE5D9] flex items-center justify-center hover:bg-[#EAE5D9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141413] shrink-0 cursor-pointer transition-colors"
        >
          <X className="w-5 h-5 text-[#141413]" aria-hidden="true" />
        </button>
      </div>

      {/* Controls Bar (Card Count Selector & Available Pool Indicator) */}
      <div className="px-5 py-3 sm:px-6 bg-[#F5F2EA]/80 border-b border-[#EAE5D9] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <CardCountSelector
          selectedCount={cardCount}
          onSelectCount={onChangeCardCount}
          disabled={isLoading || isCardChosen}
        />

        <div className="flex items-center gap-2.5">
          {round && !isLoading && !error && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#141413] bg-white px-3 py-1.5 rounded-xl border border-[#EAE5D9] tabular-nums">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
              <span>พร้อมสุ่ม {round.totalEligibleCount} เมนู</span>
            </span>
          )}

          {round && round.cards.length > 0 && !isLoading && (
            <button
              type="button"
              onClick={onStartNewRound}
              disabled={round.isTransitioning}
              className="kindi-btn-secondary min-h-9 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
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
                <span className="inline-block px-3.5 py-1 rounded-full bg-[#141413] text-[#FACC15] text-xs sm:text-sm font-extrabold">
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
      <div className="px-4 py-2.5 sm:px-6 bg-white border-t border-[#EAE5D9] flex items-center justify-between gap-2 text-xs text-[#78716C] shrink-0">
        <span className="truncate">{SAFETY_DISCLAIMER_TH}</span>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="px-3 py-1 rounded-lg font-bold text-[#141413] hover:bg-[#F5F2EA] shrink-0 cursor-pointer transition-colors"
        >
          ปิด (Esc)
        </button>
      </div>
    </dialog>
  );
}

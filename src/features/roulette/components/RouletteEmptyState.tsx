'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, SearchX, Share2, SlidersHorizontal } from 'lucide-react';

interface RouletteEmptyStateProps {
  hasOptionalFilters: boolean;
  onResetOptionalFilters: () => void;
  onCloseModal: () => void;
}

export function RouletteEmptyState({
  hasOptionalFilters,
  onResetOptionalFilters,
  onCloseModal,
}: RouletteEmptyStateProps) {
  return (
    <div
      role="status"
      className="kindi-surface-card max-w-lg mx-auto my-4 p-6 sm:p-8 text-center space-y-4"
    >
      <div className="w-14 h-14 rounded-2xl bg-[#FFF3C4] border border-[#171717]/15 flex items-center justify-center mx-auto">
        <SearchX className="w-7 h-7 text-[#171717]" aria-hidden="true" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg sm:text-xl font-extrabold text-[#171717]">
          วันนี้ยังไม่มีเมนูที่ตรงเงื่อนไข ลองปรับตัวกรองดูไหม?
        </h3>
        <p className="text-xs sm:text-sm text-[#6E6A63] leading-relaxed">
          หากยังไม่มีสูตรอาหารในระบบ คุณสามารถไปที่หน้า &ldquo;เพิ่มเมนูอาหาร&rdquo;
          เพื่อเพิ่มเมนูโปรดของคุณ หรือปรับตัวกรองมื้ออาหารและเวลาทำอาหารได้
        </p>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2.5 pt-2">
        <Link
          href="/community"
          onClick={onCloseModal}
          className="kindi-btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-sm"
        >
          <Share2 className="w-4 h-4" aria-hidden="true" />
          <span>ไปหน้าเพิ่มเมนูอาหาร</span>
        </Link>

        {hasOptionalFilters && (
          <button
            type="button"
            onClick={onResetOptionalFilters}
            className="kindi-btn-accent w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-sm cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>ล้างตัวกรองด่วนแล้วสุ่มใหม่</span>
          </button>
        )}

        <button
          type="button"
          onClick={onCloseModal}
          className="kindi-btn-secondary w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
          <span>ปิดหน้าต่าง</span>
        </button>
      </div>
    </div>
  );
}

interface RouletteErrorStateProps {
  message: string;
  onRetry: () => void;
  onCloseModal: () => void;
}

export function RouletteErrorState({ message, onRetry, onCloseModal }: RouletteErrorStateProps) {
  return (
    <div
      role="alert"
      className="kindi-surface-card max-w-lg mx-auto my-4 p-6 sm:p-8 text-center space-y-4"
    >
      <div className="w-14 h-14 rounded-2xl bg-[#FFE4E6] border border-red-200 flex items-center justify-center mx-auto">
        <AlertTriangle className="w-7 h-7 text-[#171717]" aria-hidden="true" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg sm:text-xl font-extrabold text-[#171717]">
          โหลดสำรับไพ่ไม่สำเร็จ
        </h3>
        <p className="text-xs sm:text-sm text-[#6E6A63] leading-relaxed">{message}</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
        <button
          type="button"
          onClick={onRetry}
          className="kindi-btn-accent w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          <span>ลองใหม่อีกครั้ง</span>
        </button>

        <button
          type="button"
          onClick={onCloseModal}
          className="kindi-btn-secondary w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer"
        >
          ปิดหน้าต่าง
        </button>
      </div>
    </div>
  );
}

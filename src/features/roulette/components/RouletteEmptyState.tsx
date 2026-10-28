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
      className="max-w-lg mx-auto my-4 p-6 sm:p-8 rounded-3xl bg-white border-2 border-[#171717] shadow-[5px_5px_0px_#171717] text-center space-y-4"
    >
      <div className="w-14 h-14 rounded-2xl bg-[#FFF3C4] border-2 border-[#171717] flex items-center justify-center mx-auto">
        <SearchX className="w-7 h-7 text-[#171717]" aria-hidden="true" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg sm:text-xl font-extrabold text-[#171717]">
          วันนี้ยังไม่มีเมนูที่ตรงเงื่อนไข ลองปรับตัวกรองดูไหม?
        </h3>
        <p className="text-xs sm:text-sm text-[#77736B] leading-relaxed">
          หากยังไม่มีสูตรอาหารในระบบ คุณสามารถไปที่หน้า &ldquo;แบ่งปันสูตรอาหาร&rdquo;
          เพื่อเพิ่มเมนูโปรดของคุณ หรือปรับตัวกรองมื้ออาหารและเวลาทำอาหารได้
        </p>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2.5 pt-2">
        <Link
          href="/community"
          onClick={onCloseModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#171717] text-[#F8D84A] border-2 border-[#171717] font-extrabold text-sm hover:bg-[#171717]/90"
        >
          <Share2 className="w-4 h-4" aria-hidden="true" />
          <span>ไปหน้าแบ่งปันสูตรอาหาร</span>
        </Link>

        {hasOptionalFilters && (
          <button
            type="button"
            onClick={onResetOptionalFilters}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F8D84A] text-[#171717] border-2 border-[#171717] font-extrabold text-sm hover:bg-[#F2CC22] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>ล้างตัวกรองด่วนแล้วสุ่มใหม่</span>
          </button>
        )}

        <button
          type="button"
          onClick={onCloseModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-[#171717] border-2 border-[#171717] font-bold text-sm hover:bg-[#EAE5DA] cursor-pointer"
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
      className="max-w-lg mx-auto my-4 p-6 sm:p-8 rounded-3xl bg-white border-2 border-[#171717] shadow-[5px_5px_0px_#171717] text-center space-y-4"
    >
      <div className="w-14 h-14 rounded-2xl bg-[#FFE4E6] border-2 border-[#171717] flex items-center justify-center mx-auto">
        <AlertTriangle className="w-7 h-7 text-[#171717]" aria-hidden="true" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg sm:text-xl font-extrabold text-[#171717]">
          สะดุดนิดหน่อย! โหลดสำรับไพ่ไม่สำเร็จ
        </h3>
        <p className="text-xs sm:text-sm text-[#77736B] leading-relaxed">{message}</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
        <button
          type="button"
          onClick={onRetry}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#F8D84A] text-[#171717] border-2 border-[#171717] font-extrabold text-sm hover:bg-[#F2CC22] cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          <span>ลองใหม่อีกครั้ง</span>
        </button>

        <button
          type="button"
          onClick={onCloseModal}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white text-[#171717] border-2 border-[#171717] font-bold text-sm hover:bg-[#EAE5DA] cursor-pointer"
        >
          ปิดหน้าต่าง
        </button>
      </div>
    </div>
  );
}

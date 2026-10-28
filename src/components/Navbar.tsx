'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PlusCircle, Refrigerator, ShieldCheck, Sparkles, Utensils } from 'lucide-react';
import { UserFoodRestrictions } from '@/types/recipe';

interface NavbarProps {
  restrictions: UserFoodRestrictions;
  onOpenRestrictions: () => void;
}

export function Navbar({ restrictions, onOpenRestrictions }: NavbarProps) {
  const pathname = usePathname();

  const activeRestrictionsCount =
    restrictions.allergens.length +
    (restrictions.customAllergens?.length ?? 0) +
    restrictions.avoidedIngredients.length +
    (restrictions.customAvoidedTerms?.length ?? 0) +
    (restrictions.dietaryPreference !== 'unrestricted' ? 1 : 0);

  const isRouletteActive = pathname === '/' || pathname?.startsWith('/roulette');
  const isFridgeActive = pathname?.startsWith('/fridge');
  const isCommunityActive = pathname?.startsWith('/community');

  return (
    <header className="sticky top-0 z-30 bg-[#FFF9EC]/95 backdrop-blur-sm border-b-2 border-[#171717]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 group focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171717] rounded-xl"
        >
          <div className="w-10 h-10 rounded-xl bg-[#F8D84A] border-2 border-[#171717] shadow-[2px_2px_0px_#171717] flex items-center justify-center group-hover:bg-[#F2CC22] transition-colors">
            <Utensils className="w-5 h-5 text-[#171717]" aria-hidden="true" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-[#171717] block leading-none">
              กินดิ! — KIN DI
            </span>
            <span className="text-[11px] font-semibold text-[#77736B] block mt-0.5">
              Stop thinking. Start eating.
            </span>
          </div>
        </Link>

        {/* Primary Navigation Links */}
        <nav aria-label="เมนูหลัก" className="hidden md:flex items-center gap-1.5">
          <Link
            href="/"
            className={`px-3.5 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-1.5 border-2 transition-colors ${
              isRouletteActive
                ? 'bg-[#F8D84A] text-[#171717] border-[#171717] shadow-[2px_2px_0px_#171717]'
                : 'border-transparent text-[#171717] hover:bg-[#EAE5DA]/70'
            }`}
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>สุ่มไพ่เมนู (Food Roulette)</span>
          </Link>

          <Link
            href="/fridge"
            className={`px-3.5 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-1.5 border-2 transition-colors ${
              isFridgeActive
                ? 'bg-[#F8D84A] text-[#171717] border-[#171717] shadow-[2px_2px_0px_#171717]'
                : 'border-transparent text-[#171717] hover:bg-[#EAE5DA]/70'
            }`}
          >
            <Refrigerator className="w-4 h-4" aria-hidden="true" />
            <span>มีอะไรในตู้ (Fridge Mode)</span>
          </Link>

          <Link
            href="/community"
            className={`px-3.5 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-1.5 border-2 transition-colors ${
              isCommunityActive
                ? 'bg-[#F8D84A] text-[#171717] border-[#171717] shadow-[2px_2px_0px_#171717]'
                : 'border-transparent text-[#171717] hover:bg-[#EAE5DA]/70'
            }`}
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            <span>เพิ่มเมนูอาหาร</span>
          </Link>
        </nav>

        {/* Shared Food Restrictions Button */}
        <button
          type="button"
          onClick={onOpenRestrictions}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border-2 border-[#171717] shadow-[2px_2px_0px_#171717] hover:bg-[#EAE5DA] text-xs sm:text-sm font-bold text-[#171717] cursor-pointer shrink-0"
        >
          <ShieldCheck className="w-4 h-4 text-[#171717]" aria-hidden="true" />
          <span>ข้อจำกัดทางอาหาร</span>
          {activeRestrictionsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-[#171717] text-[#F8D84A] text-[11px] font-extrabold leading-none">
              {activeRestrictionsCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Navigation Bar */}
      <nav
        aria-label="เมนูมือถือ"
        className="flex md:hidden items-center justify-around border-t border-[#171717]/15 bg-[#FFF9EC] px-2 py-1.5"
      >
        <Link
          href="/"
          className={`flex-1 py-1.5 rounded-lg text-center text-xs font-bold inline-flex items-center justify-center gap-1 ${
            isRouletteActive
              ? 'bg-[#F8D84A] text-[#171717] border border-[#171717]'
              : 'text-[#77736B]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>สุ่มไพ่เมนู</span>
        </Link>
        <Link
          href="/fridge"
          className={`flex-1 py-1.5 rounded-lg text-center text-xs font-bold inline-flex items-center justify-center gap-1 ${
            isFridgeActive
              ? 'bg-[#F8D84A] text-[#171717] border border-[#171717]'
              : 'text-[#77736B]'
          }`}
        >
          <Refrigerator className="w-3.5 h-3.5" aria-hidden="true" />
          <span>ค้นตู้เย็น</span>
        </Link>
        <Link
          href="/community"
          className={`flex-1 py-1.5 rounded-lg text-center text-xs font-bold inline-flex items-center justify-center gap-1 ${
            isCommunityActive
              ? 'bg-[#F8D84A] text-[#171717] border border-[#171717]'
              : 'text-[#77736B]'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>เพิ่มเมนูอาหาร</span>
        </Link>
      </nav>
    </header>
  );
}

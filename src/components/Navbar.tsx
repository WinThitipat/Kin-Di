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
    <header className="sticky top-0 z-30 bg-[#FCFBF7]/92 backdrop-blur-md border-b border-[#EAE5D9]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand Identity */}
        <Link
          href="/"
          className="inline-flex items-center gap-3 group focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#141413] rounded-xl"
        >
          <div className="w-10 h-10 rounded-xl bg-[#141413] text-[#FACC15] flex items-center justify-center shadow-xs group-hover:bg-[#292826] transition-colors">
            <Utensils className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-[#141413] leading-none">
                กินดิ!
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-[#FEF9C3] border border-[#EAE5D9] text-[10px] font-extrabold tracking-wider text-[#141413] uppercase">
                KIN DI
              </span>
            </div>
            <span className="text-xs font-medium text-[#78716C] block mt-0.5">
              สุ่มไพ่เมนู & ค้นของในตู้เย็น
            </span>
          </div>
        </Link>

        {/* Primary Segmented Navigation */}
        <nav
          aria-label="เมนูหลัก"
          className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-[#F5F2EA] border border-[#EAE5D9]"
        >
          <Link
            href="/"
            className={`min-h-9 px-4 py-1.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-all ${
              isRouletteActive
                ? 'bg-[#141413] text-[#FACC15] shadow-xs'
                : 'text-[#57534E] hover:text-[#141413] hover:bg-white/80'
            }`}
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>สุ่มไพ่เมนู</span>
          </Link>

          <Link
            href="/fridge"
            className={`min-h-9 px-4 py-1.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-all ${
              isFridgeActive
                ? 'bg-[#141413] text-[#FACC15] shadow-xs'
                : 'text-[#57534E] hover:text-[#141413] hover:bg-white/80'
            }`}
          >
            <Refrigerator className="w-4 h-4" aria-hidden="true" />
            <span>มีอะไรในตู้</span>
          </Link>

          <Link
            href="/community"
            className={`min-h-9 px-4 py-1.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-all ${
              isCommunityActive
                ? 'bg-[#141413] text-[#FACC15] shadow-xs'
                : 'text-[#57534E] hover:text-[#141413] hover:bg-white/80'
            }`}
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            <span>เพิ่มเมนูอาหาร</span>
          </Link>
        </nav>

        {/* Shared Food Restrictions Trigger */}
        <button
          type="button"
          onClick={onOpenRestrictions}
          className="kindi-btn-secondary min-h-10 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold cursor-pointer shrink-0"
        >
          <ShieldCheck
            className={`w-4 h-4 ${
              activeRestrictionsCount > 0 ? 'text-emerald-700' : 'text-[#57534E]'
            }`}
            aria-hidden="true"
          />
          <span>ข้อจำกัดทางอาหาร</span>
          {activeRestrictionsCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full bg-[#141413] text-[#FACC15] text-xs font-extrabold tabular-nums leading-none">
              {activeRestrictionsCount}
            </span>
          ) : (
            <span className="hidden sm:inline-block w-2 h-2 rounded-full bg-[#D8D1C2]" />
          )}
        </button>
      </div>

      {/* Mobile Navigation Dock */}
      <nav
        aria-label="เมนูมือถือ"
        className="flex md:hidden items-center justify-around border-t border-[#EAE5D9] bg-[#FCFBF7] px-2.5 py-1.5 gap-1.5"
      >
        <Link
          href="/"
          className={`flex-1 min-h-10 py-1.5 rounded-xl text-center text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
            isRouletteActive
              ? 'bg-[#141413] text-[#FACC15]'
              : 'text-[#57534E] hover:bg-[#F5F2EA]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>สุ่มไพ่เมนู</span>
        </Link>
        <Link
          href="/fridge"
          className={`flex-1 min-h-10 py-1.5 rounded-xl text-center text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
            isFridgeActive
              ? 'bg-[#141413] text-[#FACC15]'
              : 'text-[#57534E] hover:bg-[#F5F2EA]'
          }`}
        >
          <Refrigerator className="w-3.5 h-3.5" aria-hidden="true" />
          <span>มีอะไรในตู้</span>
        </Link>
        <Link
          href="/community"
          className={`flex-1 min-h-10 py-1.5 rounded-xl text-center text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
            isCommunityActive
              ? 'bg-[#141413] text-[#FACC15]'
              : 'text-[#57534E] hover:bg-[#F5F2EA]'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>เพิ่มเมนูอาหาร</span>
        </Link>
      </nav>
    </header>
  );
}

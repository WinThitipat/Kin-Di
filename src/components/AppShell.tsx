'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { FoodRestrictionsModal } from '@/components/FoodRestrictionsModal';
import { Navbar } from '@/components/Navbar';
import { DEFAULT_USER_RESTRICTIONS } from '@/features/food-safety/eligibility';
import {
  loadFavoriteRecipeIds,
  loadUserRestrictions,
  saveUserRestrictions,
  toggleFavoriteRecipeId,
} from '@/lib/user-storage';
import { SAFETY_DISCLAIMER_TH, UserFoodRestrictions } from '@/types/recipe';

interface KinDiAppContextValue {
  restrictions: UserFoodRestrictions;
  setRestrictions: (next: UserFoodRestrictions) => void;
  openRestrictionsModal: () => void;
  favoriteIds: string[];
  toggleFavorite: (recipeId: string) => void;
  isHydrated: boolean;
}

const KinDiAppContext = createContext<KinDiAppContextValue>({
  restrictions: DEFAULT_USER_RESTRICTIONS,
  setRestrictions: () => {},
  openRestrictionsModal: () => {},
  favoriteIds: [],
  toggleFavorite: () => {},
  isHydrated: false,
});

export function useKinDiApp() {
  return useContext(KinDiAppContext);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [restrictions, setRestrictionsState] = useState<UserFoodRestrictions>(
    DEFAULT_USER_RESTRICTIONS
  );
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isRestrictionsOpen, setIsRestrictionsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setRestrictionsState(loadUserRestrictions());
    setFavoriteIds(loadFavoriteRecipeIds());
    setIsHydrated(true);
    // Open the Food Restrictions ("ข้อจำกัดทางอาหาร") modal automatically when entering the website
    setIsRestrictionsOpen(true);

    const handleRestrictionsSync = () => setRestrictionsState(loadUserRestrictions());
    const handleFavoritesSync = () => setFavoriteIds(loadFavoriteRecipeIds());

    window.addEventListener('kindi-restrictions-updated', handleRestrictionsSync);
    window.addEventListener('kindi-favorites-updated', handleFavoritesSync);

    return () => {
      window.removeEventListener('kindi-restrictions-updated', handleRestrictionsSync);
      window.removeEventListener('kindi-favorites-updated', handleFavoritesSync);
    };
  }, []);

  const handleSetRestrictions = (next: UserFoodRestrictions) => {
    setRestrictionsState(next);
    saveUserRestrictions(next);
  };

  const handleToggleFavorite = (recipeId: string) => {
    const updated = toggleFavoriteRecipeId(recipeId);
    setFavoriteIds(updated);
  };

  return (
    <KinDiAppContext.Provider
      value={{
        restrictions,
        setRestrictions: handleSetRestrictions,
        openRestrictionsModal: () => setIsRestrictionsOpen(true),
        favoriteIds,
        toggleFavorite: handleToggleFavorite,
        isHydrated,
      }}
    >
      <div className="min-h-dvh flex flex-col bg-[#FFF9EC] text-[#171717]">
        <Navbar
          restrictions={restrictions}
          onOpenRestrictions={() => setIsRestrictionsOpen(true)}
        />

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          {children}
        </main>

        <footer className="border-t-2 border-[#171717]/15 bg-[#EAE5DA]/60 py-6 px-4 sm:px-6 mt-12">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#77736B]">
            <div>
              <p className="font-bold text-[#171717]">
                กินดิ! — KIN DI · Stop thinking. Start eating.
              </p>
              <p className="mt-1 max-w-2xl leading-relaxed">{SAFETY_DISCLAIMER_TH}</p>
            </div>
            <div className="text-[11px] font-semibold text-[#77736B] shrink-0">
              ระบบคัดกรองข้อจำกัดทางอาหารและสุ่มไพ่เมนูอาหาร
            </div>
          </div>
        </footer>

        <FoodRestrictionsModal
          isOpen={isRestrictionsOpen}
          onClose={() => setIsRestrictionsOpen(false)}
          restrictions={restrictions}
          onChange={handleSetRestrictions}
        />
      </div>
    </KinDiAppContext.Provider>
  );
}

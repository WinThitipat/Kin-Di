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
      <div className="min-h-dvh flex flex-col bg-[#FCFBF7] text-[#141413]">
        <Navbar
          restrictions={restrictions}
          onOpenRestrictions={() => setIsRestrictionsOpen(true)}
        />

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </main>

        <footer className="border-t border-[#EAE5D9] bg-white py-6 px-4 sm:px-6 mt-12">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#78716C]">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[#141413]">กินดิ!</span>
                <span className="px-1.5 py-0.5 rounded bg-[#FEF9C3] border border-[#EAE5D9] text-[10px] font-extrabold text-[#141413]">
                  KIN DI
                </span>
                <span className="text-[#57534E] font-medium">
                  สุ่มไพ่เมนูอาหารและค้นหาเมนูจากของในตู้เย็น
                </span>
              </div>
              <p className="mt-1.5 max-w-2xl leading-relaxed text-[#78716C]">
                {SAFETY_DISCLAIMER_TH}
              </p>
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

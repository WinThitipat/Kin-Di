"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { FoodRestrictionsModal } from "@/components/FoodRestrictionsModal";
import { Navbar } from "@/components/Navbar";
import { DEFAULT_USER_RESTRICTIONS } from "@/features/food-safety/eligibility";
import {
  loadFavoriteRecipeIds,
  loadUserRestrictions,
  saveUserRestrictions,
  toggleFavoriteRecipeId,
} from "@/lib/user-storage";
import { SAFETY_DISCLAIMER_TH, UserFoodRestrictions } from "@/types/recipe";

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
    DEFAULT_USER_RESTRICTIONS,
  );
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isRestrictionsOpen, setIsRestrictionsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setRestrictionsState(loadUserRestrictions());
    setFavoriteIds(loadFavoriteRecipeIds());
    setIsHydrated(true);
    const handleRestrictionsSync = () =>
      setRestrictionsState(loadUserRestrictions());
    const handleFavoritesSync = () => setFavoriteIds(loadFavoriteRecipeIds());

    window.addEventListener(
      "kindi-restrictions-updated",
      handleRestrictionsSync,
    );
    window.addEventListener("kindi-favorites-updated", handleFavoritesSync);

    return () => {
      window.removeEventListener(
        "kindi-restrictions-updated",
        handleRestrictionsSync,
      );
      window.removeEventListener(
        "kindi-favorites-updated",
        handleFavoritesSync,
      );
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
      <div className="app-shell">
        <a href="#main-content" className="skip-link">
          ข้ามไปเนื้อหา
        </a>
        <Navbar
          restrictions={restrictions}
          onOpenRestrictions={() => setIsRestrictionsOpen(true)}
        />

        <main id="main-content" className="site-main">
          {children}
        </main>

        <footer className="site-footer">
          <div className="footer-inner">
            <div className="footer-brand">
              กินดิ!<small>คิดน้อยลง อร่อยมากขึ้น</small>
            </div>
            <p>{SAFETY_DISCLAIMER_TH}</p>
            <span className="footer-signoff">
              MADE FOR THE EVERYDAY APPETITE.
            </span>
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

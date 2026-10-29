"use client";

import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FoodRestrictionsModal } from "@/components/FoodRestrictionsModal";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const pendingMotion = useRef(0);
  useLayoutEffect(() => {
    const direction = pendingMotion.current;
    pendingMotion.current = 0;
    if (!direction || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = mainRef.current?.animate([
      { transform: `translateX(${direction * 16}px)` },
      { transform: 'translateX(0)' },
    ], { duration: 240, easing: 'cubic-bezier(.215,.61,.355,1)' });
    return () => animation?.cancel();
  }, [pathname]);
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
          onNavigate={(direction, animate) => { pendingMotion.current = animate ? direction : 0; }}
          onOpenRestrictions={() => setIsRestrictionsOpen(true)}
        />

        <main ref={mainRef} id="main-content" className="site-main">
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

"use client";
import React, { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { UserFoodRestrictions } from "@/types/recipe";
export function Navbar({
  restrictions,
  onOpenRestrictions,
  onNavigate,
}: {
  onNavigate: (direction: number, animate: boolean) => void;
  restrictions: UserFoodRestrictions;
  onOpenRestrictions: () => void;
}) {
  const pathname = usePathname();
  const count =
    restrictions.allergens.length +
    (restrictions.customAllergens?.length ?? 0) +
    restrictions.avoidedIngredients.length +
    (restrictions.customAvoidedTerms?.length ?? 0) +
    Number(restrictions.dietaryPreference !== "unrestricted");
  const links = [
    {
      href: "/",
      label: "วันนี้กินอะไร",
      active: pathname === "/" || pathname === "/roulette",
    },
    {
      href: "/fridge",
      label: "ค้นตู้เย็น",
      active: pathname.startsWith("/fridge"),
    },
    {
      href: "/community",
      label: "แบ่งปันเมนู",
      active: pathname.startsWith("/community"),
    },
  ];
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const nav = navRef.current;
    const indicator = indicatorRef.current;
    if (!nav || !indicator) return;
    const update = () => {
      const active = nav.querySelector<HTMLElement>('a[aria-current="page"]');
      indicator.style.opacity = active ? '1' : '0';
      if (active) indicator.style.transform = `translateX(${active.offsetLeft}px) scaleX(${active.offsetWidth})`;
    };
    update();
    const frame = requestAnimationFrame(() => { indicator.dataset.ready = 'true'; });
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    void document.fonts.ready.then(() => { if (nav.isConnected) update(); });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [pathname]);
  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link href="/" className="wordmark" aria-label="กินดิ! หน้าหลัก">
          กินดิ<span>!</span>
          <small>KIN DI</small>
        </Link>
        <nav ref={navRef} className="primary-nav" aria-label="เมนูหลัก">
          <span ref={indicatorRef} className="nav-active-indicator" aria-hidden="true" />
          {links.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={event => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.active) return;
                const current = links.findIndex(item => item.active);
                onNavigate(index >= current ? 1 : -1, event.detail !== 0);
              }}
              aria-current={link.active ? "page" : undefined}
            >
              {link.label}
              {link.href === "/community" && (
                <ArrowUpRight size={15} aria-hidden="true" />
              )}
            </Link>
          ))}
        </nav>
        <button className="diet-trigger" onClick={onOpenRestrictions}>
          <ShieldCheck size={18} aria-hidden="true" />
          <span>ข้อจำกัดทางอาหาร</span>
          {count > 0 && <b>{count}</b>}
        </button>
      </div>
    </header>
  );
}

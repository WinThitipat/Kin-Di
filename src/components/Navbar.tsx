"use client";
import React from "react";
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
  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link href="/" className="wordmark" aria-label="กินดิ! หน้าหลัก">
          กินดิ<span>!</span>
          <small>KIN DI</small>
        </Link>
        <nav className="primary-nav" aria-label="เมนูหลัก">
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

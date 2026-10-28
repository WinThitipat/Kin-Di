# KIN DI (กินดิ!) — Design System Master Specification

> **Design Direction**: Swiss Editorial Grid + Bento Box Modular Architecture + Tactile Culinary Card Experience
> **Skills Applied**: `ui-ux-pro-max`, `design-system` (3-Layer Token Architecture), `ui-styling` (Tailwind v4 `@theme` + Accessible Primitives)
> **Core Anti-Slop Mandate**: Zero AI multi-stop gradients (`linear-gradient` / `radial-gradient` hero slabs), zero thick cartoon borders (`2px` black outlines or hard offset shadows), zero robotic em-dash (`—`) copy, and zero full-width yellow wall-to-wall slabs.

---

## 1. Three-Layer Token Architecture (`design-system`)

### Layer 1: Primitive Tokens (Raw Values)
- **Paper & Warm Stone Neutrals**:
  - `--primitive-paper-50`: `#FCFBF7` (Primary warm canvas background)
  - `--primitive-paper-100`: `#F5F2EA` (Subtle inset surface / filter wells)
  - `--primitive-paper-200`: `#EAE5D9` (Warm stone divider & border base)
  - `--primitive-paper-300`: `#D8D1C2` (Hover border & interactive outline)
  - `--primitive-white`: `#FFFFFF` (Elevated Bento card surface)
- **Ink & Charcoal**:
  - `--primitive-ink-950`: `#141413` (Primary editorial ink & dark mystery card stage)
  - `--primitive-ink-800`: `#292826` (Primary button hover & secondary dark surface)
  - `--primitive-ink-600`: `#57534E` (Secondary body copy)
  - `--primitive-ink-400`: `#78716C` (Muted metadata & captions)
- **Culinary Saffron & Semantic Accents**:
  - `--primitive-saffron-400`: `#FACC15` (Signature KIN DI saffron gold accent)
  - `--primitive-saffron-500`: `#EAB308` (Saffron active/hover state)
  - `--primitive-saffron-100`: `#FEF9C3` (Soft saffron tint badge surface)
  - `--primitive-saffron-50`: `#FEFCE8` (Subtle warm highlight)
  - `--primitive-emerald-700`: `#047857` (Safe / Verified dietary status)
  - `--primitive-emerald-50`: `#ECFDF5` (Safe surface tint)
  - `--primitive-rose-700`: `#BE123C` (Allergen warning / danger text)
  - `--primitive-rose-50`: `#FFF1F2` (Allergen chip surface)
  - `--primitive-amber-700`: `#B45309` (Near-match missing ingredient badge)
  - `--primitive-amber-50`: `#FFFBEB` (Near-match surface tint)

### Layer 2: Semantic Tokens (Purpose-Driven)
- `--color-bg-canvas`: `var(--primitive-paper-50)`
- `--color-bg-surface`: `var(--primitive-white)`
- `--color-bg-subtle`: `var(--primitive-paper-100)`
- `--color-bg-stage`: `var(--primitive-ink-950)`
- `--color-text-primary`: `var(--primitive-ink-950)`
- `--color-text-secondary`: `var(--primitive-ink-600)`
- `--color-text-muted`: `var(--primitive-ink-400)`
- `--color-brand-accent`: `var(--primitive-saffron-400)`
- `--color-brand-accent-soft`: `var(--primitive-saffron-100)`
- `--color-border-subtle`: `var(--primitive-paper-200)`
- `--color-border-strong`: `var(--primitive-paper-300)`

### Layer 3: Component Tokens
- `--card-bg`: `var(--color-bg-surface)`
- `--card-border`: `1px solid var(--color-border-subtle)`
- `--card-radius`: `1.25rem` (`20px`)
- `--bento-radius`: `1.5rem` (`24px`)
- `--card-shadow`: `0 1px 2px rgba(20, 20, 19, 0.03), 0 8px 24px -6px rgba(20, 20, 19, 0.05)`
- `--card-shadow-hover`: `0 4px 12px rgba(20, 20, 19, 0.06), 0 16px 32px -8px rgba(20, 20, 19, 0.09)`

---

## 2. Layout & Spatial Architecture (`ui-ux-pro-max`)

1. **Asymmetric Bento Hero Grid (`12-column`)**:
   - Instead of a full-width yellow banner stacked above white boxes, the home view uses a **2-Zone Bento Grid**:
     - **Left Editorial Bento (7 cols)**: Crisp white surface (`#FFFFFF`) with subtle stone border (`#EAE5D9`), saffron status pill, bold Thai headline (`คิดไม่ออก ก็สุ่มดิ!`), live eligible recipe counter, active restriction chips, and primary action bar.
     - **Right Tactile Card Stage Bento (5 cols)**: Deep warm charcoal card table (`#141413`) with subtle gold trim, interactive 3-card fan preview, and inline deck size switcher (`3 / 5 / 7 ใบ`) right on the stage.
2. **Integrated Filter Dock**:
   - Compact 3-column Bento strip for `มื้ออาหาร`, `หมวดหมู่อาหาร`, and `เวลาทำอาหาร` with instant pool count feedback.
3. **Editorial Recipe Catalog (`รวมเมนูทั้งหมด`)**:
   - Magazine-style cards with 16:10 image aspect ratio, floating category badge, tabular cooking time (`tabular-nums`), and 1-click external recipe launch (`ดูสูตรอาหาร`).
4. **Touch Targets & Accessibility**:
   - Minimum `44px` (`min-h-11`) touch targets on primary interactive controls.
   - Native `<dialog>` modals with clean white/paper headers (no heavy yellow modal headers).

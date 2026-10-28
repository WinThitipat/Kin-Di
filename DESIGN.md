# KIN DI visual direction

The October 2026 redesign replaces the former yellow bento treatment with a Thai food journal: chili red, warm ivory, generous spacing, expressive Thai type and one appetizing photographic centerpiece. The user delegated the visual direction and confirmed preservation of the existing product features.

## Product surfaces

- Home and roulette: a clear meal decision first, compact filters directly above the roulette action, ingredient matching as a secondary route, and an open recipe collection below.
- Fridge: ingredient selection and matched recipes in two work areas on desktop, stacked on mobile. Ingredient families use dividers rather than nested cards.
- Community: a numbered recipe form and a collection sidebar, with an explicit success state after submission.
- Recipe detail: food image, prominent title, source link, ingredient checklist, cooking steps and the existing safety information.
- Dietary settings and roulette use native dialogs with fixed headers, scrollable content, visible close controls and Escape dismissal.

## Visual system

Canonical tokens and responsive rules live in `src/app/globals.css`.

| Role | Value |
| --- | --- |
| Canvas | `#FBF7EF` |
| Ink | `#302923` |
| Secondary text | `#6E5D50` |
| Chili action | `#A33326` |
| Chili hover | `#83271E` |
| Rules | `#DDD2C2` |
| Pantry surface | `#E6E9DA` |
| Quiet surface | `#FFFDF8` |

Typography: self-hosted IBM Plex Sans Thai, regular, medium, semibold and bold, with its OFL license in `public/fonts/OFL.txt`. Display type is large and tightly composed; functional labels stay restrained. Corners are small on controls; the photographic arch is the signature shape. No decorative gradients, glass layers, repeated icon tiles or floating badges as page structure.

The generated editorial hero in `public/images/thai-table.jpg` is atmosphere, not a catalog recipe. Actual recipe photography always comes from each recipe's image field. Missing and failed images have an explicit neutral fallback. No sample recipes are added to user storage by the app.

## Motion and accessibility

The hero has one short entrance sequence. Buttons give a restrained press response. Dialogs enter over 220ms, with matching backdrop timing. Card reveals use a deliberate 450ms flip and can be immediately revealed with reduced motion enabled. Hover movement is restricted to fine pointers. Focus, text selection, caret and scrollbar colors match the palette. All primary actions and ingredient selections have at least 44px targets.

## Verification

`npm run lint`, `npm test`, and `npm run build` are the project gates. `scripts/verify-redesign.cjs` uses a disposable Playwright browser context to test responsive layouts, filters, roulette, saved favorites, dietary restrictions, recipe details, ingredient matching and recipe sharing. Screenshots are written under `artifacts/redesign`. Its test recipes are isolated fixtures and never shipped as product data.

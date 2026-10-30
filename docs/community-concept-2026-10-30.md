# Community recipe desk — 2026-10-30

Applied the user-approved desktop/mobile image concept to the existing Next.js community page. No framework or dependency changes and no generated food images were added.

## Design decisions
The main question is: how do I save and share a recipe? The four-step form is the primary workspace; the searchable collection is secondary. The existing KIN DI wordmark, cream/red palette, Plex Thai typography and real recipe photos carry the identity. The concept supplied the direction, so no random style redraw was used.

- Desktop: a restrained food banner above aligned form and collection panels.
- Mobile: compact banner, a native progress bar and current step label, then form and collection in reading order.
- Removed duplicate fieldset headings visually; the fieldset accessible names remain.
- Kept existing draft persistence, validation, image modes, review, admin PIN and database submission logic.
- Collection search matches recipe names and category labels. Six initial rows with load more prevent an excessively long mobile page.
- Collection recipe links are neutral outlined controls; the form retains the primary red action.

## Verification
Production build passed. Browser checks cover 320, 390, 600, 768, 1024 and 1440px: search, no-results state, clearing search, load more, progress and no horizontal page overflow. The existing mobile-touch/desktop four-step test passed validation, focus progression, back navigation preserving data, review, mocked API save and reset. No test recipes were written to the live database.

The design-taste-frontend app inspector and screenshots were reviewed at desktop, tablet and mobile. Remaining warnings about the cream palette and banner title reflect the explicitly approved concept and established brand. Unequal panel heights are intentional: form and searchable list contain different content and do not stretch over blank space. Border contrast is retained for visible form grouping. These are documented design choices, not a claim of a perfect inspector score.

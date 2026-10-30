# Compact community actions — 2026-10-30

Corrected the visual issues identified in the user screenshots: full-width row buttons and expanding horizontal action trays made each recipe unnecessarily tall.

Recipe rows now align a compact thumbnail, metadata, a text link and a 44px overflow trigger. The anchored vertical action surface opens without changing row height. Only one recipe action surface stays open; clicking outside or pressing Escape closes it. Removed the nested recipe-list scrollbar so the floating surface is not clipped. Share, edit, original-source and PIN-protected delete behavior is preserved.

Used design-taste-frontend app guidance with the approved brand preserved. Reviewed desktop and phone screenshots with actions both open and closed. Browser checks at 320,390,600,768,1024,1440px verify unchanged row height on open, menu bounds, exclusive opening, outside dismissal, search and pagination. Existing touch/desktop four-step form tests pass, including edit return and Escape dismissal. Production build passes. Tests use mocked writes rather than live recipe creation.

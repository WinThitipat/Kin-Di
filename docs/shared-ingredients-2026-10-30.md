# Shared ingredients — 30 October 2026

Fridge additions now POST to /api/ingredients and save immediately to Supabase. Add remains visible for a non-empty query even when partial results exist. A built-in exact match returns the existing ingredient; custom names use normalized unique keys and conflict handling to prevent concurrent duplicates.

Private table with RLS enabled, direct anon writes revoked, secret-checked security-definer RPCs with empty search_path. API enforces same origin, bounded input, name validation and the existing shared creation rate limit. Server secrets stay server-side. Custom safety composition is marked unknown rather than assumed verified.

Reads hydrate the browser ingredient cache from the database. Pantry selection stays device-local; the ingredient catalog is shared. Failure keeps search text and does not report a successful save.

Build passed. End-to-end test saved the genuine ingredient ไข่เป็ด, read it in a fresh browser, submitted the same name again and verified one database record. Partial-match search still allows Add; invalid empty input returns 400; mobile and desktop have no horizontal overflow. SQL confirms RLS and no direct anon INSERT permission. Existing local-only additions are not automatically uploaded.

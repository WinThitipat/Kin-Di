# API and infrastructure audit — 29 October 2026

Scope: local production build, three API endpoints, all application routes, browser-side data loading, Supabase recipe integration, dependency registry audit. No public hosting deployment, DNS, TLS termination, provider backups, or multi-instance environment was available to validate.

## Fixed

- Oversized requests were buffered in full before checking size; deletion had no body limit. Shared streaming JSON reader now rejects declared and actual oversized bodies with HTTP 413 (2 MB save/edit, 4 KB delete), preserving malformed-JSON HTTP 400 and origin HTTP 403.
- Supabase network calls had no deadline. Server database fetches now time out after 15 seconds; browser recipe reads after 20 seconds and writes after 25 seconds. Write timeouts preserve the existing retry-safe ID behavior and keep the draft.
- Recipe detail converted backend failures into a misleading not-found screen. It now shows a distinct load error and retry action. Removed redundant URL decoding that could throw on malformed percent-encoded IDs.
- Recipe detail memoized the ingredient catalog before asynchronous snapshots arrived. It now rebuilds when the recipe arrives.
- Patched dependency findings: Next 15.5.23 → 15.5.28, sharp 0.34.5 → 0.35.5, Zod 3 → 4.6.7, Vitest 3 → 5.0.5. Next's stale PostCSS 8.4.31 is replaced by the pinned 8.5.32 override. Updated draft-schema access for Zod 4 while retaining incomplete-draft support. Final npm audit reports zero known vulnerabilities; see artifacts/dependency-audit-after.json.

## Verification

- 50 unit/API regression tests pass; TypeScript check and production build pass.
- scripts/verify-api-infra.cjs: all three API endpoint origin/JSON/size checks, no-store database GET, all page routes at mobile/desktop widths, malformed recipe ID, simulated database failure and retry.
- scripts/verify-fridge-request-loop.cjs: one initial recipe GET; ingredient-only changes cause no recipe GET; recipe changes reload once; navigation does not duplicate listeners.
- scripts/verify-recipe-functions.cjs: real database persistence, PIN edit rejection/acceptance, stale-edit rejection, draft recovery, sharing, cross-browser reads and every recipe consumer. Creates labeled test recipes and archives only those rows afterward.

## Remaining deployment boundaries

- Supabase advisor reports four anonymous-executable SECURITY DEFINER RPCs. All validate a separate high-entropy server secret and use an empty search_path; direct anonymous table UPDATE/DELETE are revoked. This is a deliberate existing access pattern, not a clean advisor result. Remediation reference: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- PIN attempt limits are process-local and reset on restart. A shared persistent limiter is required before scaling to multiple instances. No claim of multi-instance brute-force protection is made.
- Existing browser drafts/favorites/restrictions remain browser-local by design. Saved recipes are authoritative in Supabase.
- Registry auditing is point-in-time; zero reported advisories does not establish absence of all security issues.

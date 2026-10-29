# Shared request limits and recipe image storage

Implemented 29 October 2026. Hosting deployment remains out of scope.

## Limits

The private Postgres table `private.kindi_request_limits` stores an atomic fixed-window counter. Its security-definer RPC authenticates `RECIPE_SERVER_SECRET` before consuming any quota. The edit and delete endpoints share the same `pin` scope. Limits are **global to this small application**, not per IP: 5 PIN attempts/minute, 12 recipe creation attempts/minute, 40 internal image uploads/minute. Successful PINs also consume attempts. Counters persist through restarts and work across application instances. HTTP 429 includes Retry-After; database limiter outages fail closed with 503.

This deliberately avoids trusting unconfigured forwarded-IP headers before tomorrow's hosting choice. A malicious user can consume the shared budget and temporarily block other users. At public deployment, consider trusted ingress identities plus per-client and global budgets rather than treating this as complete DDoS protection. The current windows expire naturally; no scheduled cleanup is needed because only three rows exist.

## Storage

All nine active menu photos were copied into the public `recipe-images` bucket and their Supabase recipe documents were updated after successful upload. Original recipe records were preserved in `artifacts/storage-migration/before.json` for rollback. Recipe IDs and creation timestamps were retained. Original sources/local files remain available; no destructive cleanup was performed.

New saves/edits decode supported uploads, enforce input pixel/byte limits, resize to at most 960px, and encode WebP (max 512 KiB). Content-addressed filenames prevent overwrites and make retries reuse the same object. Storage commit precedes recipe commit; an interrupted recipe write can leave an unused content-addressed object. Do not delete unused objects automatically without checking active references and a grace period.

A server-only Edge Function authenticates the existing server secret through the rate-limit RPC and uses its built-in service-role environment credential for Storage writes. No new service-role key is copied into the Next.js environment or browser. The public bucket permits reads; anonymous uploads fail. The edge has JWT verification disabled because it implements secret authentication itself. Preserve this authentication on every change.

Server-side URL imports are restricted to the previously used public photo hosts and reject redirects, custom ports and credentials. Other sites require uploading a JPG/PNG/WebP file. This restriction prevents fetching arbitrary internal network addresses. Existing Storage URLs are reused directly. The photographer credit for the real pork photo remains on the recipe detail page, with the license in public/images/CREDITS.md.

## Verification

- 52 unit/API tests; TypeScript and production build.
- Live image migration verifies every public object URL.
- Live test confirms new save/upload, admin edit, unauthenticated Edge rejection and anonymous Storage-write rejection.
- Concurrent wrong PIN attempts across edit/delete produce four 401 responses and two 429 responses after one prior authorized edit: the shared five-attempt budget is atomic.
- Restarting the Node app retains the active PIN lock.
- Thirteen repeated idempotent save requests hit the shared creation limit; the single test recipe is archived afterward.
- Mobile/desktop page checks show migrated images and handle database failures/retries.

## Advisory notes

The advisor now reports five guarded public SECURITY DEFINER RPCs and an INFO for RLS without policies on the private counter table. The private counter intentionally denies direct access; only the guarded RPC owns mutation. No anonymous INSERT/UPDATE Storage policies were added. References:
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

If rolling back application code, leave migrated images in Storage and keep the new database functions/table. Restoring the rollback recipe snapshot requires explicit row/version checks to avoid replacing later user edits.

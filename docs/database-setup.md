# KIN DI database and admin deletion

## Connected project

- Project: `kin-di`, organization `WinThitipat's`, Singapore.
- Project reference: `crspsvwptpvohcojlyst`.
- Dashboard: https://supabase.com/dashboard/project/crspsvwptpvohcojlyst
- Migration applied: `supabase/migrations/20261029000000_shared_recipe_documents.sql`.

The authoritative recipe store is `public.community_recipes` in Supabase Postgres. Each row stores the complete recipe aggregate, including ingredients, ingredient-name snapshots, image, cooking instructions, and allergen metadata. The aggregate is inserted atomically. Browser recipe records are now legacy import backups only; new saves and edits do not write recipe copies there.

## Local configuration

`.env.local` is gitignored. The live project URL, publishable key and random server-only secret have been configured locally. The administrator's chosen PIN is stored only as a salted scrypt hash in `ADMIN_DELETE_PIN_HASH`; the former plaintext variable has been removed. The hash cannot be read back as a PIN. Use `hashAdminPin` from `src/lib/admin-pin.server.ts` to generate a new hash, update the environment variable, and restart Next.js. Never put the hash or `RECIPE_SERVER_SECRET` in a `NEXT_PUBLIC_*` variable. Live PIN integration tests receive a PIN temporarily through `TEST_ADMIN_PIN`, not from a committed file.

For a hosted deployment, copy the environment variables from `.env.local` into the host's protected environment-variable settings. Do not commit the file. The server secret must match the SHA-256 digest in `private.kindi_server_config`; rotating it requires updating both locations.

## Flow

1. The community form posts to `/api/recipes`. The server validates the submission and constructs the recipe; client-provided safety flags are ignored.
2. A server-authenticated database RPC inserts the complete recipe before the API reports success. A repeated submission ID never overwrites or duplicates a recipe.
3. Other browsers read the same data through `/api/recipes` with caching disabled. Local ingredient names are hydrated from server-produced snapshots.
4. The delete button opens a native PIN dialog. Five incorrect attempts lock the local server endpoint for one minute. Only a successful server PIN check calls the database archive operation.
5. Archiving sets `deleted_at`; normal reads omit that recipe. A deletion marker excludes old local backups from the import prompt, preventing accidental re-import of archived recipes.

The in-memory PIN limiter is suitable for this single-server local deployment. Before scaling to multiple application instances, replace it with a shared rate limiter.

## Existing browser recipes

Legacy recipes remain untouched. When local-only recipes are detected, the community page shows **นำเมนูเดิมขึ้นฐานข้อมูล**. Import is explicit, preserves the legacy recipe ID, keeps the local backup, and can be retried safely. If an import fails halfway, already-saved rows remain and the remaining local data is preserved.

## Database protection

RLS permits public reads of active recipes. Direct anonymous INSERT, UPDATE and DELETE are revoked. The write/archive RPCs are intentionally executable by the anonymous API role but verify a separate 256-bit server secret against a digest in the unexposed `private` schema. The publishable key alone cannot perform these operations. Function search paths are fixed and database object references are qualified.

Supabase's generic advisor flags these as public SECURITY DEFINER functions. This is an intentional authenticated-server RPC pattern, not unrestricted anonymous access; live tests verify that direct DELETE and an incorrect RPC secret are rejected. Advisor reference: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

Unknown recipe allergens and cross-contact risk stay `unknown` rather than being inferred as free of allergens. User-provided ingredients do not automatically establish complete safety metadata.

## Recovery and rollback

Recipes are soft-archived. An administrator can restore a row by setting its `deleted_at` to NULL in Supabase. Restore only the intended ID. The old normalized-schema migration and browser-local data have not been dropped or rewritten. Reverting the application code does not delete the new database table or local backups.

## Verification

- `npm test`: API validation, PIN authorization, rate limiting, database error handling, and existing roulette/safety rules.
- `scripts/verify-supabase-flow.cjs`: real Supabase save, image/metadata round trip, separate browser, full local cache, idempotent retries, legacy import, wrong/correct PIN, direct anonymous deletion rejection, and simulated database outage. Only test-labeled rows are used and they are soft-archived afterward.
- Other browser regression scripts use `scripts/mock-recipe-api.cjs` and cannot mutate live Supabase.


## Recipe editing, drafts and sharing

- `POST /api/admin/update-recipe` checks same-origin, the existing scrypt admin PIN hash, an attempt limit, submission validation and the recipe version before updating.
- `kindi_update_recipe` uses the same private server secret as existing RPCs. Direct anonymous UPDATE remains revoked. Its atomic version check prevents stale writes and refuses archived rows. The original recipe ID and creation time are preserved; `updated_at` tracks the current version.
- The security advisor now reports four anonymous-executable SECURITY DEFINER RPCs (including this new guarded update RPC). All require the high-entropy server secret, use an empty search path and explicitly qualified tables. See [Supabase's advisory](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable). Keep the shared rate limiter requirement for multi-instance deployment.
- Drafts are browser-local under `kindi-recipe-draft-v1`. They include image data and the active step, but never the PIN. Successful submission clears the draft; failed submission retains it. Storage failures display a warning. Drafts do not sync between devices.
- Share uses Web Share when available, clipboard otherwise, and a selectable link if clipboard access fails. Shared links use the current origin: localhost links work only on the host computer until the app is deployed to a public domain.
- Verification: `scripts/verify-recipe-functions.cjs` requires `TEST_ADMIN_PIN`, creates explicitly labeled test recipes, and archives only those recipes afterward. It covers mobile/desktop draft recovery, image persistence, edit authorization, stale edits, sharing branches, and cross-browser database reads.


## Database as the recipe source

All active recipe readers use `/api/recipes` without caching, backed by Supabase. New saves and edits wait for the database response and do not write browser-local recipe copies. Home/roulette, the full collection, fridge matching and recipe details share this repository. Database errors return no local fallback. Legacy browser records are kept only as a separate import source on the community page and are excluded from all active recipe pools until imported. Drafts, favorites, restrictions and ingredient selections remain local user preferences.

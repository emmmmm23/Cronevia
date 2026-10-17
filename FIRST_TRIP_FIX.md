# First-trip failure: evidence and deployment

## Evidence from the configured hosted service

The read-only `npm run check:planner` probe connected to `lrgxrfyzakehsnifypmd.supabase.co` during this investigation. No account tokens, payload values, or private rows are recorded here.

| Request | HTTP | Code | Sanitized service message |
| --- | --- | --- | --- |
| Trips required-column probe | 400 | 42703 | column trips.timezone does not exist |
| Itinerary required-column probe | 400 | 42703 | column itinerary_items.end_day_offset does not exist |
| POST rpc/trip_folder_summaries, no arguments | 404 | PGRST202 | Could not find the function public.trip_folder_summaries without parameters in the schema cache |
| POST rpc/create_trip_draft, details + draft_id | 404 | PGRST202 | Could not find the function public.create_trip_draft(details, draft_id) in the schema cache |
| POST rpc/ensure_trip_days, target_trip_id | 404 | PGRST202 | Could not find the function public.ensure_trip_days(target_trip_id) in the schema cache |
| POST rpc/save_trip_place | 404 | PGRST202 | Could not find public.save_trip_place(activity_id, details, place_date, target_trip_id) in the schema cache |
| POST rpc/reorder_trip_places | 404 | PGRST202 | Could not find public.reorder_trip_places(item_ids, place_date, target_trip_id) in the schema cache |

These are live schema probes with the configured public API key, not a replay of a user's authenticated request. Missing RPC resolution occurs before insert constraints can run. The repository's base and legacy Supabase schemas both make destination, description, start/end dates nullable; `create_trip_draft` supplies the owner from `auth.uid()` and a stable slug. The local SQL test proves that a new active account can create with only a trimmed title and add a first manual place. The hosted constraints and authenticated save still require post-deployment verification.

## Request trace and implementation

- Route guards await auth initialization. Supabase restores/refreshes its session; API operations verify the user with `auth.getUser()` and scope trip queries to their ID. RLS also enforces the active owner. A rejected session now gets an inline sign-in recovery form on the list/create screens, preserving the in-memory name. Auth-service outages remain request failures, not expired-session messages.
- Previously Trips loaded the authenticated list and `trip_folder_summaries()` in parallel, so the missing summary RPC failed even for users with zero trips. It now loads the real list first, and requests summaries only when trips exist. A failed list remains an error with Retry. Zero trips, no search matches, loading, and errors are separate states.
- Previously a confirmed create was followed by optional media hydration inside the POST adapter. A media failure could make a successful save appear failed. The adapter now returns the server-confirmed row immediately. The creation screen retains the returned ID and retries opening that ID after navigation failure. An uncertain create response keeps the original draft UUID; repeated clicks are guarded. There is no direct-insert or local-only fallback.
- The actual deployment commands previously called `npm run build`, bypassing the existing schema check. Both Vercel configurations and `deploy-to-vercel.ps1` now run `npm run check:planner-release`, which checks production-mode environment values (matching the Vite build) and blocks the build when that database lacks required planner dependencies.

## Required deployment action — not applied remotely

No Supabase/psql CLI, database admin connection environment, or Supabase connector was available. The browser deployment surface also failed to initialize (`failed to write kernel assets`, OS error 3). The public frontend key cannot install migrations. No hosted SQL or production deployment was executed.

The required versioned fix already exists in migrations `20261015000001` through `20261018000001`; do not create a second trip system or bypass RLS. The complete transaction is `supabase/apply-trip-planner-upgrade.sql`.

1. From `frontend`, run `npm run planner:bundle` and `npm run test:database`.
2. In the SQL Editor of **project lrgxrfyzakehsnifypmd**, review and run the **entire** `supabase/apply-trip-planner-upgrade.sql` transaction. It installs the missing planner columns/RPCs in order, retains existing data, preserves ownership policies, and notifies PostgREST to reload its schema cache. Follow the existing backup/release procedure. If the project is managed through the Supabase CLI instead, apply the versioned files with the linked project's normal `supabase db push` workflow; do not mix migration ledgers casually.
3. Run `supabase/verify-trip-planner.sql` in that same project. Check nullable optional fields, function signatures, private buckets and ownership policies. Then run `npm run check:planner-release` with that deployment's public Supabase URL/key configured.
4. Deploy the frontend. Verify with an ordinary signed-in account that has zero trips: empty state → create name only → add manual place → reload. Repeat with a second account to verify private trip isolation. Production creation is not confirmed fixed until this succeeds.

See `FOLDER_PLANNER.md` for the full migration review and optional place-provider setup. Manual creation and manual places do not require the map provider.

## Verification scope

Unit coverage includes navigation failure after confirmed creation, uncertain-response retries using the same UUID, duplicate submission blocking, blank-name validation, HTTP/database error preservation and authentication outage classification. Browser coverage uses mocked Supabase responses for first-time desktop/phone flows, genuine load failure, missing summary service, post-create load failure, and expired-session recovery. The local PostgreSQL/PGlite suite executes the actual migrations, constraints and RLS with fixture auth/storage schemas; it is not a hosted save test.

## Follow-up after the user ran the upgrade

The user reported `Success, No rows returned` after running the upgrade in the SQL Editor. A subsequent live production-mode probe against the same project no longer returned `PGRST202` or `42703`. All seven requests returned HTTP 401 / `42501` (permission denied for the respective private table/function). This is expected for the unsigned probe and does not establish that a signed-in save or the full SQL verification succeeded.

The release checker previously accepted those denials only for RPCs; it now accepts them for private table probes too, without granting anonymous access. Missing schema, invalid API keys/JWTs and server errors still fail. Run `node --test scripts/test-planner-probe.mjs` from `frontend` for the focused regression checks. The remaining verification is the SQL verification script and an authenticated create/add-place/reload flow in Cronevia.

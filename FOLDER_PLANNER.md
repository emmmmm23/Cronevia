# Folder-first trip planner

The active frontend uses Supabase Auth, Postgres, row-level security and private Storage. Creating a trip requires only a name. The device's IANA timezone is included automatically. A stable UUID is retained for each creation/save attempt; an uncertain response can be retried without creating another record. Nothing falls back to local-only persistence.

## Data and migration review

`supabase/migrations/20261018000001_folder_planner.sql` extends existing records:

- `trip_days.explicit_date` distinguishes dates chosen in the place editor from older numbered-day schedules. Changing optional trip dates leaves explicit dates fixed. Existing dated/undated places and Ideas remain visible; Ideas appear under Unscheduled until assigned a date.
- `itinerary_items.latitude`, `longitude`, `location_source` store an optional paired, range-checked pin. Existing joined `locations` still display. Editing the address clears the old pin; search/map/GPS use the existing explicit-confirmation picker.
- `save_trip_place(uuid,uuid,date,jsonb)` validates ownership, locks the parent trip, finds or creates the chosen date's existing day record, moves the item and linked journal day, and saves fields/pin in one transaction. Invalid coordinates or times roll back the whole operation. IDs, notes, categories and links remain in the same itinerary system.
- `trip_folder_summaries()` provides real place counts and date ranges. Both new functions run as the authenticated caller, with existing RLS; anonymous execution is revoked. No service key belongs in frontend code.
- `reorder_trip_places(uuid,date,uuid[])` atomically reorders untimed stops across the whole visible date group, including older trips with several undated day records. It rejects stale, duplicate, cross-trip or incomplete ID lists. It also runs as the caller under RLS.
- No table is dropped; no existing trip or place is deleted. Existing trip/day/activity policies remain enabled. The upgrade is repeatable and tested against real PostgreSQL in PGlite with fixture auth/storage schemas.

## Deploy to the existing hosted project

Production has NOT been changed from this workspace. The project previously returned missing-column errors and PGRST202 for `create_trip_draft(details,draft_id)` and `ensure_trip_days(target_trip_id)`. A frontend deployment alone cannot install these SQL functions. End users require no owner approval after the deployment is correctly installed.

1. Confirm the intended Supabase project (`lrgxrfyzakehsnifypmd`) and take the usual database backup. In a checkout with the frontend dependencies installed, run:

   ```powershell
   cd frontend
   node scripts/build-trip-planner-upgrade.mjs
   npm run supabase:bundle
   npm run test:database
   ```

2. For the existing October 14 schema, open that project's Supabase **SQL Editor**, paste **the complete** `supabase/apply-trip-planner-upgrade.sql`, and run it once. This transaction installs migrations October 15, 16, 17 and 18 together, in dependency order, and reloads PostgREST's schema cache. Do not execute only the last migration on an older project. If SQL reports an error, the transaction rolls back; resolve the dependency before deploying the frontend.

   For a new database use the repository's full migration setup. For an already CLI-managed project, use the linked project's normal `supabase db push` workflow with the versioned migrations instead of the SQL bundle. Do not mix SQL-editor and CLI migration-ledger management without reconciling the ledger.

3. Run `supabase/verify-trip-planner.sql` in the SQL Editor. Confirm the fields, functions, existing ownership policies, private buckets, `prosecdef=false`, `anon_execute=false`, `authenticated_execute=true`. Then run `npm run check:planner` from `frontend`. This is a read-only schema probe using the public key; it must resolve all RPC signatures, but is not proof of signed-in persistence.

4. Run `npm run check:planner-release` as the release gate. It checks the configured hosted schema before building and fails if the dependencies are absent. Deploy the frontend with its existing public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The app's existing auth session is used for every save.

5. For place lookup on Vercel, configure **server-only** `GEOAPIFY_API_KEY` for `frontend/api/places.js`, then redeploy the serverless handler. The local Vite server does not implement this production endpoint. An approved proxy can be configured through `VITE_PLACES_ENDPOINT`. Never put a privileged or Geoapify secret key in a `VITE_` variable. Map tiles use the existing configured provider or OpenStreetMap with visible attribution. See `DESTINATION_PICKER.md` for proxy, quota and map configuration. Manual places work without either service.

6. Verify with two real test accounts: create a name-only folder; add manual, dated, overnight and pinned places; reload; move/delete; retry an interrupted save; verify the other account cannot read or write the private trip or its child records. Confirm folder count and range after returning to Trips. Only after this authenticated hosted verification should production creation be described as fixed.

No database admin connection or authenticated deployment capability was available in this workspace. Applying SQL and the signed-in hosted smoke test remain deployment actions.

## Validation scope

- `npm run build`: TypeScript/Vue and production compilation.
- `npm test -- --maxWorkers=2 --minWorkers=1`: existing unit suite, including search selection, stale requests, pin clearing, GPS success/denial/timeout/unavailable, reverse lookup failure, and map confirmation/cancellation.
- `npm run test:database`: full versioned migrations and repeatable upgrade, real SQL constraints, atomic rollback, name-only folders, retry IDs, explicit dates, pins, manual clearing and cross-account RLS rejection.
- `npx playwright test --config playwright.itinerary.config.ts`: Edge browser flows with mocked Supabase/place responses, blocked map tiles, touch events, phone 360/390px, tablet 768px and desktop 1440px. Screenshots in `frontend/test-results/planner/folder-*.png`.
- Browser fixture saves demonstrate UI behavior and reload hydration, not hosted persistence. No live GPS, live Geoapify credential or successful live tile response is implied by these tests.

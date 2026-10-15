# Destination picker deployment and verification

Creation and both trip edit entry points share `DestinationPicker.vue`. Text remains valid without a pin. Search, map and GPS pins persist as `destination_latitude`, `destination_longitude`, and `destination_source`; the existing `destination` is the display label. No timezone is inferred. Coordinates are validated as a pair in the API and PostgreSQL. The active frontend uses Supabase; the legacy Laravel application is not this frontend's API.

## Database deployment

1. Confirm the intended Supabase project against the deployment's `VITE_SUPABASE_URL`. Back up according to the project's normal deployment process.
2. Apply existing migrations through `20261016000001_itinerary_timeline.sql` first. Review and execute `supabase/migrations/20261017000001_trip_destination.sql` in that project's SQL editor, or apply pending migrations in order using the established Supabase CLI process. The new file is one transaction and can be reapplied.
3. The migration adds three nullable columns and a CHECK constraint; it replaces `create_trip_draft(uuid,jsonb)` only to add the fields to its INSERT. Existing authentication, ownership filtering, invoker security, grants, idempotent IDs and atomic ideas creation remain intact. It does not modify RLS, visibility, owners, existing destination names or timezones. There is no data deletion/backfill.
4. Verify with `SELECT destination,destination_latitude,destination_longitude,destination_source FROM public.trips LIMIT 0;` and inspect `SELECT pg_get_functiondef('public.create_trip_draft(uuid,jsonb)'::regprocedure);` for all three new INSERT fields.
5. Deploy the frontend after the migration. In an authenticated test account, create a pinned trip, reload, reopen Edit trip details → Choose on map and compare coordinates. Save a changed pin and repeat. Edit the destination text and save: all three pin columns must become NULL. Verify another account cannot access the trip.

Do not reapply an older planner-only bundle after this migration: it would restore the old creation function. Reapply the destination migration last if that happens. The full migration-bundle generator discovers migrations in order. No hosted migration has been applied by this task.

## Place lookup and map configuration

The supplied Vercel Node endpoint is `frontend/api/places.js`. Set Vercel's project root to `frontend`, and configure **server-only** `GEOAPIFY_API_KEY` plus `SUPABASE_URL` and `SUPABASE_ANON_KEY` (existing `VITE_SUPABASE_*` values are accepted as fallback). Never prefix the Geoapify key with `VITE_`. The endpoint verifies the user's Supabase access token, validates queries, limits output, times out upstream calls, and returns generic errors without logging coordinates or secrets.

Geoapify receives explicit search queries and GPS coordinates for reverse lookup. See https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/ and https://apidocs.geoapify.com/docs/geocoding/reverse-geocoding/. Configure a provider plan appropriate to expected volume and enforce an aggregate quota/rate rule at your production gateway or Vercel firewall. The endpoint's per-user in-memory throttle is per instance, not a distributed quota. Configure hosting access-log redaction for query parameters; do not retain precise GPS lookup URLs unnecessarily.

`npm run dev` serves only Vite and does not run Vercel functions. For live local lookup, use the project's Vercel development environment with those server variables, or set `VITE_PLACES_ENDPOINT` to an approved endpoint. With plain Vite and no configured endpoint, lookup shows its retry/manual-entry state. There is no live provider key included in this change.

Replaceable build configuration:

- `VITE_PLACES_ENDPOINT`: URL accepting `?q=...` or `?lat=...&lon=...`, returning an array of `{name,latitude,longitude}`. Same-origin calls attach the user's access token; external origins never receive it.
- `VITE_PLACE_PROVIDER_NAME`: disclosure label (default Geoapify). If changing provider, update the provider attribution link in the picker to meet its terms.
- `VITE_MAP_TILE_URL`: approved raster URL with `{z}/{x}/{y}` placeholders.
- `VITE_MAP_ATTRIBUTION`: trusted deployment-controlled attribution HTML for the tile provider.

Default raster tiles use OpenStreetMap with attribution, browser caching and normal browser Referer headers. No prefetch/offline feature is implemented. Retain Referer headers and follow https://operations.osmfoundation.org/policies/tiles/; choose a contracted tile provider for production needs beyond that service's policy. The implementation does not call public Nominatim. Do not point the adapter at public Nominatim without an explicit policy review and application-wide throttling/caching; its raw response format is different.

GPS is one-shot and only starts after a click. It requires HTTPS or localhost. Browser timeout is 10 seconds with a 12-second guard; closing invalidates callbacks. Reverse lookup failure preserves coordinates. Editing coordinates changes the source to map. Initial world view never creates a pin. Tile/WebGL failure leaves coordinate entry and manual destination text available.

## Validation

From `frontend` run `npm run build`, `npm test -- --maxWorkers=2 --minWorkers=1`, `npm run test:database`, `node --test scripts/test-places-proxy.mjs`, and `npx playwright test --config playwright.destination.config.ts`.

Unit tests mock map/GPS/geocoding. Browser tests mock Supabase and place lookup and block live tiles; they exercise real forms, dialogs, focus, failed-save retention, pin confirmation/cancellation, save/reopen and phone/desktop layout. Database tests run actual PostgreSQL in PGlite with auth/storage fixtures, including creation RPC persistence, invalid coordinates, repeat application, clearing and ownership isolation. These checks do not prove hosted database deployment, live provider availability or physical-device GPS accuracy.

Verified in this implementation: 113 unit tests passed; local database suite passed; proxy test passed; two browser scenarios passed at desktop and 390px phone widths with touch enabled, including actual map canvas tap/click, draggable marker and zoom control. Reviewed `frontend/test-results/planner/destination-phone.png` and `destination-desktop.png`; these deliberately show the tile-failure fallback. Build passed with the MapLibre chunk-size warning; the map module is loaded only when opening the picker. Live Geoapify requests were not verified because no provider key was configured; OSM tile traffic was deliberately blocked in automated tests. Hosted schema deployment and authenticated live round-trip verification remain deployment steps.

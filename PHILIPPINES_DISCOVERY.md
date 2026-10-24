# Philippines discovery and decision support

## What is implemented

The existing destination picker, MapLibre maps, Geoapify proxy and Supabase itinerary remain the implementation. The picker frames the Philippine archipelago, restricts navigation to a padded regional rectangle, and checks country membership separately. Search and nearby requests specify `countrycode:ph`; reverse geocoding intentionally does not, so a foreign GPS position is never snapped into the country. Provider country evidence takes precedence over the attributed, locally bundled OCHA/NAMRIA/geoBoundaries land geometry. Small coastal points outside that geometry need provider confirmation. Existing foreign pins remain saved and visible; editing cannot silently relocate them.

Search is explicitly submitted. Pin clicks, completed drags and coordinate edits trigger settled nearby requests; requests are cancelled/versioned, and cached for five minutes (50 queries, in memory). “View on map” highlights a separate sage marker. Only “Choose this destination” changes the burgundy destination pin. Confirmation does not wait for nearby recommendations. Map/Places tabs and a fixed confirmation footer keep the full-screen mobile picker usable. Coordinates live in a disclosure.

The existing Add Place editor receives recommendations with name, address, coordinates, provider identity and planning day. A standalone `/map` visit offers existing trip folders and the existing name-only New trip flow. Navigation drafts stay in memory and are not represented as saved records. All saves use the signed-in user's existing trip ownership rules. Day-plan suggestions require review and “Add selected stops”; stable UUIDs survive failed or lost responses. Successfully saved entries are tracked during a partial retry. Existing itinerary entries are never moved by the DSS.

## Explainable rules

Rules are centralized in `frontend/src/composables/discovery.ts`; provider data lives in `types/discovery.ts` and `services/places.ts`; presentation is `NearbyPlaces.vue`.

- Each matching interest: +40. Distance contributes 0–20 points within the preferred straight-line distance; outside points remain visible with an explanation.
- A category/provider estimated visit fitting a free wall-clock window: +10, explicitly excluding travel.
- Provider-supplied 24/7 hours: +5. Other raw opening-hour strings are displayed but not interpreted as open/closed for a particular date.
- Reliable price-level match: +10; provider wheelchair-access indication when requested: +10. Missing values earn no points and remain unknown. The current adapter does not invent price levels or ratings.
- Already planned provider identity (or same nearby named place): −25, with an intentional repeat-visit action.
- Greedy variety adjustment: −8 per already represented category. Ties use stable provider/location identifiers. Visible reasons describe the actual evidence; “Strong interest match” is preference fit, not a probability.
- Visit estimates: food/attractions 60 minutes, nature/culture 90 minutes, labelled category estimates unless a provider duration exists. They are not silently persisted as confirmed visit times.
- Relaxed/balanced/packed plans target at most 3/5/7 visits, including existing non-cancelled entries. Proposals omit existing places by default and retain editable dates/times/notes. No routes or travel times are inferred from distance. Without routing, candidates stay untimed; no ferry, flight, road feasibility or travel buffers are claimed.
- Date-only values and overnight intervals use calendar-minute arithmetic in the trip's existing timezone. A place never changes that timezone. Overlaps and busy days are advice, not save blockers.

## Provider configuration

Geoapify already supplies geocoding and also supports `/v2/places`. No second paid provider or AI API is introduced. The proxy uses category/radius allowlists, authenticates with Supabase, filters results to Philippine country codes, and deduplicates provider IDs. It does not forward the user's session token to Geoapify. Photos are not supplied by this adapter, so category artwork is shown; no reviews, ratings, hours or price claims are synthesized.

On Vercel set **server-only** `GEOAPIFY_API_KEY`, and the existing `SUPABASE_URL` / `SUPABASE_ANON_KEY` (or their public `VITE_SUPABASE_*` equivalents). Redeploy the API handler as well as the frontend. Both root-directory and `frontend`-directory deployments have `/api/places` handlers/rewrites. Never prefix the provider secret with `VITE_`. `VITE_PLACES_ENDPOINT` and `VITE_PLACE_PROVIDER_NAME` can point to an approved compatible proxy; it must return the documented normalized fields including country codes and provider identity. No key was available in this workspace, so real provider results were not verified.

The browser serializes provider requests with a 1.1-second minimum interval. The proxy has a per-user, per-instance one-second limiter. For production traffic use the provider's appropriate paid quota and a shared platform/WAF rate limiter; a serverless in-memory map is not a global quota enforcement system. The local `vite` server does not host Vercel functions: use `vercel dev` with server environment configuration or an approved development proxy. A 503 for missing credentials is explicit and manual planning remains available.

Map tiles continue using `VITE_MAP_TILE_URL` / `VITE_MAP_ATTRIBUTION`, with OpenStreetMap as the existing default. Visible OSM/Geoapify attribution is retained. For production tile volume configure a suitable tile service; no bulk tile downloads or offline tile caching are introduced.

Provider references: [Geoapify Places](https://apidocs.geoapify.com/docs/places/), [country filters](https://apidocs.geoapify.com/docs/geocoding/), [caching and attribution](https://www.geoapify.com/places-api/). Boundary provenance and license: `frontend/src/data/PHILIPPINES-LICENSE.md`.

## Database deployment — prepared, not applied here

The already-installed planner migrations remain prerequisites. Review and run **only** the new transaction in `supabase/migrations/20261019000001_philippines_discovery.sql` in project `lrgxrfyzakehsnifypmd` (or use the project's established CLI migration workflow). It adds nullable paired provider fields, a security-invoker `save_discovered_trip_place` wrapper around the existing validated/idempotent save, and a trigger that clears stale provider identity when an address or pin changes. It deletes no trips or itinerary items and changes no RLS policies. Ordinary manual trip/place creation keeps its existing RPC and works independently of this optional upgrade.

Run `supabase/verify-philippines-discovery.sql` afterwards. Confirm `prosecdef=false`, `anon_execute=false`, `authenticated_execute=true`. Confirm the two columns, paired constraint and clearing trigger. Then run `npm run check:planner-release` and deploy the frontend/API. Before calling production complete, use a signed-in account to search, add a recommendation, reload and edit it; verify isolation with another account. No hosted authenticated save or hosted migration is implied by mocked browser tests.

## Verification commands

### Resumed verification — October 24, 2026

- Unit suite: 135 tests passed across 13 files.
- Places proxy: all 3 tests passed.
- Local database migration and ownership suite passed, including provider save/retry and clearing checks.
- Discovery browser suite: all 6 tests passed at phone and desktop sizes.
- Existing itinerary and first-trip browser regressions: all 16 tests passed.
- Production type check and Vite build passed; Vite reports a large-chunk warning.
- Inspected the generated 360px discovery screenshot for readable controls and confirmation footer placement.

Browser tests use mocked provider/Supabase data. This verification did not apply hosted SQL or deploy the application. Provider credentials and authenticated hosted save/reload verification remain the deployment steps described above.

From `frontend`:

```text
npm test -- --maxWorkers=2 --minWorkers=1
node --test scripts/test-places-proxy.mjs
npm run test:database
npx playwright test --config playwright.discovery.config.ts
npx playwright test --config playwright.itinerary.config.ts
npm run build
```

Unit tests cover geographic membership, interest ranking, unknown evidence, duplicates, stale nearby responses, review-only proposals, overlaps and overnight windows. Local PostgreSQL/PGlite executes actual migrations, provider save/retry, manual clearing, constraint rollback and ownership isolation. Browser tests use explicitly mocked Geoapify/Supabase responses and blocked tiles, exercising touch layouts, comparison/highlight, failed-response retries, refresh hydration, standalone trip creation and explicit plan confirmation. Screenshots are written to `frontend/test-results/planner/discovery-*.png` for visual review.

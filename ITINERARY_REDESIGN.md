# Personal travel itinerary

The workspace opens on a daily timeline beneath a compact travel cover. It uses the trip's supplied cover photograph when available and a typographic stamp otherwise. Activity tickets show category, time or flexible label, duration, place and a short note preview. Add activity sits above the route without covering a ticket.

Setup contains trip name, destination and dates, with one Create itinerary action. Notes and a searchable city/timezone selector sit under Optional details. The selector saves the IANA value, such as `Asia/Manila`; destination selection does not change it.

Ideas live in the workspace as note cards, with a small inspiration collection on desktop. Plan this opens a day-selection sheet, persists the move through the existing ownership-scoped RPC, and opens the selected day. Editing, duplication, removal, day moves, flexible drag ordering and accessible move buttons remain available. Long trips retain scrolling day tabs and a day-jump selector. The overview uses the same activity records as the timeline.

Map shows saved destination and activity coordinates. Place names without coordinates remain in a readable list with place links. It does not invent route geometry or travel-time estimates. The destination picker retains confirmation/cancellation, explicit one-shot GPS, source persistence, text-only entry and failure fallbacks. Prepare is a separate checklist with completion progress and an explicit save action. Photos, memories, journals and linked records retain their existing flows.

## Validation

- Production build passed, with Vite's size warning for the lazy-loaded MapLibre chunk.
- All 113 unit tests passed.
- All 10 planner browser scenarios passed across the regression run and the corrected focused workspace run. The focused rerun corrected a test locator to use the native day selector's accessible role.
- Layouts were exercised from 360 to 1440 CSS pixels, including touch reordering, keyboard alternatives, keyboard-sized viewports, day naming, long trips, overnight intervals, retry retention, photos, destination persistence and direct idea-to-day planning.
- Reviewed `frontend/test-results/planner/redesign-setup-phone.png`, `redesign-workspace-390.png`, `redesign-workspace-1440.png`, `redesign-ideas-phone.png`, `redesign-map-phone.png`, `redesign-prepare-phone.png`, and `redesign-overview-desktop.png`.
- Local PostgreSQL/PGlite migration and ownership tests passed after regenerating the combined planner upgrade.

From `frontend`, run `npm run build`, `npm test -- --maxWorkers=2 --minWorkers=1`, and `npx playwright test --config playwright.itinerary.config.ts`.

Browser tests mock Supabase and place lookup and block live OSM tiles. Map captures deliberately show the tile-failure fallback. These tests do not verify hosted deployment, a live geocoder key or physical-device GPS accuracy.

## Hosted 404 fix

The read-only probe confirmed that project `lrgxrfyzakehsnifypmd` is missing `create_trip_draft`, `ensure_trip_days`, `trips.timezone` and `itinerary_items.end_day_offset`. The missing RPCs returned `PGRST202`. Frontend redeployment alone does not install them.

For that existing October 14 schema, review and execute `supabase/apply-trip-planner-upgrade.sql` in the intended Supabase project's SQL editor. The current bundle includes planner, timeline and destination migrations in one transaction. Then execute `supabase/verify-trip-planner.sql`, run `npm run check:planner` from `frontend`, and perform an authenticated create/save/reload test. Keep a failed form open during the upgrade so its in-memory details remain available for retry.

The bundle generators remove each migration's outer transaction markers before adding one bundle transaction. The targeted upgrade preserves destination fields in the creation RPC and was tested twice on an existing local schema. No hosted SQL was executed by this task. Provider configuration is documented in `DESTINATION_PICKER.md`.

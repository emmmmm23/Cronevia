# Trip timeline refinement

## Confirmed hosted save failure

On October 15, 2026, a safe unauthenticated probe of the configured project, lrgxrfyzakehsnifypmd.supabase.co, returned:

- trips.timezone: HTTP 400 / 42703, column does not exist.
- create_trip_draft(details,draft_id): HTTP 404 / PGRST202, function missing from schema cache.
- ensure_trip_days(target_trip_id): HTTP 404 / PGRST202, function missing from schema cache.
- itinerary_items.end_day_offset: HTTP 400 / 42703, column does not exist.

The trip form calls create_trip_draft; the hosted schema is behind the frontend. Retrying the same request cannot repair missing schema. The frontend now distinguishes this setup problem from temporary save failures and retains both entered details and initial ideas for retry. Technical diagnostics remain in the developer console.

No hosted writes or migrations were performed. There is no authorized Supabase database connection in this environment. The probe uses only the public client key, an unauthenticated request, an invalid creation payload and a zero test ID; it never writes user records.

## Exact upgrade

1. Confirm the deployed VITE_SUPABASE_URL points to the intended project. The local project identifier is above.
2. In that project's authorized SQL editor, review and execute **supabase/apply-trip-planner-upgrade.sql** as one transaction. This now includes both 20261015000001_trip_planner.sql and 20261016000001_itinerary_timeline.sql. It is additive and safe to reapply; it does not replace days, activities, media, memories, or journal content.
3. Execute **supabase/verify-trip-planner.sql** and confirm the functions, columns and triggers. If using CLI migrations, reconcile any prior SQL-editor installations with the migration ledger through the established deployment process.
4. From `frontend`, run `npm run check:planner`. Missing columns/functions, invalid credentials and network failures now produce a nonzero exit code, suitable for a deployment gate. A successful unauthenticated schema probe is not proof of authenticated persistence.
5. Deploy the frontend build. Retry the retained form, then perform authenticated hosted save/reload checks using authorized test data. Keep the failed form open while applying the upgrade so its in-memory draft remains available.

For a base installation, regenerate the complete apply-once bundle with npm run supabase:bundle. Existing installations should use the targeted upgrade above. Regenerate it with node scripts/build-trip-planner-upgrade.mjs from frontend. Neither generator deploys SQL.

## Interaction and model

The real /trips/:id route now uses a shared ItineraryBoard for Daily timeline and Trip overview. There is one source of days/activities, one activity editor, and one set of persistence operations.

- Compact destination/title/date/duration header, Edit trip details and photo controls.
- Horizontal day tabs with selected state, keyboard arrows/Home/End, and a jump selector for more than seven days.
- Optional day titles saved through an owner-scoped database function.
- Timed activities sort chronologically; equal times use stored manual order and ID as tie breakers. Flexible activities have their own section and retain manual order, with arrows and touch dragging. Change a timed activity's time to reschedule it.
- Overview has aligned time/activity/place columns on wide screens and stacked blocks on phones. Selecting a row edits that same activity. Returning from editing preserves the current view, active day and page scroll.
- Start/end times are optional. End-before-start requires explicit Next day. The normalized day offset is persisted with end_time; duration is derived in the database when both times are known. Legacy overnight end times are made explicit by the upgrade.
- Overlap warnings include the next numbered day's early activities after an overnight plan; Ideas and cancelled/skipped items are excluded. Warnings do not prevent saving legitimate overlapping plans.
- Initial setup remains short. An optional collapsed Ideas list supports up to 20 unsaved possibilities. Creation of the trip, days and initial ideas is atomic and uses stable IDs for retry.
- Existing Prepare, Today, private trip photos, linked memories/journal entries and date-change preservation remain available.

The reference images were not available as attachments in this session. The implementation follows the written direction: editorial daily timeline, structured multi-day overview, warm paper, burgundy and sage, restrained travel details.

## Validation

- Production build passed (Vue type checking and Vite).
- Unit suite: 99 tests passed across 8 files.
- Database suite passed using local PGlite, including migration reapplication, transactional draft rollback, ownership boundaries, day naming and overnight interval validation.
- Full browser suite: 17 tests passed in Edge/Chromium. Includes seven planner tests and ten existing Journal/Memories scrapbook regressions.
- Real Vue routes were exercised with explicitly mocked API/storage data: trip creation and lost-response retry without duplicates; missing-schema feedback; activity editing, duplication, deletion, movement and touch reordering; Ideas; date changes; Prepare persistence; Today; linked memories; upload retry; named days; chronological ordering; overnight overlap; 14-day navigation; view switching and reload.
- Responsive screenshots and horizontal-overflow checks passed at 360, 390, 430, 768, 1024 and 1440 CSS pixels. Phone, tablet and desktop screenshots were inspected. Refinements reduced phone control height, prevented clipped tab focus rings, made the sticky Add action opaque and restored natural activity-heading accessible names.
- git diff --check passed. Both SQL bundles were regenerated locally; nothing was deployed.

Review artifacts (fixture content, actual rendered routes):

- [Phone timeline](frontend/test-results/planner/timeline-360.png)
- [Tablet timeline](frontend/test-results/planner/timeline-768.png)
- [Desktop timeline](frontend/test-results/planner/timeline-1440.png)
- [Phone overview](frontend/test-results/planner/overview-390.png)
- [Desktop overview](frontend/test-results/planner/overview-1440.png)
- [Missing upgrade feedback](frontend/test-results/planner/setup-missing-migration.png)

Screenshots are generated local test artifacts and are ignored by Git. Browser tests do not establish hosted persistence. The hosted schema probe was real and read-only; authenticated hosted creation/save/reload still requires the SQL upgrade above. Physical iOS/Android keyboards require device testing; constrained viewports and Chromium touch input are the available local approximation.

# Memories & Trips redesign

## Real application routes

The deployed frontend enters through frontend/index.html and src/main.ts, using the Vue router and Supabase adapter. The implemented screens are /memories, /memories/new, /memories/:id, /memories/:id/edit, /trips, /trips/new, /trips/:id and /trips/:id/edit. Existing Journal and scrapbook components remain shared, with a single state model across breakpoints.

## Experience

- Memories separates the photo-led collection from creation, editing and viewing. Existing search, month grouping, media filters, sorting, archive actions, text-only cards and private gallery are retained. Related trip, activity and journal links can now be edited in Details. The gallery supports horizontal touch swipes and full-screen arrow controls.
- Trips has grouped travel cards, quick setup with undecided dates, and a field-notebook workspace: Itinerary, Ideas, Prepare, Today and Keepsakes. Activities support flexible labels or exact times, duration, place, notes, booking reference, explicit completion, editing, duplication, deletion, drag reordering, move up/down and move between days.
- Preparation is separate from the itinerary. An optional starter checklist supplies practical prompts only when requested. Changes have an explicit save and stay in the draft after failure.
- Today uses the destination IANA timezone, or the browser timezone with a visible explanation. Passing a time never completes an activity. Directions opens a real external directions URL only when a place or coordinates exist. There is no simulated map integration.
- Both features use paper colors, serif headings, sage sections, burgundy actions, 44px controls and shared accessible sheets. Phones keep one day or scrapbook page active; desktop gains the trip summary or book spread.

## Data and compatibility

The planner extends the existing trips, trip_days and itinerary_items tables. Ideas is a distinct day marked is_ideas; ordinary day IDs and activity IDs are retained. Changing travel dates shifts numbered days from the new start; shortening the trip retains extra days and visibly labels them outside the date range. Undecided dates retain numbered days with null dates.

The existing status column is preserved. planning follows local travel dates: no start = Drafts, before start = Upcoming, within dates = In progress, after end = Past trips. Explicit active, completed and archived statuses override date grouping. Activity completion stays manual.

Trip drafts and activity saves use stable IDs and database functions. Moves update journal day links in the same transaction. Preparation and relationship validation run in the database, with existing owner RLS and content-link ownership checks. Private media remains in cronevia-media; custom stickers remain in stickers-custom. Browser code uses only the public Supabase client.

## Hosted upgrade — still required

No hosted schema, bucket, policy or user data was changed during this work. Use the project's authorized Supabase SQL editor or established migration pipeline. Confirm the target matches the deployed VITE_SUPABASE_URL; the inspected local configuration points at lrgxrfyzakehsnifypmd.

1. Existing October 14 installations: review and execute supabase/apply-trip-planner-upgrade.sql as one transaction. It is generated from 20261015000001_trip_planner.sql and is safe to reapply.
2. If the earlier scrapbook upgrade is missing, first apply supabase/apply-scrapbook-upgrade.sql. It reconciles sticker_assets, journal_sticker_placements, the private stickers-custom bucket and owner policies, built-in compatibility records, versioned layouts and transactional save functions. Do not make the bucket public.
3. Run supabase/verify-trip-planner.sql and supabase/verify-scrapbook.sql. Confirm both buckets are private, the planner columns/functions/triggers exist, and owner policies remain installed.
4. Deploy the frontend build with the expected public Supabase URL/key. Perform authenticated hosted smoke tests with authorized test accounts: uploads, save/reload, activity moves, preparation and cross-user denial.

For the base installation path, supabase/apply-existing-project.sql includes all eight October migrations, including the sticker and planner migrations. It is an apply-once base bundle, not a substitute for the targeted idempotent upgrades on an already upgraded database. SQL-editor installs may not be in the CLI migration ledger; reconcile that ledger through the normal deployment process before CLI pushes.

Regenerate using frontend/scripts/build-trip-planner-upgrade.mjs, frontend/scripts/build-scrapbook-upgrade.mjs and npm run supabase:bundle from frontend. Generators write SQL files only; they do not deploy anything.

The earlier “Bucket not found” / missing-placement-table defect came from incomplete project setup: the old migration bundle omitted the sticker migration. Local bundled SVG stickers are independent of that service. The private bucket's hosted state and migration ledger require an authorized database check; a public-client diagnostic cannot establish private bucket existence conclusively.

## Validation

Validated locally on October 14, 2026:

- npm run build: **passed** (Vue TypeScript checking and production Vite build).
- git diff --check: **passed**.
- npm test: **95 tests passed** across eight files.
- npm run test:database: **passed**. Runs actual migrations in PGlite, reapplies both targeted upgrades twice, and checks ownership, malformed layouts, rollback, private storage object policies, stable draft IDs, date preservation, Ideas moves, preparation validation and linked-record consistency.
- npx playwright test --config playwright.scrapbook.config.ts: **15 tests passed** in Edge/Chromium against the real application routes with intercepted Supabase fixtures.
- Browser widths: **360, 390, 430, 768, 1024 and 1440px**. Verified no document horizontal overflow, preserved reading order, draft state across orientation changes, page switching, sheets, focus return, native touch dragging, photo swipes, full-screen controls, and reduced-motion rendering.
- Planner browser flows: fixed/undecided setup, lost-create-response retry without duplicate records, activity save failure/retry, edit/duplicate/delete/reorder, Ideas-to-day moves, shortened dates retaining activities, preparation failure/retry/reload, timezone-aware Today, linked memory, and trip photo failure/retry/cover persistence.
- Journal/Memory browser flows: local built-in library, stickers on both actual paper pages, drag/resize/rotation, photo upload and Polaroid frame, stacking, duplicate/delete, undo/redo, save/reload, view controls hidden, cancel restoration, custom upload/signing failure recovery, initial-load overwrite prevention, and new-ID synchronization. The Memories collection checks populated/empty/filtered/no-result states, varied image proportions, detail viewing and creation navigation.

Browser fixtures are local and explicitly synthetic; no fictional content was inserted into the live collection. Database tests use local PGlite PostgreSQL with authenticated role simulation, not hosted Supabase Storage. Physical software keyboards were approximated using constrained visual viewports; no physical-device result is claimed.

### Screenshot review

Actual rendered pages were inspected for typography, spacing, clipping, controls and image proportions. Review led to a single-row phone activity toolbar, a disclosure for trip grouping explanations, corrected singular counts, and a compact Place/optional label. The screenshot directories are ignored test artifacts and are regenerated by the browser suite.

| Review | Artifact |
| --- | --- |
| Phone itinerary | [360px itinerary](frontend/test-results/planner/itinerary-360.png) |
| Desktop itinerary | [1440px itinerary](frontend/test-results/planner/itinerary-1440.png) |
| Phone preparation | [Checklist](frontend/test-results/planner/preparation-mobile.png) |
| Keyboard-sized activity sheet | [Focused field and save controls](frontend/test-results/planner/activity-mobile-keyboard-sized.png) |
| Trip collection | [Phone](frontend/test-results/planner/collection-360.png), [desktop](frontend/test-results/planner/collection-1440.png) |
| Memory collection | [Phone](frontend/test-results/evidence/adaptive/collection-360.png), [desktop](frontend/test-results/evidence/adaptive/collection-1440.png) |
| Memory links | [Phone details sheet](frontend/test-results/planner/memory-links-mobile.png) |
| Decorated memory | [Selected sticker and photo](frontend/test-results/evidence/memories-selected.png), [saved view](frontend/test-results/evidence/memories-desktop.png) |
| Decorated journal | [Saved view](frontend/test-results/evidence/journal-desktop.png) |
| Upload failure | [Trip photo retry](frontend/test-results/planner/trip-upload-failure.png), [custom sticker retry](frontend/test-results/evidence/adaptive/custom-upload-failure-390.png) |

All six widths are captured in frontend/test-results/planner and frontend/test-results/evidence/adaptive.

## Practical limits

- Chromium touch emulation and keyboard-sized viewports exercise gestures and focus; a physical iOS/Android keyboard and Safari still need device review.
- Drafts survive failed requests and responsive changes in the current editor session. They are not an offline draft-sync service.
- Long writing uses the existing notebook overflow strategy; decorations retain normalized page geometry. Automatic text flow around rotated decorations is not implemented.
- Hosted deployment, storage signing and real authenticated persistence remain separate verification steps.

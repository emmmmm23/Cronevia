# Adaptive Journal and Memories redesign

## Entry point and preserved work

Continued the existing work on branch main, commit 543e1c3 (clean at inspection). Reviewed the existing adaptive editor and regression drafts before changing them; no reset, schema replacement, or user-data conversion was performed. No AGENTS.md instructions were present. The deployed build configuration selects frontend/index.html → src/main.ts → src/router → the Vue pages below. An authenticated hosted deployment was not available for comparison.

## Real routes

- /journal/new and /journal/:id: JournalEditorPage → shared ScrapbookNotebook.
- /memories: photo-led collection, search, real content filters, sorting, month groups, archive/restore/delete, and one Create memory action. Creation is no longer embedded in the archive.
- /memories/new, /memories/:id/edit, /memories/:id: dedicated MemoryDetailPage creation, editing, and viewing, sharing the notebook and private media service. Existing galleries remain accessible, including photos that have no scrapbook placement. Detail has a full-screen photo viewer and existing related trip/journal links.

## Adaptive interaction and art direction

Below 960 CSS pixels the same notebook shows one paper page with Story / Keepsakes tabs. At 960 pixels it becomes a spread. The library docks beside the spread at 1280 pixels; below that it opens in a dismissible native dialog sheet. These are presentation changes to one component and one state source, not duplicate editors.

The compact phone header provides Back, a truthful load/save status, one Save/Edit action, and an options sheet. Date, mood, place, and tags remain in a details sheet where supported. Sheets use native modal focus containment, Escape dismissal, explicit close controls, and focus return. Page tabs support arrows, Home, and End without moving a selected decoration.

Ivory paper, sage book edges, restrained burgundy controls, serif writing, handwriting accents, original SVG stickers, and tactile frames remain shared across Journal and Memories. The archive emphasizes user photographs with stable image stages and preserved proportions, readable long titles, real text-only cards, and missing-image feedback. Tablet navigation collapses before the full link row becomes crowded. Options buttons have reserved space rather than overlapping card text.

Phone writing is 18px, metadata inputs are at least 16px, titles wrap, primary controls and transform handles are at least 44px. Optional keyboard guidance sits below the paper instead of making an extra toolbar row. The visual viewport and safe-area insets inform keyboard positioning. Reduced motion is respected.

Both stickers and photos retain drag, proportional resize, rotate, duplication, placement removal, four layer operations, accessible page transfer, and gesture-grouped undo/redo. On phones a selected decoration opens contextual adjustment controls. Native single-touch drags and normal writing/page scrolling use separate touch-action rules. New photo previews visibly explain that uploading occurs on Save; failed uploads expose Review uploads and retry without opening an unrelated screen.

## Composition and save integrity

Version 1 layout data remains unchanged. Each decoration uses page-relative centers, width, aspect ratio, rotation, z-index, stable asset ID, and frame metadata. A fixed 3:4 reference layer stays attached to its original paper page even when mobile writing grows beyond it. On desktop long writing retains the existing scrollable text area; on phones it grows into document flow. Nothing is clipped or discarded. Text does not wrap around rotated decorations. Cross-page pointer dragging is not implemented; the explicit Move to left/right page action remains available.

Switching tabs preserves per-page selection, content, placements, and pending uploads. Resizing does not rebuild the editor, change normalized styles, or save automatically. Existing legacy conversion and layout ownership enforcement are retained. No new migration is required for this responsive redesign.

The existing protections remain: stable draft IDs, no empty-layout reload on first ID receipt, atomic content/layout update, transactional legacy placement replacement, failed-load save blocking, failed-save draft retention, clean successful baselines, and cancel restoration. Upload completion updates both current layout and undo history without changing transforms. Placement deletion does not delete reusable assets. Collection requests discard stale responses when filters change quickly.

## Validation

Run from frontend:

- npm test: 87 unit tests passed.
- npm run test:database: passed in local PostgreSQL/PGlite, including repeated upgrade, journal/memory round trips, transactional rollback, retry-safe creation, cross-user asset rejection, private storage paths, and protected asset deletion.
- npm run build: passed (TypeScript and Vite production build).
- npx playwright test --config playwright.scrapbook.config.ts: 10 workflows passed in actual Edge application routes with explicitly mocked Supabase Auth, REST, and object storage. No live personal records are used.

Browser coverage includes six requested widths (360, 390, 430, 768, 1024, 1440), exact layout viewport width and no horizontal overflow, portrait/landscape resizing, touch dragging, contextual transforms, page selection retention, photo frames, first-placement undo, redo, layering, page transfer, cancel, failed-save retry, no duplicate creation, saved transform reload, hidden view controls, custom upload/signing recovery, delayed library merging, keyboard field protection, sheet focus return, reduced motion, and long mobile writing without nested scrolling. Archive coverage includes empty/populated/filtered/no-result states, varied aspect ratios and long titles, stable reading order, full-screen gallery, filter retention on back navigation, archive failure/retry, restore, and deletion.

The touch drag helper uses Chromium's completed native gesture synthesis; taps remain touchscreen interactions. Raw dispatch of a rapid touch sequence was replaced after it suppressed subsequent synthetic clicks. Keyboard-open testing compresses the viewport and checks focus; it does not emulate a physical iOS/Android keyboard. Physical devices, Safari, and hosted persistence still require verification.

## Screenshots and visual review

Evidence is generated under frontend/test-results/evidence/adaptive/ (ignored test output; rerun the suite to regenerate). Original procedural artwork is explicitly fixture content, not live memories or photographs.

- journal-empty-360.png, memories-empty-360.png
- journal-library-360.png, memories-library-360.png
- journal-{360,390,430,768,1024,1440}.png
- memories-{360,390,430,768,1024,1440}.png
- collection-{360,390,430,768,1024,1440}.png
- collection-empty.png, collection-filtered.png, collection-no-results.png
- memory-detail-390.png, memory-fullscreen.png
- custom-upload-failure-390.png, custom-upload-success-390.png
- journal-keyboard-viewport.png, memories-keyboard-viewport.png

Additional saved compositions, selected states, and cancel/reload evidence remain in frontend/test-results/evidence/. Screenshots were inspected for paper proportions, text size, toolbar wrapping, card overlap, and tablet navigation. The resulting refinements include collapsed tablet navigation, reserved card-action space, a shorter phone toolbar, visible upload recovery, and removing introductory memory hints after content is entered.

## Remaining hosted setup

The previous read-only diagnosis remains documented in SCRAPBOOK_IMPLEMENTATION.md. The configured project is lrgxrfyzakehsnifypmd.supabase.co. The old migration bundle omitted the sticker migration, and the project's REST API reported missing sticker_assets and journal_sticker_placements. Custom uploads target private stickers-custom; photos target private cronevia-media. Anonymous “Bucket not found” responses cannot establish whether a private bucket exists. No service-role credentials belong in the browser.

An authorized project administrator must:

1. Confirm the deployed frontend points to the intended project using its public URL/publishable key.
2. Apply supabase/apply-scrapbook-upgrade.sql in the authorized SQL editor, or apply pending migrations through the project's existing CLI deployment process. The reviewed upgrade is idempotent and preserves existing rows.
3. Run supabase/verify-scrapbook.sql to inspect tables, built-in compatibility records, RPCs, bucket privacy, ownership policies, and paths; check the migration ledger where CLI-managed.
4. Deploy the frontend and repeat hosted upload/save/reload/cancel with authorized test accounts, including cross-user rejection.

No hosted migration or production deployment was performed during this continuation. Local browser mocks and PostgreSQL checks do not establish hosted storage success.

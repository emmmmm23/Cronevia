# Scrapbook implementation and verification

> The subsequent adaptive Journal and Memories redesign supersedes the mobile stacking and inline memory form described here. See [ADAPTIVE_SCRAPBOOK_REDESIGN.md](ADAPTIVE_SCRAPBOOK_REDESIGN.md) for current routes, responsive behavior, and validation. The hosted setup instructions below still apply.

## Actual application and preserved work

Inspected branch `main` and the existing uncommitted scrapbook draft before editing. No work was reset or discarded. The repository's Vercel configuration builds `frontend` into `frontend/dist`. Its entry point is `frontend/index.html → src/main.ts → router → JournalEditorPage.vue`. The backend's older editor is not the editor selected by that deployment configuration. An authenticated live deployment/version was not available to inspect.

The real `/journal/new`, `/journal/:id`, new-memory form on `/memories`, and `/memories/:id` use `ScrapbookNotebook.vue`. One responsive component/state source renders both desktop and mobile.

## Design and interactions

- Warm ivory paper, subtle texture, sage cover edges, central binding, soft shadows, serif writing, and handwriting accents.
- The journal editor has a quiet brand header, obvious back link, one Save entry action, compact date, and expandable mood/place/tags.
- Write / Decorate modes keep the notebook prominent. The library sits beside the book on desktop and in normal document flow above it on mobile. Selection tools appear only for a selected decoration; keyboard help opens on demand.
- Both paper pages accept stickers and photos. Both share drag, proportional resize, rotate, duplicate, placement deletion, four layer commands, explicit page transfer, undo/redo, and keyboard controls. Pointer gestures create one history step.
- Twelve original bundled SVG stickers load without Supabase. The populated Library is the default tab, including when custom storage fails.
- Plain, Polaroid, paper border, and washi treatments remain layout metadata. Original images and transparency are preserved. Deleting a placement retains the reusable asset.
- View mode has no editing controls or transform outlines. Done Decorating restores writing interaction.
- The same 3:4 sheets stack on mobile. Coordinates are relative to each sheet's current bounding rectangle, accounting for scrolling and display scale. Rotated corners stay on their page. Transfer uses the accessible “Move to left/right page” action; cross-page pointer dragging is not implemented.
- Long writing scrolls within a defined text area, retaining stable paper geometry. Long titles can wrap and scroll. Text does not automatically flow around decorations.

## Upload and save protections

Custom stickers and photos preview on paper immediately. Custom stickers also immediately appear in My stickers. Existing-entry photos upload immediately; new-entry photos upload after Save obtains the record ID. Stable upload IDs allow retries after uncertain responses without creating another reusable asset. Signed URLs are for display only.

Upload completion replaces the temporary asset reference throughout the current layout and undo history, preserving all transforms and frame metadata. A delayed library request merges with newly uploaded assets. Failures keep the local preview and expose retry; unresolved references cannot be saved.

A stable draft key and owner-scoped `create_journal_draft` / `create_memory_draft` RPCs prevent duplicate records when creation succeeds but its response is lost. Receiving a new record ID does not reload placements. Writing and the shared versioned layout save in one PostgreSQL UPDATE. The legacy `replace_journal_stickers` RPC replaces rows in one transaction, so an insertion failure rolls back deletion.

Load/save success establishes a clean baseline. Failed saves retain the draft. Failed initial legacy-placement loads pause saving until a successful reload. Cancel restores saved writing and composition. Legacy placement rows are retained; their top-left anchors convert to notebook centers when read, using stored asset proportions. Saving explicitly migrates that layout.

## Connected Supabase project and cause

Read-only checks on October 14, 2026:

- Frontend URL: `https://lrgxrfyzakehsnifypmd.supabase.co`.
- The browser uses a **public publishable key**, held in the existing `VITE_SUPABASE_ANON_KEY` variable. No service-role key is used by browser code.
- `public.sticker_assets` and `public.journal_sticker_placements` return HTTP 404 / `PGRST205`: missing from the connected project's PostgREST schema cache.
- The old migration-bundle generator selected only `20261011*`, omitting `20261012000001_add_sticker_system.sql`. That omitted migration creates the sticker tables, bucket and policies. The generator now includes all seven October migrations, including the shared layout, built-in compatibility seed, transactional replacement, and retry-safe creation functions.
- Custom uploads target **`stickers-custom`** at **`{authenticated-user-id}/{stable-upload-id}.png|webp`**. Photos use the existing private **`cronevia-media`** service and the same owner-folder pattern.
- Anonymous bucket metadata returns “Bucket not found” for both custom stickers and private media. This response does **not** establish whether a private bucket exists. The missing schema and omitted bundle migration establish a setup defect; bucket inventory, policies actually installed, migration ledger, and deployment environment still require an authorized check.

No admin database connection or authenticated Supabase browser session was available. No hosted SQL or user data was changed. The expected project is the configured local project above; the deployed environment's URL still needs comparison.

## Exact remaining deployment steps

1. In the authorized Supabase SQL editor, confirm project **`lrgxrfyzakehsnifypmd`**.
2. Run **`supabase/apply-scrapbook-upgrade.sql`**. It is an idempotent transaction for an existing October 11 base installation. It includes both missing sticker tables, private sticker buckets, owner-scoped policies, 12 built-in compatibility asset records, layout columns/validation triggers, asset deletion protection, and save/create functions. Existing rows are retained. It was applied twice successfully in local PostgreSQL.
3. Run **`supabase/verify-scrapbook.sql`**. Confirm `stickers-custom` and `cronevia-media` remain private, inspect upload/read/update/delete ownership policies, check layout columns, the 12 compatibility records and RPCs. Inspect CLI migration history if this project uses it; SQL-editor installs may not have ledger entries.
4. Deploy the updated frontend with its public Supabase URL/key pointed to that project.
5. With authorized test data, repeat custom sticker/photo upload, save/reload and cancel on the hosted journal and memory routes. Confirm another user cannot read or reference those private assets.

For CLI-managed projects, apply pending migrations in order through the existing deployment process. Avoid replaying the base setup on an already provisioned project. Regenerate the targeted upgrade from `frontend` with `node scripts/build-scrapbook-upgrade.mjs`; `npm run supabase:bundle` regenerates the full setup bundle.

## Validation and evidence

- **Production build:** `npm run build` passed (TypeScript and Vite).
- **Unit tests:** `npm test` — **83 passed**, covering layout validation, rotated bounds, clean baselines, first undo, failed loading/saving, legacy conversion, transactional API calls, and asset deletion protection.
- **Local PostgreSQL:** `npm run test:database` passed. All migrations, repeated upgrade, journal/memory round trips, malformed geometry/type/frame rejection, cross-user asset protection, private storage paths, transaction rollback, retry-safe journal/memory creation, and cross-user draft rejection. This uses real PostgreSQL in PGlite with fixture auth/storage platform schemas.
- **Browser:** `npx playwright test --config playwright.scrapbook.config.ts` — **6 passed** in installed Edge on the real application routes. Supabase auth, REST and object storage are explicitly mocked. Verified thumbnails during custom-storage failure; left/right placement; drag/resize/rotate; photo upload and Polaroid frame; layering; duplicate/delete/page transfer; undo/redo; save/reload with exact saved transform styles; view controls hidden; cancel; mobile stacking; long writing overflow; keyboard input protection; upload/signing failure and retry; late library synchronization; lost creation response without duplicate records; blocked legacy-load failure.
- Screenshots were inspected and the texture, typography and mobile controls refined. Evidence under `frontend/test-results/evidence/`: `journal-empty.png`, `journal-desktop.png`, `journal-selected.png`, `journal-mobile.png`, `journal-mobile-decorating.png`, `memories-desktop.png`, `memories-selected.png`, `memories-mobile.png`, `custom-upload-success.png`, and `custom-upload-failure.png`. These contain original procedural test images, not user photos.
- **Hosted upload/persistence is not verified.** The read-only connected-project diagnostics confirm the remaining setup issue; browser mocks and local PostgreSQL checks are not a claim of hosted success.

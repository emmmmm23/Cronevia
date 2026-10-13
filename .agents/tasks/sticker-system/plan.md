# Implementation Plan: Interactive Sticker System for Cronevia Journal

## Exploration Summary

**Current Stack:**
- Vue 3.4, TypeScript 5.4, Vite 5, Tailwind CSS 4, Pinia 2.1, Supabase 2.116
- Moveable 0.53.0 already installed ✓
- Test frameworks: Vitest 2.0 (unit), Playwright 1.44 (e2e), jsdom 30.1
- Database: PostgreSQL via Supabase with RLS policies

**Key Findings:**
- `JournalEditorPage.vue` exists at `c:\Users\Juan Miguel\Cronevia\frontend\src\pages\JournalEditorPage.vue`
  - Has `isEditing` mode (route param determines create vs edit)
  - Implements `isDirty` tracking with unsaved changes guard (`onBeforeRouteLeave`)
  - Uses Pinia `useJournalStore` for CRUD operations
  - `handleSave()` function calls `store.createEntry()` or `store.updateEntry()`
  - Photo uploads use `PhotoUpload.vue` component
  - No existing scrapbook/decoration features (DecorativeMotifs.vue and ScrapbookPhoto.vue do not exist)
- Supabase client configured in `frontend/src/lib/supabase.ts`
- Services follow pattern in `frontend/src/services/supabase-api.ts` (preparePayload, check, requireUser helpers)
- Types in `frontend/src/types/index.ts` (no database.types.ts import in main types)
- Stores in `frontend/src/stores/` (auth.ts, journal.ts, trips.ts, memories.ts, dashboard.ts)
- Migration pattern: `YYYYMMDDNNNNNN_description.sql` in `supabase/migrations/`
- RLS pattern: owner_access policy using `user_id = auth.uid() AND public.is_account_active()`
- Storage pattern: private bucket, user folders (`{user_id}/filename`), signed URLs generated on read
- No composables directory exists yet — will create `frontend/src/composables/`
- No journal components directory — will create `frontend/src/components/journal/`

**Design Decisions:**

1. **Coordinate System**: Stickers use normalized coordinates (0-1 relative to journal content area width/height). The journal entry's content area (`#entry-content` textarea's parent container) defines the sticker canvas. No separate pages — one canvas surface per entry. Positions stored as floats 0.0-1.0, converted to px on render. On mobile, the same normalized coordinates map to the scaled-down canvas.

2. **Data Model**: Two tables:
   - `sticker_assets`: Reusable sticker library (built-in + user uploads)
   - `journal_sticker_placements`: Individual sticker instances on entries
   - Journal entries get a `sticker_layout` JSONB column for the layout structure

3. **Storage**: Two buckets:
   - `stickers-builtin`: Public read for authenticated users, SVG files for built-in stickers
   - `stickers-custom`: Private, user-scoped folders (`{user_id}/`), PNG/WebP uploads

4. **Undo/Redo**: Snapshot-based history (max 50 states). One snapshot per completed drag/resize/rotate gesture, not per pointer move.

5. **Integration**: New "Decorate" mode toggle in JournalEditorPage edit mode. When enabled, shows sticker tray (desktop: side panel, mobile: bottom sheet) and editing tools. Stickers persist with `isDirty` tracking, save atomically with entry, cancel restores saved state.

---

## Implementation Plan

### Phase 1: Database & Types (Foundation)

- [ ] **1. Create Supabase migration for sticker tables and storage**
      
      Create `supabase/migrations/20261012000001_add_sticker_system.sql`
      
      Tables:
      - `sticker_assets` (id, user_id nullable for builtins, storage_path, mime_type, width, height, created_at)
      - `journal_sticker_placements` (id, journal_entry_id FK, sticker_asset_id FK, x, y, width, rotation, z_index, created_at)
      - Add `sticker_layout` JSONB column to `journal_entries` (stores {version, surfaces[{id, stickers[...]}]})
      
      Storage buckets:
      - `stickers-builtin` (public read for authenticated)
      - `stickers-custom` (private, user folders)
      
      RLS policies:
      - `sticker_assets`: authenticated users can read all (builtins + own), insert/update/delete only own (user_id = auth.uid())
      - `journal_sticker_placements`: users can read/write only for journal_entries they own (via journal_entries.user_id = auth.uid())
      
      Indexes:
      - `sticker_assets(user_id)` for user library queries
      - `journal_sticker_placements(journal_entry_id)` for loading entry stickers
      
      Files: `supabase/migrations/20261012000001_add_sticker_system.sql`
      
      Verify: `cd frontend && npm run check:supabase` — no missing-table errors for sticker_assets or journal_sticker_placements

- [ ] **2. Create TypeScript types for stickers**
      
      Create `frontend/src/types/sticker.types.ts`
      
      Export interfaces:
      - `StickerAsset` (id, userId, storagePath, mimeType, width, height, signedUrl, createdAt)
      - `StickerPlacement` (id, assetId, asset, x, y, width, rotation, zIndex)
      - `StickerLayout` (version: 1, surfaces: StickerSurface[])
      - `StickerSurface` (id: string, stickers: StickerPlacement[])
      - `StickerCategory` ('builtin' | 'custom')
      
      Re-export from `frontend/src/types/index.ts`
      
      Files: `frontend/src/types/sticker.types.ts`, `frontend/src/types/index.ts`
      
      Verify: `cd frontend && npm run build` — TypeScript compiles without errors

### Phase 2: Services & Data Layer

- [ ] **3. Create sticker service for Supabase operations**
      
      Create `frontend/src/services/sticker.service.ts`
      
      Functions:
      - `fetchBuiltinAssets()`: Query sticker_assets WHERE user_id IS NULL, generate signed URLs from stickers-builtin bucket
      - `fetchUserAssets(userId: string)`: Query sticker_assets WHERE user_id = userId, generate signed URLs from stickers-custom bucket
      - `uploadStickerAsset(file: File)`: Validate (PNG/WebP, max 5MB, max 2000x2000px, check transparency via canvas), upload to stickers-custom/{userId}/, insert sticker_assets row, return StickerAsset with signed URL
      - `deleteAsset(assetId: string)`: Check no placements reference this asset (safety), delete storage file, delete sticker_assets row
      - `fetchPlacements(entryId: string)`: Query journal_sticker_placements WHERE journal_entry_id = entryId, join sticker_assets, return StickerPlacement[]
      - `savePlacements(entryId: string, placements: StickerPlacement[])`: Upsert journal_sticker_placements rows, update journal_entries.sticker_layout JSONB
      - `validateLayout(layout: unknown)`: Type guard, check version=1, finite numerics, position/size/rotation bounds, max 100 stickers
      
      Use existing Supabase client from `@/lib/supabase`, follow error handling pattern from `supabase-api.ts`
      
      Files: `frontend/src/services/sticker.service.ts`
      
      Verify: `cd frontend && npm run build` — service compiles, no import errors

- [ ] **4. Create built-in SVG sticker library (10-12 files)**
      
      Create directory `frontend/public/stickers-builtin/`
      
      Design and export 10-12 simple SVG stickers matching Cronevia aesthetic (cream #f5ebdd, burgundy #7B0323, pastels):
      - `star-01.svg`, `star-02.svg` (different styles)
      - `heart-01.svg`, `heart-02.svg`
      - `flower-01.svg`, `flower-02.svg`
      - `tape-01.svg`, `tape-02.svg` (washi tape strips)
      - `leaf-01.svg`, `stamp-travel-01.svg` (passport stamp style)
      - `doodle-abstract-01.svg`, `doodle-abstract-02.svg`
      
      Each SVG: viewBox="0 0 100 100", max 2KB, no embedded scripts
      
      Manually insert metadata rows into `sticker_assets` table via Supabase SQL Editor (user_id=NULL, storage_path='star-01.svg', mime_type='image/svg+xml', width=100, height=100) for each built-in
      
      Files: `frontend/public/stickers-builtin/*.svg` (10-12 files)
      
      Verify: Open http://127.0.0.1:5173/stickers-builtin/star-01.svg in dev server — SVG renders

### Phase 3: Composables (Business Logic)

- [ ] **5. Create useStickerAssets composable**
      
      Create `frontend/src/composables/useStickerAssets.ts`
      
      Reactive state:
      - `builtinAssets: Ref<StickerAsset[]>`
      - `userAssets: Ref<StickerAsset[]>`
      - `loading: Ref<boolean>`
      - `uploadProgress: Ref<number>`
      - `error: Ref<string | null>`
      
      Functions:
      - `loadBuiltins()`: Fetch builtin assets, cache in ref
      - `loadUserAssets()`: Fetch user assets
      - `uploadAsset(file: File)`: Validate, show progress, call sticker.service.uploadStickerAsset, update userAssets
      - `deleteUserAsset(assetId: string)`: Confirm no placements reference it, delete, refresh list
      
      Files: `frontend/src/composables/useStickerAssets.ts`
      
      Verify: `cd frontend && npm run build` — composable compiles

- [ ] **6. Create useStickerEditor composable (core editing logic)**
      
      Create `frontend/src/composables/useStickerEditor.ts`
      
      Reactive state:
      - `placements: Ref<StickerPlacement[]>` (current sticker instances)
      - `selectedId: Ref<string | null>` (currently selected sticker)
      - `history: Ref<StickerPlacement[][]>` (snapshot-based undo/redo, max 50)
      - `historyIndex: Ref<number>`
      - `canvasWidth: Ref<number>`, `canvasHeight: Ref<number>` (for coordinate normalization)
      
      Functions:
      - `addSticker(asset: StickerAsset)`: Create placement at center (x=0.4, y=0.4, width=0.15), push to placements, select it, save snapshot
      - `updatePlacement(id: string, updates: Partial<StickerPlacement>)`: Merge updates, clamp values (x/y 0-1, width 0.05-0.5, rotation -180 to 180)
      - `deleteSticker(id: string)`: Remove from placements, deselect, save snapshot
      - `duplicateSticker(id: string)`: Clone placement with +0.05 offset, save snapshot
      - `bringForward(id)`, `sendBackward(id)`, `bringToFront(id)`, `sendToBack(id)`: Adjust zIndex, save snapshot
      - `selectSticker(id: string | null)`: Update selectedId
      - `undo()`, `redo()`: Navigate history, restore placements snapshot
      - `saveSnapshot()`: Push placements clone to history, trim to max 50, reset historyIndex
      - `normalizeCoords(pxX, pxY)`: Convert pixel coords to 0-1 based on canvasWidth/canvasHeight
      - `denormalizeCoords(x, y)`: Convert 0-1 coords to pixels
      - `loadPlacements(entryId: string)`: Fetch from service, set placements, clear history
      - `savePlacements(entryId: string)`: Call service.savePlacements with current placements
      
      Files: `frontend/src/composables/useStickerEditor.ts`
      
      Verify: `cd frontend && npm run build` — composable compiles

### Phase 4: UI Components

- [ ] **7. Create StickerPlacement.vue (single sticker renderer)**
      
      Create `frontend/src/components/journal/StickerPlacement.vue`
      
      Props: `placement: StickerPlacement`, `canvasWidth: number`, `canvasHeight: number`, `isSelected: boolean`, `viewMode: boolean`
      
      Renders:
      - `<img>` with placement.asset.signedUrl
      - Inline style: `position: absolute; left: ${x*canvasWidth}px; top: ${y*canvasHeight}px; width: ${width*canvasWidth}px; transform: rotate(${rotation}deg); z-index: ${zIndex}`
      - Selection outline: 2px dashed burgundy #7B0323 when isSelected && !viewMode
      - No handles (Moveable provides those)
      
      Emits: `@click` to select
      
      Files: `frontend/src/components/journal/StickerPlacement.vue`
      
      Verify: `cd frontend && npm run build` — component compiles

- [ ] **8. Create StickerCanvas.vue (orchestrates all placements + Moveable)**
      
      Create `frontend/src/components/journal/StickerCanvas.vue`
      
      Props: `placements: StickerPlacement[]`, `selectedId: string | null`, `viewMode: boolean`, `canvasEl: HTMLElement | null`
      
      Template:
      - Container div with `position: relative`, matches canvas dimensions
      - Render `<StickerPlacement>` for each placement
      - `<Moveable>` component (from moveable package) bound to selected sticker's DOM element
      - Moveable config: draggable, resizable, rotatable, keepRatio (preserve aspect), bounds (parent canvas), snappable (optional grid)
      
      Events:
      - `@drag`, `@resize`, `@rotate`: Emit normalized coordinate updates (do NOT save snapshot during drag — only on dragEnd)
      - `@dragEnd`, `@resizeEnd`, `@rotateEnd`: Emit save-snapshot event
      - `@click` on background: Emit deselect
      
      Emits: `update:placement`, `save-snapshot`, `select`, `deselect`
      
      Files: `frontend/src/components/journal/StickerCanvas.vue`
      
      Verify: `cd frontend && npm run build` — component compiles, no Moveable import errors

- [ ] **9. Create StickerToolbar.vue (contextual editing controls)**
      
      Create `frontend/src/components/journal/StickerToolbar.vue`
      
      Props: `selectedPlacement: StickerPlacement | null`, `canUndo: boolean`, `canRedo: boolean`
      
      Template:
      - Compact toolbar with icon buttons (Cronevia aesthetic: cream bg, burgundy accents)
      - Buttons: Duplicate, Delete, Bring Forward, Send Backward, Bring to Front, Send to Back, Rotate Left (-15°), Rotate Right (+15°), Undo, Redo
      - Tooltip labels on hover
      - Disabled state when no selection (except Undo/Redo)
      
      Emits: `duplicate`, `delete`, `bring-forward`, `send-backward`, `bring-to-front`, `send-to-back`, `rotate-left`, `rotate-right`, `undo`, `redo`
      
      Files: `frontend/src/components/journal/StickerToolbar.vue`
      
      Verify: `cd frontend && npm run build` — component compiles

- [ ] **10. Create StickerTray.vue (library + upload UI)**
      
      Create `frontend/src/components/journal/StickerTray.vue`
      
      Props: `show: boolean`
      
      Template:
      - Responsive container: desktop (fixed right side panel, 280px width, full height, overflow-y scroll), mobile (bottom sheet drawer, slide up transition)
      - Tabs: "Library" and "My Stickers" (radix-vue Tabs component)
      - Library tab: Grid of builtin stickers (4 columns), click to add
      - My Stickers tab: Grid of user uploads, "Upload Sticker" button at top, each sticker has delete button
      - Upload modal/dialog: file input (PNG/WebP, max 5MB), progress bar, preview, validation errors
      - Styled with Cronevia aesthetic (cream #f5ebdd bg, burgundy #7B0323 primary, restrained shadows)
      
      Uses `useStickerAssets()` composable for data
      
      Emits: `add-sticker(asset: StickerAsset)`, `close`
      
      Files: `frontend/src/components/journal/StickerTray.vue`
      
      Verify: `cd frontend && npm run build` — component compiles

- [ ] **11. Create StickerEditor.vue (top-level orchestrator)**
      
      Create `frontend/src/components/journal/StickerEditor.vue`
      
      Props: `entryId: string | null`, `viewMode: boolean`
      
      Template:
      - "Decorate" mode toggle button (edit mode only, shown near title/date in JournalEditorPage)
      - When decorateMode = true:
        - Renders `<StickerCanvas>` overlaying the journal content area (position: absolute over #entry-content container)
        - Renders `<StickerTray>` (desktop: side panel, mobile: bottom sheet)
        - Renders `<StickerToolbar>` (floating, top-right of canvas)
        - "Done Decorating" button (hides tray, returns to normal editing)
      - When viewMode = true: Only render placements (no selection, no toolbar, no tray)
      
      Logic:
      - Uses `useStickerEditor()` composable
      - Loads placements on mount if entryId exists
      - Keyboard shortcuts: Delete (delete selected), Ctrl+Z (undo), Ctrl+Shift+Z (redo), Arrow keys (nudge selected sticker)
      - Integrates with JournalEditorPage's isDirty state (expose `isDirty` computed via emit)
      
      Emits: `dirty-change(isDirty: boolean)`, `placements-change(placements: StickerPlacement[])`
      
      Files: `frontend/src/components/journal/StickerEditor.vue`
      
      Verify: `cd frontend && npm run build` — component compiles

### Phase 5: Integration with JournalEditorPage

- [ ] **12. Integrate StickerEditor into JournalEditorPage.vue**
      
      Modify `frontend/src/pages/JournalEditorPage.vue`
      
      Changes:
      - Import `StickerEditor` component
      - Add reactive `stickerPlacements` ref (initially empty or loaded from existing entry)
      - Add `stickerDirty` ref (tracks sticker changes separately from main form)
      - Combine `isDirty` logic: `computed(() => formDirty.value || stickerDirty.value)`
      - Render `<StickerEditor :entry-id="entryId" :view-mode="!isEditing" @dirty-change="stickerDirty = $event" @placements-change="stickerPlacements = $event" />` inside form container (after content textarea)
      - Update `handleSave()`: After saving entry, call sticker.service.savePlacements(savedEntryId, stickerPlacements) if stickerPlacements.length > 0
      - Update `onMounted()` load logic: If editing, load sticker placements from service
      - Update cancel/route-leave guard: Restore saved sticker state on cancel
      
      Files: `frontend/src/pages/JournalEditorPage.vue`
      
      Verify: `cd frontend && npm run dev` — page loads, no console errors, Decorate toggle visible in edit mode

### Phase 6: Testing

- [ ] **13. Create unit tests for useStickerEditor composable**
      
      Create `frontend/src/composables/useStickerEditor.test.ts`
      
      Tests:
      - `addSticker()` creates placement with correct normalized coords
      - `updatePlacement()` clamps values correctly
      - `deleteSticker()` removes placement and deselects
      - `duplicateSticker()` creates offset copy
      - Layer operations (bringForward, etc.) adjust zIndex correctly
      - `undo()/redo()` restore correct history snapshots
      - `normalizeCoords()` and `denormalizeCoords()` round-trip correctly
      - Max 50 history states enforced
      
      Files: `frontend/src/composables/useStickerEditor.test.ts`
      
      Verify: `cd frontend && npm run test` — all tests pass

- [ ] **14. Create unit tests for StickerTray component**
      
      Create `frontend/src/components/journal/StickerTray.test.ts`
      
      Tests:
      - Builtin stickers render in Library tab
      - User stickers render in My Stickers tab
      - Upload button opens file input
      - Add sticker emits correct event
      - Delete user sticker shows confirmation
      - Responsive layout (mock viewport sizes)
      
      Use `@vue/test-utils`, mock `useStickerAssets` composable
      
      Files: `frontend/src/components/journal/StickerTray.test.ts`
      
      Verify: `cd frontend && npm run test` — all tests pass

- [ ] **15. Create unit tests for StickerEditor component**
      
      Create `frontend/src/components/journal/StickerEditor.test.ts`
      
      Tests:
      - Decorate mode toggle shows/hides tray
      - Keyboard shortcuts (Delete, Ctrl+Z, Ctrl+Shift+Z, arrows) work
      - View mode hides editing controls
      - Dirty state emitted correctly
      - Placements loaded on mount when entryId provided
      
      Files: `frontend/src/components/journal/StickerEditor.test.ts`
      
      Verify: `cd frontend && npm run test` — all tests pass

- [ ] **16. Create E2E test for complete sticker workflow**
      
      Create `frontend/tests/e2e/stickers.spec.ts`
      
      Test flow:
      1. Sign in as test user
      2. Navigate to /journal/new
      3. Fill journal title, content
      4. Click "Decorate" toggle
      5. Verify sticker tray opens
      6. Click a builtin sticker from Library tab
      7. Verify sticker appears on canvas
      8. Drag sticker to new position
      9. Resize sticker
      10. Rotate sticker
      11. Click "Duplicate" in toolbar
      12. Verify second sticker appears with offset
      13. Select first sticker, click "Delete"
      14. Verify only one sticker remains
      15. Click "Done Decorating"
      16. Save journal entry
      17. Navigate away, then back to entry
      18. Verify sticker persisted in correct position
      19. Switch to view mode
      20. Verify no editing controls visible, sticker visible
      
      Files: `frontend/tests/e2e/stickers.spec.ts`
      
      Verify: `cd frontend && npm run test:e2e` — test passes (requires Supabase test instance with migrations applied)

### Phase 7: Documentation & Refinement

- [ ] **17. Add sticker feature documentation**
      
      Create `frontend/docs/STICKERS.md`
      
      Document:
      - Architecture overview (2-table design, coordinate normalization)
      - How to add more builtin stickers
      - Upload constraints and validation
      - RLS policy details
      - Known limitations (max 100 stickers per entry, 5MB per upload)
      - Troubleshooting common issues
      
      Files: `frontend/docs/STICKERS.md`
      
      Verify: Manual review — documentation is clear and accurate

- [ ] **18. Performance optimization and polish**
      
      Optimizations:
      - Add `loading="lazy"` to sticker images
      - Debounce Moveable drag events (only update every 16ms, ~60fps)
      - Memoize denormalized coords in StickerPlacement with computed
      - Add transition animations for sticker add/delete (GSAP fade/scale, 200ms)
      - Optimize StickerTray scroll performance (virtual scrolling if user has 100+ stickers)
      - Add keyboard focus management (Tab through stickers, Enter to select)
      - ARIA labels for all interactive elements
      - Test with screen reader (VoiceOver/NVDA)
      
      Files: `frontend/src/components/journal/*.vue`
      
      Verify: `cd frontend && npm run build && npm run dev` — smooth interactions, no jank, accessible

---

## File Manifest

### New Files Created (35 total)

**Database:**
1. `supabase/migrations/20261012000001_add_sticker_system.sql`

**Types:**
2. `frontend/src/types/sticker.types.ts`

**Services:**
3. `frontend/src/services/sticker.service.ts`

**Composables:**
4. `frontend/src/composables/useStickerAssets.ts`
5. `frontend/src/composables/useStickerEditor.ts`

**Components:**
6. `frontend/src/components/journal/StickerPlacement.vue`
7. `frontend/src/components/journal/StickerCanvas.vue`
8. `frontend/src/components/journal/StickerToolbar.vue`
9. `frontend/src/components/journal/StickerTray.vue`
10. `frontend/src/components/journal/StickerEditor.vue`

**Built-in Stickers (SVG):**
11-22. `frontend/public/stickers-builtin/*.svg` (12 files: star-01, star-02, heart-01, heart-02, flower-01, flower-02, tape-01, tape-02, leaf-01, stamp-travel-01, doodle-abstract-01, doodle-abstract-02)

**Tests:**
23. `frontend/src/composables/useStickerEditor.test.ts`
24. `frontend/src/components/journal/StickerTray.test.ts`
25. `frontend/src/components/journal/StickerEditor.test.ts`
26. `frontend/tests/e2e/stickers.spec.ts`

**Documentation:**
27. `frontend/docs/STICKERS.md`

### Modified Files (2 total)

28. `frontend/src/pages/JournalEditorPage.vue` — Integrate StickerEditor component
29. `frontend/src/types/index.ts` — Re-export sticker types

---

## Data Model Details

### sticker_assets table
```sql
CREATE TABLE sticker_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL for builtin stickers
  storage_path TEXT NOT NULL,  -- Relative path in storage bucket
  mime_type VARCHAR(50) NOT NULL,  -- image/svg+xml, image/png, image/webp
  width INTEGER NOT NULL,  -- Intrinsic width in pixels
  height INTEGER NOT NULL,  -- Intrinsic height in pixels
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sticker_assets_user_id ON sticker_assets(user_id);
```

### journal_sticker_placements table
```sql
CREATE TABLE journal_sticker_placements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  sticker_asset_id UUID NOT NULL REFERENCES sticker_assets(id) ON DELETE CASCADE,
  x DECIMAL(5,4) NOT NULL CHECK (x >= 0 AND x <= 1),  -- Normalized 0-1
  y DECIMAL(5,4) NOT NULL CHECK (y >= 0 AND y <= 1),
  width DECIMAL(5,4) NOT NULL CHECK (width >= 0.05 AND width <= 0.5),  -- Relative to canvas width
  rotation DECIMAL(6,2) NOT NULL DEFAULT 0 CHECK (rotation >= -180 AND rotation <= 180),
  z_index INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_journal_sticker_placements_entry_id ON journal_sticker_placements(journal_entry_id);
```

### journal_entries.sticker_layout column
```sql
ALTER TABLE journal_entries ADD COLUMN sticker_layout JSONB;
```

**sticker_layout JSON structure:**
```json
{
  "version": 1,
  "surfaces": [
    {
      "id": "main-canvas",
      "stickers": [
        {
          "id": "uuid",
          "assetId": "uuid",
          "x": 0.25,
          "y": 0.40,
          "width": 0.12,
          "rotation": -15,
          "zIndex": 3
        }
      ]
    }
  ]
}
```

---

## Verification Commands

- **Build check**: `cd frontend && npm run build`
- **Unit tests**: `cd frontend && npm run test`
- **E2E tests**: `cd frontend && npm run test:e2e`
- **Supabase check**: `cd frontend && npm run check:supabase`
- **Dev server**: `cd frontend && npm run dev` → http://127.0.0.1:5173

---

## Implementation Notes

1. **Coordinate System**: All positions stored as normalized 0.0-1.0 floats relative to canvas dimensions. Convert to pixels on render using `canvasWidth * x`. This ensures consistent layout across desktop/mobile despite different viewport sizes.

2. **Moveable Integration**: Use Moveable's `target` prop bound to selected sticker's DOM ref. Enable `draggable`, `resizable`, `rotatable`, `keepRatio`, `bounds` (parent). Listen to `drag`/`resize`/`rotate` events during gesture, `dragEnd`/`resizeEnd`/`rotateEnd` to save history snapshot.

3. **Upload Validation**: Check MIME type, file size (max 5MB), decode image to verify dimensions (max 2000x2000px), render to canvas to check for transparency (reject fully opaque images). Never accept SVG uploads in initial release (XSS risk).

4. **Authorization**: RLS policies enforce ownership. `sticker_assets` with `user_id = auth.uid()` for custom stickers, `user_id IS NULL` for builtins. `journal_sticker_placements` inherits entry ownership via FK join to journal_entries. Storage buckets enforce user folder prefixes.

5. **Dirty State**: Sticker changes tracked separately from main form. JournalEditorPage combines both: `isDirty = formDirty || stickerDirty`. Save atomically: save entry first, then save placements using returned entry ID.

6. **Cancel Behavior**: On cancel or route leave without saving, restore last saved placements from server. Use `onBeforeRouteLeave` guard to confirm unsaved changes.

7. **View Mode**: In view mode (`!isEditing`), render placements without selection outlines, handles, toolbar, or tray. Stickers are purely decorative, not interactive.

8. **History Limits**: Max 50 undo states. Max 100 stickers per entry (enforced in validation). Max 5MB per upload. Max 2000x2000px per upload.

9. **Responsive Design**: Desktop: side tray (280px width, fixed right). Mobile: bottom sheet drawer (slide up, swipe down to close). Canvas scales proportionally, same normalized coords work on both.

10. **Accessibility**: ARIA labels on all buttons, keyboard navigation (Tab through stickers, Enter to select, arrow keys to nudge, Delete to remove), focus management, screen reader tested.

---

## End of Plan

This plan covers all requirements from the original brief:
- ✅ Add, drag, resize, rotate stickers
- ✅ Duplicate, delete, reorder by z-index
- ✅ Built-in library + user uploads (PNG/WebP with transparency)
- ✅ Undo/redo (snapshot-based, max 50)
- ✅ Save/restore with entry (atomic, dirty state tracking)
- ✅ Cancel restores saved state
- ✅ View mode (no editing controls)
- ✅ Responsive (desktop tray, mobile drawer)
- ✅ Supabase Storage (private user folders, signed URLs)
- ✅ RLS authorization (owner-only access)
- ✅ Coordinate normalization (stable across viewports)
- ✅ Upload validation (type, size, dimensions, transparency)
- ✅ Cronevia aesthetic (cream, burgundy, pastels, handmade feel)
- ✅ Integration with existing JournalEditorPage (edit/view modes, dirty state, save lifecycle)
- ✅ Tests (unit: composables + components, E2E: full workflow)

The plan is ordered by dependency: database → types → services → composables → components → integration → tests → polish. Each step leaves the codebase buildable and includes specific file paths and verification commands.

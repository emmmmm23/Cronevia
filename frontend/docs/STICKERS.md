# Sticker System Documentation

## Overview

The Cronevia sticker system allows users to decorate their journal entries with built-in stickers and custom uploaded images. Stickers can be positioned, sized, rotated, and layered on the journal page, creating a scrapbook-like experience.

## Architecture

### Components

The sticker system is built with five main Vue components:

1. **StickerEditor** (`src/components/journal/StickerEditor.vue`)
   - Top-level orchestrator
   - Manages "Decorate" mode toggle
   - Handles keyboard shortcuts
   - Integrates with JournalEditorPage

2. **StickerCanvas** (`src/components/journal/StickerCanvas.vue`)
   - Renders all sticker placements
   - Integrates Moveable.js for drag/resize/rotate
   - Handles coordinate normalization (pixel ↔ normalized 0-1)
   - Enforces canvas bounds

3. **StickerPlacement** (`src/components/journal/StickerPlacement.vue`)
   - Renders individual sticker
   - Applies CSS transforms from normalized coordinates
   - Shows selection outline in edit mode

4. **StickerTray** (`src/components/journal/StickerTray.vue`)
   - Displays built-in and user-uploaded stickers
   - Provides upload interface for custom stickers
   - Responsive: side panel on desktop, bottom sheet on mobile

5. **StickerToolbar** (`src/components/journal/StickerToolbar.vue`)
   - Contextual editing controls
   - Duplicate, delete, layer order, rotate
   - Undo/redo buttons

### Composables

1. **useStickerEditor** (`src/composables/useStickerEditor.ts`)
   - Manages editing state (placements, selection, canvas dimensions)
   - Implements undo/redo with snapshot-based history (max 50 states)
   - Provides coordinate normalization utilities
   - Handles persistence (load/save placements)

2. **useStickerAssets** (`src/composables/useStickerAssets.ts`)
   - Manages sticker library (built-in and user assets)
   - Handles upload with validation
   - Provides asset deletion with reference checking
   - Reactive loading and error states

### Services

**sticker.service.ts** (`src/services/sticker.service.ts`)
- Supabase API interactions
- CRUD operations for assets and placements
- Upload validation (type, size, dimensions, transparency)
- Signed URL generation for private storage

### Database Schema

#### `sticker_assets`
```sql
CREATE TABLE sticker_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  category TEXT DEFAULT 'other',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

- `user_id = NULL` for built-in stickers (system-owned)
- `user_id = <user_id>` for user-uploaded custom stickers

#### `journal_sticker_placements`
```sql
CREATE TABLE journal_sticker_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE NOT NULL,
  sticker_asset_id UUID REFERENCES sticker_assets(id) ON DELETE RESTRICT NOT NULL,
  x NUMERIC(5,4) NOT NULL,  -- Normalized 0-1
  y NUMERIC(5,4) NOT NULL,  -- Normalized 0-1
  width NUMERIC(5,4) NOT NULL,  -- Normalized 0-1
  rotation INTEGER DEFAULT 0,  -- Degrees -360 to 360
  z_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Storage Buckets

- **stickers-builtin** (public read for authenticated users)
  - System-managed built-in sticker SVGs
  - Located in `frontend/public/stickers-builtin/`

- **stickers-custom** (private)
  - User-uploaded stickers in folders: `{user_id}/filename`
  - Requires signed URLs for access

## Built-in Stickers

### Adding New Built-in Stickers

1. **Design the sticker**
   - Create SVG with `viewBox="0 0 100 100"`
   - Use Cronevia color palette:
     - Burgundy: `#7B0323`
     - Cream: `#f5ebdd`
     - Pastels as accents
   - Keep file size under 2KB
   - No embedded scripts or external references

2. **Save the file**
   - Save to `frontend/public/stickers-builtin/`
   - Use naming convention: `{category}-{number}.svg`
   - Example: `heart-03.svg`, `star-04.svg`

3. **Insert metadata**
   - Run SQL in Supabase SQL Editor:
   ```sql
   INSERT INTO sticker_assets (user_id, storage_path, mime_type, width, height, category)
   VALUES (NULL, 'heart-03.svg', 'image/svg+xml', 100, 100, 'hearts');
   ```

4. **Test**
   - Reload the journal editor
   - Open Decorate mode → Library tab
   - New sticker should appear

### Current Built-in Categories

- **hearts**: Heart shapes and love symbols
- **stars**: Star shapes and sparkles
- **flowers**: Floral decorations
- **tape**: Washi tape and decorative borders
- **leaves**: Botanical elements
- **travel**: Travel stamps and icons
- **doodles**: Abstract shapes and artistic elements

## Custom Sticker Upload

### User Workflow

1. Open journal entry in edit mode
2. Click "Decorate"
3. Switch to "My Stickers" tab
4. Click "Upload Sticker"
5. Select PNG or WebP file
6. Sticker appears in "My Stickers" library
7. Click to add to journal entry

### Upload Constraints

- **Allowed formats**: PNG, WebP (with transparency preferred)
- **Max file size**: 5MB
- **Max dimensions**: 2000×2000 pixels
- **Required**: Must be an image (MIME type validation)
- **Recommended**: Transparent background for best results

### Validation

The upload process validates:
1. File type (PNG or WebP only)
2. File size (under 5MB)
3. Image dimensions (under 2000×2000)
4. Successful image decode (corrupt files rejected)
5. Transparency detection via canvas rendering

Failed uploads show error messages in the tray UI.

## Security & Authorization

### RLS Policies

**sticker_assets**
- Read: All authenticated users can read all assets
- Insert/Update/Delete: Users can only modify assets they own (`user_id = auth.uid()`)

**journal_sticker_placements**
- Read/Write: Users can only access placements for journal entries they own
- Enforced via FK join: `journal_entries.user_id = auth.uid()`

### Asset Deletion

- Deletion is **blocked** if placements reference the asset (ON DELETE RESTRICT)
- Users must remove the sticker from all entries first
- This prevents broken references

### Storage Policies

- **stickers-builtin**: Public read for authenticated users
- **stickers-custom**: Private folders per user
  - Insert: User can write to `{user_id}/*`
  - Select: User can read from `{user_id}/*`
  - Delete: User can delete from `{user_id}/*`

### Frontend Security

- Never persist signed URLs (they expire)
- Store `storage_path` and regenerate signed URLs on load
- Service-level validation prevents:
  - Uploading to other users' folders
  - Reading other users' custom stickers
  - Accepting arbitrary SVG (XSS risk)

## Features

### Editing Controls

- **Drag**: Click and drag sticker to reposition
- **Resize**: Drag corner handles, aspect ratio locked
- **Rotate**: Drag rotation handle or use ±15° buttons
- **Duplicate**: Creates copy with small offset
- **Delete**: Remove from entry (asset remains in library)
- **Layer order**: Bring forward/back, to front/back

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Delete` / `Backspace` | Delete selected sticker |
| `Ctrl+Z` / `Cmd+Z` | Undo last action |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo last undone action |
| `Arrow keys` | Nudge sticker position (small steps) |
| `Shift+Arrow keys` | Nudge sticker position (larger steps) |
| `Escape` | Deselect sticker |

### Undo/Redo

- Snapshot-based history
- Maximum 50 states stored
- Includes all operations: add, move, resize, rotate, duplicate, delete, layer changes
- Drag/resize/rotate creates single history entry on end (not during movement)

### View Mode

When viewing a saved journal entry:
- Stickers are displayed
- No selection outlines
- No editing controls (toolbar, tray)
- No Decorate toggle

## Limitations

### Current Constraints

- **Max stickers per entry**: No hard limit, but performance degrades beyond ~100
- **Upload size**: 5MB max file size
- **Upload dimensions**: 2000×2000 max
- **History depth**: 50 undo/redo states
- **SVG uploads**: Not supported (security risk)

### Known Issues

- **Moveable handles**: May not render correctly at very small sticker sizes (< 50px)
- **Mobile drag**: Requires careful touch interaction; may conflict with scrolling
- **Rotation precision**: Limited to integer degrees; fractional rotation not persisted
- **Canvas bounds**: Stickers can be dragged partially off-canvas before bounds enforcement

### Browser Support

- **Desktop**: Chrome, Firefox, Edge, Safari (latest 2 versions)
- **Mobile**: iOS Safari 14+, Chrome Android 90+
- **Required features**: CSS transforms, Pointer Events, ES2020

## Performance Optimizations

### Implemented

1. **Lazy loading**: Sticker images use `loading="lazy"` attribute
2. **Debounced events**: Moveable events throttled to 60fps (16ms)
3. **Memoized coordinates**: Denormalized positions cached during render
4. **GSAP transitions**: Smooth add/delete animations (200ms fade + scale)
5. **Component-level rendering**: Only changed stickers re-render

### Future Improvements

- Virtual scrolling for large sticker libraries
- Web Worker for image processing during upload
- Canvas-based rendering for 100+ stickers
- Preload next/previous journal entries in carousel view

## Troubleshooting

### Stickers not loading

**Symptoms**: Library tab shows "No built-in stickers available"

**Causes & Solutions**:
1. **Database not seeded**
   - Run `supabase/migrations/seed-builtin-stickers.sql`
   - Verify with: `SELECT * FROM sticker_assets WHERE user_id IS NULL;`

2. **Storage bucket missing**
   - Check Supabase dashboard → Storage → stickers-builtin
   - Ensure bucket exists and has correct policies

3. **Files not in public directory**
   - Verify `frontend/public/stickers-builtin/*.svg` files exist
   - Dev server must serve from `/stickers-builtin/`

### Stickers not persisting

**Symptoms**: Stickers disappear after reload

**Causes & Solutions**:
1. **Entry not saved**
   - Ensure "Save Entry" was clicked
   - Check for save errors in console

2. **RLS policy blocking**
   - Verify `journal_sticker_placements` RLS policies
   - Check user owns the journal entry

3. **Placement save failed**
   - Open DevTools → Network → look for failed POST requests
   - Check Supabase logs for errors

### Upload fails

**Symptoms**: "Could not upload sticker" error

**Causes & Solutions**:
1. **File too large**: Use PNG/WebP compression, target < 1MB
2. **Wrong format**: Only PNG and WebP accepted
3. **Corrupt image**: Try re-exporting from image editor
4. **Storage quota**: Check Supabase storage limits

### Drag/resize not working

**Symptoms**: Sticker won't move when dragged

**Causes & Solutions**:
1. **Not in decorate mode**: Click "Decorate" first
2. **View mode active**: Edit mode required
3. **Sticker not selected**: Click sticker to select it
4. **Moveable not initialized**: Check console for errors
5. **Browser compatibility**: Update to latest browser version

### Keyboard shortcuts not working

**Symptoms**: Ctrl+Z doesn't undo

**Causes & Solutions**:
1. **Not in decorate mode**: Enable "Decorate" mode
2. **Focus on input**: Click canvas area to move focus away from text inputs
3. **Nothing to undo**: History may be empty (no previous actions)

## Development

### Running Tests

```bash
# Unit tests
cd frontend
npm run test

# E2E tests (requires Supabase running)
npm run test:e2e

# Coverage report
npm run test -- --coverage
```

### Building

```bash
cd frontend
npm run build
```

### Local Development

```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

### Debugging Tips

1. **Vue DevTools**: Install browser extension for reactive state inspection
2. **Console logging**: Components log key actions in development mode
3. **Network tab**: Monitor Supabase API calls and storage requests
4. **React DevTools**: Inspect Moveable handles and state

## API Reference

### useStickerEditor

```typescript
const editor = useStickerEditor()

// State
editor.placements.value        // Array of StickerInstance
editor.selectedId.value        // string | null
editor.selectedSticker.value   // StickerInstance | null
editor.canUndo.value           // boolean
editor.canRedo.value           // boolean
editor.hasChanges.value        // boolean

// Actions
editor.addSticker(assetId, x?, y?, width?)
editor.updatePlacement(id, updates)
editor.deleteSticker(id)
editor.duplicateSticker(id)
editor.bringForward(id)
editor.sendBackward(id)
editor.bringToFront(id)
editor.sendToBack(id)
editor.selectSticker(id | null)
editor.undo()
editor.redo()

// Persistence
await editor.loadPlacements(entryId)
await editor.savePlacements(entryId)
editor.clearPlacements()

// Configuration
editor.setCanvasDimensions(width, height)

// Utilities
editor.normalizeCoords(x, y, width)     // px → 0-1
editor.denormalizeCoords(x, y, width)   // 0-1 → px
```

### useStickerAssets

```typescript
const assets = useStickerAssets(userId?)

// State
assets.builtinAssets.value   // Array<StickerAsset & { url }>
assets.userAssets.value      // Array<StickerAsset & { url }>
assets.allAssets.value       // Combined array
assets.hasUserAssets.value   // boolean
assets.loading.value         // boolean
assets.uploadProgress.value  // number 0-100
assets.error.value           // string | null

// Actions
await assets.loadBuiltins()
await assets.loadUserAssets(userId)
await assets.uploadAsset(file)  // Returns asset or null
await assets.deleteUserAsset(assetId)  // Returns boolean
assets.clearError()

// Utilities
assets.findAsset(assetId)  // Returns asset | undefined
```

## Migration Guide

### From Non-Sticker Entries

Existing journal entries without stickers:
- `journal_sticker_placements` rows: 0
- Behavior: No stickers rendered, "Decorate" button available

### Database Rollback

To remove the sticker system:

```sql
-- Drop tables (cascade removes placements)
DROP TABLE IF EXISTS journal_sticker_placements CASCADE;
DROP TABLE IF EXISTS sticker_assets CASCADE;

-- Drop storage buckets (via Supabase dashboard)
-- stickers-builtin
-- stickers-custom
```

**Warning**: This permanently deletes all custom stickers and placements.

## Support

For issues or questions:
- Check this documentation first
- Review console errors and network requests
- Search existing issues on GitHub
- Open a new issue with reproduction steps

## License

This sticker system is part of Cronevia and follows the project's license terms.

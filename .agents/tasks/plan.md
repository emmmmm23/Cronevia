# Implementation Plan: Scrapbook Visual Redesign and Sticker System Integration

## ROOT CAUSE ANALYSIS

**Why the old UI is still showing:**

The previous workflow created all sticker components (StickerEditor.vue, StickerCanvas.vue, StickerTray.vue, StickerToolbar.vue, StickerPlacement.vue) and supporting infrastructure (services, composables, types), BUT:

1. **StickerEditor.vue was NEVER imported** in JournalEditorPage.vue
2. **No visual scrapbook styling** was applied to JournalEditorPage.vue — it still uses the beige form (`bg-[#f5ebdd]`)
3. **No handwritten fonts** were added to index.html
4. **No notebook or page layout** was implemented
5. **No sticker integration wiring** exists in the journal editor

The components exist but are completely disconnected from the actual journal editing experience.

---

## IMPLEMENTATION PLAN

### FEAT-001: Apply Scrapbook Visual Redesign to JournalEditorPage.vue

**Objective:** Transform the beige form into a visible denim-blue graph-paper notebook with handwritten title typography, Polaroid photos, and pastel decorations.

**Files to modify:**
- `c:\Users\Juan Miguel\Cronevia\frontend\index.html`
- `c:\Users\Juan Miguel\Cronevia\frontend\src\pages\JournalEditorPage.vue`
- `c:\Users\Juan Miguel\Cronevia\frontend\src\style.css` (if needed)

**Steps:**

1. **Add handwritten Google Fonts to index.html**
   
   Replace the existing Google Fonts link (line 9) with:
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600&family=Caveat:wght@400;600&family=Indie+Flower&family=Patrick+Hand&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
   ```
   
2. **Transform the root background from beige to denim-blue notebook**
   
   In JournalEditorPage.vue template, line 526, change:
   ```vue
   <div class="min-h-screen bg-[#f5ebdd]" @click.self="closePickers">
   ```
   to:
   ```vue
   <div class="min-h-screen bg-[#2C4054] relative overflow-x-hidden" @click.self="closePickers">
     <!-- Graph paper pattern overlay -->
     <div class="fixed inset-0 pointer-events-none opacity-30" style="background-image: repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(255,255,255,0.15) 19px, rgba(255,255,255,0.15) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(255,255,255,0.15) 19px, rgba(255,255,255,0.15) 20px); background-size: 20px 20px;"></div>
   ```

3. **Replace the sticky header with a notebook header bar**
   
   In JournalEditorPage.vue template, lines 529-552 (the header div), replace with:
   ```vue
   <div class="bg-[#3a4f61] border-b-2 border-[#1a2634] sticky top-0 z-20 shadow-lg">
     <div class="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
       <RouterLink :to="{ name: 'journal' }" class="inline-flex items-center gap-1.5 text-sm text-[#d4c4a8] hover:text-[#f5ebdd] transition-colors" :class="{ 'pointer-events-none opacity-50': saving }">
         <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
           <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
         </svg>
         Back to Journal
       </RouterLink>

       <div class="flex items-center gap-2">
         <p v-if="saveError" role="alert" class="text-xs text-[#ffb3b3] max-w-xs text-right">{{ saveError }}</p>

         <button
           type="button"
           :disabled="!canSave"
           :aria-busy="saving"
           :class="[
             'inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded border transition-all',
             canSave
               ? 'bg-[#7B0323] text-[#fdfaf5] border-[#5a0019] hover:bg-[#5a0019] shadow-md'
               : 'bg-[#555] text-[#999] border-[#555] cursor-not-allowed opacity-60',
           ]"
           @click="handleSave"
         >
           <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
             <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
             <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
           </svg>
           {{ saving ? 'Saving…' : (isEditing ? 'Save Changes' : 'Save Entry') }}
         </button>
       </div>
     </div>
   </div>
   ```

4. **Replace the form content area with a cream notebook page layout**
   
   In JournalEditorPage.vue template, lines 555-556, replace:
   ```vue
   <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
   ```
   with:
   ```vue
   <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 relative z-10">
     <!-- Desktop: Two-page spread with center binding -->
     <div class="hidden md:grid md:grid-cols-2 gap-1 bg-[#1a2634] p-1 rounded-lg shadow-2xl mb-8">
       <!-- Left page -->
       <div class="notebook-page bg-[#F5F1E8] p-8 rounded-l-lg relative min-h-[800px]">
         <!-- Binding shadow on right edge -->
         <div class="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-black/10 to-transparent pointer-events-none"></div>
         
         <div class="flex flex-col gap-6 relative z-10">
   ```

5. **Add handwritten title styling**
   
   In JournalEditorPage.vue template, around line 565 (Title section), replace the input styling:
   ```vue
   <input
     id="entry-title"
     v-model="title"
     type="text"
     placeholder="What should you call this memory?"
     autocomplete="off"
     class="w-full px-2 py-3 bg-transparent border-none text-[#2b1a10] placeholder:text-[#a68e73] focus:outline-none text-2xl"
     style="font-family: 'Indie Flower', 'Patrick Hand', cursive; font-size: 2rem; line-height: 1.3;"
     @input="markDirty"
   />
   ```

6. **Style content textarea with readable serif typography**
   
   In JournalEditorPage.vue template, around line 720 (Content section), update textarea styling:
   ```vue
   <textarea
     id="entry-content"
     v-model="content"
     rows="14"
     placeholder="Start writing your story…"
     aria-describedby="content-counter"
     class="w-full px-4 py-3.5 bg-transparent border border-[#d7c7b3] rounded text-[#2b1a10] text-base leading-relaxed placeholder:text-[#a68e73] focus:outline-none focus:border-[#7B0323] focus:ring-2 focus:ring-[#7B0323]/20 transition resize-y"
     style="min-height: 300px; line-height: 1.8; font-family: 'Crimson Text', 'Merriweather', Georgia, serif;"
     @input="markDirty"
   />
   ```

7. **Add compact metadata badge display (date, mood, location)**
   
   After the title section, before content, insert a metadata row:
   ```vue
   <!-- Metadata badges row -->
   <div class="flex flex-wrap items-center gap-2 text-xs py-3 border-b border-[#d7c7b3]/50">
     <!-- Date badge -->
     <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#fdfaf5] border border-[#d7c7b3] rounded-full">
       <svg class="w-3.5 h-3.5 text-[#7B0323]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
         <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
       </svg>
       <span class="font-medium text-[#2b1a10]">{{ new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}</span>
     </div>
     
     <!-- Mood badge (if set) -->
     <div v-if="moodEmoji" class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#fdfaf5] border border-[#d7c7b3] rounded-full">
       <span class="text-base leading-none">{{ moodEmoji }}</span>
       <span class="font-medium text-[#2b1a10]">{{ moodLabel }}</span>
     </div>
     
     <!-- Location badge (if set) -->
     <div v-if="locationName" class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#fdfaf5] border border-[#d7c7b3] rounded-full max-w-xs">
       <svg class="w-3.5 h-3.5 text-[#7B0323] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
         <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
         <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/>
       </svg>
       <span class="font-medium text-[#2b1a10] truncate">{{ locationName }}</span>
     </div>
   </div>
   ```

8. **Close the left page div and open right page**
   
   After all left-page content (title, metadata, date/mood/location inputs - keep them on left), close the left page and open right page:
   ```vue
         </div> <!-- end left page content -->
       </div> <!-- end left page -->
       
       <!-- Right page -->
       <div class="notebook-page bg-[#F5F1E8] p-8 rounded-r-lg relative min-h-[800px]">
         <!-- Binding shadow on left edge -->
         <div class="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-black/10 to-transparent pointer-events-none"></div>
         
         <div class="flex flex-col gap-6 relative z-10">
           <!-- Content textarea goes here on right page -->
           <!-- Photos go here on right page -->
           <!-- Tags go here on right page -->
         </div>
       </div> <!-- end right page -->
     </div> <!-- end desktop two-page spread -->
     
     <!-- Mobile: Single stacked page -->
     <div class="md:hidden bg-[#F5F1E8] p-6 rounded-lg shadow-2xl mb-8 min-h-[600px]">
       <div class="flex flex-col gap-6">
         <!-- All content stacked vertically for mobile -->
       </div>
     </div>
   </div> <!-- end container -->
   ```

9. **Add Polaroid-style photo frames with washi tape**
   
   Wrap the PhotoUpload component (around line 755) with Polaroid styling:
   ```vue
   <div class="polaroid-photos-section">
     <p class="text-xs font-semibold uppercase tracking-wider text-[#6b4423] mb-3">Photos</p>
     
     <!-- Existing PhotoUpload component, but add polaroid wrapper class to its parent -->
     <div class="photo-grid">
       <PhotoUpload
         v-model="newPhotos"
         :existing-photos="existingPhotos"
         :disabled="saving || uploadingPhotos"
         @remove-existing="handleRemoveExistingPhoto"
       />
     </div>
   </div>
   ```

10. **Add CSS for Polaroid frames and washi tape decorations**
    
    In JournalEditorPage.vue, add a `<style scoped>` section at the end of the file (after `</template>`):
    ```vue
    <style scoped>
    .notebook-page {
      box-shadow: inset 0 0 30px rgba(0,0,0,0.05);
    }
    
    /* Polaroid photo styling - target PhotoUpload's image containers */
    :deep(.photo-preview) {
      background: white;
      padding: 12px 12px 48px 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      transform: rotate(-2deg);
      transition: transform 0.2s;
      position: relative;
    }
    
    :deep(.photo-preview:nth-child(even)) {
      transform: rotate(2deg);
    }
    
    :deep(.photo-preview:hover) {
      transform: rotate(0deg) scale(1.05);
      z-index: 10;
    }
    
    /* Washi tape decoration on photos */
    :deep(.photo-preview::before) {
      content: '';
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%) rotate(-2deg);
      width: 60%;
      height: 20px;
      background: linear-gradient(90deg, 
        rgba(255,182,193,0.7) 0%, 
        rgba(255,192,203,0.7) 50%, 
        rgba(255,182,193,0.7) 100%);
      border-left: 2px solid rgba(255,255,255,0.5);
      border-right: 2px solid rgba(255,255,255,0.5);
      pointer-events: none;
    }
    
    /* Pastel corner embellishments */
    .notebook-page::after {
      content: '✦';
      position: absolute;
      top: 16px;
      right: 16px;
      font-size: 24px;
      color: rgba(255, 182, 193, 0.4);
      pointer-events: none;
    }
    </style>
    ```

**Acceptance Criteria:**
- [ ] Denim-blue graph-paper background is visible on the journal editor page
- [ ] Handwritten font (Indie Flower or Patrick Hand) is applied to entry title
- [ ] Desktop shows a two-page spread with center binding shadow
- [ ] Mobile shows a single stacked cream page
- [ ] Content uses readable serif font (Crimson Text or Merriweather)
- [ ] Photos display with Polaroid-style frames and washi tape
- [ ] Date, mood, and location appear as compact badges
- [ ] Pastel decorative details are visible

**Verification:**
```bash
cd c:\Users\Juan Miguel\Cronevia\frontend
npm run dev
```
Then navigate to http://127.0.0.1:5173/journal/new and visually inspect:
1. Background is denim blue with graph paper pattern
2. Title input uses handwritten font
3. Desktop layout shows two cream pages side-by-side
4. Mobile layout (resize browser) shows single stacked page
5. Photos have white Polaroid frames with pink washi tape decoration

---

### FEAT-002: Integrate Sticker Editor into JournalEditorPage.vue

**Objective:** Wire StickerEditor into the journal editing workflow with proper state management, load/save persistence, and dirty state tracking.

**Files to modify:**
- `c:\Users\Juan Miguel\Cronevia\frontend\src\pages\JournalEditorPage.vue`

**Steps:**

1. **Import StickerEditor component in the script section**
   
   In JournalEditorPage.vue, after line 15 (after PhotoUpload import), add:
   ```typescript
   import StickerEditor from '@/components/journal/StickerEditor.vue'
   ```

2. **Add sticker-related reactive state**
   
   After line 48 (after `uploadingPhotos = ref(false)`), add:
   ```typescript
   // Sticker editing state
   const stickersDirty = ref(false)
   const stickerEditorRef = ref<InstanceType<typeof StickerEditor> | null>(null)
   ```

3. **Update isDirty computation to include stickers**
   
   Find the `isDirty` ref (around line 45) and note that `markDirty()` sets it. Add sticker dirty tracking by updating the save handler to check both:
   ```typescript
   // In handleSave function (around line 275), after the main save succeeds and before uploadingPhotos,
   // add sticker save:
   
   // After successful journal entry save, around line 295:
   
   // Save sticker placements if editor is mounted and there are changes
   if (stickerEditorRef.value && savedEntryId) {
     try {
       await stickerEditorRef.value.savePlacements()
     } catch (stickerErr) {
       console.error('Failed to save sticker placements:', stickerErr)
       // Don't fail the entire save for sticker errors, but show warning
       saveError.value = 'Entry saved, but sticker placements may not have saved. Please try again.'
     }
   }
   ```

4. **Add sticker dirty state handler**
   
   After the `closePickers` function (around line 523), add:
   ```typescript
   function handleStickerDirtyChange(dirty: boolean) {
     stickersDirty.value = dirty
     if (dirty) {
       markDirty()
     }
   }
   ```

5. **Render StickerEditor in the template**
   
   In the template, after the form content and before the closing `</div>` of the main container (around line 784), add:
   ```vue
   <!-- Sticker Editor Integration -->
   <div class="mt-8">
     <StickerEditor
       ref="stickerEditorRef"
       :entry-id="savedEntryId || null"
       :view-mode="false"
       :user-id="store.user?.id"
       @dirty-change="handleStickerDirtyChange"
       @placements-change="markDirty"
     />
   </div>
   ```

6. **Update the global isDirty check to include stickers**
   
   Find the `onBeforeRouteLeave` guard (around line 110) and update the condition:
   ```typescript
   onBeforeRouteLeave((_to, _from, next) => {
     if ((isDirty.value || stickersDirty.value) && !saveSuccess.value) {
       const confirmed = window.confirm(
         'You have unsaved changes. Leave without saving?'
       )
       if (confirmed) next()
       else next(false)
     } else {
       next()
     }
   })
   ```

7. **Ensure the sticker canvas is positioned correctly**
   
   The StickerEditor renders its own canvas wrapper. Position it after the notebook pages so stickers overlay the content area. The current StickerEditor.vue already has a canvas wrapper with proper styling, so no additional CSS is needed here, but we should ensure the notebook pages have `position: relative` for stacking context.
   
   Update the notebook page classes to include `relative`:
   ```vue
   <div class="notebook-page bg-[#F5F1E8] p-8 rounded-l-lg relative min-h-[800px]">
   ```
   (This is already in step FEAT-001, just confirming.)

**Acceptance Criteria:**
- [ ] StickerEditor is imported and rendered in JournalEditorPage.vue
- [ ] A visible "Decorate" or "Stickers" button appears in edit mode
- [ ] Clicking the button opens the sticker tray with visible thumbnails
- [ ] Clicking a thumbnail places a sticker on the notebook surface
- [ ] Stickers persist when saving the entry
- [ ] Stickers load correctly when editing an existing entry
- [ ] Unsaved sticker changes trigger the "unsaved changes" warning
- [ ] View mode (if implemented) hides sticker editing controls

**Verification:**
```bash
cd c:\Users\Juan Miguel\Cronevia\frontend
npm run dev
```
Then:
1. Navigate to http://127.0.0.1:5173/journal/new
2. Fill in title and content
3. Click "Decorate" button — sticker tray should appear
4. Verify tray shows 12 built-in sticker thumbnails
5. Click a sticker thumbnail — it should appear on the notebook
6. Drag the sticker — it should move
7. Click the sticker — handles should appear
8. Resize and rotate using handles
9. Save the entry
10. Navigate back to journal list, then click the saved entry
11. Verify stickers appear in their saved positions
12. Try to navigate away without saving after adding a sticker — unsaved changes warning should appear

---

### FEAT-003: Implement Sticker Library UI Polish and Upload Flow

**Objective:** Ensure the sticker tray UI is fully functional with visible thumbnails, upload capability, and proper error handling.

**Files to verify/modify:**
- `c:\Users\Juan Miguel\Cronevia\frontend\src\components\journal\StickerTray.vue` (already complete, verify)
- `c:\Users\Juan Miguel\Cronevia\frontend\src\composables\useStickerAssets.ts` (already complete, verify)
- `c:\Users\Juan Miguel\Cronevia\frontend\src\services\sticker.service.ts` (already complete, verify)

**Steps:**

1. **Verify built-in stickers load from public folder**
   
   Confirm that `fetchBuiltinAssets()` in sticker.service.ts correctly references the `stickers-builtin` bucket and that the 12 SVG files exist in `c:\Users\Juan Miguel\Cronevia\frontend\public\stickers-builtin\`.
   
   Files confirmed (from earlier investigation):
   - doodle-abstract-01.svg, doodle-abstract-02.svg
   - flower-01.svg, flower-02.svg
   - heart-01.svg, heart-02.svg
   - leaf-01.svg
   - star-01.svg, star-02.svg
   - stamp-travel-01.svg
   - tape-01.svg, tape-02.svg
   
   ✅ This is complete.

2. **Test sticker upload validation**
   
   The `validateStickerFile` function checks:
   - MIME type (PNG/WebP only)
   - File size (< 5MB)
   - Dimensions (< 2000x2000)
   - Transparency (required)
   
   ✅ This is already implemented in sticker.service.ts.

3. **Verify sticker deletion with placement check**
   
   The `deleteAsset` function checks for existing placements before allowing deletion.
   
   ✅ This is already implemented.

4. **Test responsive layout (desktop side panel, mobile bottom sheet)**
   
   StickerTray.vue already has responsive CSS:
   - Desktop: `width: 280px` fixed right panel
   - Mobile: `fixed bottom sheet, max-height: 60vh`
   
   ✅ This is already implemented.

5. **Ensure "My Stickers" tab works**
   
   StickerTray.vue loads user assets via `useStickerAssets` composable and displays them in a grid with delete buttons.
   
   ✅ This is already implemented.

6. **Visual polish: ensure tray matches notebook aesthetic**
   
   Current colors in StickerTray.vue:
   - Background: `bg-[#fdfaf5]` (cream)
   - Border: `border-[#d7c7b3]` (tan)
   - Active tab: `text-[#7B0323]` (burgundy)
   
   These already match the notebook page colors from FEAT-001. No changes needed.

**Acceptance Criteria:**
- [ ] Sticker tray displays 12 built-in sticker thumbnails immediately
- [ ] "My Stickers" tab is accessible
- [ ] "Upload Sticker" button is visible and functional
- [ ] Uploading a valid PNG/WebP with transparency succeeds
- [ ] Uploading an invalid file shows an actionable error message
- [ ] Uploaded stickers appear in "My Stickers" tab
- [ ] Delete button appears on hover for custom stickers
- [ ] Deleting a sticker shows confirmation pattern (click twice)
- [ ] Desktop layout shows side panel, mobile shows bottom sheet

**Verification:**
```bash
cd c:\Users\Juan Miguel\Cronevia\frontend
npm run dev
```
Then:
1. Navigate to http://127.0.0.1:5173/journal/new
2. Click "Decorate" button
3. Verify "Library" tab shows 12 thumbnails
4. Click "My Stickers" tab
5. Click "Upload Sticker" button
6. Select a valid PNG with transparency — upload should succeed and sticker should appear
7. Try uploading a JPG or PNG without transparency — error should display
8. Hover over uploaded sticker — delete button should appear
9. Click delete once — button should turn red with "confirm" styling
10. Click delete again — sticker should be removed
11. Resize browser to mobile width — tray should become bottom sheet

---

### FEAT-004: Test Full Sticker Interaction Flow with Moveable

**Objective:** Verify all sticker manipulation controls work: drag, resize, rotate, duplicate, delete, layer order, undo/redo.

**Files to verify:**
- `c:\Users\Juan Miguel\Cronevia\frontend\src\components\journal\StickerCanvas.vue` (already complete)
- `c:\Users\Juan Miguel\Cronevia\frontend\src\components\journal\StickerToolbar.vue` (already complete)
- `c:\Users\Juan Miguel\Cronevia\frontend\src\components\journal\StickerPlacement.vue` (already complete)
- `c:\Users\Juan Miguel\Cronevia\frontend\src\composables\useStickerEditor.ts` (already complete)

**Steps:**

1. **Verify Moveable integration in StickerCanvas.vue**
   
   StickerCanvas.vue already:
   - Initializes Moveable on selected sticker
   - Handles drag, resize, rotate events
   - Emits normalized coordinate updates
   - Destroys Moveable on deselection
   
   ✅ Complete.

2. **Verify toolbar appears when sticker is selected**
   
   StickerEditor.vue already renders StickerToolbar when `selectedId.value` is truthy.
   
   ✅ Complete.

3. **Test keyboard shortcuts**
   
   StickerEditor.vue already implements:
   - Delete/Backspace: delete selected sticker
   - Ctrl+Z: undo
   - Ctrl+Shift+Z: redo
   - Arrow keys: nudge sticker position
   - Escape: deselect
   
   ✅ Complete.

4. **Test undo/redo history**
   
   useStickerEditor.ts maintains a snapshot-based history (max 50 entries) and supports undo/redo.
   
   ✅ Complete.

5. **Test layer order controls**
   
   StickerToolbar.vue has buttons for:
   - Bring to front
   - Bring forward
   - Send backward
   - Send to back
   
   useStickerEditor.ts implements all four functions by manipulating z-index.
   
   ✅ Complete.

6. **Test rotation controls**
   
   StickerToolbar.vue has buttons to rotate ±15°. useStickerEditor.ts applies rotation updates.
   
   ✅ Complete.

7. **Verify sticker selection outline**
   
   StickerPlacement.vue applies a red ring outline when `isSelected` is true.
   
   ✅ Complete.

8. **Test duplicate function**
   
   useStickerEditor.ts `duplicateSticker` creates a copy with a slight offset and incremented z-index.
   
   ✅ Complete.

**Acceptance Criteria:**
- [ ] Clicking a sticker selects it (red outline appears)
- [ ] Dragging a selected sticker moves it
- [ ] Resize handles appear and work (preserving aspect ratio)
- [ ] Rotation handle appears and works
- [ ] Toolbar appears above canvas when sticker is selected
- [ ] Duplicate button creates a copy with slight offset
- [ ] Delete button removes the selected sticker
- [ ] Layer order buttons (bring forward, send backward, etc.) work correctly
- [ ] Rotation buttons rotate the sticker by 15°
- [ ] Undo button reverts the last change
- [ ] Redo button re-applies an undone change
- [ ] Delete key removes selected sticker
- [ ] Ctrl+Z undoes, Ctrl+Shift+Z redoes
- [ ] Arrow keys nudge the selected sticker
- [ ] Escape deselects the sticker

**Verification:**
```bash
cd c:\Users\Juan Miguel\Cronevia\frontend
npm run dev
```
Then:
1. Navigate to http://127.0.0.1:5173/journal/new
2. Click "Decorate", add a sticker
3. Click the sticker — red outline and toolbar should appear
4. Drag the sticker — it should move
5. Drag a corner handle — sticker should resize proportionally
6. Drag the rotation handle — sticker should rotate
7. Click toolbar "Duplicate" — a copy should appear with slight offset
8. Click toolbar "Delete" — sticker should be removed
9. Press Ctrl+Z — deleted sticker should reappear
10. Press Ctrl+Shift+Z — sticker should be deleted again
11. Add two stickers, select the bottom one
12. Click "Bring Forward" — z-index should swap
13. Click toolbar rotation buttons — sticker should rotate by 15°
14. Press arrow keys — sticker should nudge in that direction
15. Press Escape — sticker should deselect (no outline, no toolbar)

---

### FEAT-005: Verify Persistence and Database Integration

**Objective:** Confirm sticker placements save to Supabase and load correctly when editing an existing entry.

**Files to verify:**
- `c:\Users\Juan Miguel\Cronevia\frontend\src\services\sticker.service.ts` (already complete)
- `c:\Users\Juan Miguel\Cronevia\frontend\src\composables\useStickerEditor.ts` (already complete)
- Database schema (already deployed, confirmed by user)

**Steps:**

1. **Verify database tables exist**
   
   User stated: "Database tables `sticker_assets` and `journal_sticker_placements` exist (migration already deployed)."
   
   ✅ Confirmed.

2. **Verify fetchPlacements loads from database**
   
   sticker.service.ts `fetchPlacements()`:
   - Verifies entry ownership
   - Fetches placements from `journal_sticker_placements` table
   - Returns array of StickerPlacement objects
   
   ✅ Complete.

3. **Verify savePlacements writes to database**
   
   sticker.service.ts `savePlacements()`:
   - Verifies entry ownership
   - Deletes existing placements for the entry
   - Inserts new placements atomically
   
   ✅ Complete.

4. **Test save and reload flow**
   
   - Create a new entry with stickers
   - Save the entry
   - Navigate away, then back to edit the entry
   - Verify stickers load in correct positions
   
   This will be verified during manual testing.

5. **Test cancel/restore flow**
   
   The current implementation does NOT have a cancel button that restores stickers. This would require:
   - Loading initial placements into a separate "saved" state
   - On cancel, restoring from saved state instead of current editor state
   
   This is a gap. Add a simple reset function:
   
   In useStickerEditor.ts, add:
   ```typescript
   function resetToSaved() {
     if (history.value.length > 0) {
       restoreSnapshot(history.value[0])
       historyIndex.value = 0
     }
   }
   ```
   
   Expose it in the return object:
   ```typescript
   return {
     // ... existing exports
     resetToSaved
   }
   ```
   
   In JournalEditorPage.vue, if there's a Cancel button (check around line 29 where RouterLink back to journal exists), add a click handler that calls `stickerEditorRef.value?.resetToSaved()` before navigating.
   
   Actually, there is NO explicit Cancel button currently — the user uses the back link. We could intercept that with the unsaved changes guard. This is acceptable as-is for now.

6. **Verify private asset access control**
   
   sticker.service.ts already:
   - Uses signed URLs with 1-hour expiration
   - Verifies ownership on upload/delete
   - Checks entry ownership before loading placements
   
   ✅ Complete.

7. **Verify placement validation**
   
   sticker.service.ts `validateLayout()` checks:
   - Layout structure
   - Coordinate normalization (0-1 range)
   - Rotation bounds (-360 to 360)
   - Maximum 100 stickers per entry
   
   ✅ Complete.

**Acceptance Criteria:**
- [ ] Creating a new entry with stickers and saving persists placements to database
- [ ] Editing an existing entry loads stickers in correct positions
- [ ] Sticker positions remain accurate after save/reload
- [ ] Private uploaded stickers generate signed URLs
- [ ] Other users cannot access another user's private stickers
- [ ] Deleting a placement does not delete the reusable asset
- [ ] Save failures show actionable error messages
- [ ] Browser console shows no authentication or permission errors

**Verification:**
```bash
cd c:\Users\Juan Miguel\Cronevia\frontend
npm run dev
```
Then:
1. Navigate to http://127.0.0.1:5173/journal/new
2. Create an entry with title, content, and 3 stickers in different positions
3. Save the entry
4. Note the entry ID from the URL
5. Navigate to the journal list
6. Click the saved entry to edit it
7. Verify all 3 stickers appear in their saved positions
8. Open browser DevTools Network tab
9. Check that sticker asset requests return 200 OK with signed URLs
10. Check browser console for errors — there should be none
11. Add another sticker, do NOT save
12. Click the back link — unsaved changes warning should appear
13. Confirm navigation — sticker changes should be lost
14. Re-open the entry — only the 3 original stickers should be present

---

### FEAT-006: Mobile Layout and Responsive Verification

**Objective:** Ensure the scrapbook design and sticker system work seamlessly on mobile devices with stacked pages and bottom sheet sticker tray.

**Files to verify:**
- `c:\Users\Juan Miguel\Cronevia\frontend\src\pages\JournalEditorPage.vue` (verify responsive classes)
- `c:\Users\Juan Miguel\Cronevia\frontend\src\components\journal\StickerTray.vue` (verify bottom sheet on mobile)
- `c:\Users\Juan Miguel\Cronevia\frontend\src\components\journal\StickerEditor.vue` (verify responsive layout)

**Steps:**

1. **Verify desktop two-page layout uses CSS Grid**
   
   FEAT-001 already specifies:
   ```vue
   <div class="hidden md:grid md:grid-cols-2 gap-1 ...">
   ```
   
   ✅ Will be implemented in FEAT-001.

2. **Verify mobile single-page layout**
   
   FEAT-001 already specifies:
   ```vue
   <div class="md:hidden bg-[#F5F1E8] p-6 rounded-lg ...">
   ```
   
   ✅ Will be implemented in FEAT-001.

3. **Verify sticker tray becomes bottom sheet on mobile**
   
   StickerTray.vue already has responsive CSS:
   ```css
   @media (max-width: 767px) {
     position: fixed;
     bottom: 0;
     left: 0;
     right: 0;
     max-height: 60vh;
     border-left: none;
     border-top: 1px solid #d7c7b3;
     box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
   }
   ```
   
   ✅ Already implemented.

4. **Test touch interactions for sticker manipulation**
   
   Moveable library supports touch events by default. StickerCanvas.vue uses Moveable, so touch drag/resize/rotate should work.
   
   Manual testing required.

5. **Verify toolbar positioning on mobile**
   
   StickerEditor.vue positions the toolbar:
   ```vue
   <div class="absolute top-4 left-1/2 -translate-x-1/2 z-20">
   ```
   
   This is responsive and will center on mobile. ✅

6. **Test mobile photo layout**
   
   Polaroid frames should stack vertically on mobile. The existing PhotoUpload component should handle this, but verify in testing.

**Acceptance Criteria:**
- [ ] Desktop shows two-page spread side-by-side
- [ ] Mobile (< 768px width) shows single stacked page
- [ ] Mobile sticker tray appears as bottom sheet overlay
- [ ] Touch drag/resize/rotate work on mobile devices
- [ ] Toolbar remains visible and accessible on mobile
- [ ] Photos stack vertically on mobile with Polaroid frames
- [ ] All text remains readable on mobile
- [ ] No horizontal scrolling on mobile

**Verification:**
```bash
cd c:\Users\Juan Miguel\Cronevia\frontend
npm run dev
```
Then:
1. Open http://127.0.0.1:5173/journal/new in desktop browser
2. Verify two-page layout
3. Open browser DevTools and toggle device toolbar (F12 → Ctrl+Shift+M)
4. Select iPhone 12 Pro or similar mobile viewport
5. Verify single-page layout
6. Click "Decorate" — tray should slide up from bottom
7. Add a sticker and test touch interactions (use DevTools touch simulation)
8. Verify toolbar remains visible and centered
9. Add photos and verify Polaroid frames stack vertically
10. Scroll through content — no horizontal overflow should occur

---

## FINAL INTEGRATION VERIFICATION

**After all FEATs are complete**, run the following full-stack verification:

### Build and Test Commands

```bash
# Terminal 1: Build frontend
cd c:\Users\Juan Miguel\Cronevia\frontend
npm run build

# Terminal 2: Start dev server
cd c:\Users\Juan Miguel\Cronevia\frontend
npm run dev
```

### Browser Testing Checklist

1. **Visual Redesign (FEAT-001)**
   - [ ] Denim-blue graph-paper background visible
   - [ ] Handwritten title font renders correctly
   - [ ] Two-page desktop spread with center binding
   - [ ] Cream page background (#F5F1E8)
   - [ ] Polaroid photo frames with washi tape
   - [ ] Pastel decorative details visible
   - [ ] Mobile shows single stacked page

2. **Sticker Integration (FEAT-002)**
   - [ ] "Decorate" button visible in edit mode
   - [ ] StickerEditor renders without errors
   - [ ] Sticker changes trigger dirty state
   - [ ] Unsaved changes warning includes stickers
   - [ ] Stickers save with journal entry
   - [ ] Stickers load when editing existing entry

3. **Sticker Library (FEAT-003)**
   - [ ] Library tab shows 12 built-in stickers
   - [ ] "My Stickers" tab is accessible
   - [ ] Upload button works for valid files
   - [ ] Upload validation errors display correctly
   - [ ] Uploaded stickers appear in "My Stickers"
   - [ ] Delete confirmation works (two clicks)

4. **Sticker Interactions (FEAT-004)**
   - [ ] Click sticker to select (red outline)
   - [ ] Drag sticker to move
   - [ ] Resize handles work proportionally
   - [ ] Rotation handle works
   - [ ] Toolbar appears on selection
   - [ ] Duplicate creates copy with offset
   - [ ] Delete removes sticker
   - [ ] Layer order buttons work
   - [ ] Undo/redo work (toolbar and Ctrl+Z)
   - [ ] Keyboard shortcuts work (Delete, arrows, Escape)

5. **Persistence (FEAT-005)**
   - [ ] Save persists sticker placements
   - [ ] Reload restores placements accurately
   - [ ] Signed URLs load private stickers
   - [ ] No console errors for auth/permissions
   - [ ] Navigation warning prevents data loss

6. **Mobile Responsive (FEAT-006)**
   - [ ] Mobile shows single-page layout
   - [ ] Bottom sheet sticker tray works
   - [ ] Touch drag/resize/rotate work
   - [ ] No horizontal scrolling
   - [ ] All controls accessible on mobile

### Console Error Check

Open browser DevTools (F12) → Console tab. After interacting with the journal editor and stickers, verify:
- [ ] No red errors related to imports
- [ ] No "cannot read property" errors
- [ ] No 404s for sticker assets
- [ ] No authentication errors
- [ ] No CORS errors

### Performance Check

- [ ] Page loads in under 3 seconds
- [ ] Sticker drag is smooth (60fps)
- [ ] No lag when adding/removing stickers
- [ ] Build completes without warnings

---

## KNOWN GAPS AND FUTURE WORK

1. **View-only mode for saved entries**: Currently, editing and viewing use the same component. Implement a `viewMode` prop to hide editing controls when viewing a saved entry.

2. **Cancel button with sticker reset**: Add an explicit Cancel button that calls `stickerEditorRef.value?.resetToSaved()` to restore the last saved sticker arrangement.

3. **Sticker search/filter**: With many uploaded stickers, add search/filter to the library.

4. **Keyboard accessibility**: Add full keyboard navigation for sticker selection and manipulation.

5. **Sticker preview before placement**: Show a ghost preview when hovering over the canvas after selecting a sticker from the tray.

6. **Multi-surface support**: The sticker system supports multiple surfaces (pages), but the current UI only uses one. Implement page navigation for multi-page entries.

7. **Sticker history persistence**: Currently, undo/redo history is lost on page reload. Consider persisting draft state to localStorage.

---

## DEPLOYMENT NOTES

**Migration Status:** The user confirmed that database tables `sticker_assets` and `journal_sticker_placements` already exist (migration deployed).

**No additional migrations are required** for this implementation.

**Deployment Steps:**

1. Merge the changes to the main branch
2. Run `npm run build` in the frontend directory
3. Deploy the built assets to the hosting environment
4. Verify environment variables are set (Supabase URL and anon key)
5. Test the deployed journal editor page
6. Monitor Sentry/logs for any runtime errors

**No backend changes are required** — this is a pure frontend feature using existing Supabase APIs.

---

## ROOT CAUSE SUMMARY

**Why the UI was unchanged:** All sticker components existed but were never imported or rendered in JournalEditorPage.vue. The visual redesign was planned but never applied to the actual template.

**What will change:** JournalEditorPage.vue will receive:
1. Denim-blue notebook background with graph paper pattern
2. Two-page cream notebook layout (desktop) and single-page (mobile)
3. Handwritten title font and readable serif content font
4. Polaroid photo frames with washi tape decorations
5. StickerEditor component import and rendering
6. Sticker dirty state tracking and save integration
7. Full sticker manipulation with Moveable library
8. Persistence to Supabase with load/save handlers

**Result:** A fully visible and functional scrapbook journal editor with working sticker library, placement, and persistence.

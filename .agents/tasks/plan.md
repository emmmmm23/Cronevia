# Implementation Plan: Cronevia Journal Scrapbook Redesign

## Overview
Redesign journal entry experience into a handmade scrapbook aesthetic with view and edit modes. Both modes share the same notebook composition. View mode presents saved entries cleanly; edit mode makes content editable within that composition.

## Context Summary
- **Stack**: Vue 3 + TypeScript + Vite, Supabase backend, Tailwind CSS
- **Entry point**: `frontend/src/pages/JournalEditorPage.vue` (loaded for both `/journal/new` and `/journal/:id`)
- **Current state**: Edit-only page, broken photo previews (prepends `/storage/` to signed URLs)
- **Fonts available**: Caveat (handwritten), Playfair Display (serif), Inter (UI) — already loaded in index.html
- **Color palette**: #7B0323 (burgundy), #f5ebdd (cream bg), #6b4423 (brown text), #d7c7b3 (borders)
- **Header height**: 64px (h-16 from AppLayout.vue)
- **Build**: `npm run build` from frontend/, dev server: `npm run dev` on port 5173
- **Key fact**: Photo `file_path` is already a full Supabase signed URL; do not prefix it

## Component Breakdown

### Reusable Components to Create
1. **NotebookPage.vue** — Single page with graph paper background, rounded corners, subtle shadow
2. **NotebookSpread.vue** — Two-page layout with center binding line
3. **ScrapbookPhoto.vue** — Polaroid-style frame with rotation and washi tape accent
4. **ScrapbookDecoration.vue** — Small SVG decorative motifs (stars, hearts, flowers, lines)

### Components to Modify
- **JournalEditorPage.vue** — Add view/edit mode logic, integrate notebook components
- **PhotoUpload.vue** — Fix broken photo URLs, optionally restyle for scrapbook integration

## CSS Strategy

### Notebook Paper
- Background: light blue-tinted cream (#f0f6f9)
- Graph grid: CSS `repeating-linear-gradient`, 5mm spacing, light lines (#d0dfe8)
- Rounded corners on outer edges only (left page: top-left, bottom-left; right page: top-right, bottom-right)
- Subtle box-shadow for depth

### Center Binding
- Desktop: 1-2px vertical line between pages with inner shadow
- Mobile: simplified or removed (stacked pages)

### Polaroid Frames (ScrapbookPhoto)
- White border: thicker on bottom (~20-30px) like real Polaroid
- Subtle rotation: random -3° to +3°
- Drop shadow for dimension
- Washi tape accent: CSS ::before pseudo-element with pastel stripe pattern

### Handwritten Text Styling
- Title: Caveat font, ~2.5rem, warm brown color
- Story (edit): Caveat or similar readable handwritten font, ~1.1rem, line-height 1.8
- Inputs: transparent or very light bg, minimal borders to look like writing on paper

### Decorative Elements
- Inline SVG for stars, hearts, flowers, hand-drawn flourishes (4-5 motifs)
- Positioned absolutely, aria-hidden, pointer-events-none
- Pastel colors: pink (#f8d7da), lilac (#e8d8f5), butter yellow (#fff8dc), mint (#d4edda)

## Mode Switching Logic

### State Management
- Add reactive `mode` ref: `'view' | 'edit'`
- Initialize in `onMounted`:
  - If `entryId` exists (route is `/journal/:id`): start in `'view'` mode
  - If no `entryId` (route is `/journal/new`): start in `'edit'` mode

### View Mode (Read-Only)
- Displays saved entry in notebook composition
- Left page: title (large Caveat), date, mood emoji+label, location, story (preserve line breaks)
- Right page: photos in Polaroid frames, tags as decorative labels
- Actions: "Back to Journal" (RouterLink to `/journal`) and "Edit Entry" button (sets `mode = 'edit'`)
- Handle loading, not-found, and error states with designed fallbacks

### Edit Mode (Interactive)
- Uses same notebook composition with inputs styled like writing on paper
- Left page: title input (Caveat font, transparent bg, bottom-border only), date picker, mood selector, location picker, story textarea (handwritten font, minimal styling)
- Right page: PhotoUpload component (integrated with scrapbook styling), tags input
- Actions: "Save Changes" (prominent) and "Cancel" (secondary)
- Cancel behavior:
  - If `entryId` exists: revert to view mode, restore saved state
  - If new entry: confirm if dirty, navigate to `/journal`
- After successful save of existing entry: switch to view mode

## Photo URL Fix

### Current Bug
Line 109 in `PhotoUpload.vue`: `:src="\`/storage/${photo.file_path}\`"` prepends `/storage/` to a full HTTPS signed URL, breaking images.

### Fix
Change to: `:src="photo.file_path"`

The `file_path` already contains the full signed URL from `supabase.storage.from('cronevia-media').createSignedUrl(...)` in `supabase-api.ts`.

## View/Edit Transition Details

1. **View to Edit**: Click "Edit Entry" button → `mode.value = 'edit'` → form inputs populate with saved values → layout remains notebook composition
2. **Edit to View (save)**: Save succeeds → if `entryId` exists, `mode.value = 'view'` → display saved entry → if new entry, redirect to `/journal`
3. **Edit to View (cancel)**: Click "Cancel" → if `entryId` exists, `mode.value = 'view'` and restore saved data → if new entry, confirm then navigate to `/journal`

## Responsive Breakpoints

- **Mobile (<768px)**:
  - Stack notebook pages vertically
  - Simplify or remove center binding
  - Reduce decoration density
  - Ensure touch targets ≥44×44px
  - Font size ≥16px for story to avoid iOS zoom
  - No horizontal scroll at 375px

- **Tablet (768px-1024px)**:
  - Adjust spacing and font sizes
  - May use side-by-side or stacked depending on readability

- **Desktop (1024px+)**:
  - Full two-page spread
  - Max width ~1100-1280px
  - Prominent center binding

## Accessibility Requirements

### Labels and ARIA
- Every input must have an associated `<label for="...">`
- Icon buttons need `aria-label`
- Decorative elements: `aria-hidden="true"`
- Mood picker: `aria-haspopup="dialog"`, `aria-expanded`
- Loading states: `aria-busy="true"`
- Error messages: `role="alert"`

### Focus Management
- Visible focus indicators on all interactive elements (thicker underline, ring, or shadow)
- Logical tab order
- Ensure inputs styled like handwriting are still native form controls (input/textarea, not contenteditable divs)

### Keyboard Navigation
- All buttons and links keyboard-accessible
- Enter/Space to activate
- Escape to close popovers

### Motion
- Respect `prefers-reduced-motion` for all animations/transitions

### Color Contrast
- Verify text on notebook paper meets WCAG AA (4.5:1 for body text)
- Use warm off-white or darker text if needed for contrast

### Heading Structure
- h1 for entry title in view mode
- Logical heading hierarchy

## Order of Implementation

1. **Fix photo URLs** (FEAT-001)
   - Modify `PhotoUpload.vue` line 109
   - Verify: photos display correctly
   - Files: `frontend/src/components/ui/PhotoUpload.vue`

2. **Create scrapbook components** (FEAT-002)
   - Implement `NotebookPage.vue`, `NotebookSpread.vue`, `ScrapbookPhoto.vue`, `ScrapbookDecoration.vue`
   - CSS for graph paper, Polaroid frames, decorations
   - Verify: visual appearance in temp test page
   - Files: `frontend/src/components/journal/NotebookPage.vue`, `NotebookSpread.vue`, `ScrapbookPhoto.vue`, `ScrapbookDecoration.vue`

3. **Implement view mode** (FEAT-003)
   - Add `mode` state to `JournalEditorPage.vue`
   - Create view mode template using notebook components
   - Handle loading/error states
   - Add "Back to Journal" and "Edit Entry" actions
   - Verify: `/journal/:id` displays saved entry in notebook layout
   - Files: `frontend/src/pages/JournalEditorPage.vue`

4. **Transform edit mode** (FEAT-004)
   - Wrap existing form in `v-if="mode === 'edit'"`
   - Restyle inputs to integrate with notebook composition
   - Implement Cancel behavior (view mode or navigate)
   - Preserve validation and error handling
   - Verify: edit mode uses notebook layout, save/cancel work
   - Files: `frontend/src/pages/JournalEditorPage.vue`, optionally `PhotoUpload.vue`

5. **Add responsive behavior** (FEAT-005)
   - Implement mobile stacking, adjust spacing
   - Ensure touch targets ≥44px, readable text
   - Reduce decoration on mobile
   - Add `prefers-reduced-motion` support
   - Verify: test at 375px, 768px, 1024px, 1280px+ widths
   - Files: all notebook components, `JournalEditorPage.vue`

## Verification After Each Step

1. Run `npm run build` from `frontend/` — TypeScript must compile without errors
2. Start dev server: `npm run dev` from `frontend/`
3. Manual testing:
   - Create new entry via `/journal/new`
   - Verify edit mode layout and functionality
   - Save entry
   - Navigate to `/journal/:id`
   - Verify view mode displays correctly
   - Click "Edit Entry", verify mode switch
   - Test Cancel behavior
   - Test responsive at different widths
   - Test keyboard navigation and focus indicators
4. Close dev server

## Scope Boundaries

### In Scope
- View/edit mode split
- Notebook composition with graph paper, binding, rounded corners
- Polaroid photo frames with rotation
- Handwritten-style typography for title and story
- Decorative SVG motifs (stars, hearts, flowers)
- Responsive layout (desktop spread, mobile stack)
- Accessibility (labels, focus, keyboard, ARIA)
- Photo URL fix

### Out of Scope
- Freeform sticker placement or draggable photos
- Drawing tools or rich-text formatting
- New database columns for decoration data
- Sample content or hardcoded entries
- Month tabs or pagination within entry view
- Backend changes (Supabase schema remains unchanged)

## Preservation Requirements

### Must Preserve
- Entry creation, retrieval, update via Supabase API
- Authentication and ownership checks (row-level security)
- Private photo uploads and signed URL generation
- Mood and location selection (existing logic)
- Tags (existing logic)
- Validation (title, content, date required; photo upload limits)
- Unsaved-change route guard
- Error handling for network failures, 422 validation, 401/403 auth

### Do Not Change
- Router configuration (keep `/journal/new` and `/journal/:id` routes)
- Supabase integration or credentials
- Store methods (`createEntry`, `updateEntry`, `fetchEntries`)
- Existing type definitions (`JournalEntry`, `Media`)

---

This plan is grounded in the actual codebase. All file paths, type names, and API patterns are verified. The implementation follows existing conventions (Vue 3 Composition API, Tailwind utilities, Pinia stores). Each step is independently verifiable with concrete commands and expected outcomes.

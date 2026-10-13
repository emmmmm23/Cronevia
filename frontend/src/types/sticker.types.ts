/**
 * Sticker system type definitions
 * Matches database schema from supabase/migrations/20261012000001_add_sticker_system.sql
 */

/**
 * A reusable sticker asset (built-in or user-uploaded)
 */
export interface StickerAsset {
  id: string
  user_id: string | null // null for built-in stickers
  storage_path: string
  mime_type: string
  width: number
  height: number
  category: string
  created_at: string
}

/**
 * An instance of a sticker placed on a journal entry
 */
export interface StickerPlacement {
  id: string
  journal_entry_id: string
  sticker_asset_id: string
  x: number // Normalized 0-1
  y: number // Normalized 0-1
  width: number // Normalized 0-1
  rotation: number // Degrees -360 to 360
  z_index: number
  created_at: string
}

/**
 * A single sticker instance on a page surface (client-side working format)
 */
export interface StickerInstance {
  id: string // Placement ID (or temp ID during editing)
  assetId: string // Reference to StickerAsset
  x: number // Normalized 0-1
  y: number // Normalized 0-1
  width: number // Normalized 0-1
  rotation: number // Degrees
  zIndex: number
}

/**
 * A page or surface that can contain stickers
 */
export interface StickerSurface {
  id: string // e.g., "page-1", "page-2"
  stickers: StickerInstance[]
}

/**
 * Complete sticker layout for a journal entry (persisted in journal_entries.sticker_layout JSONB)
 */
export interface StickerLayout {
  version: number // Schema version for future migrations
  surfaces: StickerSurface[]
}

/**
 * Sticker category for organizing the library
 */
export type StickerCategory = 
  | 'hearts'
  | 'stars'
  | 'flowers'
  | 'tape'
  | 'leaves'
  | 'travel'
  | 'doodles'
  | 'custom'
  | 'other'

/**
 * Sticker with loaded asset data and signed URL
 */
export interface StickerWithAsset extends StickerInstance {
  asset: StickerAsset
  url: string // Signed URL for display
}

/**
 * Upload validation result
 */
export interface StickerUploadValidation {
  valid: boolean
  error?: string
  width?: number
  height?: number
  hasTransparency?: boolean
}

/**
 * Transform state for sticker editing
 */
export interface StickerTransform {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  scaleX: number
  scaleY: number
}

/**
 * History entry for undo/redo
 */
export interface StickerHistoryEntry {
  action: 'add' | 'remove' | 'move' | 'resize' | 'rotate' | 'reorder' | 'duplicate'
  timestamp: number
  before: StickerLayout
  after: StickerLayout
}

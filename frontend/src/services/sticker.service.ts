/**
 * Sticker Service
 * Handles all Supabase operations for sticker assets and placements
 */
import { supabase } from '@/lib/supabase'
import type { StickerAsset, StickerPlacement, StickerLayout, StickerUploadValidation } from '@/types/sticker.types'

/**
 * Error handling pattern from supabase-api.ts
 */
function failure(message: string, status = 400): never {
  throw Object.assign(new Error(message), { response: { status, data: { message } } })
}

function check<T>(result: { data: T; error: { message: string } | null; status?: number }): NonNullable<T> {
  if (result.error) failure(result.error.message, result.status || 400)
  return result.data as NonNullable<T>
}

export async function requireUser() {
  const result = await supabase.auth.getUser()
  if (result.error || !result.data.user) failure('Please sign in to continue.', 401)
  return result.data.user
}

/**
 * Fetch built-in sticker assets from public directory
 * Returns assets with local URLs (no Supabase required)
 */
export async function fetchBuiltinAssets(): Promise<Array<StickerAsset & { url: string }>> {
  // Built-in stickers are in public/stickers-builtin/ and available immediately
  const builtinStickers = [
    { path: 'heart-01.svg', category: 'hearts', name: 'Heart 1' },
    { path: 'heart-02.svg', category: 'hearts', name: 'Heart 2' },
    { path: 'star-01.svg', category: 'stars', name: 'Star 1' },
    { path: 'star-02.svg', category: 'stars', name: 'Star 2' },
    { path: 'flower-01.svg', category: 'flowers', name: 'Flower 1' },
    { path: 'flower-02.svg', category: 'flowers', name: 'Flower 2' },
    { path: 'tape-01.svg', category: 'tape', name: 'Washi Tape 1' },
    { path: 'tape-02.svg', category: 'tape', name: 'Washi Tape 2' },
    { path: 'leaf-01.svg', category: 'leaves', name: 'Leaf 1' },
    { path: 'stamp-travel-01.svg', category: 'travel', name: 'Travel Stamp' },
    { path: 'doodle-abstract-01.svg', category: 'doodles', name: 'Doodle 1' },
    { path: 'doodle-abstract-02.svg', category: 'doodles', name: 'Doodle 2' },
  ]

  return builtinStickers.map((sticker) => ({
    id: `builtin-${sticker.path}`,
    user_id: null,
    storage_path: sticker.path,
    mime_type: 'image/svg+xml',
    width: 100,
    height: 100,
    category: sticker.category,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    url: `/stickers-builtin/${sticker.path}`
  }))
}

/**
 * Fetch user's uploaded sticker assets
 * Returns assets with signed URLs from stickers-custom bucket
 */
export async function fetchUserAssets(userId: string): Promise<Array<StickerAsset & { url: string }>> {
  const rows = check(
    await supabase
      .from('sticker_assets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  ) || []

  // Generate signed URLs for each custom asset
  return Promise.all(
    rows.map(async (row) => {
      const signed = check(
        await supabase.storage
          .from('stickers-custom')
          .createSignedUrl(row.storage_path, 3600)
      )
      return {
        ...row,
        url: signed.signedUrl
      }
    })
  )
}

/** Only assets referenced by an accessible entry are returned by sharing RLS. */
export async function fetchJournalAssets(ids:string[]):Promise<Array<StickerAsset & {url:string}>>{
 const valid=[...new Set(ids)].filter(id=>/^[0-9a-f-]{36}$/i.test(id)).slice(0,200)
 if(!valid.length)return []
 const rows=check(await supabase.from('sticker_assets').select('*').in('id',valid))||[]
 return Promise.all(rows.map(async row=>({...row,url:check(await supabase.storage.from('stickers-custom').createSignedUrl(row.storage_path,60)).signedUrl})))
}

/**
 * Validate uploaded sticker file
 * Checks: MIME type, file size, dimensions, transparency
 */
export async function validateStickerFile(file: File): Promise<StickerUploadValidation> {
  // Check MIME type
  if (!['image/png', 'image/webp'].includes(file.type)) {
    return { valid: false, error: 'Only PNG and WebP formats are supported.' }
  }

  // Check file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'File size must be under 5 MB.' }
  }

  // Load and decode image
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      // Check dimensions
      if (img.width > 2000 || img.height > 2000) {
        resolve({ valid: false, error: 'Image dimensions must not exceed 2000x2000 pixels.' })
        return
      }

      // Check for transparency using canvas
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          resolve({ valid: false, error: 'Could not validate image transparency.' })
          return
        }

        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, img.width, img.height)
        const pixels = imageData.data

        // Check alpha channel - if any pixel has alpha < 255, it has transparency
        let hasTransparency = false
        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] < 255) {
            hasTransparency = true
            break
          }
        }

        if (!hasTransparency) {
          resolve({ valid: false, error: 'Sticker must have transparency. Please use a PNG or WebP with transparent background.' })
          return
        }

        resolve({
          valid: true,
          width: img.width,
          height: img.height,
          hasTransparency: true
        })
      } catch (err) {
        console.error('Error checking transparency:', err)
        resolve({ valid: false, error: 'Could not validate image.' })
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve({ valid: false, error: 'Could not decode image file.' })
    }

    img.src = objectUrl
  })
}

/**
 * Upload a new sticker asset
 * Validates file, uploads to stickers-custom bucket, creates database row
 */
export async function uploadStickerAsset(file: File, uploadId: string = crypto.randomUUID()): Promise<StickerAsset & { url: string }> {
  const user = await requireUser()

  // Validate file
  const validation = await validateStickerFile(file)
  if (!validation.valid) {
    failure(validation.error || 'Invalid sticker file.', 422)
  }

  // Generate unique storage path
  const ext = file.type === 'image/png' ? 'png' : 'webp'
  const path = `${user.id}/${uploadId}.${ext}`

  // Upload to storage
  check(
    await supabase.storage
      .from('stickers-custom')
      .upload(path, file, { contentType: file.type, upsert: true })
  )

  // Create database row
  const result = await supabase
    .from('sticker_assets')
    .upsert({
      id: uploadId,
      user_id: user.id,
      storage_path: path,
      mime_type: file.type,
      width: validation.width!,
      height: validation.height!,
      category: 'custom'
    })
    .select()
    .single()

  // A failed response may follow a committed upsert. Keep the private object for safe retry.
  check(result)

  const asset = result.data!

  // Generate signed URL
  const signed = check(
    await supabase.storage
      .from('stickers-custom')
      .createSignedUrl(path, 3600)
  )

  return {
    ...asset,
    url: signed.signedUrl
  }
}

/**
 * Delete a user's sticker asset
 * Checks for placements referencing it before deletion
 */
export async function deleteAsset(assetId: string): Promise<void> {
  const user = await requireUser()

  // Verify ownership
  const asset = check(
    await supabase
      .from('sticker_assets')
      .select('*')
      .eq('id', assetId)
      .eq('user_id', user.id)
      .single()
  )

  // Check for placements referencing this asset
  const placements = check(
    await supabase
      .from('journal_sticker_placements')
      .select('id')
      .eq('sticker_asset_id', assetId)
      .limit(1)
  )

  if (placements && placements.length > 0) {
    failure('Cannot delete sticker that is used in journal entries. Remove it from all entries first.', 409)
  }

  // Database triggers reject deletion while any saved scrapbook still references this asset.
  // Perform that check before touching the underlying private object.
  check(
    await supabase.from('sticker_assets').delete().eq('id', assetId).eq('user_id', user.id)
  )
  check(await supabase.storage.from('stickers-custom').remove([asset.storage_path]))

}

/**
 * Fetch sticker placements for a journal entry
 * Returns placements with asset information joined
 */
export async function fetchPlacements(entryId: string): Promise<StickerPlacement[]> {
  await requireUser()

  // Verify entry access through RLS; members can read eligible legacy decorations.
  check(
    await supabase
      .from('journal_entries')
      .select('id')
      .eq('id', entryId)
      .single()
  )

  const placements = check(
    await supabase
      .from('journal_sticker_placements')
      .select(`
        *,
        sticker_asset:sticker_assets (
          id,
          user_id,
          storage_path,
          mime_type,
          width,
          height,
          category
        )
      `)
      .eq('journal_entry_id', entryId)
      .order('z_index', { ascending: true })
  ) || []

  // For built-in stickers, convert asset ID to our client-side format
  return placements.map((p: any) => {
    const placement = { ...p, asset_aspect_ratio: p.sticker_asset?.width / p.sticker_asset?.height || 1 }
    
    // If the asset is built-in (user_id is null), use our client-side ID format
    if (p.sticker_asset && p.sticker_asset.user_id === null) {
      placement.sticker_asset_id = `builtin-${p.sticker_asset.storage_path}`
    }
    
    // Remove the joined asset data from the placement object
    delete placement.sticker_asset
    
    return placement as StickerPlacement
  })
}

/**
 * Save sticker placements for a journal entry
 * Replaces all existing placements atomically
 * 
 * For built-in stickers (IDs starting with "builtin-"), we store the path directly
 * For custom stickers, we reference the database ID
 */
export async function savePlacements(entryId: string, placements: StickerPlacement[]): Promise<void> {
  await requireUser()
  check(await supabase.rpc('replace_journal_stickers', {
    target_entry_id: entryId,
    placements: placements.map(p => ({
      id:p.id, sticker_asset_id:p.sticker_asset_id, x:p.x, y:p.y,
      width:p.width, rotation:p.rotation, z_index:p.z_index
    }))
  }))
}

/**
 * Validate sticker layout data structure
 * Returns true if layout is valid, throws descriptive error if not
 */
export function validateLayout(layout: unknown): layout is StickerLayout {
  if (!layout || typeof layout !== 'object') {
    failure('Invalid layout: must be an object.', 422)
  }

  const l = layout as Record<string, unknown>

  // Check version
  if (typeof l.version !== 'number' || l.version < 1) {
    failure('Invalid layout: version must be a positive number.', 422)
  }

  // Check surfaces
  if (!Array.isArray(l.surfaces)) {
    failure('Invalid layout: surfaces must be an array.', 422)
  }

  // Limit total sticker count
  let totalStickers = 0

  for (const surface of l.surfaces) {
    if (!surface || typeof surface !== 'object') {
      failure('Invalid layout: each surface must be an object.', 422)
    }

    const s = surface as Record<string, unknown>

    if (typeof s.id !== 'string' || !s.id) {
      failure('Invalid layout: each surface must have a non-empty id string.', 422)
    }

    if (!Array.isArray(s.stickers)) {
      failure('Invalid layout: each surface must have a stickers array.', 422)
    }

    totalStickers += s.stickers.length

    for (const sticker of s.stickers) {
      if (!sticker || typeof sticker !== 'object') {
        failure('Invalid layout: each sticker must be an object.', 422)
      }

      const st = sticker as Record<string, unknown>

      // Check required fields
      if (typeof st.id !== 'string' || !st.id) {
        failure('Invalid layout: each sticker must have a non-empty id string.', 422)
      }

      if (typeof st.assetId !== 'string' || !st.assetId) {
        failure('Invalid layout: each sticker must have a non-empty assetId string.', 422)
      }

      // Check numeric fields are finite
      const numericFields = ['x', 'y', 'width', 'rotation', 'zIndex'] as const
      for (const field of numericFields) {
        if (typeof st[field] !== 'number' || !Number.isFinite(st[field])) {
          failure(`Invalid layout: sticker ${field} must be a finite number.`, 422)
        }
      }

      // Check normalized coordinates are in valid range (we know they're numbers after the check above)
      const x = st.x as number
      const y = st.y as number
      const width = st.width as number
      const rotation = st.rotation as number
      
      if (x < 0 || x > 1 || y < 0 || y > 1 || width < 0 || width > 1) {
        failure('Invalid layout: sticker coordinates and width must be normalized (0-1).', 422)
      }

      // Check rotation is reasonable
      if (Math.abs(rotation) > 360) {
        failure('Invalid layout: sticker rotation must be between -360 and 360 degrees.', 422)
      }
    }
  }

  // Limit total stickers per entry
  if (totalStickers > 100) {
    failure('Invalid layout: maximum 100 stickers per entry.', 422)
  }

  return true
}

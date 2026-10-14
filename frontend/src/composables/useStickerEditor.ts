/**
 * Sticker Editor Composable
 * Manages sticker editing state, transformations, and undo/redo history
 */
import { ref, computed } from 'vue'
import type {
  StickerInstance,
  StickerLayout,
  StickerPlacement
} from '@/types/sticker.types'
import { fetchPlacements, savePlacements } from '@/services/sticker.service'

const MAX_HISTORY = 50

export function useStickerEditor() {
  // Reactive state
  const placements = ref<StickerInstance[]>([])
  const selectedId = ref<string | null>(null)
  const canvasWidth = ref(800) // Default, should be set by component
  const canvasHeight = ref(1000) // Default, should be set by component
  const saving = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const baseline = ref('[]')
  const loadFailed = ref(false)

  // History state (snapshot-based undo/redo)
  const history = ref<StickerLayout[]>([{version:1,surfaces:[{id:'page-1',stickers:[]}]}])
  const historyIndex = ref(0)

  // Computed
  const selectedSticker = computed(() => 
    placements.value.find(s => s.id === selectedId.value) || null
  )
  
  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)
  const hasChanges = computed(() => JSON.stringify(placements.value) !== baseline.value)

  /**
   * Create a snapshot of current state
   */
  function createSnapshot(): StickerLayout {
    return {
      version: 1,
      surfaces: [{
        id: 'page-1', // Single page for now, can be extended
        stickers: placements.value.map(p => ({ ...p }))
      }]
    }
  }

  /**
   * Save current state to history
   */
  function saveSnapshot() {
    const snapshot = createSnapshot()
    
    // Remove any future history if we're not at the end
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }
    
    // Add new snapshot
    history.value.push(snapshot)
    
    // Limit history size
    if (history.value.length > MAX_HISTORY) {
      history.value.shift()
    } else {
      historyIndex.value++
    }
  }

  /**
   * Restore state from a snapshot
   */
  function restoreSnapshot(snapshot: StickerLayout) {
    // Find the first surface (for now we only support one)
    const surface = snapshot.surfaces[0]
    if (surface) {
      placements.value = surface.stickers.map(s => ({ ...s }))
    } else {
      placements.value = []
    }
    selectedId.value = null
  }

  /**
   * Undo last action
   */
  function undo() {
    if (!canUndo.value) return
    
    historyIndex.value--
    const snapshot = history.value[historyIndex.value]
    restoreSnapshot(snapshot)
  }

  /**
   * Redo last undone action
   */
  function redo() {
    if (!canRedo.value) return
    
    historyIndex.value++
    const snapshot = history.value[historyIndex.value]
    restoreSnapshot(snapshot)
  }

  /**
   * Normalize pixel coordinates to 0-1 range
   */
  function normalizeCoords(x: number, y: number, width: number) {
    return {
      x: x / canvasWidth.value,
      y: y / canvasHeight.value,
      width: width / canvasWidth.value
    }
  }

  /**
   * Denormalize 0-1 coordinates to pixels
   */
  function denormalizeCoords(x: number, y: number, width: number) {
    return {
      x: x * canvasWidth.value,
      y: y * canvasHeight.value,
      width: width * canvasWidth.value
    }
  }

  /**
   * Add a new sticker to the canvas
   */
  function addSticker(assetId: string, initialX = 0.5, initialY = 0.5, initialWidth = 0.2) {
    const maxZIndex = placements.value.reduce((max, s) => Math.max(max, s.zIndex), 0)
    
    const newSticker: StickerInstance = {
      id: crypto.randomUUID(),
      assetId,
      x: initialX,
      y: initialY,
      width: initialWidth,
      rotation: 0,
      zIndex: maxZIndex + 1
    }
    
    placements.value.push(newSticker)
    selectedId.value = newSticker.id
    saveSnapshot()
  }

  /**
   * Update a sticker's properties
   */
  function updatePlacement(id: string, updates: Partial<StickerInstance>) {
    const index = placements.value.findIndex(s => s.id === id)
    if (index === -1) return
    
    placements.value[index] = {
      ...placements.value[index],
      ...updates
    }
  }

  /**
   * Finalize a transformation (called after drag/resize/rotate ends)
   * This creates a single history entry for the entire gesture
   */
  function finalizeTransform() {
    saveSnapshot()
  }

  /**
   * Delete a sticker
   */
  function deleteSticker(id: string) {
    placements.value = placements.value.filter(s => s.id !== id)
    if (selectedId.value === id) {
      selectedId.value = null
    }
    saveSnapshot()
  }

  /**
   * Duplicate a sticker
   */
  function duplicateSticker(id: string) {
    const original = placements.value.find(s => s.id === id)
    if (!original) return
    
    const maxZIndex = placements.value.reduce((max, s) => Math.max(max, s.zIndex), 0)
    
    const duplicate: StickerInstance = {
      ...original,
      id: crypto.randomUUID(),
      x: Math.min(1, original.x + 0.05), // Small offset
      y: Math.min(1, original.y + 0.05),
      zIndex: maxZIndex + 1
    }
    
    placements.value.push(duplicate)
    selectedId.value = duplicate.id
    saveSnapshot()
  }

  /**
   * Bring sticker forward one layer
   */
  function bringForward(id: string) {
    const index = placements.value.findIndex(s => s.id === id)
    if (index === -1) return
    
    const currentZ = placements.value[index].zIndex
    const nextHigherZ = Math.min(
      ...placements.value
        .map(s => s.zIndex)
        .filter(z => z > currentZ)
    )
    
    if (nextHigherZ !== Infinity) {
      // Swap z-indices
      const otherIndex = placements.value.findIndex(s => s.zIndex === nextHigherZ)
      if (otherIndex !== -1) {
        placements.value[otherIndex].zIndex = currentZ
        placements.value[index].zIndex = nextHigherZ
        saveSnapshot()
      }
    }
  }

  /**
   * Send sticker backward one layer
   */
  function sendBackward(id: string) {
    const index = placements.value.findIndex(s => s.id === id)
    if (index === -1) return
    
    const currentZ = placements.value[index].zIndex
    const nextLowerZ = Math.max(
      ...placements.value
        .map(s => s.zIndex)
        .filter(z => z < currentZ)
    )
    
    if (nextLowerZ !== -Infinity) {
      // Swap z-indices
      const otherIndex = placements.value.findIndex(s => s.zIndex === nextLowerZ)
      if (otherIndex !== -1) {
        placements.value[otherIndex].zIndex = currentZ
        placements.value[index].zIndex = nextLowerZ
        saveSnapshot()
      }
    }
  }

  /**
   * Bring sticker to front
   */
  function bringToFront(id: string) {
    const index = placements.value.findIndex(s => s.id === id)
    if (index === -1) return
    
    const maxZ = placements.value.reduce((max, s) => Math.max(max, s.zIndex), 0)
    placements.value[index].zIndex = maxZ + 1
    saveSnapshot()
  }

  /**
   * Send sticker to back
   */
  function sendToBack(id: string) {
    const index = placements.value.findIndex(s => s.id === id)
    if (index === -1) return
    
    const minZ = placements.value.reduce((min, s) => Math.min(min, s.zIndex), Infinity)
    placements.value[index].zIndex = minZ - 1
    saveSnapshot()
  }

  /**
   * Select a sticker
   */
  function selectSticker(id: string | null) {
    selectedId.value = id
  }

  /**
   * Load placements from database
   */
  async function loadPlacements(journalEntryId: string) {
    if (!journalEntryId) return
    
    loading.value = true
    error.value = null
    
    try {
      const dbPlacements = await fetchPlacements(journalEntryId)
      
      // Convert database placements to editor format
      placements.value = dbPlacements.map(p => ({
        id: p.id,
        assetId: p.sticker_asset_id,
        x: p.x,
        y: p.y,
        width: p.width,
        rotation: p.rotation,
        zIndex: p.z_index
      }))
      
      // Initialize history with loaded state
      history.value = [createSnapshot()]
      historyIndex.value = 0
      baseline.value = JSON.stringify(placements.value)
      loadFailed.value = false
    } catch (err: unknown) {
      loadFailed.value = true
      error.value = 'Saved stickers could not be loaded. Please retry before saving.'
      console.error('[useStickerEditor] loadPlacements error:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Save placements to database
   */
  async function savePlacementsToDb(journalEntryId: string) {
    if (!journalEntryId) return
    
    if (loadFailed.value) throw new Error('Reload saved stickers before saving.')
    saving.value = true
    error.value = null
    
    try {
      // Convert editor format to database format
      const dbPlacements: StickerPlacement[] = placements.value.map(p => ({
        id: p.id,
        journal_entry_id: journalEntryId,
        sticker_asset_id: p.assetId,
        x: p.x,
        y: p.y,
        width: p.width,
        rotation: p.rotation,
        z_index: p.zIndex,
        created_at: new Date().toISOString()
      }))
      
      await savePlacements(journalEntryId, dbPlacements)
      
      // Update history baseline after save
      history.value = [createSnapshot()]
      historyIndex.value = 0
      baseline.value = JSON.stringify(placements.value)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      error.value = e?.response?.data?.message || 'Could not save sticker placements.'
      console.error('[useStickerEditor] savePlacementsToDb error:', err)
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Clear all placements
   */
  function clearPlacements() {
    placements.value = []
    selectedId.value = null
    history.value = [createSnapshot()]
    historyIndex.value = 0
    baseline.value = '[]'
    loadFailed.value = false
  }

  /**
   * Set canvas dimensions
   */
  function setCanvasDimensions(width: number, height: number) {
    canvasWidth.value = width
    canvasHeight.value = height
  }

  return {
    // State
    placements,
    selectedId,
    selectedSticker,
    canvasWidth,
    canvasHeight,
    saving,
    loading,
    error,
    
    // History
    canUndo,
    canRedo,
    hasChanges,
    
    // Actions
    addSticker,
    updatePlacement,
    finalizeTransform,
    deleteSticker,
    duplicateSticker,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    selectSticker,
    
    // History actions
    undo,
    redo,
    saveSnapshot,
    
    // Coordinate utilities
    normalizeCoords,
    denormalizeCoords,
    
    // Persistence
    loadPlacements,
    savePlacements: savePlacementsToDb,
    clearPlacements,
    
    // Configuration
    setCanvasDimensions
  }
}

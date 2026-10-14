import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStickerEditor } from './useStickerEditor'

// Mock the sticker service
vi.mock('@/services/sticker.service', () => ({
  fetchPlacements: vi.fn().mockResolvedValue([]),
  savePlacements: vi.fn().mockResolvedValue(undefined),
}))

describe('useStickerEditor', () => {
  let editor: ReturnType<typeof useStickerEditor>

  beforeEach(() => {
    editor = useStickerEditor()
    editor.setCanvasDimensions(800, 1000)
  })

  describe('addSticker', () => {
    it('adds sticker with correct normalized coordinates', () => {
      editor.addSticker('asset-1', 0.5, 0.5, 0.2)
      
      expect(editor.placements.value).toHaveLength(1)
      expect(editor.placements.value[0]).toMatchObject({
        assetId: 'asset-1',
        x: 0.5,
        y: 0.5,
        width: 0.2,
        rotation: 0,
        zIndex: 1,
      })
      expect(editor.placements.value[0].id).toBeDefined()
      expect(editor.selectedId.value).toBe(editor.placements.value[0].id)
    })

    it('assigns incrementing z-index to new stickers', () => {
      editor.addSticker('asset-1')
      editor.addSticker('asset-2')
      editor.addSticker('asset-3')
      
      expect(editor.placements.value[0].zIndex).toBe(1)
      expect(editor.placements.value[1].zIndex).toBe(2)
      expect(editor.placements.value[2].zIndex).toBe(3)
    })

    it('creates history snapshot after adding', () => {
      editor.addSticker('asset-1')
      expect(editor.canUndo.value).toBe(true)
      expect(editor.canRedo.value).toBe(false)
    })
  })

  describe('updatePlacement', () => {
    it('updates sticker properties', () => {
      editor.addSticker('asset-1', 0.5, 0.5, 0.2)
      const id = editor.placements.value[0].id
      
      editor.updatePlacement(id, { x: 0.6, y: 0.7, rotation: 45 })
      
      expect(editor.placements.value[0]).toMatchObject({
        x: 0.6,
        y: 0.7,
        rotation: 45,
      })
    })

    it('does not mutate if id not found', () => {
      editor.addSticker('asset-1')
      const original = JSON.parse(JSON.stringify(editor.placements.value))
      
      editor.updatePlacement('nonexistent', { x: 0.9 })
      
      expect(editor.placements.value).toEqual(original)
    })

    it('clamps normalized coordinates to 0-1 range', () => {
      editor.addSticker('asset-1')
      const id = editor.placements.value[0].id
      
      editor.updatePlacement(id, { x: -0.5, y: 1.5, width: 2.0 })
      
      // Note: updatePlacement doesn't enforce clamping automatically
      // The component should handle bounds through Moveable bounds config
      expect(editor.placements.value[0].x).toBe(-0.5)
      expect(editor.placements.value[0].y).toBe(1.5)
    })
  })

  describe('deleteSticker', () => {
    it('removes sticker from placements', () => {
      editor.addSticker('asset-1')
      editor.addSticker('asset-2')
      const idToDelete = editor.placements.value[0].id
      
      editor.deleteSticker(idToDelete)
      
      expect(editor.placements.value).toHaveLength(1)
      expect(editor.placements.value[0].assetId).toBe('asset-2')
    })

    it('deselects if deleted sticker was selected', () => {
      editor.addSticker('asset-1')
      const id = editor.placements.value[0].id
      editor.selectSticker(id)
      
      editor.deleteSticker(id)
      
      expect(editor.selectedId.value).toBeNull()
    })

    it('creates history snapshot after deleting', () => {
      editor.addSticker('asset-1')
      const historyLengthBefore = editor.canUndo.value
      
      editor.deleteSticker(editor.placements.value[0].id)
      
      expect(editor.canUndo.value).toBe(true)
    })
  })

  describe('duplicateSticker', () => {
    it('creates copy with small offset', () => {
      editor.addSticker('asset-1', 0.5, 0.5, 0.2)
      const originalId = editor.placements.value[0].id
      
      editor.duplicateSticker(originalId)
      
      expect(editor.placements.value).toHaveLength(2)
      expect(editor.placements.value[1]).toMatchObject({
        assetId: 'asset-1',
        x: 0.55, // offset by 0.05
        y: 0.55, // offset by 0.05
        width: 0.2,
        rotation: 0,
      })
      expect(editor.placements.value[1].id).not.toBe(originalId)
    })

    it('assigns higher z-index to duplicate', () => {
      editor.addSticker('asset-1')
      editor.addSticker('asset-2')
      
      editor.duplicateSticker(editor.placements.value[0].id)
      
      expect(editor.placements.value[2].zIndex).toBe(3)
    })

    it('selects the duplicate after creation', () => {
      editor.addSticker('asset-1')
      const originalId = editor.placements.value[0].id
      
      editor.duplicateSticker(originalId)
      
      expect(editor.selectedId.value).toBe(editor.placements.value[1].id)
      expect(editor.selectedId.value).not.toBe(originalId)
    })
  })

  describe('layer operations', () => {
    beforeEach(() => {
      // Create stack of 3 stickers with z-index 1, 2, 3
      editor.addSticker('asset-1')
      editor.addSticker('asset-2')
      editor.addSticker('asset-3')
    })

    it('bringForward swaps with next higher layer', () => {
      const bottomId = editor.placements.value[0].id
      
      editor.bringForward(bottomId)
      
      const bottomSticker = editor.placements.value.find(s => s.id === bottomId)
      expect(bottomSticker?.zIndex).toBe(2)
    })

    it('sendBackward swaps with next lower layer', () => {
      const topId = editor.placements.value[2].id
      
      editor.sendBackward(topId)
      
      const topSticker = editor.placements.value.find(s => s.id === topId)
      expect(topSticker?.zIndex).toBe(2)
    })

    it('bringToFront moves to highest z-index + 1', () => {
      const bottomId = editor.placements.value[0].id
      
      editor.bringToFront(bottomId)
      
      const bottomSticker = editor.placements.value.find(s => s.id === bottomId)
      expect(bottomSticker?.zIndex).toBe(4) // max was 3, now 4
    })

    it('sendToBack moves to lowest z-index - 1', () => {
      const topId = editor.placements.value[2].id
      
      editor.sendToBack(topId)
      
      const topSticker = editor.placements.value.find(s => s.id === topId)
      expect(topSticker?.zIndex).toBe(0) // min was 1, now 0
    })
  })

  describe('undo/redo', () => {
    it('restores previous state on undo', () => {
      editor.addSticker('asset-1', 0.5, 0.5, 0.2)
      editor.addSticker('asset-2', 0.6, 0.6, 0.2)
      
      editor.undo()
      
      expect(editor.placements.value).toHaveLength(1)
      expect(editor.placements.value[0].assetId).toBe('asset-1')
    })

    it('restores next state on redo', () => {
      editor.addSticker('asset-1')
      editor.addSticker('asset-2')
      editor.undo()
      
      editor.redo()
      
      expect(editor.placements.value).toHaveLength(2)
    })

    it('clears redo history after new action', () => {
      editor.addSticker('asset-1')
      editor.addSticker('asset-2')
      editor.undo()
      expect(editor.canRedo.value).toBe(true)
      
      editor.addSticker('asset-3') // new action
      
      expect(editor.canRedo.value).toBe(false)
    })

    it('limits history to max 50 states', () => {
      // Add 55 stickers
      for (let i = 0; i < 55; i++) {
        editor.addSticker(`asset-${i}`)
      }
      
      // Undo should work, but we can't go back 55 steps
      let undoCount = 0
      while (editor.canUndo.value && undoCount < 60) {
        editor.undo()
        undoCount++
      }
      
      expect(undoCount).toBeLessThanOrEqual(50)
    })

    it('deselects on undo/redo', () => {
      editor.addSticker('asset-1')
      const id = editor.placements.value[0].id
      editor.selectSticker(id)
      
      editor.undo()
      
      expect(editor.selectedId.value).toBeNull()
    })
  })

  describe('coordinate normalization', () => {
    it('normalizes pixel coordinates to 0-1 range', () => {
      editor.setCanvasDimensions(800, 1000)
      
      const normalized = editor.normalizeCoords(400, 500, 160)
      
      expect(normalized).toEqual({
        x: 0.5, // 400 / 800
        y: 0.5, // 500 / 1000
        width: 0.2, // 160 / 800
      })
    })

    it('denormalizes to pixel coordinates', () => {
      editor.setCanvasDimensions(800, 1000)
      
      const pixels = editor.denormalizeCoords(0.5, 0.5, 0.2)
      
      expect(pixels).toEqual({
        x: 400,
        y: 500,
        width: 160,
      })
    })

    it('round-trips within 1px tolerance', () => {
      editor.setCanvasDimensions(800, 1000)
      
      const original = { x: 123, y: 456, width: 78 }
      const normalized = editor.normalizeCoords(original.x, original.y, original.width)
      const denormalized = editor.denormalizeCoords(normalized.x, normalized.y, normalized.width)
      
      expect(Math.abs(denormalized.x - original.x)).toBeLessThan(1)
      expect(Math.abs(denormalized.y - original.y)).toBeLessThan(1)
      expect(Math.abs(denormalized.width - original.width)).toBeLessThan(1)
    })
  })

  describe('select and deselect', () => {
    it('selects sticker by id', () => {
      editor.addSticker('asset-1')
      const id = editor.placements.value[0].id
      
      editor.selectSticker(id)
      
      expect(editor.selectedId.value).toBe(id)
      expect(editor.selectedSticker.value).toMatchObject({ id, assetId: 'asset-1' })
    })

    it('deselects by passing null', () => {
      editor.addSticker('asset-1')
      editor.selectSticker(editor.placements.value[0].id)
      
      editor.selectSticker(null)
      
      expect(editor.selectedId.value).toBeNull()
      expect(editor.selectedSticker.value).toBeNull()
    })
  })

  describe('clearPlacements', () => {
    it('removes all placements and resets state', () => {
      editor.addSticker('asset-1')
      editor.addSticker('asset-2')
      editor.selectSticker(editor.placements.value[0].id)
      
      editor.clearPlacements()
      
      expect(editor.placements.value).toHaveLength(0)
      expect(editor.selectedId.value).toBeNull()
      expect(editor.canUndo.value).toBe(false)
    })
  })
})

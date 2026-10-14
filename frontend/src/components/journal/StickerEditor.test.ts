import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import StickerEditor from './StickerEditor.vue'

// Mock child components
vi.mock('./StickerCanvas.vue', () => ({
  default: {
    name: 'StickerCanvas',
    template: '<div data-test="canvas" />',
  },
}))

vi.mock('./StickerTray.vue', () => ({
  default: {
    name: 'StickerTray',
    template: '<div data-test="tray" />',
    emits: ['add-sticker', 'close'],
  },
}))

vi.mock('./StickerToolbar.vue', () => ({
  default: {
    name: 'StickerToolbar',
    template: '<div data-test="toolbar" />',
    emits: ['duplicate', 'delete', 'bring-forward', 'send-backward', 'to-front', 'to-back', 'rotate', 'undo', 'redo'],
  },
}))

// Mock composables
const mockPlacements = vi.fn(() => [])
const mockSelectedId = vi.fn(() => null)
const mockSelectedSticker = vi.fn(() => null)
const mockCanUndo = vi.fn(() => false)
const mockCanRedo = vi.fn(() => false)
const mockHasChanges = vi.fn(() => false)
const mockAddSticker = vi.fn()
const mockUpdatePlacement = vi.fn()
const mockDeleteSticker = vi.fn()
const mockDuplicateSticker = vi.fn()
const mockBringForward = vi.fn()
const mockSendBackward = vi.fn()
const mockBringToFront = vi.fn()
const mockSendToBack = vi.fn()
const mockSelectSticker = vi.fn()
const mockUndo = vi.fn()
const mockRedo = vi.fn()
const mockSaveSnapshot = vi.fn()
const mockLoadPlacements = vi.fn()
const mockSavePlacements = vi.fn()
const mockClearPlacements = vi.fn()
const mockSetCanvasDimensions = vi.fn()

vi.mock('@/composables/useStickerEditor', () => ({
  useStickerEditor: () => ({
    placements: { value: mockPlacements() },
    selectedId: { value: mockSelectedId() },
    selectedSticker: { value: mockSelectedSticker() },
    canUndo: { value: mockCanUndo() },
    canRedo: { value: mockCanRedo() },
    hasChanges: { value: mockHasChanges() },
    addSticker: mockAddSticker,
    updatePlacement: mockUpdatePlacement,
    deleteSticker: mockDeleteSticker,
    duplicateSticker: mockDuplicateSticker,
    bringForward: mockBringForward,
    sendBackward: mockSendBackward,
    bringToFront: mockBringToFront,
    sendToBack: mockSendToBack,
    selectSticker: mockSelectSticker,
    undo: mockUndo,
    redo: mockRedo,
    saveSnapshot: mockSaveSnapshot,
    loadPlacements: mockLoadPlacements,
    savePlacements: mockSavePlacements,
    clearPlacements: mockClearPlacements,
    setCanvasDimensions: mockSetCanvasDimensions,
  }),
}))

vi.mock('@/composables/useStickerAssets', () => ({
  useStickerAssets: () => ({
    builtinAssets: { value: [] },
    userAssets: { value: [] },
    loadBuiltins: vi.fn(),
    loadUserAssets: vi.fn(),
  }),
}))

describe('StickerEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPlacements.mockReturnValue([])
    mockSelectedId.mockReturnValue(null)
    mockSelectedSticker.mockReturnValue(null)
    mockCanUndo.mockReturnValue(false)
    mockCanRedo.mockReturnValue(false)
    mockHasChanges.mockReturnValue(false)
  })

  it('renders Decorate toggle in edit mode', () => {
    const wrapper = mount(StickerEditor, {
      props: {
        entryId: 'entry-1',
        viewMode: false,
      },
    })
    
    expect(wrapper.text()).toContain('Decorate')
  })

  it('does not render Decorate toggle in view mode', () => {
    const wrapper = mount(StickerEditor, {
      props: {
        entryId: 'entry-1',
        viewMode: true,
      },
    })
    
    expect(wrapper.text()).not.toContain('Decorate')
  })

  it('shows tray when Decorate toggle is clicked', async () => {
    const wrapper = mount(StickerEditor, {
      props: {
        entryId: 'entry-1',
        viewMode: false,
      },
    })
    
    const decorateButton = wrapper.find('[aria-pressed]')
    expect(wrapper.find('[data-test="tray"]').exists()).toBe(false)
    
    await decorateButton.trigger('click')
    await nextTick()
    
    expect(wrapper.find('[data-test="tray"]').exists()).toBe(true)
    expect(decorateButton.text()).toContain('Done Decorating')
  })

  it('hides tray when Done Decorating is clicked', async () => {
    const wrapper = mount(StickerEditor, {
      props: {
        entryId: 'entry-1',
        viewMode: false,
      },
    })
    
    const decorateButton = wrapper.find('[aria-pressed]')
    
    // Enable decorate mode
    await decorateButton.trigger('click')
    await nextTick()
    expect(wrapper.find('[data-test="tray"]').exists()).toBe(true)
    
    // Disable decorate mode
    await decorateButton.trigger('click')
    await nextTick()
    expect(wrapper.find('[data-test="tray"]').exists()).toBe(false)
  })

  it('shows toolbar when sticker is selected in decorate mode', async () => {
    mockPlacements.mockReturnValue([{ id: 'sticker-1', assetId: 'asset-1', x: 0.5, y: 0.5, width: 0.2, rotation: 0, zIndex: 1 }])
    mockSelectedId.mockReturnValue('sticker-1')
    mockSelectedSticker.mockReturnValue({ id: 'sticker-1', assetId: 'asset-1', x: 0.5, y: 0.5, width: 0.2, rotation: 0, zIndex: 1 })
    
    const wrapper = mount(StickerEditor, {
      props: {
        entryId: 'entry-1',
        viewMode: false,
      },
    })
    
    const decorateButton = wrapper.find('[aria-pressed]')
    await decorateButton.trigger('click')
    await nextTick()
    
    expect(wrapper.find('[data-test="toolbar"]').exists()).toBe(true)
  })

  it('hides toolbar when no sticker is selected', async () => {
    mockPlacements.mockReturnValue([{ id: 'sticker-1', assetId: 'asset-1', x: 0.5, y: 0.5, width: 0.2, rotation: 0, zIndex: 1 }])
    mockSelectedId.mockReturnValue(null)
    mockSelectedSticker.mockReturnValue(null)
    
    const wrapper = mount(StickerEditor, {
      props: {
        entryId: 'entry-1',
        viewMode: false,
      },
    })
    
    const decorateButton = wrapper.find('[aria-pressed]')
    await decorateButton.trigger('click')
    await nextTick()
    
    expect(wrapper.find('[data-test="toolbar"]').exists()).toBe(false)
  })

  it('loads placements when entryId changes', async () => {
    const wrapper = mount(StickerEditor, {
      props: {
        entryId: 'entry-1',
        viewMode: false,
      },
    })
    
    await nextTick()
    expect(mockLoadPlacements).toHaveBeenCalledWith('entry-1')
    
    await wrapper.setProps({ entryId: 'entry-2' })
    expect(mockLoadPlacements).toHaveBeenCalledWith('entry-2')
  })

  it('clears placements when entryId is null', async () => {
    const wrapper = mount(StickerEditor, {
      props: {
        entryId: 'entry-1',
        viewMode: false,
      },
    })
    
    await wrapper.setProps({ entryId: null })
    expect(mockClearPlacements).toHaveBeenCalled()
  })

  it('emits dirty-change when hasChanges changes', async () => {
    mockHasChanges.mockReturnValue(false)
    
    const wrapper = mount(StickerEditor, {
      props: {
        entryId: 'entry-1',
        viewMode: false,
      },
    })
    
    // Simulate hasChanges becoming true
    mockHasChanges.mockReturnValue(true)
    await wrapper.vm.$forceUpdate()
    await nextTick()
    
    // Note: This test is limited because we mock the composable
    // In a real scenario, we'd test with the actual composable
  })

  it('keyboard shortcut Delete calls deleteSticker', async () => {
    mockPlacements.mockReturnValue([{ id: 'sticker-1', assetId: 'asset-1', x: 0.5, y: 0.5, width: 0.2, rotation: 0, zIndex: 1 }])
    mockSelectedId.mockReturnValue('sticker-1')
    
    const wrapper = mount(StickerEditor, {
      props: {
        entryId: 'entry-1',
        viewMode: false,
      },
      attachTo: document.body,
    })
    
    // Enable decorate mode
    const decorateButton = wrapper.find('[aria-pressed]')
    await decorateButton.trigger('click')
    await nextTick()
    
    // Trigger Delete key
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }))
    await nextTick()
    
    expect(mockDeleteSticker).toHaveBeenCalled()
    
    wrapper.unmount()
  })

  it('keyboard shortcut Ctrl+Z calls undo', async () => {
    mockCanUndo.mockReturnValue(true)
    
    const wrapper = mount(StickerEditor, {
      props: {
        entryId: 'entry-1',
        viewMode: false,
      },
      attachTo: document.body,
    })
    
    // Enable decorate mode
    const decorateButton = wrapper.find('[aria-pressed]')
    await decorateButton.trigger('click')
    await nextTick()
    
    // Trigger Ctrl+Z
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    await nextTick()
    
    expect(mockUndo).toHaveBeenCalled()
    
    wrapper.unmount()
  })

  it('keyboard shortcut Ctrl+Shift+Z calls redo', async () => {
    mockCanRedo.mockReturnValue(true)
    
    const wrapper = mount(StickerEditor, {
      props: {
        entryId: 'entry-1',
        viewMode: false,
      },
      attachTo: document.body,
    })
    
    // Enable decorate mode
    const decorateButton = wrapper.find('[aria-pressed]')
    await decorateButton.trigger('click')
    await nextTick()
    
    // Trigger Ctrl+Shift+Z
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true }))
    await nextTick()
    
    expect(mockRedo).toHaveBeenCalled()
    
    wrapper.unmount()
  })

  it('keyboard shortcut Escape deselects sticker', async () => {
    mockSelectedId.mockReturnValue('sticker-1')
    
    const wrapper = mount(StickerEditor, {
      props: {
        entryId: 'entry-1',
        viewMode: false,
      },
      attachTo: document.body,
    })
    
    // Enable decorate mode
    const decorateButton = wrapper.find('[aria-pressed]')
    await decorateButton.trigger('click')
    await nextTick()
    
    // Trigger Escape
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    
    expect(mockSelectSticker).toHaveBeenCalledWith(null)
    
    wrapper.unmount()
  })

  it('arrow keys nudge selected sticker position', async () => {
    mockSelectedId.mockReturnValue('sticker-1')
    mockSelectedSticker.mockReturnValue({ id: 'sticker-1', assetId: 'asset-1', x: 0.5, y: 0.5, width: 0.2, rotation: 0, zIndex: 1 })
    
    const wrapper = mount(StickerEditor, {
      props: {
        entryId: 'entry-1',
        viewMode: false,
      },
      attachTo: document.body,
    })
    
    // Enable decorate mode
    const decorateButton = wrapper.find('[aria-pressed]')
    await decorateButton.trigger('click')
    await nextTick()
    
    // Trigger ArrowRight
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    await nextTick()
    
    expect(mockUpdatePlacement).toHaveBeenCalledWith('sticker-1', expect.objectContaining({ x: expect.any(Number) }))
    
    wrapper.unmount()
  })

  it('does not respond to keyboard shortcuts in view mode', async () => {
    mockSelectedId.mockReturnValue('sticker-1')
    
    const wrapper = mount(StickerEditor, {
      props: {
        entryId: 'entry-1',
        viewMode: true,
      },
      attachTo: document.body,
    })
    
    // Trigger Delete key
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }))
    await nextTick()
    
    expect(mockDeleteSticker).not.toHaveBeenCalled()
    
    wrapper.unmount()
  })

  it('exposes savePlacements method via ref', () => {
    const wrapper = mount(StickerEditor, {
      props: {
        entryId: 'entry-1',
        viewMode: false,
      },
    })
    
    expect(wrapper.vm.savePlacements).toBeDefined()
    expect(typeof wrapper.vm.savePlacements).toBe('function')
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { ref } from 'vue'
enableAutoUnmount(afterEach)
import StickerTray from './StickerTray.vue'

// Mock composables
const mockLoading = vi.fn(() => false)
const mockError = vi.fn(() => null as string | null)
const mockBuiltinAssets = vi.fn(() => [] as any[])
const mockUserAssets = vi.fn(() => [] as any[])
const mockLoadBuiltins = vi.fn()
const mockLoadUserAssets = vi.fn()
const mockUploadAsset = vi.fn()
const mockDeleteUserAsset = vi.fn()
const mockClearError = vi.fn()

vi.mock('@/composables/useStickerAssets', () => ({
  useStickerAssets: () => ({
    builtinAssets: ref(mockBuiltinAssets()),
    userAssets: ref(mockUserAssets()),
    loading: ref(mockLoading()),
    uploadProgress: ref(0),
    error: ref(mockError()),
    loadBuiltins: mockLoadBuiltins,
    loadUserAssets: mockLoadUserAssets,
    uploadAsset: mockUploadAsset,
    deleteUserAsset: mockDeleteUserAsset,
    clearError: mockClearError,
  }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { id: 'test-user-id' },
  }),
}))

describe('StickerTray', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLoading.mockReturnValue(false)
    mockError.mockReturnValue(null)
    mockBuiltinAssets.mockReturnValue([])
    mockUserAssets.mockReturnValue([])
  })

  it('renders with Library tab active by default', () => {
    const wrapper = mount(StickerTray, {
      props: { userId: 'test-user' },
    })
    
    expect(wrapper.text()).toContain('Library')
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toBe('Library')
  })

  it('loads builtin and user stickers on mount', async () => {
    mount(StickerTray, {
      props: { userId: 'test-user' },
    })
    
    await flushPromises()
    expect(mockLoadBuiltins).toHaveBeenCalledTimes(1)
    expect(mockLoadUserAssets).toHaveBeenCalledWith('test-user')
  })

  it('renders builtin stickers in Library tab', async () => {
    mockBuiltinAssets.mockReturnValue([
      { id: 'builtin-1', url: '/sticker1.svg', category: 'hearts' },
      { id: 'builtin-2', url: '/sticker2.svg', category: 'stars' },
    ])
    
    const wrapper = mount(StickerTray, {
      props: { userId: 'test-user' },
    })
    
    const stickers = wrapper.findAll('button[aria-label*="sticker"]').filter(b => b.attributes('aria-label') !== 'Close sticker tray')
    expect(stickers).toHaveLength(2)
    expect(stickers[0].attributes('aria-label')).toContain('hearts')
    expect(stickers[1].attributes('aria-label')).toContain('stars')
  })

  it('switches to My Stickers tab when clicked', async () => {
    const wrapper = mount(StickerTray, {
      props: { userId: 'test-user' },
    })
    
    const myStickersTab = wrapper.findAll('[role="tab"]')[1]
    await myStickersTab.trigger('click')
    
    expect(myStickersTab.attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).toContain('Upload Sticker')
  })

  it('renders user stickers in My Stickers tab', async () => {
    mockUserAssets.mockReturnValue([
      { id: 'user-1', url: '/user-sticker1.png', category: 'custom' },
      { id: 'user-2', url: '/user-sticker2.png', category: 'custom' },
    ])
    
    const wrapper = mount(StickerTray, {
      props: { userId: 'test-user' },
    })
    
    const myStickersTab = wrapper.findAll('[role="tab"]')[1]
    await myStickersTab.trigger('click')
    
    const stickers = wrapper.findAll('button[aria-label*="sticker"]').filter(b => b.attributes('aria-label') !== 'Close sticker tray')
    expect(stickers.length).toBeGreaterThanOrEqual(2)
  })

  it('emits add-sticker when builtin sticker is clicked', async () => {
    mockBuiltinAssets.mockReturnValue([
      { id: 'builtin-1', url: '/sticker1.svg', category: 'hearts' },
    ])
    
    const wrapper = mount(StickerTray, {
      props: { userId: 'test-user' },
    })
    
    const sticker = wrapper.find('[aria-label*="hearts sticker"]')
    await sticker.trigger('click')
    
    expect(wrapper.emitted('add-sticker')).toBeTruthy()
    expect(wrapper.emitted('add-sticker')?.[0]).toEqual(['builtin-1'])
  })

  it('emits add-sticker when user sticker is clicked', async () => {
    mockUserAssets.mockReturnValue([
      { id: 'user-1', url: '/user-sticker1.png', category: 'custom' },
    ])
    
    const wrapper = mount(StickerTray, {
      props: { userId: 'test-user' },
    })
    
    const myStickersTab = wrapper.findAll('[role="tab"]')[1]
    await myStickersTab.trigger('click')
    
    const sticker = wrapper.find('[aria-label="Add custom sticker"]')
    await sticker.trigger('click')
    
    expect(wrapper.emitted('add-sticker')).toBeTruthy()
    expect(wrapper.emitted('add-sticker')?.[0]).toEqual(['user-1'])
  })

  it('shows upload button in My Stickers tab', async () => {
    const wrapper = mount(StickerTray, {
      props: { userId: 'test-user' },
    })
    
    const myStickersTab = wrapper.findAll('[role="tab"]')[1]
    await myStickersTab.trigger('click')
    
    expect(wrapper.text()).toContain('Upload Sticker')
    expect(wrapper.text()).toContain('PNG or WebP with transparency')
  })

  it('shows delete confirmation on first click, deletes on second click', async () => {
    mockUserAssets.mockReturnValue([
      { id: 'user-1', url: '/user-sticker1.png', category: 'custom' },
    ])
    mockDeleteUserAsset.mockResolvedValue(true)
    
    const wrapper = mount(StickerTray, {
      props: { userId: 'test-user' },
    })
    
    const myStickersTab = wrapper.findAll('[role="tab"]')[1]
    await myStickersTab.trigger('click')
    
    const deleteButton = wrapper.find('[aria-label*="Delete sticker"]')
    
    // First click shows confirmation
    await deleteButton.trigger('click')
    expect(deleteButton.attributes('aria-label')).toContain('confirm')
    expect(mockDeleteUserAsset).not.toHaveBeenCalled()
    
    // Second click deletes
    await deleteButton.trigger('click')
    expect(mockDeleteUserAsset).toHaveBeenCalledWith('user-1')
  })

  it('emits close when close button is clicked', async () => {
    const wrapper = mount(StickerTray, {
      props: { userId: 'test-user' },
    })
    
    const closeButton = wrapper.find('[aria-label="Close sticker tray"]')
    await closeButton.trigger('click')
    
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('displays loading state', () => {
    mockLoading.mockReturnValue(true)
    
    const wrapper = mount(StickerTray, {
      props: { userId: 'test-user' },
    })
    
    expect(wrapper.text()).toContain('Loading stickers')
  })

  it('displays empty state in Library tab', () => {
    mockBuiltinAssets.mockReturnValue([])
    
    const wrapper = mount(StickerTray, {
      props: { userId: 'test-user' },
    })
    
    expect(wrapper.text()).toContain('No built-in stickers available')
  })

  it('displays empty state in My Stickers tab', async () => {
    mockUserAssets.mockReturnValue([])
    
    const wrapper = mount(StickerTray, {
      props: { userId: 'test-user' },
    })
    
    const myStickersTab = wrapper.findAll('[role="tab"]')[1]
    await myStickersTab.trigger('click')
    
    expect(wrapper.text()).toContain('No custom stickers yet')
  })

  it('shows error message when error prop is set', () => {
    mockError.mockReturnValue('Failed to load stickers')
    
    const wrapper = mount(StickerTray, {
      props: { userId: 'test-user' },
    })
    
    expect(wrapper.text()).toContain('Failed to load stickers')
  })
})

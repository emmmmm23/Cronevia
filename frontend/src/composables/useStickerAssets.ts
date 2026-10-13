/**
 * Sticker Assets Composable
 * Manages reactive state for sticker library (builtin + user uploads)
 */
import { ref, computed } from 'vue'
import type { StickerAsset } from '@/types/sticker.types'
import {
  fetchBuiltinAssets,
  fetchUserAssets,
  uploadStickerAsset,
  deleteAsset
} from '@/services/sticker.service'

export function useStickerAssets(userId?: string) {
  // Reactive state
  const builtinAssets = ref<Array<StickerAsset & { url: string }>>([])
  const userAssets = ref<Array<StickerAsset & { url: string }>>([])
  const loading = ref(false)
  const uploadProgress = ref(0)
  const error = ref<string | null>(null)

  // Computed
  const allAssets = computed(() => [...builtinAssets.value, ...userAssets.value])
  const hasUserAssets = computed(() => userAssets.value.length > 0)

  /**
   * Load built-in sticker assets
   */
  async function loadBuiltins() {
    loading.value = true
    error.value = null
    try {
      builtinAssets.value = await fetchBuiltinAssets()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      error.value = e?.response?.data?.message || 'Could not load built-in stickers.'
      console.error('[useStickerAssets] loadBuiltins error:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Load user's uploaded sticker assets
   */
  async function loadUserAssets(uid?: string) {
    const targetUserId = uid || userId
    if (!targetUserId) {
      error.value = 'User ID is required to load custom stickers.'
      return
    }

    loading.value = true
    error.value = null
    try {
      userAssets.value = await fetchUserAssets(targetUserId)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      error.value = e?.response?.data?.message || 'Could not load your custom stickers.'
      console.error('[useStickerAssets] loadUserAssets error:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Upload a new sticker asset
   */
  async function uploadAsset(file: File): Promise<(StickerAsset & { url: string }) | null> {
    uploadProgress.value = 0
    error.value = null

    try {
      // Simulate progress for better UX (actual upload happens quickly)
      const progressInterval = setInterval(() => {
        uploadProgress.value = Math.min(90, uploadProgress.value + 10)
      }, 100)

      const asset = await uploadStickerAsset(file)

      clearInterval(progressInterval)
      uploadProgress.value = 100

      // Add to local state
      userAssets.value = [asset, ...userAssets.value]

      // Reset progress after a brief moment
      setTimeout(() => {
        uploadProgress.value = 0
      }, 500)

      return asset
    } catch (err: unknown) {
      uploadProgress.value = 0
      const e = err as { response?: { data?: { message?: string } } }
      error.value = e?.response?.data?.message || 'Could not upload sticker.'
      console.error('[useStickerAssets] uploadAsset error:', err)
      return null
    }
  }

  /**
   * Delete a user's sticker asset
   */
  async function deleteUserAsset(assetId: string): Promise<boolean> {
    error.value = null
    try {
      await deleteAsset(assetId)
      
      // Remove from local state
      userAssets.value = userAssets.value.filter(a => a.id !== assetId)
      
      return true
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string }; status?: number } }
      
      if (e?.response?.status === 409) {
        // Conflict - asset is still in use
        error.value = e.response.data?.message || 'This sticker is still being used in your journal entries.'
      } else {
        error.value = e?.response?.data?.message || 'Could not delete sticker.'
      }
      
      console.error('[useStickerAssets] deleteUserAsset error:', err)
      return false
    }
  }

  /**
   * Find an asset by ID
   */
  function findAsset(assetId: string): (StickerAsset & { url: string }) | undefined {
    return allAssets.value.find(a => a.id === assetId)
  }

  /**
   * Clear error message
   */
  function clearError() {
    error.value = null
  }

  return {
    // State
    builtinAssets,
    userAssets,
    allAssets,
    hasUserAssets,
    loading,
    uploadProgress,
    error,
    
    // Actions
    loadBuiltins,
    loadUserAssets,
    uploadAsset,
    deleteUserAsset,
    findAsset,
    clearError
  }
}

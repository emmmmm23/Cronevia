<script setup lang="ts">
/**
 * StickerTray.vue — Responsive library UI (desktop side panel, mobile bottom sheet)
 * 
 * Displays built-in and user-uploaded stickers with tabs.
 * Provides upload functionality for custom stickers.
 */
import { ref, computed, onMounted } from 'vue'
import { useStickerAssets } from '@/composables/useStickerAssets'
import { useAuthStore } from '@/stores/auth'

interface Props {
  userId?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'add-sticker', assetId: string): void
  (e: 'close'): void
}>()

const authStore = useAuthStore()
const {
  builtinAssets,
  userAssets,
  loading,
  uploadProgress,
  error,
  loadBuiltins,
  loadUserAssets,
  uploadAsset,
  deleteUserAsset,
  clearError
} = useStickerAssets(props.userId || authStore.user?.id)

const activeTab = ref<'library' | 'my-stickers'>('library')
const uploadInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const deleteConfirm = ref<string | null>(null)

const currentUserId = computed(() => props.userId || authStore.user?.id)

// Load assets on mount
onMounted(async () => {
  await loadBuiltins()
  if (currentUserId.value) {
    await loadUserAssets(currentUserId.value)
  }
})

function handleAddSticker(assetId: string) {
  emit('add-sticker', assetId)
}

function openUploadDialog() {
  uploadInput.value?.click()
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const file = target.files[0]
  
  // Validation
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    error.value = 'File must be smaller than 5MB'
    return
  }

  const allowedTypes = ['image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    error.value = 'Only PNG and WebP images are supported for stickers'
    return
  }

  uploading.value = true
  clearError()

  try {
    await uploadAsset(file)
    // Switch to My Stickers tab after successful upload
    activeTab.value = 'my-stickers'
  } finally {
    uploading.value = false
    target.value = '' // Reset input
  }
}

async function handleDeleteSticker(assetId: string) {
  if (deleteConfirm.value !== assetId) {
    deleteConfirm.value = assetId
    setTimeout(() => {
      deleteConfirm.value = null
    }, 3000)
    return
  }

  const success = await deleteUserAsset(assetId)
  if (success) {
    deleteConfirm.value = null
  }
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <div class="sticker-tray flex flex-col bg-[#fdfaf5] border-l border-[#d7c7b3] h-full">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-[#d7c7b3]">
      <h3 class="text-sm font-semibold uppercase tracking-wider text-[#6b4423]">
        Stickers
      </h3>
      <button
        type="button"
        aria-label="Close sticker tray"
        class="text-[#8a5c2e] hover:text-[#7B0323] transition-colors"
        @click="handleClose"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Error message -->
    <div v-if="error" class="mx-4 mt-3 px-3 py-2 bg-[#fdf2f3] border border-[#eeaab5] rounded text-xs text-[#7B0323]">
      {{ error }}
      <button
        type="button"
        class="ml-2 underline hover:no-underline"
        @click="clearError"
      >
        Dismiss
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-[#d7c7b3]" role="tablist">
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'library'"
        :class="[
          'flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors',
          activeTab === 'library'
            ? 'text-[#7B0323] bg-[#fdfaf5] border-b-2 border-[#7B0323]'
            : 'text-[#8a5c2e] bg-[#f5ebdd] hover:text-[#7B0323]'
        ]"
        @click="activeTab = 'library'"
      >
        Library
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'my-stickers'"
        :class="[
          'flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors',
          activeTab === 'my-stickers'
            ? 'text-[#7B0323] bg-[#fdfaf5] border-b-2 border-[#7B0323]'
            : 'text-[#8a5c2e] bg-[#f5ebdd] hover:text-[#7B0323]'
        ]"
        @click="activeTab = 'my-stickers'"
      >
        My Stickers
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- Library Tab -->
      <div v-if="activeTab === 'library'" role="tabpanel">
        <div v-if="loading" class="text-center py-8 text-sm text-[#a68e73]">
          Loading stickers...
        </div>
        <div v-else-if="builtinAssets.length === 0" class="text-center py-8 text-sm text-[#a68e73]">
          No built-in stickers available
        </div>
        <div v-else class="grid grid-cols-4 gap-2">
          <button
            v-for="asset in builtinAssets"
            :key="asset.id"
            type="button"
            :aria-label="`Add ${asset.category} sticker`"
            class="aspect-square bg-white border-2 border-[#d7c7b3] rounded p-2 hover:border-[#7B0323] hover:shadow-md transition-all active:scale-95"
            @click="handleAddSticker(asset.id)"
          >
            <img
              :src="asset.url"
              :alt="`${asset.category} sticker`"
              class="w-full h-full object-contain"
            />
          </button>
        </div>
      </div>

      <!-- My Stickers Tab -->
      <div v-else-if="activeTab === 'my-stickers'" role="tabpanel">
        <!-- Upload button -->
        <div class="mb-4">
          <input
            ref="uploadInput"
            type="file"
            accept="image/png,image/webp"
            class="sr-only"
            @change="handleFileSelect"
          />
          <button
            type="button"
            :disabled="uploading"
            class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#7B0323] text-[#fdfaf5] text-sm font-semibold rounded border border-[#5a0019] hover:bg-[#5a0019] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            @click="openUploadDialog"
          >
            <svg v-if="!uploading" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ uploading ? 'Uploading...' : 'Upload Sticker' }}
          </button>
          <p class="mt-2 text-xs text-center text-[#a68e73]">
            PNG or WebP with transparency, up to 5MB
          </p>
          
          <!-- Upload progress -->
          <div v-if="uploading && uploadProgress > 0" class="mt-2">
            <div class="h-1.5 bg-[#efe2cf] rounded-full overflow-hidden">
              <div
                class="h-full bg-[#7B0323] transition-all duration-300"
                :style="{ width: `${uploadProgress}%` }"
              />
            </div>
          </div>
        </div>

        <!-- User stickers grid -->
        <div v-if="loading" class="text-center py-8 text-sm text-[#a68e73]">
          Loading your stickers...
        </div>
        <div v-else-if="userAssets.length === 0" class="text-center py-8 text-sm text-[#a68e73]">
          <p class="mb-2">No custom stickers yet</p>
          <p class="text-xs">Upload your first sticker to get started!</p>
        </div>
        <div v-else class="grid grid-cols-4 gap-2">
          <div
            v-for="asset in userAssets"
            :key="asset.id"
            class="relative aspect-square bg-white border-2 border-[#d7c7b3] rounded p-2 group"
          >
            <button
              type="button"
              :aria-label="`Add ${asset.category} sticker`"
              class="w-full h-full hover:border-[#7B0323] transition-all active:scale-95"
              @click="handleAddSticker(asset.id)"
            >
              <img
                :src="asset.url"
                :alt="`Custom sticker`"
                class="w-full h-full object-contain"
              />
            </button>
            
            <!-- Delete button -->
            <button
              type="button"
              :aria-label="deleteConfirm === asset.id ? 'Click again to confirm deletion' : 'Delete sticker'"
              :class="[
                'absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100',
                deleteConfirm === asset.id
                  ? 'bg-red-600 hover:bg-red-700 ring-2 ring-red-300'
                  : 'bg-[#7B0323] hover:bg-[#5a0019]'
              ]"
              @click.stop="handleDeleteSticker(asset.id)"
            >
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sticker-tray {
  /* Desktop: fixed right side panel */
  @media (min-width: 768px) {
    width: 280px;
  }
  
  /* Mobile: bottom sheet */
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
}
</style>

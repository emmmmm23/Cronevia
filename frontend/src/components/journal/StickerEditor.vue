<script setup lang="ts">
/**
 * StickerEditor.vue — Top-level orchestrator for sticker editing
 * 
 * Manages:
 * - Decorate mode toggle
 * - Renders StickerCanvas, StickerTray, StickerToolbar when decorateMode=true
 * - Keyboard shortcuts (Delete, Ctrl+Z, Ctrl+Shift+Z, arrow keys)
 * - Loads placements on mount
 * - Emits dirty-change and placements-change
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useStickerEditor } from '@/composables/useStickerEditor'
import { useStickerAssets } from '@/composables/useStickerAssets'
import StickerCanvas from './StickerCanvas.vue'
import StickerTray from './StickerTray.vue'
import StickerToolbar from './StickerToolbar.vue'

interface Props {
  entryId: string | null
  viewMode: boolean
  userId?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'dirty-change', isDirty: boolean): void
  (e: 'placements-change'): void
}>()

// Composables
const editor = useStickerEditor()
const assets = useStickerAssets(props.userId)

// Local state
const decorateMode = ref(false)
const canvasRef = ref<HTMLElement | null>(null)
const showTray = ref(false)

// Asset URL lookup for placements
const assetUrls = computed(() => {
  const map: Record<string, string> = {}
  
  // Add builtin assets
  assets.builtinAssets.value.forEach(asset => {
    map[asset.id] = asset.url
  })
  
  // Add user assets
  assets.userAssets.value.forEach(asset => {
    map[asset.id] = asset.url
  })
  
  return map
})

// Watch for changes to emit dirty state
watch(
  () => editor.hasChanges.value,
  (hasChanges) => {
    emit('dirty-change', hasChanges)
  }
)

watch(
  () => editor.placements.value,
  () => {
    emit('placements-change')
  },
  { deep: true }
)

// Load placements when entry ID changes
watch(
  () => props.entryId,
  async (newEntryId) => {
    if (newEntryId) {
      await editor.loadPlacements(newEntryId)
    } else {
      editor.clearPlacements()
    }
  },
  { immediate: true }
)

// Load assets on mount
onMounted(async () => {
  await assets.loadBuiltins()
  if (props.userId) {
    await assets.loadUserAssets(props.userId)
  }
  
  // Set canvas dimensions if canvas element exists
  if (canvasRef.value) {
    editor.setCanvasDimensions(
      canvasRef.value.offsetWidth,
      canvasRef.value.offsetHeight
    )
  }
})

// Toggle decorate mode
function toggleDecorateMode() {
  if (props.viewMode) return
  decorateMode.value = !decorateMode.value
  showTray.value = decorateMode.value
}

// Add sticker from tray
function handleAddSticker(assetId: string) {
  editor.addSticker(assetId, 0.5, 0.5, 0.15)
}

// Canvas events
function handleUpdatePlacement(id: string, updates: Parameters<typeof editor.updatePlacement>[1]) {
  editor.updatePlacement(id, updates)
}

function handleSaveSnapshot() {
  editor.saveSnapshot()
}

function handleSelect(id: string | null) {
  editor.selectSticker(id)
}

function handleDeselect() {
  editor.selectSticker(null)
}

// Toolbar actions
function handleDuplicate() {
  if (editor.selectedId.value) {
    editor.duplicateSticker(editor.selectedId.value)
  }
}

function handleDelete() {
  if (editor.selectedId.value) {
    editor.deleteSticker(editor.selectedId.value)
  }
}

function handleBringForward() {
  if (editor.selectedId.value) {
    editor.bringForward(editor.selectedId.value)
  }
}

function handleSendBackward() {
  if (editor.selectedId.value) {
    editor.sendBackward(editor.selectedId.value)
  }
}

function handleToFront() {
  if (editor.selectedId.value) {
    editor.bringToFront(editor.selectedId.value)
  }
}

function handleToBack() {
  if (editor.selectedId.value) {
    editor.sendToBack(editor.selectedId.value)
  }
}

function handleRotate(degrees: number) {
  if (editor.selectedId.value && editor.selectedSticker.value) {
    editor.updatePlacement(editor.selectedId.value, {
      rotation: editor.selectedSticker.value.rotation + degrees
    })
    editor.saveSnapshot()
  }
}

function handleUndo() {
  editor.undo()
}

function handleRedo() {
  editor.redo()
}

// Keyboard shortcuts
function handleKeydown(event: KeyboardEvent) {
  if (!decorateMode.value || props.viewMode) return
  
  // Ignore if user is typing in an input
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
  
  // Delete
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    handleDelete()
  }
  
  // Undo (Ctrl+Z / Cmd+Z)
  if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
    event.preventDefault()
    handleUndo()
  }
  
  // Redo (Ctrl+Shift+Z / Cmd+Shift+Z)
  if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) {
    event.preventDefault()
    handleRedo()
  }
  
  // Arrow keys for nudging
  if (editor.selectedSticker.value && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault()
    const nudgeAmount = event.shiftKey ? 0.01 : 0.005 // Shift for larger steps
    
    let updates: Partial<typeof editor.selectedSticker.value> = {}
    
    switch (event.key) {
      case 'ArrowUp':
        updates.y = Math.max(0, editor.selectedSticker.value.y - nudgeAmount)
        break
      case 'ArrowDown':
        updates.y = Math.min(1, editor.selectedSticker.value.y + nudgeAmount)
        break
      case 'ArrowLeft':
        updates.x = Math.max(0, editor.selectedSticker.value.x - nudgeAmount)
        break
      case 'ArrowRight':
        updates.x = Math.min(1, editor.selectedSticker.value.x + nudgeAmount)
        break
    }
    
    editor.updatePlacement(editor.selectedId.value!, updates)
  }
  
  // Escape to deselect
  if (event.key === 'Escape') {
    event.preventDefault()
    editor.selectSticker(null)
  }
}

// Add/remove keyboard listener
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Save placements to database
async function savePlacements() {
  if (!props.entryId) return
  await editor.savePlacements(props.entryId)
}

// Expose save method for parent
defineExpose({
  savePlacements
})
</script>

<template>
  <div class="sticker-editor relative">
    <!-- Decorate Mode Toggle -->
    <div v-if="!viewMode" class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button
          type="button"
          :aria-pressed="decorateMode"
          :class="[
            'inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded border transition-all',
            decorateMode
              ? 'bg-[#7B0323] text-[#fdfaf5] border-[#5a0019] hover:bg-[#5a0019]'
              : 'bg-transparent text-[#7B0323] border-[#7B0323] hover:bg-[#fdf2f3]'
          ]"
          @click="toggleDecorateMode"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
          {{ decorateMode ? 'Done Decorating' : 'Decorate' }}
        </button>
        
        <!-- Info hint -->
        <p v-if="decorateMode" class="text-xs text-[#8a5c2e]">
          Click stickers to select, drag to move, use handles to resize and rotate
        </p>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex gap-4">
      <!-- Canvas Area -->
      <div class="flex-1 relative">
        <div
          ref="canvasRef"
          class="sticker-canvas-wrapper relative w-full bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm overflow-hidden"
          style="min-height: 600px;"
        >
          <StickerCanvas
            v-if="decorateMode || editor.placements.value.length > 0"
            :placements="editor.placements.value"
            :selected-id="editor.selectedId.value"
            :view-mode="viewMode"
            :canvas-el="canvasRef"
            :asset-urls="assetUrls"
            @update:placement="handleUpdatePlacement"
            @save-snapshot="handleSaveSnapshot"
            @select="handleSelect"
            @deselect="handleDeselect"
          />
        </div>

        <!-- Toolbar (floating above canvas when sticker is selected) -->
        <Transition name="toolbar-fade">
          <div
            v-if="decorateMode && editor.selectedId.value && !viewMode"
            class="absolute top-4 left-1/2 -translate-x-1/2 z-20"
          >
            <StickerToolbar
              :selected-placement="editor.selectedSticker.value"
              :can-undo="editor.canUndo.value"
              :can-redo="editor.canRedo.value"
              @duplicate="handleDuplicate"
              @delete="handleDelete"
              @bring-forward="handleBringForward"
              @send-backward="handleSendBackward"
              @to-front="handleToFront"
              @to-back="handleToBack"
              @rotate="handleRotate"
              @undo="handleUndo"
              @redo="handleRedo"
            />
          </div>
        </Transition>
      </div>

      <!-- Sticker Tray (desktop) -->
      <Transition name="tray-slide">
        <div v-if="decorateMode && showTray && !viewMode" class="hidden md:block">
          <StickerTray
            :user-id="userId"
            @add-sticker="handleAddSticker"
            @close="showTray = false"
          />
        </div>
      </Transition>
    </div>

    <!-- Sticker Tray (mobile bottom sheet) -->
    <Transition name="tray-slide-up">
      <div v-if="decorateMode && showTray && !viewMode" class="md:hidden">
        <StickerTray
          :user-id="userId"
          @add-sticker="handleAddSticker"
          @close="showTray = false"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Toolbar fade transition */
.toolbar-fade-enter-active,
.toolbar-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toolbar-fade-enter-from,
.toolbar-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}

/* Tray slide transition (desktop) */
.tray-slide-enter-active,
.tray-slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.tray-slide-enter-from,
.tray-slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* Tray slide up transition (mobile) */
.tray-slide-up-enter-active,
.tray-slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.tray-slide-up-enter-from,
.tray-slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>

<script setup lang="ts">
/**
 * StickerCanvas.vue — Orchestrates all sticker placements + Moveable integration
 * 
 * Renders all placements, binds Moveable to selected element, and handles
 * drag/resize/rotate events by emitting normalized coordinate updates.
 */
import { ref, watch, onBeforeUnmount, computed } from 'vue'
import Moveable from 'moveable'
import StickerPlacement from './StickerPlacement.vue'
import type { StickerInstance } from '@/types/sticker.types'

interface Props {
  placements: StickerInstance[]
  selectedId: string | null
  viewMode: boolean
  canvasEl: HTMLElement | null
  assetUrls: Record<string, string> // Map of assetId -> url
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:placement', id: string, updates: Partial<StickerInstance>): void
  (e: 'save-snapshot'): void
  (e: 'select', id: string | null): void
  (e: 'deselect'): void
}>()

const canvasRef = ref<HTMLElement | null>(null)
let moveable: Moveable | null = null

// Sorted placements by z-index
const sortedPlacements = computed(() => {
  return [...props.placements].sort((a, b) => a.zIndex - b.zIndex)
})

// Initialize Moveable when selection changes
watch(
  () => [props.selectedId, props.viewMode, props.canvasEl],
  ([newSelectedId, newViewMode]) => {
    if (moveable) {
      moveable.destroy()
      moveable = null
    }

    if (newViewMode || !newSelectedId || !props.canvasEl) {
      return
    }

    // Find the selected element
    const targetElement = document.querySelector(`[data-sticker-id="${newSelectedId}"]`) as HTMLElement
    if (!targetElement) return

    // Get canvas bounds
    const canvasRect = props.canvasEl.getBoundingClientRect()

    // Create Moveable instance
    moveable = new Moveable(document.body, {
      target: targetElement,
      draggable: true,
      resizable: true,
      rotatable: true,
      keepRatio: true,
      bounds: {
        left: 0,
        top: 0,
        right: canvasRect.width,
        bottom: canvasRect.height,
        position: 'css'
      },
      origin: false,
      edge: false,
      throttleDrag: 0,
      throttleResize: 0,
      throttleRotate: 0,
    })

    // Drag event
    moveable.on('drag', ({ target, transform }) => {
      target.style.transform = transform
    })

    moveable.on('dragEnd', ({ target }) => {
      // Extract position from transform
      const transformMatrix = new DOMMatrix(getComputedStyle(target).transform)
      const normalizedX = transformMatrix.m41 / canvasRect.width
      const normalizedY = transformMatrix.m42 / canvasRect.height
      
      emit('update:placement', newSelectedId as string, {
        x: Math.max(0, Math.min(1, normalizedX)),
        y: Math.max(0, Math.min(1, normalizedY))
      })
      emit('save-snapshot')
    })

    // Resize event
    moveable.on('resize', ({ target, width, height, drag }) => {
      target.style.width = `${width}px`
      target.style.height = `${height}px`
      target.style.transform = drag.transform
    })

    moveable.on('resizeEnd', ({ target }) => {
      const width = parseFloat(target.style.width)
      const transformMatrix = new DOMMatrix(getComputedStyle(target).transform)
      const normalizedX = transformMatrix.m41 / canvasRect.width
      const normalizedY = transformMatrix.m42 / canvasRect.height
      const normalizedWidth = width / canvasRect.width
      
      emit('update:placement', newSelectedId as string, {
        x: Math.max(0, Math.min(1, normalizedX)),
        y: Math.max(0, Math.min(1, normalizedY)),
        width: Math.max(0.05, Math.min(0.5, normalizedWidth))
      })
      emit('save-snapshot')
    })

    // Rotate event
    moveable.on('rotate', ({ target, transform }) => {
      target.style.transform = transform
    })

    moveable.on('rotateEnd', ({ target }) => {
      // Extract rotation from transform
      const transformMatrix = new DOMMatrix(getComputedStyle(target).transform)
      const rotation = Math.atan2(transformMatrix.b, transformMatrix.a) * (180 / Math.PI)
      
      emit('update:placement', newSelectedId as string, {
        rotation: rotation
      })
      emit('save-snapshot')
    })
  },
  { immediate: true }
)

// Click on canvas background to deselect
function handleCanvasClick(event: MouseEvent) {
  if (event.target === canvasRef.value) {
    emit('deselect')
  }
}

// Click on sticker to select
function handleStickerClick(id: string) {
  emit('select', id)
}

onBeforeUnmount(() => {
  if (moveable) {
    moveable.destroy()
    moveable = null
  }
})
</script>

<template>
  <div
    ref="canvasRef"
    class="sticker-canvas relative w-full h-full overflow-hidden"
    :class="{ 'cursor-default': viewMode }"
    @click="handleCanvasClick"
  >
    <StickerPlacement
      v-for="placement in sortedPlacements"
      :key="placement.id"
      :placement="placement"
      :asset-url="assetUrls[placement.assetId] || ''"
      :canvas-width="canvasEl?.offsetWidth || 800"
      :canvas-height="canvasEl?.offsetHeight || 1000"
      :is-selected="placement.id === selectedId"
      :view-mode="viewMode"
      @click="handleStickerClick(placement.id)"
    />
  </div>
</template>

<style scoped>
.sticker-canvas {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
</style>

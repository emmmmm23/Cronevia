<script setup lang="ts">
/**
 * StickerPlacement.vue — Renders a single sticker with CSS transforms
 * 
 * Converts normalized coordinates (0-1) to pixel positions within the canvas.
 * Shows selection outline in edit mode when selected.
 */
import { computed } from 'vue'
import type { StickerInstance } from '@/types/sticker.types'

interface Props {
  placement: StickerInstance
  assetUrl: string
  canvasWidth: number
  canvasHeight: number
  isSelected: boolean
  viewMode: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

// Convert normalized coordinates to pixels
const pixelX = computed(() => props.placement.x * props.canvasWidth)
const pixelY = computed(() => props.placement.y * props.canvasHeight)
const pixelWidth = computed(() => props.placement.width * props.canvasWidth)

// CSS transform string
const transformStyle = computed(() => {
  return `translate(${pixelX.value}px, ${pixelY.value}px) rotate(${props.placement.rotation}deg)`
})

// Container styles
const containerStyle = computed(() => ({
  position: 'absolute' as const,
  top: '0',
  left: '0',
  transform: transformStyle.value,
  width: `${pixelWidth.value}px`,
  height: 'auto',
  zIndex: props.placement.zIndex,
  cursor: props.viewMode ? 'default' : 'move',
}))

// Image styles with selection outline
const imageClass = computed(() => [
  'block w-full h-auto select-none pointer-events-none',
  props.isSelected && !props.viewMode ? 'ring-2 ring-[#7B0323] ring-offset-2 ring-offset-[#fdfaf5] rounded-sm' : ''
])

function handleClick(event: MouseEvent) {
  if (!props.viewMode) {
    event.stopPropagation()
    emit('click')
  }
}
</script>

<template>
  <div
    :style="containerStyle"
    :data-sticker-id="placement.id"
    class="sticker-placement"
    @click="handleClick"
  >
    <img
      :src="assetUrl"
      :alt="`Sticker ${placement.id}`"
      :class="imageClass"
      draggable="false"
    />
  </div>
</template>

<style scoped>
.sticker-placement {
  transform-origin: center center;
  will-change: transform;
}
</style>

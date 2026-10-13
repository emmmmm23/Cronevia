<script setup lang="ts">
/**
 * StickerToolbar.vue — Contextual toolbar with icon buttons for sticker manipulation
 * 
 * Provides controls for: Duplicate, Delete, Layer order, Rotate, Undo, Redo
 */
import type { StickerInstance } from '@/types/sticker.types'

interface Props {
  selectedPlacement: StickerInstance | null
  canUndo: boolean
  canRedo: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'duplicate'): void
  (e: 'delete'): void
  (e: 'bring-forward'): void
  (e: 'send-backward'): void
  (e: 'to-front'): void
  (e: 'to-back'): void
  (e: 'rotate', degrees: number): void
  (e: 'undo'): void
  (e: 'redo'): void
}>()

const disabled = !props.selectedPlacement

function handleDuplicate() {
  if (!disabled) emit('duplicate')
}

function handleDelete() {
  if (!disabled) emit('delete')
}

function handleBringForward() {
  if (!disabled) emit('bring-forward')
}

function handleSendBackward() {
  if (!disabled) emit('send-backward')
}

function handleToFront() {
  if (!disabled) emit('to-front')
}

function handleToBack() {
  if (!disabled) emit('to-back')
}

function handleRotate(degrees: number) {
  if (!disabled) emit('rotate', degrees)
}

function handleUndo() {
  if (props.canUndo) emit('undo')
}

function handleRedo() {
  if (props.canRedo) emit('redo')
}
</script>

<template>
  <div class="sticker-toolbar flex items-center gap-1 px-3 py-2 bg-[#f5ebdd] border border-[#d7c7b3] rounded shadow-sm">
    <!-- Undo -->
    <button
      type="button"
      :disabled="!canUndo"
      :aria-label="canUndo ? 'Undo' : 'Nothing to undo'"
      :class="[
        'flex items-center justify-center w-8 h-8 rounded transition-colors',
        'text-[#7B0323] bg-transparent',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B0323]',
        canUndo 
          ? 'hover:bg-[#fdfaf5] active:bg-[#efe2cf]' 
          : 'text-[#c4ad94] cursor-not-allowed opacity-50'
      ]"
      @click="handleUndo"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
      </svg>
    </button>

    <!-- Redo -->
    <button
      type="button"
      :disabled="!canRedo"
      :aria-label="canRedo ? 'Redo' : 'Nothing to redo'"
      :class="[
        'flex items-center justify-center w-8 h-8 rounded transition-colors',
        'text-[#7B0323] bg-transparent',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B0323]',
        canRedo 
          ? 'hover:bg-[#fdfaf5] active:bg-[#efe2cf]' 
          : 'text-[#c4ad94] cursor-not-allowed opacity-50'
      ]"
      @click="handleRedo"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3" />
      </svg>
    </button>

    <!-- Divider -->
    <div class="w-px h-6 bg-[#d7c7b3] mx-1" />

    <!-- Duplicate -->
    <button
      type="button"
      :disabled="disabled"
      aria-label="Duplicate sticker"
      :class="[
        'flex items-center justify-center w-8 h-8 rounded transition-colors',
        'text-[#7B0323] bg-transparent',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B0323]',
        disabled
          ? 'text-[#c4ad94] cursor-not-allowed opacity-50'
          : 'hover:bg-[#fdfaf5] active:bg-[#efe2cf]'
      ]"
      @click="handleDuplicate"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3m6-4h9m0 0-3-3m3 3-3 3" />
      </svg>
    </button>

    <!-- Delete -->
    <button
      type="button"
      :disabled="disabled"
      aria-label="Delete sticker"
      :class="[
        'flex items-center justify-center w-8 h-8 rounded transition-colors',
        'text-[#7B0323] bg-transparent',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B0323]',
        disabled
          ? 'text-[#c4ad94] cursor-not-allowed opacity-50'
          : 'hover:bg-[#fdf2f3] hover:text-[#5a0019] active:bg-[#efe2cf]'
      ]"
      @click="handleDelete"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
      </svg>
    </button>

    <!-- Divider -->
    <div class="w-px h-6 bg-[#d7c7b3] mx-1" />

    <!-- Layer controls -->
    <div class="flex items-center gap-1">
      <button
        type="button"
        :disabled="disabled"
        aria-label="Bring to front"
        title="Bring to front"
        :class="[
          'flex items-center justify-center w-8 h-8 rounded transition-colors',
          'text-[#7B0323] bg-transparent',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B0323]',
          disabled
            ? 'text-[#c4ad94] cursor-not-allowed opacity-50'
            : 'hover:bg-[#fdfaf5] active:bg-[#efe2cf]'
        ]"
        @click="handleToFront"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z" />
        </svg>
      </button>

      <button
        type="button"
        :disabled="disabled"
        aria-label="Bring forward"
        title="Bring forward"
        :class="[
          'flex items-center justify-center w-8 h-8 rounded transition-colors',
          'text-[#7B0323] bg-transparent',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B0323]',
          disabled
            ? 'text-[#c4ad94] cursor-not-allowed opacity-50'
            : 'hover:bg-[#fdfaf5] active:bg-[#efe2cf]'
        ]"
        @click="handleBringForward"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
        </svg>
      </button>

      <button
        type="button"
        :disabled="disabled"
        aria-label="Send backward"
        title="Send backward"
        :class="[
          'flex items-center justify-center w-8 h-8 rounded transition-colors',
          'text-[#7B0323] bg-transparent',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B0323]',
          disabled
            ? 'text-[#c4ad94] cursor-not-allowed opacity-50'
            : 'hover:bg-[#fdfaf5] active:bg-[#efe2cf]'
        ]"
        @click="handleSendBackward"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <button
        type="button"
        :disabled="disabled"
        aria-label="Send to back"
        title="Send to back"
        :class="[
          'flex items-center justify-center w-8 h-8 rounded transition-colors',
          'text-[#7B0323] bg-transparent',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B0323]',
          disabled
            ? 'text-[#c4ad94] cursor-not-allowed opacity-50'
            : 'hover:bg-[#fdfaf5] active:bg-[#efe2cf]'
        ]"
        @click="handleToBack"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M5 12a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2M5 12a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2m-2-4h.01M17 16h.01" />
        </svg>
      </button>
    </div>

    <!-- Divider -->
    <div class="w-px h-6 bg-[#d7c7b3] mx-1" />

    <!-- Rotation controls -->
    <div class="flex items-center gap-1">
      <button
        type="button"
        :disabled="disabled"
        aria-label="Rotate left 15 degrees"
        title="Rotate -15°"
        :class="[
          'flex items-center justify-center w-8 h-8 rounded transition-colors',
          'text-[#7B0323] bg-transparent',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B0323]',
          disabled
            ? 'text-[#c4ad94] cursor-not-allowed opacity-50'
            : 'hover:bg-[#fdfaf5] active:bg-[#efe2cf]'
        ]"
        @click="handleRotate(-15)"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
        </svg>
      </button>

      <button
        type="button"
        :disabled="disabled"
        aria-label="Rotate right 15 degrees"
        title="Rotate +15°"
        :class="[
          'flex items-center justify-center w-8 h-8 rounded transition-colors',
          'text-[#7B0323] bg-transparent',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B0323]',
          disabled
            ? 'text-[#c4ad94] cursor-not-allowed opacity-50'
            : 'hover:bg-[#fdfaf5] active:bg-[#efe2cf]'
        ]"
        @click="handleRotate(15)"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12a7.5 7.5 0 0 0 15 0m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077 1.41-.513m14.095-5.13 1.41-.513M5.106 17.785l1.15-.964m11.49-9.642 1.149-.964M7.501 19.795l.75-1.3m7.5-12.99.75-1.3m-6.063 16.658.26-1.477m2.605-14.772.26-1.477m0 17.726-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205 12 12m6.894 5.785-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* No custom styles needed - all styles are inline Tailwind classes */
</style>

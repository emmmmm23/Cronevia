<script setup lang="ts">
/**
 * PhotoUpload — Reusable photo upload component for journal entries, trips, and memories.
 * 
 * Features:
 * - Drag & drop support
 * - Multiple file selection
 * - Image preview
 * - File validation (type, size)
 * - Remove individual photos
 * - Secure uploads via API
 */
import { ref, computed } from 'vue'
import type { Media } from '@/types'

interface Props {
  modelValue: File[]
  existingPhotos?: Media[]
  maxFiles?: number
  maxFileSize?: number // in MB
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: File[]): void
  (e: 'remove-existing', photoId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  existingPhotos: () => [],
  maxFiles: 10,
  maxFileSize: 10,
  disabled: false,
})

const emit = defineEmits<Emits>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const error = ref('')

const totalPhotos = computed(() => {
  return props.modelValue.length + props.existingPhotos.length
})

const canAddMore = computed(() => {
  return totalPhotos.value < props.maxFiles && !props.disabled
})

// Generate preview URLs for new files
const previews = computed(() => {
  return props.modelValue.map(file => ({
    file,
    url: URL.createObjectURL(file),
    name: file.name,
  }))
})

function openFilePicker() {
  if (!canAddMore.value) return
  fileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    processFiles(Array.from(target.files))
  }
  // Reset input so same file can be selected again
  target.value = ''
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  if (!canAddMore.value) return
  
  const files = event.dataTransfer?.files
  if (files) {
    processFiles(Array.from(files))
  }
}

function processFiles(files: File[]) {
  error.value = ''
  
  // Filter valid image files
  const validFiles: File[] = []
  
  for (const file of files) {
    // Check file type
    if (!file.type.startsWith('image/')) {
      error.value = 'Only image files are allowed.'
      continue
    }
    
    // Check allowed formats
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      error.value = 'Only JPG, PNG, and WEBP images are allowed.'
      continue
    }
    
    // Check file size
    const maxBytes = props.maxFileSize * 1024 * 1024
    if (file.size > maxBytes) {
      error.value = `Images must be smaller than ${props.maxFileSize}MB.`
      continue
    }
    
    // Check total count
    if (totalPhotos.value + validFiles.length >= props.maxFiles) {
      error.value = `You can only upload up to ${props.maxFiles} photos.`
      break
    }
    
    validFiles.push(file)
  }
  
  if (validFiles.length > 0) {
    emit('update:modelValue', [...props.modelValue, ...validFiles])
  }
}

function removeNew(index: number) {
  const updated = [...props.modelValue]
  updated.splice(index, 1)
  emit('update:modelValue', updated)
}

function removeExisting(photoId: string) {
  emit('remove-existing', photoId)
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  if (canAddMore.value) {
    isDragging.value = true
  }
}

function handleDragLeave() {
  isDragging.value = false
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <label class="block text-xs font-semibold uppercase tracking-wider text-[#6b4423]">
        Photos <span class="normal-case font-normal text-[#a68e73]">(optional)</span>
      </label>
      <span class="text-xs text-[#a68e73]">
        {{ totalPhotos }} / {{ maxFiles }}
      </span>
    </div>

    <!-- Error message -->
    <div v-if="error" class="mb-3 px-3 py-2 bg-[#fdf2f3] border border-[#eeaab5] rounded text-xs text-[#7B0323]">
      {{ error }}
    </div>

    <!-- Existing photos -->
    <div v-if="existingPhotos.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
      <div
        v-for="photo in existingPhotos"
        :key="photo.id"
        class="relative aspect-square bg-[#f5ebdd] border border-[#d7c7b3] rounded overflow-hidden group"
      >
        <img
          :src="`/storage/${photo.path}`"
          :alt="photo.original_name"
          class="w-full h-full object-cover"
        />
        <button
          v-if="!disabled"
          type="button"
          class="absolute top-2 right-2 w-6 h-6 bg-[#7B0323] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#5a0019]"
          :aria-label="`Remove ${photo.original_name}`"
          @click="removeExisting(photo.id)"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- New photo previews -->
    <div v-if="previews.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
      <div
        v-for="(preview, idx) in previews"
        :key="idx"
        class="relative aspect-square bg-[#f5ebdd] border border-[#d7c7b3] rounded overflow-hidden group"
      >
        <img
          :src="preview.url"
          :alt="preview.name"
          class="w-full h-full object-cover"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <button
          type="button"
          class="absolute top-2 right-2 w-6 h-6 bg-[#7B0323] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#5a0019]"
          :aria-label="`Remove ${preview.name}`"
          @click="removeNew(idx)"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <div class="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 text-white text-[10px] truncate opacity-0 group-hover:opacity-100 transition-opacity">
          {{ preview.name }}
        </div>
      </div>
    </div>

    <!-- Upload area -->
    <div
      v-if="canAddMore"
      :class="[
        'relative border-2 border-dashed rounded-sm transition-colors',
        isDragging
          ? 'border-[#7B0323] bg-[#7B0323]/5'
          : 'border-[#d7c7b3] bg-[#fdfaf5] hover:border-[#7B0323]',
      ]"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        class="sr-only"
        @change="handleFileSelect"
      />
      <button
        type="button"
        :disabled="disabled"
        class="w-full px-4 py-8 text-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        @click="openFilePicker"
      >
        <svg class="w-10 h-10 mx-auto mb-2 text-[#c4ad94]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
        <p class="text-sm font-medium text-[#6b4423] mb-1">
          {{ isDragging ? 'Drop photos here' : 'Click to upload or drag and drop' }}
        </p>
        <p class="text-xs text-[#a68e73]">
          JPG, PNG, or WEBP up to {{ maxFileSize }}MB
        </p>
      </button>
    </div>

    <!-- Max reached message -->
    <div v-else-if="totalPhotos >= maxFiles" class="text-center py-4 text-sm text-[#a68e73]">
      Maximum of {{ maxFiles }} photos reached
    </div>
  </div>
</template>

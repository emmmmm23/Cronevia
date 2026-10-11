<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  label?: string
  type?: string
  placeholder?: string
  error?: string | null
  required?: boolean
  disabled?: boolean
  autocomplete?: string
  id?: string
}>(), {
  type: 'text',
  required: false,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// For password fields — toggle visibility
const showPassword = ref(false)
const computedType = computed(() => {
  if (props.type === 'password') return showPassword.value ? 'text' : 'password'
  return props.type
})

const inputId = computed(() => props.id ?? `input-${Math.random().toString(36).slice(2, 8)}`)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label
      v-if="label"
      :for="inputId"
      class="block text-xs font-semibold uppercase tracking-wider text-[#6b4423]"
    >
      {{ label }}
      <span v-if="required" class="text-[#8f1d2c] ml-0.5" aria-label="required">*</span>
    </label>

    <div class="relative">
      <input
        :id="inputId"
        :type="computedType"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :autocomplete="autocomplete"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${inputId}-error` : undefined"
        :class="[
          'w-full bg-[#fdfaf5] border-1.5 rounded text-[#2b1a10] text-sm font-normal',
          'placeholder:text-[#a68e73]',
          'transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-[#8f1d2c]/20',
          type === 'password' ? 'pr-10 pl-3 py-2.5' : 'px-3 py-2.5',
          error
            ? 'border-[#8f1d2c] bg-[#fdf2f3] focus:border-[#8f1d2c]'
            : 'border-[#d7c7b3] focus:border-[#8f1d2c]',
          disabled && 'opacity-60 cursor-not-allowed bg-[#f5ebdd]',
        ]"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />

      <!-- Show/hide password toggle -->
      <button
        v-if="type === 'password'"
        type="button"
        tabindex="-1"
        :aria-label="showPassword ? 'Hide password' : 'Show password'"
        class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#a68e73] hover:text-[#6b4423] transition-colors"
        @click="showPassword = !showPassword"
      >
        <!-- Eye icon (show) -->
        <svg v-if="!showPassword" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <!-- Eye-off icon (hide) -->
        <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
      </button>
    </div>

    <!-- Error message -->
    <p
      v-if="error"
      :id="`${inputId}-error`"
      class="text-xs text-[#8f1d2c] font-medium flex items-center gap-1"
      role="alert"
    >
      <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
      </svg>
      {{ error }}
    </p>
  </div>
</template>

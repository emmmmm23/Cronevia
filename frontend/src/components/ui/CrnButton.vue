<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  fullWidth?: boolean
}>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
  type: 'button',
  fullWidth: false,
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 select-none',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f1d2c]',
      fullWidth ? 'w-full' : '',
      // Size
      size === 'sm' && 'text-sm px-3 py-1.5 rounded',
      size === 'md' && 'text-sm px-5 py-2.5 rounded',
      size === 'lg' && 'text-base px-7 py-3 rounded',
      // Variant
      variant === 'primary' && 'bg-[#8f1d2c] text-[#fdfaf5] border border-[#721520] hover:bg-[#721520] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed',
      variant === 'secondary' && 'bg-transparent text-[#8f1d2c] border-1.5 border-[#8f1d2c] hover:bg-[#fdf2f3] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed',
      variant === 'ghost' && 'bg-transparent text-[#6b4423] border border-transparent hover:bg-[#efe2cf] active:translate-y-px',
      variant === 'danger' && 'bg-[#8f1d2c] text-white border border-[#5a1018] hover:bg-[#5a1018] disabled:opacity-50 disabled:cursor-not-allowed',
    ]"
  >
    <!-- Loading spinner -->
    <svg
      v-if="loading"
      class="animate-spin"
      :class="size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    <slot />
  </button>
</template>

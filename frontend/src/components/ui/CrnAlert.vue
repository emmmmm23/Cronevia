<script setup lang="ts">
defineProps<{
  type?: 'error' | 'warning' | 'success' | 'info'
  message: string
}>()
</script>

<template>
  <div
    role="alert"
    :class="[
      'flex items-start gap-2.5 rounded px-3.5 py-3 text-sm font-medium border',
      type === 'error'   && 'bg-[#fdf2f3] border-[#eeaab5] text-[#721520]',
      type === 'warning' && 'bg-[#fffbeb] border-[#fcd34d] text-[#78350f]',
      type === 'success' && 'bg-[#f0fdf4] border-[#86efac] text-[#166534]',
      type === 'info'    && 'bg-[#eff6ff] border-[#93c5fd] text-[#1e40af]',
      !type              && 'bg-[#fdf2f3] border-[#eeaab5] text-[#721520]',
    ]"
  >
    <!-- Error icon -->
    <svg v-if="!type || type === 'error'" class="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
    </svg>
    <span>{{ message }}</span>
  </div>
</template>

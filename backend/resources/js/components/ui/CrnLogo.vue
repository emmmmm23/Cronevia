<script setup lang="ts">
withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'dark' | 'light' | 'cream'
}>(), {
  size: 'md',
  variant: 'light',
})
</script>

<template>
  <!--
    Official Cronevia logo: distressed vintage serif lettering "CRONEVIA"
    with a pocket watch/clock replacing the letter O.
    Cream/ivory on dark background per the brand identity.
  -->
  <span
    :class="[
      'inline-flex items-center font-bold tracking-tight select-none leading-none',
      size === 'sm' && 'text-xl',
      size === 'md' && 'text-2xl',
      size === 'lg' && 'text-3xl',
      size === 'xl' && 'text-4xl',
      variant === 'light' && 'text-[#fdfaf5]',
      variant === 'dark'  && 'text-[#2b1a10]',
      variant === 'cream' && 'text-[#efe2cf]',
    ]"
    style="font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; letter-spacing: -0.03em;"
    aria-label="Cronevia"
  >
    CR
    <!-- Pocket watch inline SVG replacing the O -->
    <svg
      :class="[
        'inline-block',
        size === 'sm' && 'w-5 h-5 -mx-0.5',
        size === 'md' && 'w-6 h-6 -mx-0.5',
        size === 'lg' && 'w-7 h-7 -mx-0.5',
        size === 'xl' && 'w-8 h-8 -mx-0.5',
      ]"
      viewBox="0 0 32 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <!-- Crown/stem of pocket watch -->
      <rect x="13" y="1" width="6" height="3" rx="1.5"
        :fill="variant === 'light' ? '#fdfaf5' : variant === 'cream' ? '#efe2cf' : '#2b1a10'" />
      <!-- Watch case circle -->
      <circle cx="16" cy="20" r="13" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.9"/>
      <!-- Inner dial -->
      <circle cx="16" cy="20" r="10" stroke="currentColor" stroke-width="0.75" fill="currentColor" fill-opacity="0.08"/>
      <!-- Hour hand -->
      <line x1="16" y1="20" x2="16" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <!-- Minute hand -->
      <line x1="16" y1="20" x2="21" y2="17" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
      <!-- Center dot -->
      <circle cx="16" cy="20" r="1.5" fill="currentColor"/>
      <!-- 12 o'clock tick -->
      <line x1="16" y1="8.5" x2="16" y2="10.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
    </svg>
    NEVIA
  </span>
</template>

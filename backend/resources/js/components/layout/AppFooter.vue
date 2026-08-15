<script setup lang="ts">
import CrnLogo from '@/components/ui/CrnLogo.vue'
const year = new Date().getFullYear()
</script>

<template>
  <footer class="bg-[#2b1a10] text-[#a68e73] border-t border-[#3d2614]">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
      <div class="flex items-center gap-2">
        <CrnLogo size="sm" variant="cream" />
      </div>
      <p class="text-[#6b4423] text-center">
        &copy; {{ year }} Cronevia. Your memories, beautifully kept.
      </p>
      <p class="font-medium tracking-wide uppercase text-[0.625rem] text-[#6b4423] text-center">
        Plan it. Live it. Remember it.
      </p>
    </div>
  </footer>
</template>

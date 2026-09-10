<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const user = computed(() => auth.user)

const health = ref({
  api: 'unknown',
  database: 'unknown',
  storage: 'unknown',
  cache: 'unknown'
})

const loading = ref(false)
</script>

<template>
  <div class="min-h-screen bg-[#f5ebdd]">
    <!-- Header -->
    <section class="bg-[#fdfaf5] border-b border-[#e5d4bb]">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <h1 class="text-3xl sm:text-4xl font-bold text-[#2b1a10] leading-tight" style="font-family:'Playfair Display',Georgia,serif;">
          System Health
        </h1>
        <p class="mt-2 text-base text-[#6b4423]">
          Monitor system services and resources
        </p>
      </div>
    </section>

    <!-- Content -->
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <!-- API Status -->
        <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-[#2b1a10]" style="font-family:'Playfair Display',serif;">API Server</h3>
            <span class="w-3 h-3 rounded-full" :class="health.api === 'healthy' ? 'bg-green-500' : health.api === 'degraded' ? 'bg-yellow-500' : 'bg-gray-400'" />
          </div>
          <p class="text-sm text-[#6b4423] mb-2">Status: <span class="font-semibold">{{ health.api }}</span></p>
          <p class="text-xs text-[#8a5c2e]">Last checked: <span>Loading...</span></p>
        </div>

        <!-- Database Status -->
        <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-[#2b1a10]" style="font-family:'Playfair Display',serif;">Database</h3>
            <span class="w-3 h-3 rounded-full" :class="health.database === 'healthy' ? 'bg-green-500' : health.database === 'degraded' ? 'bg-yellow-500' : 'bg-gray-400'" />
          </div>
          <p class="text-sm text-[#6b4423] mb-2">Status: <span class="font-semibold">{{ health.database }}</span></p>
          <p class="text-xs text-[#8a5c2e]">Last checked: <span>Loading...</span></p>
        </div>

        <!-- Storage Status -->
        <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-[#2b1a10]" style="font-family:'Playfair Display',serif;">Storage</h3>
            <span class="w-3 h-3 rounded-full" :class="health.storage === 'healthy' ? 'bg-green-500' : health.storage === 'degraded' ? 'bg-yellow-500' : 'bg-gray-400'" />
          </div>
          <p class="text-sm text-[#6b4423] mb-2">Status: <span class="font-semibold">{{ health.storage }}</span></p>
          <p class="text-xs text-[#8a5c2e]">Last checked: <span>Loading...</span></p>
        </div>

        <!-- Cache Status -->
        <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-[#2b1a10]" style="font-family:'Playfair Display',serif;">Cache</h3>
            <span class="w-3 h-3 rounded-full" :class="health.cache === 'healthy' ? 'bg-green-500' : health.cache === 'degraded' ? 'bg-yellow-500' : 'bg-gray-400'" />
          </div>
          <p class="text-sm text-[#6b4423] mb-2">Status: <span class="font-semibold">{{ health.cache }}</span></p>
          <p class="text-xs text-[#8a5c2e]">Last checked: <span>Loading...</span></p>
        </div>
      </div>

      <!-- Refresh button -->
      <button 
        :disabled="loading"
        class="bg-[#7B0323] text-[#fdfaf5] px-6 py-2 rounded text-sm font-semibold hover:bg-[#5a0019] disabled:opacity-50 transition-colors"
      >
        {{ loading ? 'Refreshing...' : 'Refresh Status' }}
      </button>
    </div>
  </div>
</template>

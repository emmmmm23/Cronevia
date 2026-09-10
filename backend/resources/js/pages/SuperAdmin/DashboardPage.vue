<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const user = computed(() => auth.user)
</script>

<template>
  <div class="min-h-screen bg-[#f5ebdd]">
    <!-- Header -->
    <section class="bg-[#fdfaf5] border-b border-[#e5d4bb]">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <h1 class="text-3xl sm:text-4xl font-bold text-[#2b1a10] leading-tight" style="font-family:'Playfair Display',Georgia,serif;">
          Super Admin Dashboard
        </h1>
        <p class="mt-2 text-base text-[#6b4423]">
          System overview and administration tools
        </p>
      </div>
    </section>

    <!-- Content -->
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <!-- Stats cards -->
        <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-2">Total Users</p>
          <p class="text-2xl font-bold text-[#7B0323]" style="font-family:'Playfair Display',serif;">-</p>
          <p class="text-xs text-[#8a5c2e] mt-2">Loading...</p>
        </div>

        <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-2">Active Sessions</p>
          <p class="text-2xl font-bold text-[#7B0323]" style="font-family:'Playfair Display',serif;">-</p>
          <p class="text-xs text-[#8a5c2e] mt-2">Loading...</p>
        </div>

        <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-2">System Health</p>
          <p class="text-2xl font-bold text-[#7B0323]" style="font-family:'Playfair Display',serif;">-</p>
          <p class="text-xs text-[#8a5c2e] mt-2">Loading...</p>
        </div>

        <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-2">Audit Logs</p>
          <p class="text-2xl font-bold text-[#7B0323]" style="font-family:'Playfair Display',serif;">-</p>
          <p class="text-xs text-[#8a5c2e] mt-2">Loading...</p>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm p-6">
        <h2 class="text-lg font-bold text-[#2b1a10] mb-4" style="font-family:'Playfair Display',serif;">Quick Actions</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button class="bg-[#7B0323] text-[#fdfaf5] px-4 py-2 rounded text-sm font-semibold hover:bg-[#5a0019] transition-colors">
            View All Users
          </button>
          <button class="bg-[#7B0323] text-[#fdfaf5] px-4 py-2 rounded text-sm font-semibold hover:bg-[#5a0019] transition-colors">
            View Audit Logs
          </button>
          <button class="bg-[#7B0323] text-[#fdfaf5] px-4 py-2 rounded text-sm font-semibold hover:bg-[#5a0019] transition-colors">
            System Health
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

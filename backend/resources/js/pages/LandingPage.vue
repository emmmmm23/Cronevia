<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import CrnLogo from '@/components/ui/CrnLogo.vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'

const auth = useAuthStore()
const isAuthenticated = computed(() => auth.isAuthenticated)
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#f5ebdd]">

    <!-- Navbar -->
    <AppNavbar />

    <!-- Hero section -->
    <main class="flex-1">
      <section class="relative overflow-hidden">

        <!-- Decorative background lines (journal paper feel) -->
        <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div class="absolute top-0 left-0 right-0 h-full"
            style="background-image: repeating-linear-gradient(transparent, transparent 31px, #d7c7b3 31px, #d7c7b3 32px); opacity: 0.3;">
          </div>
        </div>

        <div class="relative max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">

          <!-- Stamp-style label -->
          <div class="inline-flex items-center gap-2 mb-8">
            <span class="text-[#7B0323] border border-[#7B0323] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-sm opacity-80">
              Personal Archive
            </span>
          </div>

          <!-- Main headline -->
          <h1
            class="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#2b1a10] leading-tight mb-6"
            style="font-family: 'Playfair Display', Georgia, serif; letter-spacing: -0.02em;"
          >
            Your journeys,<br />
            <em class="not-italic text-[#7B0323]">written in time.</em>
          </h1>

          <!-- Subheadline -->
          <p class="text-lg sm:text-xl text-[#6b4423] max-w-2xl mx-auto leading-relaxed mb-10">
            A personal journal for the places you've been,<br class="hidden sm:inline" />
            the moments you remember, and the journeys still waiting.
          </p>

          <!-- CTA buttons -->
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <template v-if="isAuthenticated">
              <RouterLink
                :to="{ name: 'home' }"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#7B0323] text-[#fdfaf5] font-semibold text-base px-8 py-3 rounded border border-[#5a0019] hover:bg-[#5a0019] transition-colors shadow-sm"
              >
                Open My Journal
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                </svg>
              </RouterLink>
            </template>
            <template v-else>
              <RouterLink
                :to="{ name: 'register' }"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#7B0323] text-[#fdfaf5] font-semibold text-base px-8 py-3 rounded border border-[#5a0019] hover:bg-[#5a0019] transition-colors shadow-sm"
              >
                Start Writing
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
              </RouterLink>
              <RouterLink
                :to="{ name: 'login' }"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-transparent text-[#7B0323] font-semibold text-base px-8 py-3 rounded border border-[#7B0323] hover:bg-[#fdf2f3] transition-colors"
              >
                Sign In
              </RouterLink>
            </template>
          </div>
        </div>
      </section>

      <!-- Features section -->
      <section class="bg-[#fdfaf5] border-t border-[#e5d4bb]">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">

          <div class="text-center mb-12">
            <h2
              class="text-2xl sm:text-3xl font-bold text-[#2b1a10]"
              style="font-family: 'Playfair Display', Georgia, serif;"
            >
              Everything your memories deserve
            </h2>
            <p class="mt-3 text-[#8a5c2e] max-w-lg mx-auto">
              One place for your journal, trips, photographs, and the moments that matter.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

            <div class="bg-[#f5ebdd] border border-[#d7c7b3] rounded-sm p-6">
              <div class="w-10 h-10 flex items-center justify-center border border-[#c4ad94] rounded text-[#7B0323] mb-4">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <h3 class="font-bold text-[#2b1a10] mb-2" style="font-family: 'Playfair Display', serif;">Travel Journal</h3>
              <p class="text-sm text-[#8a5c2e] leading-relaxed">Write rich journal entries for every trip, day, and moment. Add mood, location, and photographs.</p>
            </div>

            <div class="bg-[#f5ebdd] border border-[#d7c7b3] rounded-sm p-6">
              <div class="w-10 h-10 flex items-center justify-center border border-[#c4ad94] rounded text-[#7B0323] mb-4">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                </svg>
              </div>
              <h3 class="font-bold text-[#2b1a10] mb-2" style="font-family: 'Playfair Display', serif;">Itinerary Builder</h3>
              <p class="text-sm text-[#8a5c2e] leading-relaxed">Plan future trips with structured day-by-day itineraries. Convert plans into memories as you travel.</p>
            </div>

            <div class="bg-[#f5ebdd] border border-[#d7c7b3] rounded-sm p-6">
              <div class="w-10 h-10 flex items-center justify-center border border-[#c4ad94] rounded text-[#7B0323] mb-4">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h3 class="font-bold text-[#2b1a10] mb-2" style="font-family: 'Playfair Display', serif;">Time Capsules</h3>
              <p class="text-sm text-[#8a5c2e] leading-relaxed">Lock memories away to rediscover on a future date. Write letters to your future self.</p>
            </div>

            <div class="bg-[#f5ebdd] border border-[#d7c7b3] rounded-sm p-6">
              <div class="w-10 h-10 flex items-center justify-center border border-[#c4ad94] rounded text-[#7B0323] mb-4">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
              </div>
              <h3 class="font-bold text-[#2b1a10] mb-2" style="font-family: 'Playfair Display', serif;">Memory Archive</h3>
              <p class="text-sm text-[#8a5c2e] leading-relaxed">Store photographs, audio, and video with each memory. Browse your archive chronologically.</p>
            </div>

            <div class="bg-[#f5ebdd] border border-[#d7c7b3] rounded-sm p-6">
              <div class="w-10 h-10 flex items-center justify-center border border-[#c4ad94] rounded text-[#7B0323] mb-4">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
              </div>
              <h3 class="font-bold text-[#2b1a10] mb-2" style="font-family: 'Playfair Display', serif;">Journey Map</h3>
              <p class="text-sm text-[#8a5c2e] leading-relaxed">See all your travels on an interactive map. Replay your journeys day by day with "Take Me Back".</p>
            </div>

            <div class="bg-[#f5ebdd] border border-[#d7c7b3] rounded-sm p-6">
              <div class="w-10 h-10 flex items-center justify-center border border-[#c4ad94] rounded text-[#7B0323] mb-4">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
              </div>
              <h3 class="font-bold text-[#2b1a10] mb-2" style="font-family: 'Playfair Display', serif;">On This Day</h3>
              <p class="text-sm text-[#8a5c2e] leading-relaxed">Receive daily reminders of memories from past years on this same date. Relive old journeys.</p>
            </div>

          </div>
        </div>
      </section>

      <!-- Final CTA -->
      <section class="bg-[#7B0323] text-[#fdfaf5]">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-16 text-center">
          <h2
            class="text-2xl sm:text-3xl font-bold mb-4"
            style="font-family: 'Playfair Display', Georgia, serif;"
          >
            Every journey deserves to be remembered.
          </h2>
          <p class="text-[#fdfaf5]/75 mb-8 text-base">
            Join Cronevia and start building your personal travel archive today.
          </p>
          <RouterLink
            v-if="!isAuthenticated"
            :to="{ name: 'register' }"
            class="inline-flex items-center gap-2 bg-[#fdfaf5] text-[#7B0323] font-semibold text-base px-8 py-3 rounded hover:bg-[#efe2cf] transition-colors border border-white/30"
          >
            Create Free Account
          </RouterLink>
          <RouterLink
            v-else
            :to="{ name: 'home' }"
            class="inline-flex items-center gap-2 bg-[#fdfaf5] text-[#7B0323] font-semibold text-base px-8 py-3 rounded hover:bg-[#efe2cf] transition-colors border border-white/30"
          >
            Go to My Journal
          </RouterLink>
        </div>
      </section>
    </main>

    <AppFooter />
  </div>
</template>

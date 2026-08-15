<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth   = useAuthStore()
const router = useRouter()

const user = computed(() => auth.user)

// Stats come from /api/v1/auth/me response — real database counts
const stats = computed(() => user.value?.stats ?? {
  journal_entries: 0,
  trips:           0,
  memories:        0,
  places:          0,
})

const memberSince = computed(() => {
  if (!user.value?.created_at) return '—'
  return new Date(user.value.created_at).toLocaleDateString('en-PH', {
    month: 'long',
    year:  'numeric',
  })
})

const initial = computed(() =>
  (user.value?.name ?? 'U').charAt(0).toUpperCase()
)

async function handleSignOut() {
  await auth.logout()
  router.push({ name: 'login' })
}

// Refresh stats when profile page is visited
auth.fetchCurrentUser().catch(() => {})
</script>

<template>
  <div class="min-h-screen bg-[#f5ebdd]">

    <!-- Profile hero -->
    <div class="bg-[#fdfaf5] border-b border-[#e5d4bb]">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div class="flex flex-col sm:flex-row gap-6 items-start sm:items-center">

          <!-- Avatar — initial only (no photo stored yet) -->
          <div
            class="w-20 h-20 rounded-full bg-[#7B0323] flex items-center justify-center text-3xl font-bold text-[#fdfaf5] shrink-0 border-4 border-[#fdfaf5] shadow"
            :aria-label="`${user?.name ?? 'User'}'s avatar`"
          >
            {{ initial }}
          </div>

          <div class="flex-1 min-w-0">
            <h1 class="text-2xl font-bold text-[#2b1a10]" style="font-family:'Playfair Display',Georgia,serif;">
              {{ user?.name ?? '—' }}
            </h1>
            <p class="text-sm text-[#8a5c2e] mt-0.5 truncate">{{ user?.email ?? '—' }}</p>
            <p class="text-xs text-[#a68e73] mt-2 uppercase tracking-widest font-semibold">
              Member since {{ memberSince }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">

      <!-- Real stats from database -->
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-4">
          Your Journey
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm px-4 py-4 text-center">
            <p class="text-2xl font-bold text-[#7B0323]" style="font-family:'Playfair Display',serif;">{{ stats.journal_entries }}</p>
            <p class="text-xs text-[#8a5c2e] mt-1">Journal Entries</p>
          </div>
          <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm px-4 py-4 text-center">
            <p class="text-2xl font-bold text-[#7B0323]" style="font-family:'Playfair Display',serif;">{{ stats.trips }}</p>
            <p class="text-xs text-[#8a5c2e] mt-1">Trips</p>
          </div>
          <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm px-4 py-4 text-center">
            <p class="text-2xl font-bold text-[#7B0323]" style="font-family:'Playfair Display',serif;">{{ stats.memories }}</p>
            <p class="text-xs text-[#8a5c2e] mt-1">Memories</p>
          </div>
          <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm px-4 py-4 text-center">
            <p class="text-2xl font-bold text-[#7B0323]" style="font-family:'Playfair Display',serif;">{{ stats.places }}</p>
            <p class="text-xs text-[#8a5c2e] mt-1">Places Visited</p>
          </div>
        </div>

        <!-- New account guidance -->
        <p v-if="stats.journal_entries === 0 && stats.trips === 0" class="text-sm text-[#8a5c2e] italic mt-4 text-center">
          Your journey is just beginning. Write your first entry to start your story.
        </p>
      </section>

      <!-- Account actions -->
      <section aria-labelledby="account-heading">
        <h2 id="account-heading" class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-4">
          Account
        </h2>
        <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm divide-y divide-[#efe2cf]">

          <router-link
            :to="{ name: 'settings' }"
            class="flex items-center justify-between px-5 py-4 text-sm font-medium text-[#2b1a10] hover:bg-[#f5ebdd] transition-colors"
          >
            Account Settings
            <svg class="w-4 h-4 text-[#c4ad94]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
            </svg>
          </router-link>

          <button
            type="button"
            class="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-[#7B0323] hover:bg-[#fdf2f3] transition-colors text-left"
            @click="handleSignOut"
          >
            Sign Out
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

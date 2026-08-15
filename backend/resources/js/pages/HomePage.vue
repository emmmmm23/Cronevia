<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useJournalStore } from '@/stores/journal'
import type { JournalEntry } from '@/types'

const auth    = useAuthStore()
const journal = useJournalStore()

const user      = computed(() => auth.user)
const firstName = computed(() => user.value?.name?.split(' ')[0] ?? 'there')

const hour = new Date().getHours()
const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

// Real data from API
onMounted(() => {
  journal.fetchEntries({ per_page: 3 })
})

const recentEntries = computed(() => journal.entries.slice(0, 3))
const hasEntries    = computed(() => recentEntries.value.length > 0)

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
}

function excerpt(content: string, max = 100): string {
  return content.length > max ? content.slice(0, max).trimEnd() + '…' : content
}
</script>

<template>
  <div class="min-h-screen bg-[#f5ebdd]">

    <!-- Greeting hero -->
    <section class="bg-[#fdfaf5] border-b border-[#e5d4bb]">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <p class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-1">Your personal archive</p>
        <h1 class="text-3xl sm:text-4xl font-bold text-[#2b1a10] leading-tight" style="font-family:'Playfair Display',Georgia,serif;">
          {{ greeting }}, {{ firstName }}.
        </h1>
        <p class="mt-2 text-base text-[#6b4423] max-w-md">
          What will you remember about today?
        </p>
        <div class="mt-6 flex flex-wrap gap-3">
          <RouterLink
            :to="{ name: 'journal.create' }"
            class="inline-flex items-center gap-2 bg-[#7B0323] text-[#fdfaf5] text-sm font-semibold px-5 py-2.5 rounded border border-[#5a0019] hover:bg-[#5a0019] transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
            Write a Memory
          </RouterLink>
          <RouterLink
            :to="{ name: 'trips.create' }"
            class="inline-flex items-center gap-2 bg-transparent text-[#7B0323] text-sm font-semibold px-5 py-2.5 rounded border border-[#7B0323] hover:bg-[#fdf2f3] transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Plan a Trip
          </RouterLink>
        </div>
      </div>
    </section>

    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

      <!-- Recent Journal (real data) -->
      <div class="lg:col-span-2 flex flex-col gap-6">
        <section aria-labelledby="recent-journal-heading">
          <div class="flex items-center justify-between mb-4">
            <h2 id="recent-journal-heading" class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e]">Recent Journal</h2>
            <RouterLink :to="{ name: 'journal' }" class="text-xs text-[#7B0323] hover:underline font-medium">View all</RouterLink>
          </div>

          <!-- Loading -->
          <div v-if="journal.loading" class="flex flex-col gap-3">
            <div v-for="i in 2" :key="i" class="bg-[#fdfaf5] border border-[#e5d4bb] rounded-sm p-4 animate-pulse">
              <div class="h-3 bg-[#e5d4bb] rounded w-28 mb-2" />
              <div class="h-4 bg-[#e5d4bb] rounded w-3/4 mb-2" />
              <div class="h-3 bg-[#e5d4bb] rounded w-full" />
            </div>
          </div>

          <!-- Entries -->
          <div v-else-if="hasEntries" class="flex flex-col gap-3">
            <RouterLink
              v-for="entry in recentEntries"
              :key="entry.id"
              :to="{ name: 'journal.edit', params: { id: entry.id } }"
              class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm px-5 py-4 hover:border-[#c4ad94] hover:shadow-sm transition-all group"
            >
              <div class="flex items-center gap-2 mb-1">
                <span v-if="entry.mood_emoji" class="text-lg leading-none" :aria-label="entry.mood_label ?? entry.mood ?? 'mood'" :title="entry.mood_label ?? entry.mood ?? ''">
                  {{ entry.mood_emoji }}
                </span>
                <time class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e]">
                  {{ formatDate(entry.entry_date) }}
                </time>
              </div>
              <h3 class="text-base font-bold text-[#2b1a10] group-hover:text-[#7B0323] transition-colors mb-1" style="font-family:'Playfair Display',serif;">
                {{ entry.title }}
              </h3>
              <p class="text-sm text-[#6b4423] line-clamp-1">{{ excerpt(entry.content) }}</p>
            </RouterLink>
          </div>

          <!-- Empty state — new user -->
          <div v-else class="bg-[#fdfaf5] border border-dashed border-[#d7c7b3] rounded-sm px-5 py-8 text-center">
            <p class="text-sm font-medium text-[#2b1a10] mb-1" style="font-family:'Playfair Display',serif;">
              Your journal is still empty.
            </p>
            <p class="text-xs text-[#8a5c2e] mb-4">Every story starts with a first page.</p>
            <RouterLink
              :to="{ name: 'journal.create' }"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7B0323] hover:underline"
            >
              Write Your First Entry →
            </RouterLink>
          </div>
        </section>

        <!-- Quick nav cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <RouterLink
            :to="{ name: 'trips' }"
            class="group bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm p-5 hover:border-[#c4ad94] hover:shadow-sm transition-all"
          >
            <div class="w-9 h-9 rounded bg-[#f5ebdd] border border-[#d7c7b3] flex items-center justify-center text-[#7B0323] mb-3">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            </div>
            <h2 class="text-sm font-bold text-[#2b1a10] mb-1" style="font-family:'Playfair Display',serif;">Trips</h2>
            <p class="text-xs text-[#8a5c2e]">Plan journeys and document them day by day.</p>
          </RouterLink>

          <RouterLink
            :to="{ name: 'memories' }"
            class="group bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm p-5 hover:border-[#c4ad94] hover:shadow-sm transition-all"
          >
            <div class="w-9 h-9 rounded bg-[#f5ebdd] border border-[#d7c7b3] flex items-center justify-center text-[#7B0323] mb-3">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
            <h2 class="text-sm font-bold text-[#2b1a10] mb-1" style="font-family:'Playfair Display',serif;">Memories</h2>
            <p class="text-xs text-[#8a5c2e]">Browse photos and moments from your archive.</p>
          </RouterLink>
        </div>
      </div>

      <!-- Right sidebar -->
      <div class="flex flex-col gap-6">

        <!-- Stats (real from API) -->
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-3">Your Archive</h2>
          <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm divide-y divide-[#efe2cf]">
            <div class="flex items-center justify-between px-4 py-3">
              <span class="text-sm text-[#6b4423]">Journal Entries</span>
              <span class="text-sm font-bold text-[#7B0323]" style="font-family:'Playfair Display',serif;">
                {{ user?.stats?.journal_entries ?? 0 }}
              </span>
            </div>
            <div class="flex items-center justify-between px-4 py-3">
              <span class="text-sm text-[#6b4423]">Trips</span>
              <span class="text-sm font-bold text-[#7B0323]" style="font-family:'Playfair Display',serif;">
                {{ user?.stats?.trips ?? 0 }}
              </span>
            </div>
            <div class="flex items-center justify-between px-4 py-3">
              <span class="text-sm text-[#6b4423]">Memories</span>
              <span class="text-sm font-bold text-[#7B0323]" style="font-family:'Playfair Display',serif;">
                {{ user?.stats?.memories ?? 0 }}
              </span>
            </div>
            <div class="flex items-center justify-between px-4 py-3">
              <span class="text-sm text-[#6b4423]">Places</span>
              <span class="text-sm font-bold text-[#7B0323]" style="font-family:'Playfair Display',serif;">
                {{ user?.stats?.places ?? 0 }}
              </span>
            </div>
          </div>
        </section>

        <!-- Timeline / On This Day link -->
        <section>
          <h2 class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-3">Timeline</h2>
          <RouterLink
            :to="{ name: 'onthisday' }"
            class="block bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm px-4 py-4 hover:border-[#c4ad94] hover:shadow-sm transition-all group"
          >
            <p class="text-sm font-bold text-[#2b1a10] group-hover:text-[#7B0323] transition-colors mb-1" style="font-family:'Playfair Display',serif;">
              On This Day
            </p>
            <p class="text-xs text-[#8a5c2e]">See what happened on this date in past years.</p>
          </RouterLink>
        </section>

      </div>
    </div>
  </div>
</template>

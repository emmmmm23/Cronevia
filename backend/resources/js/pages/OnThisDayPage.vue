<script setup lang="ts">
/**
 * OnThisDayPage (Timeline) — fetches the authenticated user's journal entries
 * ordered by entry_date desc and renders them as a chronological timeline.
 * New accounts start with 0 entries and see a branded empty state.
 * No demo data.
 */
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useJournalStore } from '@/stores/journal'
import type { JournalEntry } from '@/types'

const store = useJournalStore()
const activeFilter = ref<'all' | 'journal' | 'trip' | 'memory'>('all')

const filters = [
  { key: 'all',     label: 'All' },
  { key: 'journal', label: 'Journal' },
]

onMounted(() => {
  store.fetchEntries({ per_page: 100 })
})

// Group entries by year then month
interface MonthGroup { month: string; entries: JournalEntry[] }
interface YearGroup  { year: number; months: MonthGroup[] }

const grouped = computed((): YearGroup[] => {
  const map = new Map<number, Map<string, JournalEntry[]>>()

  store.entries.forEach(entry => {
    const d     = new Date(entry.entry_date + 'T00:00:00')
    const year  = d.getFullYear()
    const month = d.toLocaleDateString('en-PH', { month: 'long' })

    if (!map.has(year)) map.set(year, new Map())
    const yearMap = map.get(year)!
    if (!yearMap.has(month)) yearMap.set(month, [])
    yearMap.get(month)!.push(entry)
  })

  return Array.from(map.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, months]) => ({
      year,
      months: Array.from(months.entries()).map(([month, entries]) => ({ month, entries })),
    }))
})

function formatDay(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="min-h-screen bg-[#f5ebdd]">

    <div class="bg-[#fdfaf5] border-b border-[#e5d4bb]">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <p class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-1">Your history</p>
        <h1 class="text-3xl font-bold text-[#2b1a10]" style="font-family:'Playfair Display',Georgia,serif;">Timeline</h1>
        <p class="mt-1 text-sm text-[#6b4423]">A quiet record of where you've been.</p>
        <div class="flex flex-wrap gap-2 mt-6" role="group" aria-label="Filter timeline">
          <button v-for="f in filters" :key="f.key" type="button" :aria-pressed="activeFilter === f.key"
            :class="['px-3 py-1.5 text-xs font-semibold rounded border transition-colors', activeFilter === f.key ? 'bg-[#7B0323] text-[#fdfaf5] border-[#5a0019]' : 'bg-[#fdfaf5] text-[#6b4423] border-[#d7c7b3] hover:border-[#7B0323] hover:text-[#7B0323]']"
            @click="activeFilter = f.key as typeof activeFilter.value">{{ f.label }}</button>
        </div>
      </div>
    </div>

    <div class="max-w-3xl mx-auto px-4 sm:px-6 py-10">

      <!-- Loading -->
      <div v-if="store.loading" class="flex flex-col gap-4">
        <div v-for="i in 3" :key="i" class="flex gap-4 animate-pulse">
          <div class="w-5 h-5 rounded-full bg-[#d7c7b3] shrink-0 mt-1" />
          <div class="flex-1 bg-[#fdfaf5] border border-[#e5d4bb] rounded-sm p-4">
            <div class="h-3 bg-[#e5d4bb] rounded w-32 mb-2" />
            <div class="h-4 bg-[#e5d4bb] rounded w-2/3" />
          </div>
        </div>
      </div>

      <!-- Timeline -->
      <div v-else-if="grouped.length > 0">
        <div v-for="yearGroup in grouped" :key="yearGroup.year" class="mb-10">
          <div class="flex items-center gap-4 mb-6">
            <h2 class="text-2xl font-bold text-[#2b1a10]" style="font-family:'Playfair Display',Georgia,serif;">{{ yearGroup.year }}</h2>
            <div class="flex-1 h-px bg-[#d7c7b3]" aria-hidden="true" />
          </div>

          <div v-for="monthGroup in yearGroup.months" :key="monthGroup.month" class="mb-8">
            <h3 class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-4 pl-7">{{ monthGroup.month }}</h3>

            <div class="relative">
              <div class="absolute left-2.5 top-2 bottom-2 w-px bg-[#d7c7b3]" aria-hidden="true" />
              <div class="flex flex-col gap-4">
                <div v-for="entry in monthGroup.entries" :key="entry.id" class="flex gap-4 items-start">
                  <div class="relative z-10 w-5 h-5 rounded-full border-2 border-[#7B0323] bg-[#fdfaf5] flex items-center justify-center shrink-0 mt-1" aria-hidden="true">
                    <div class="w-1.5 h-1.5 rounded-full bg-[#7B0323]" />
                  </div>
                  <RouterLink
                    :to="{ name: 'journal.edit', params: { id: entry.id } }"
                    class="flex-1 bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm px-4 py-3 hover:border-[#c4ad94] hover:shadow-sm transition-all group"
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <span v-if="entry.mood_emoji" class="text-base" :aria-label="entry.mood_label ?? entry.mood ?? 'mood'">{{ entry.mood_emoji }}</span>
                      <time class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e]">{{ formatDay(entry.entry_date) }}</time>
                    </div>
                    <p class="text-sm font-bold text-[#2b1a10] group-hover:text-[#7B0323] transition-colors leading-snug" style="font-family:'Playfair Display',serif;">
                      {{ entry.title }}
                    </p>
                    <p v-if="entry.location_name" class="text-xs text-[#a68e73] mt-0.5 flex items-center gap-1">
                      <svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/>
                      </svg>
                      {{ entry.location_name }}
                    </p>
                  </RouterLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-20">
        <div class="w-14 h-14 mx-auto mb-5 rounded border border-[#d7c7b3] bg-[#fdfaf5] flex items-center justify-center text-[#c4ad94]">
          <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h3 class="text-base font-bold text-[#2b1a10] mb-1" style="font-family:'Playfair Display',serif;">Your timeline begins here.</h3>
        <p class="text-sm text-[#8a5c2e] mb-5">Start writing and your story will grow with every moment.</p>
        <RouterLink :to="{ name: 'journal.create' }"
          class="inline-flex items-center gap-2 bg-[#7B0323] text-[#fdfaf5] text-sm font-semibold px-5 py-2.5 rounded border border-[#5a0019] hover:bg-[#5a0019] transition-colors">
          Write Your First Entry
        </RouterLink>
      </div>
    </div>
  </div>
</template>

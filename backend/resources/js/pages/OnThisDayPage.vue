<script setup lang="ts">
/**
 * OnThisDayPage (Timeline) — shows chronological history of journals, trips, and memories.
 * Combines all content types into a unified timeline view with filtering options.
 * Includes "On This Day" feature showing historical content from the same date.
 */
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useTimelineStore } from '@/stores/timeline'
import type { JournalEntry, Trip, Memory } from '@/types'

const store = useTimelineStore()
const activeView = ref<'timeline' | 'onthisday'>('timeline')
const activeFilter = ref<'all' | 'journal' | 'trips' | 'memories'>('all')

const filters = [
  { key: 'all',      label: 'All' },
  { key: 'journal',  label: 'Journal' },
  { key: 'trips',    label: 'Trips' },
  { key: 'memories', label: 'Memories' },
]

onMounted(() => {
  store.fetchTimeline()
})

function switchView(view: 'timeline' | 'onthisday') {
  activeView.value = view
  if (view === 'timeline') {
    store.fetchTimeline()
  } else {
    store.fetchOnThisDay()
  }
}

// Unified timeline item type
interface TimelineItem {
  id: number
  type: 'journal' | 'trip' | 'memory'
  date: string
  title: string
  subtitle?: string
  emoji?: string
  location?: string
  coverPhoto?: string
  data: JournalEntry | Trip | Memory
}

// Convert all content to unified timeline items
const allItems = computed((): TimelineItem[] => {
  const items: TimelineItem[] = []

  // Add journals
  if (activeFilter.value === 'all' || activeFilter.value === 'journal') {
    store.journals.forEach(entry => {
      items.push({
        id: entry.id,
        type: 'journal',
        date: entry.entry_date,
        title: entry.title,
        emoji: entry.mood_emoji,
        location: entry.location_name,
        coverPhoto: entry.media?.[0]?.url,
        data: entry,
      })
    })
  }

  // Add trips
  if (activeFilter.value === 'all' || activeFilter.value === 'trips') {
    store.trips.forEach(trip => {
      const coverMedia = trip.media?.find(m => m.is_cover_photo) || trip.media?.[0]
      items.push({
        id: trip.id,
        type: 'trip',
        date: trip.start_date,
        title: trip.name,
        subtitle: trip.description || undefined,
        location: trip.destination,
        coverPhoto: coverMedia?.url,
        data: trip,
      })
    })
  }

  // Add memories
  if (activeFilter.value === 'all' || activeFilter.value === 'memories') {
    store.memories.forEach(memory => {
      items.push({
        id: memory.id,
        type: 'memory',
        date: memory.memory_date,
        title: memory.title,
        subtitle: memory.description || undefined,
        location: memory.location,
        coverPhoto: memory.media?.[0]?.url,
        data: memory,
      })
    })
  }

  // Sort by date descending
  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

// Group items by year then month
interface MonthGroup { month: string; items: TimelineItem[] }
interface YearGroup  { year: number; months: MonthGroup[] }

const grouped = computed((): YearGroup[] => {
  const map = new Map<number, Map<string, TimelineItem[]>>()

  allItems.value.forEach(item => {
    const d     = new Date(item.date + 'T00:00:00')
    const year  = d.getFullYear()
    const month = d.toLocaleDateString('en-US', { month: 'long' })

    if (!map.has(year)) map.set(year, new Map())
    const yearMap = map.get(year)!
    if (!yearMap.has(month)) yearMap.set(month, [])
    yearMap.get(month)!.push(item)
  })

  return Array.from(map.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, months]) => ({
      year,
      months: Array.from(months.entries()).map(([month, items]) => ({ month, items })),
    }))
})

function formatDay(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

function getItemLink(item: TimelineItem) {
  if (item.type === 'journal') {
    return { name: 'journal.edit', params: { id: item.id } }
  } else if (item.type === 'trip') {
    return { name: 'trips.show', params: { id: item.id } }
  } else {
    return { name: 'memories.show', params: { id: item.id } }
  }
}

function getItemIcon(type: string) {
  if (type === 'journal') {
    return `<path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />`
  } else if (type === 'trip') {
    return `<path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />`
  } else {
    return `<path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />`
  }
}

function getItemTypeLabel(type: string) {
  if (type === 'journal') return 'Journal Entry'
  if (type === 'trip') return 'Trip'
  return 'Memory'
}
</script>

<template>
  <div class="min-h-screen bg-[#f5ebdd]">

    <!-- Header -->
    <div class="bg-[#fdfaf5] border-b border-[#e5d4bb]">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <p class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-1">Your history</p>
        <h1 class="text-3xl font-bold text-[#2b1a10]" style="font-family:'Playfair Display',Georgia,serif;">
          {{ activeView === 'timeline' ? 'Timeline' : 'On This Day' }}
        </h1>
        <p class="mt-1 text-sm text-[#6b4423]">
          {{ activeView === 'timeline' ? 'A quiet record of where you\'ve been.' : 'Moments from this day in your past.' }}
        </p>

        <!-- View Toggle -->
        <div class="flex flex-wrap gap-2 mt-6 mb-4" role="group" aria-label="Switch view">
          <button
            type="button"
            :class="['px-4 py-2 text-sm font-semibold rounded border transition-colors', 
              activeView === 'timeline' 
                ? 'bg-[#7B0323] text-[#fdfaf5] border-[#5a0019]' 
                : 'bg-[#fdfaf5] text-[#6b4423] border-[#d7c7b3] hover:border-[#7B0323] hover:text-[#7B0323]']"
            @click="switchView('timeline')"
          >
            Full Timeline
          </button>
          <button
            type="button"
            :class="['px-4 py-2 text-sm font-semibold rounded border transition-colors', 
              activeView === 'onthisday' 
                ? 'bg-[#7B0323] text-[#fdfaf5] border-[#5a0019]' 
                : 'bg-[#fdfaf5] text-[#6b4423] border-[#d7c7b3] hover:border-[#7B0323] hover:text-[#7B0323]']"
            @click="switchView('onthisday')"
          >
            On This Day
          </button>
        </div>

        <!-- Filter Tabs -->
        <div class="flex flex-wrap gap-2" role="group" aria-label="Filter timeline">
          <button 
            v-for="f in filters" 
            :key="f.key" 
            type="button" 
            :aria-pressed="activeFilter === f.key"
            :class="['px-3 py-1.5 text-xs font-semibold rounded border transition-colors', 
              activeFilter === f.key 
                ? 'bg-[#7B0323] text-[#fdfaf5] border-[#5a0019]' 
                : 'bg-[#fdfaf5] text-[#6b4423] border-[#d7c7b3] hover:border-[#7B0323] hover:text-[#7B0323]']"
            @click="activeFilter = f.key as typeof activeFilter.value"
          >
            {{ f.label }}
          </button>
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
            <h2 class="text-2xl font-bold text-[#2b1a10]" style="font-family:'Playfair Display',Georgia,serif;">
              {{ yearGroup.year }}
            </h2>
            <div class="flex-1 h-px bg-[#d7c7b3]" aria-hidden="true" />
          </div>

          <div v-for="monthGroup in yearGroup.months" :key="monthGroup.month" class="mb-8">
            <h3 class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-4 pl-7">
              {{ monthGroup.month }}
            </h3>

            <div class="relative">
              <div class="absolute left-2.5 top-2 bottom-2 w-px bg-[#d7c7b3]" aria-hidden="true" />
              <div class="flex flex-col gap-4">
                <div v-for="item in monthGroup.items" :key="`${item.type}-${item.id}`" class="flex gap-4 items-start">
                  
                  <!-- Timeline dot -->
                  <div 
                    class="relative z-10 w-5 h-5 rounded-full border-2 border-[#7B0323] bg-[#fdfaf5] flex items-center justify-center shrink-0 mt-1" 
                    aria-hidden="true"
                  >
                    <div class="w-1.5 h-1.5 rounded-full bg-[#7B0323]" />
                  </div>

                  <!-- Timeline item card -->
                  <RouterLink
                    :to="getItemLink(item)"
                    class="flex-1 bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm overflow-hidden hover:border-[#c4ad94] hover:shadow-sm transition-all group"
                  >
                    <!-- Cover photo if available -->
                    <div v-if="item.coverPhoto" class="aspect-video w-full bg-[#e5d4bb] overflow-hidden">
                      <img 
                        :src="item.coverPhoto" 
                        :alt="`Cover photo for ${item.title}`" 
                        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <div class="px-4 py-3">
                      <!-- Type badge & date -->
                      <div class="flex items-center gap-2 mb-1 flex-wrap">
                        <span class="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#8a5c2e] bg-[#f5ebdd] px-2 py-0.5 rounded">
                          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true" v-html="getItemIcon(item.type)" />
                          {{ getItemTypeLabel(item.type) }}
                        </span>
                        <time class="text-xs font-semibold uppercase tracking-widest text-[#a68e73]">
                          {{ formatDay(item.date) }}
                        </time>
                      </div>

                      <!-- Title with optional emoji -->
                      <div class="flex items-start gap-2">
                        <span v-if="item.emoji" class="text-lg shrink-0" :aria-label="'mood'">{{ item.emoji }}</span>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-bold text-[#2b1a10] group-hover:text-[#7B0323] transition-colors leading-snug" 
                             style="font-family:'Playfair Display',serif;">
                            {{ item.title }}
                          </p>
                          <p v-if="item.subtitle" class="text-xs text-[#6b4423] mt-1 line-clamp-2">
                            {{ item.subtitle }}
                          </p>
                        </div>
                      </div>

                      <!-- Location -->
                      <p v-if="item.location" class="text-xs text-[#a68e73] mt-2 flex items-center gap-1">
                        <svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/>
                        </svg>
                        {{ item.location }}
                      </p>
                    </div>
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
        <h3 class="text-base font-bold text-[#2b1a10] mb-1" style="font-family:'Playfair Display',serif;">
          {{ activeView === 'onthisday' ? 'No memories from this day yet.' : 'Your timeline begins here.' }}
        </h3>
        <p class="text-sm text-[#8a5c2e] mb-5">
          {{ activeView === 'onthisday' 
            ? 'Create entries and memories to see what happened on this day in past years.' 
            : 'Start writing and your story will grow with every moment.' 
          }}
        </p>
        <RouterLink 
          v-if="activeView === 'timeline'"
          :to="{ name: 'journal.create' }"
          class="inline-flex items-center gap-2 bg-[#7B0323] text-[#fdfaf5] text-sm font-semibold px-5 py-2.5 rounded border border-[#5a0019] hover:bg-[#5a0019] transition-colors"
        >
          Write Your First Entry
        </RouterLink>
      </div>
    </div>
  </div>
</template>

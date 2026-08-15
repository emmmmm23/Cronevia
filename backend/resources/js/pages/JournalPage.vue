<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useJournalStore } from '@/stores/journal'
import type { JournalEntry } from '@/types'

const store  = useJournalStore()
const search = ref('')
const activeMood = ref('')

const moods = [
  { key: '',          label: 'All' },
  { key: 'happy',     label: 'Happy' },
  { key: 'excited',   label: 'Excited' },
  { key: 'peaceful',  label: 'Peaceful' },
  { key: 'nostalgic', label: 'Nostalgic' },
  { key: 'sad',       label: 'Sad' },
  { key: 'anxious',   label: 'Anxious' },
  { key: 'neutral',   label: 'Neutral' },
]

onMounted(() => {
  store.fetchEntries()
})

const filtered = computed(() => {
  return store.entries.filter((entry: JournalEntry) => {
    const matchesSearch =
      !search.value ||
      entry.title.toLowerCase().includes(search.value.toLowerCase()) ||
      entry.content.toLowerCase().includes(search.value.toLowerCase())
    const matchesMood =
      !activeMood.value ||
      entry.mood === activeMood.value
    return matchesSearch && matchesMood
  })
})

function excerpt(content: string, max = 140): string {
  return content.length > max ? content.slice(0, max).trimEnd() + '…' : content
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatSaved(isoStr: string): string {
  const d = new Date(isoStr)
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
}
</script>

<template>
  <div class="min-h-screen bg-[#f5ebdd]">

    <!-- Page header -->
    <div class="bg-[#fdfaf5] border-b border-[#e5d4bb]">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-1">Your words</p>
            <h1 class="text-3xl font-bold text-[#2b1a10]" style="font-family:'Playfair Display',Georgia,serif;">
              Journal
            </h1>
            <p class="mt-1 text-sm text-[#6b4423]">Your pages, your moments, your story.</p>
          </div>
          <RouterLink
            :to="{ name: 'journal.create' }"
            class="inline-flex items-center gap-2 bg-[#7B0323] text-[#fdfaf5] text-sm font-semibold px-5 py-2.5 rounded border border-[#5a0019] hover:bg-[#5a0019] transition-colors shrink-0"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
            Write an Entry
          </RouterLink>
        </div>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8">

      <!-- Loading state -->
      <div v-if="store.loading" class="flex flex-col gap-4">
        <div v-for="i in 3" :key="i" class="bg-[#fdfaf5] border border-[#e5d4bb] rounded-sm p-5 animate-pulse">
          <div class="h-3 bg-[#e5d4bb] rounded w-32 mb-3" />
          <div class="h-5 bg-[#e5d4bb] rounded w-2/3 mb-2" />
          <div class="h-3 bg-[#e5d4bb] rounded w-full mb-1" />
          <div class="h-3 bg-[#e5d4bb] rounded w-4/5" />
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="store.error" class="text-center py-16">
        <p class="text-sm text-[#8f1d2c] mb-4">{{ store.error }}</p>
        <button
          type="button"
          class="text-sm font-semibold text-[#7B0323] hover:underline"
          @click="store.fetchEntries()"
        >
          Try Again
        </button>
      </div>

      <template v-else>
        <!-- Search + mood filter -->
        <div v-if="store.entries.length > 0" class="flex flex-col sm:flex-row gap-3 mb-6">
          <div class="relative flex-1 max-w-xs">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a68e73]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              v-model="search"
              type="search"
              placeholder="Search entries…"
              aria-label="Search journal entries"
              class="w-full pl-9 pr-3 py-2.5 text-sm bg-[#fdfaf5] border border-[#d7c7b3] rounded text-[#2b1a10] placeholder:text-[#a68e73] focus:outline-none focus:border-[#7B0323] focus:ring-2 focus:ring-[#7B0323]/10 transition"
            />
          </div>
          <div class="flex flex-wrap gap-2" role="group" aria-label="Filter by mood">
            <button
              v-for="m in moods"
              :key="m.key"
              type="button"
              :aria-pressed="activeMood === m.key"
              :class="[
                'px-3 py-1.5 text-xs font-semibold rounded border transition-colors',
                activeMood === m.key
                  ? 'bg-[#7B0323] text-[#fdfaf5] border-[#5a0019]'
                  : 'bg-[#fdfaf5] text-[#6b4423] border-[#d7c7b3] hover:border-[#7B0323] hover:text-[#7B0323]',
              ]"
              @click="activeMood = m.key"
            >
              {{ m.label }}
            </button>
          </div>
        </div>

        <!-- Entries -->
        <div v-if="filtered.length > 0" class="flex flex-col gap-5">
          <article
            v-for="entry in filtered"
            :key="entry.id"
            class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm hover:border-[#c4ad94] hover:shadow-md transition-all duration-200 overflow-hidden"
          >
            <div class="px-6 py-5">
              <!-- Date row -->
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
                <span class="text-xl" v-if="entry.mood_emoji" :title="entry.mood_label ?? entry.mood ?? ''" :aria-label="entry.mood_label ?? entry.mood ?? 'mood'">
                  {{ entry.mood_emoji }}
                </span>
                <time class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e]">
                  {{ formatDate(entry.entry_date) }}
                </time>
                <span v-if="entry.location_name" class="text-xs text-[#a68e73] flex items-center gap-1">
                  <svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/>
                  </svg>
                  {{ entry.location_name }}
                </span>
              </div>

              <!-- Title -->
              <h2 class="text-lg font-bold text-[#2b1a10] mb-2 leading-snug" style="font-family:'Playfair Display',Georgia,serif;">
                {{ entry.title }}
              </h2>

              <!-- Excerpt — plain text only, no v-html (XSS protection) -->
              <p class="text-sm text-[#6b4423] leading-relaxed line-clamp-2 mb-4 whitespace-pre-line">
                {{ excerpt(entry.content) }}
              </p>

              <!-- Footer -->
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="text-xs text-[#c4ad94]">
                  Saved {{ formatSaved(entry.updated_at) }}
                </p>
                <RouterLink
                  :to="{ name: 'journal.edit', params: { id: entry.id } }"
                  class="text-xs font-semibold text-[#7B0323] hover:underline inline-flex items-center gap-1"
                >
                  Read Entry
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                  </svg>
                </RouterLink>
              </div>
            </div>
            <div class="h-0.5 bg-gradient-to-r from-[#7B0323]/20 via-[#7B0323]/40 to-transparent" aria-hidden="true" />
          </article>
        </div>

        <!-- Empty state — no filter active -->
        <div v-else-if="store.entries.length === 0 && !search && !activeMood" class="text-center py-20">
          <div class="w-16 h-16 mx-auto mb-5 rounded border border-[#d7c7b3] bg-[#fdfaf5] flex items-center justify-center text-[#c4ad94]">
            <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.25" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-[#2b1a10] mb-2" style="font-family:'Playfair Display',serif;">
            Your journal is still empty.
          </h3>
          <p class="text-sm text-[#8a5c2e] mb-6">Every story starts with a first page.</p>
          <RouterLink
            :to="{ name: 'journal.create' }"
            class="inline-flex items-center gap-2 bg-[#7B0323] text-[#fdfaf5] text-sm font-semibold px-6 py-3 rounded border border-[#5a0019] hover:bg-[#5a0019] transition-colors"
          >
            Write Your First Entry
          </RouterLink>
        </div>

        <!-- Empty state — search/filter active -->
        <div v-else class="text-center py-16">
          <p class="text-sm text-[#8a5c2e]">No entries match your search.</p>
          <button type="button" class="mt-3 text-xs font-semibold text-[#7B0323] hover:underline" @click="search = ''; activeMood = ''">
            Clear filters
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

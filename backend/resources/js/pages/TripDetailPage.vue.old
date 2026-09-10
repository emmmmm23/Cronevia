<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import api from '@/services/api.service'
import type { Trip, JournalEntry, Memory } from '@/types'

const route  = useRoute()
const tripId = route.params.id as string

const trip     = ref<Trip | null>(null)
const journals = ref<JournalEntry[]>([])
const memories = ref<Memory[]>([])
const loading  = ref(false)
const error    = ref('')

onMounted(async () => {
  loading.value = true
  error.value   = ''
  try {
    const [tripRes, journalRes, memoryRes] = await Promise.all([
      api.get<{ data: Trip }>(`/trips/${tripId}`),
      api.get<{ data: JournalEntry[] }>('/journal', { params: { trip_id: tripId, per_page: 50 } }),
      api.get<{ data: Memory[] }>('/memories', { params: { per_page: 50 } }),
    ])
    trip.value     = tripRes.data.data
    journals.value = journalRes.data.data
    // Filter memories by trip_id client-side (API may not support trip_id filter on memories yet)
    memories.value = memoryRes.data.data.filter((m: Memory) => m.trip_id === tripId)
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status
    if (status === 403 || status === 404) {
      error.value = 'This trip could not be found or you do not have access to it.'
    } else {
      error.value = `We couldn't load this trip right now. Please try again.`
    }
  } finally {
    loading.value = false
  }
})

const statusLabel: Record<string, string> = {
  planning: 'Upcoming', active: 'Ongoing', completed: 'Completed', archived: 'Archived',
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="min-h-screen bg-[#f5ebdd]">

    <!-- Loading skeleton -->
    <div v-if="loading" class="max-w-4xl mx-auto px-4 sm:px-6 py-10 animate-pulse">
      <div class="h-4 bg-[#e5d4bb] rounded w-24 mb-6" />
      <div class="h-8 bg-[#e5d4bb] rounded w-2/3 mb-3" />
      <div class="h-4 bg-[#e5d4bb] rounded w-1/3 mb-8" />
      <div class="h-48 bg-[#fdfaf5] border border-[#e5d4bb] rounded-sm" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
      <p class="text-sm text-[#7B0323] mb-4">{{ error }}</p>
      <RouterLink :to="{ name: 'trips' }" class="text-sm font-semibold text-[#7B0323] hover:underline">Back to Trips</RouterLink>
    </div>

    <!-- Trip -->
    <div v-else-if="trip">
      <div class="bg-[#fdfaf5] border-b border-[#e5d4bb]">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <RouterLink :to="{ name: 'trips' }" class="inline-flex items-center gap-1 text-xs text-[#8a5c2e] hover:text-[#7B0323] mb-4 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            All Trips
          </RouterLink>
          <span class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-2 block">{{ statusLabel[trip.status] ?? trip.status }}</span>
          <h1 class="text-3xl font-bold text-[#2b1a10] uppercase tracking-wide" style="font-family:'Playfair Display',Georgia,serif; letter-spacing:0.04em;">
            {{ trip.title }}
          </h1>
          <div class="flex flex-wrap items-center gap-3 mt-2">
            <span class="text-sm text-[#8a5c2e]">{{ formatDate(trip.start_date) }}<span v-if="trip.end_date"> – {{ formatDate(trip.end_date) }}</span></span>
          </div>
          <p v-if="trip.description" class="mt-3 text-sm text-[#6b4423] italic max-w-lg">"{{ trip.description }}"</p>
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2">
          <h2 class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-4">About this trip</h2>
          <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm px-5 py-4">
            <p class="text-sm text-[#6b4423]">{{ trip.description || 'No description added yet.' }}</p>
          </div>
        </div>

        <div class="flex flex-col gap-6">
          <!-- Journal entries for this trip -->
          <section aria-labelledby="trip-journals">
            <h2 id="trip-journals" class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-3">Journal Entries</h2>
            <div v-if="journals.length > 0" class="flex flex-col gap-2">
              <RouterLink v-for="j in journals" :key="j.id" :to="{ name: 'journal.edit', params: { id: j.id } }"
                class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm px-4 py-3 hover:border-[#c4ad94] hover:shadow-sm transition-all">
                <div class="flex items-center gap-1.5 mb-0.5">
                  <span v-if="j.mood_emoji" class="text-sm">{{ j.mood_emoji }}</span>
                  <p class="text-xs text-[#a68e73]">{{ formatDate(j.entry_date) }}</p>
                </div>
                <p class="text-sm font-bold text-[#2b1a10]" style="font-family:'Playfair Display',serif;">{{ j.title }}</p>
              </RouterLink>
            </div>
            <p v-else class="text-sm text-[#a68e73] italic">No journal entries yet.</p>
          </section>

          <!-- Memories for this trip -->
          <section aria-labelledby="trip-memories">
            <h2 id="trip-memories" class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-3">Memories</h2>
            <div v-if="memories.length > 0" class="flex flex-col gap-2">
              <RouterLink v-for="m in memories" :key="m.id" :to="{ name: 'memories.show', params: { id: m.id } }"
                class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm px-4 py-3 hover:border-[#c4ad94] hover:shadow-sm transition-all">
                <p class="text-xs text-[#a68e73] mb-0.5">{{ formatDate(m.memory_date) }}</p>
                <p class="text-sm font-bold text-[#2b1a10]" style="font-family:'Playfair Display',serif;">{{ m.title }}</p>
              </RouterLink>
            </div>
            <p v-else class="text-sm text-[#a68e73] italic">No memories linked yet.</p>
          </section>
        </div>
      </div>
    </div>

    <!-- Not found -->
    <div v-else class="text-center py-20 max-w-md mx-auto px-4">
      <p class="text-base font-bold text-[#2b1a10] mb-2" style="font-family:'Playfair Display',serif;">Trip not found.</p>
      <RouterLink :to="{ name: 'trips' }" class="text-sm text-[#7B0323] hover:underline">Back to Trips</RouterLink>
    </div>
  </div>
</template>

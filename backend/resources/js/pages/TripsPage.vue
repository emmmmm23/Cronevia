<script setup lang="ts">
/**
 * TripsPage — fetches the authenticated user's trips from the API.
 * New accounts start with 0 trips and see a proper empty state.
 * No demo data is displayed.
 */
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/services/api.service'
import type { Trip } from '@/types'

const trips   = ref<Trip[]>([])
const loading = ref(false)
const error   = ref('')
const activeFilter = ref<'all' | 'planning' | 'active' | 'completed' | 'archived'>('all')

const filters = [
  { key: 'all',       label: 'All Trips' },
  { key: 'planning',  label: 'Upcoming' },
  { key: 'active',    label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
]

onMounted(fetchTrips)

async function fetchTrips() {
  loading.value = true
  error.value   = ''
  try {
    const { data } = await api.get<{ data: Trip[] }>('/trips')
    trips.value = data.data
  } catch {
    error.value = `We couldn't load your trips right now. Please try again.`
  } finally {
    loading.value = false
  }
}

const filtered = computed(() =>
  activeFilter.value === 'all'
    ? trips.value
    : trips.value.filter(t => t.status === activeFilter.value)
)

const statusLabel: Record<string, string> = {
  planning:  'Upcoming',
  active:    'Ongoing',
  completed: 'Completed',
  archived:  'Archived',
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="min-h-screen bg-[#f5ebdd]">

    <div class="bg-[#fdfaf5] border-b border-[#e5d4bb]">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-1">Your journeys</p>
            <h1 class="text-3xl font-bold text-[#2b1a10]" style="font-family:'Playfair Display',Georgia,serif;">Trips</h1>
            <p class="mt-1 text-sm text-[#6b4423]">Places you've been, and places you're planning to go.</p>
          </div>
          <RouterLink
            :to="{ name: 'trips.create' }"
            class="inline-flex items-center gap-2 bg-[#7B0323] text-[#fdfaf5] text-sm font-semibold px-5 py-2.5 rounded border border-[#5a0019] hover:bg-[#5a0019] transition-colors shrink-0"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Plan a Trip
          </RouterLink>
        </div>

        <div class="flex gap-1 mt-6 border-b border-[#e5d4bb] -mb-px" role="tablist">
          <button
            v-for="f in filters" :key="f.key" type="button" role="tab"
            :aria-selected="activeFilter === f.key"
            :class="['px-4 py-2 text-sm font-medium border-b-2 transition-colors', activeFilter === f.key ? 'border-[#7B0323] text-[#7B0323]' : 'border-transparent text-[#8a5c2e] hover:text-[#2b1a10]']"
            @click="activeFilter = f.key as typeof activeFilter.value"
          >{{ f.label }}</button>
        </div>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8">

      <!-- Loading -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div v-for="i in 2" :key="i" class="bg-[#fdfaf5] border border-[#e5d4bb] rounded-sm p-5 animate-pulse">
          <div class="h-3 bg-[#e5d4bb] rounded w-20 mb-3" />
          <div class="h-5 bg-[#e5d4bb] rounded w-3/4 mb-2" />
          <div class="h-3 bg-[#e5d4bb] rounded w-1/2" />
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-16">
        <p class="text-sm text-[#7B0323] mb-4">{{ error }}</p>
        <button type="button" class="text-sm font-semibold text-[#7B0323] hover:underline" @click="fetchTrips">Try Again</button>
      </div>

      <!-- Trips -->
      <div v-else-if="filtered.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <article
          v-for="trip in filtered" :key="trip.id"
          class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm hover:border-[#c4ad94] hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden"
        >
          <div class="h-1.5"
            :class="trip.status === 'completed' ? 'bg-[#7B0323]' : trip.status === 'active' ? 'bg-[#a97840]' : 'bg-[#c4ad94]'"
            aria-hidden="true"
          />
          <div class="p-5 flex-1 flex flex-col">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold uppercase tracking-widest"
                :class="{'text-[#7B0323]': trip.status === 'completed', 'text-[#a97840]': trip.status === 'active', 'text-[#6b8a5c]': trip.status === 'planning'}">
                {{ statusLabel[trip.status] ?? trip.status }}
              </span>
              <span class="text-xs text-[#a68e73]">
                {{ formatDate(trip.start_date) }}<span v-if="trip.end_date"> – {{ formatDate(trip.end_date) }}</span>
              </span>
            </div>
            <h2 class="text-lg font-bold text-[#2b1a10] mb-2 uppercase tracking-wide leading-tight" style="font-family:'Playfair Display',Georgia,serif; letter-spacing:0.04em;">
              {{ trip.title }}
            </h2>
            <p v-if="trip.description" class="text-sm text-[#6b4423] italic line-clamp-2 mb-4 mt-auto">
              "{{ trip.description }}"
            </p>
            <RouterLink
              :to="{ name: 'trips.show', params: { id: trip.id } }"
              class="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7B0323] hover:underline mt-auto"
            >
              {{ trip.status === 'completed' ? 'View Journey' : 'View Trip' }}
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
              </svg>
            </RouterLink>
          </div>
        </article>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-20">
        <div class="w-14 h-14 mx-auto mb-5 rounded border border-[#d7c7b3] bg-[#fdfaf5] flex items-center justify-center text-[#c4ad94]">
          <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
          </svg>
        </div>
        <h3 class="text-base font-bold text-[#2b1a10] mb-1" style="font-family:'Playfair Display',serif;">
          {{ activeFilter !== 'all' ? 'No trips here.' : 'No journeys planned yet.' }}
        </h3>
        <p class="text-sm text-[#8a5c2e] mb-5">
          {{ activeFilter !== 'all' ? 'Try a different filter.' : 'Perhaps somewhere is waiting for you.' }}
        </p>
        <RouterLink v-if="activeFilter === 'all'" :to="{ name: 'trips.create' }"
          class="inline-flex items-center gap-2 bg-[#7B0323] text-[#fdfaf5] text-sm font-semibold px-5 py-2.5 rounded border border-[#5a0019] hover:bg-[#5a0019] transition-colors">
          Plan Your First Trip
        </RouterLink>
        <button v-else type="button" class="text-sm font-semibold text-[#7B0323] hover:underline" @click="activeFilter = 'all'">Clear filter</button>
      </div>
    </div>
  </div>
</template>

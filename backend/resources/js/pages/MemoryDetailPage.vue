<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import api from '@/services/api.service'
import type { Memory, Trip, JournalEntry } from '@/types'

const route    = useRoute()
const memoryId = route.params.id as string

const memory  = ref<Memory | null>(null)
const trip    = ref<Trip | null>(null)
const journal = ref<JournalEntry | null>(null)
const loading = ref(false)
const error   = ref('')

onMounted(async () => {
  loading.value = true
  error.value   = ''
  try {
    const { data } = await api.get<{ data: Memory }>(`/memories/${memoryId}`)
    memory.value = data.data

    // Fetch related trip if linked
    if (memory.value.trip_id) {
      try {
        const tripRes = await api.get<{ data: Trip }>(`/trips/${memory.value.trip_id}`)
        trip.value = tripRes.data.data
      } catch { /* trip may have been deleted */ }
    }

    // Fetch related journal entry if linked
    if (memory.value.journal_entry) {
      journal.value = memory.value.journal_entry
    }
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status
    error.value = (status === 403 || status === 404)
      ? 'This memory could not be found.'
      : `We couldn't load this memory right now. Please try again.`
  } finally {
    loading.value = false
  }
})

function formatDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="min-h-screen bg-[#f5ebdd]">

    <!-- Loading -->
    <div v-if="loading" class="max-w-3xl mx-auto px-4 sm:px-6 py-10 animate-pulse">
      <div class="h-4 bg-[#e5d4bb] rounded w-24 mb-6" />
      <div class="w-full h-56 bg-[#e5d4bb] rounded-sm mb-6" />
      <div class="h-6 bg-[#e5d4bb] rounded w-2/3 mb-3" />
      <div class="h-4 bg-[#e5d4bb] rounded w-1/3" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
      <p class="text-sm text-[#7B0323] mb-4">{{ error }}</p>
      <RouterLink :to="{ name: 'memories' }" class="text-sm font-semibold text-[#7B0323] hover:underline">Back to Memories</RouterLink>
    </div>

    <!-- Memory -->
    <div v-else-if="memory" class="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <RouterLink :to="{ name: 'memories' }" class="inline-flex items-center gap-1 text-xs text-[#8a5c2e] hover:text-[#7B0323] mb-6 transition-colors">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        All Memories
      </RouterLink>

      <!-- Photo area -->
      <div
        class="w-full h-56 sm:h-72 rounded-sm bg-[#efe2cf] border border-[#d7c7b3] flex items-center justify-center mb-6"
        aria-label="Memory photo area"
      >
        <svg class="w-10 h-10 text-[#c4ad94]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.25" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
      </div>

      <!-- Content card -->
      <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm px-6 py-6">
        <time class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] block mb-2">
          {{ formatDate(memory.memory_date) }}
        </time>
        <h1 class="text-2xl font-bold text-[#2b1a10] mb-3" style="font-family:'Playfair Display',Georgia,serif;">
          {{ memory.title }}
        </h1>

        <p v-if="memory.description" class="text-base text-[#6b4423] italic leading-relaxed border-l-2 border-[#d7c7b3] pl-4">
          "{{ memory.description }}"
        </p>

        <!-- Related -->
        <div class="mt-6 pt-5 border-t border-[#efe2cf] flex flex-col gap-3">
          <div v-if="trip">
            <p class="text-xs font-semibold uppercase tracking-wide text-[#a68e73] mb-1">Part of trip</p>
            <RouterLink :to="{ name: 'trips.show', params: { id: trip.id } }"
              class="text-sm font-bold text-[#7B0323] hover:underline" style="font-family:'Playfair Display',serif;">
              {{ trip.title }}
            </RouterLink>
          </div>
          <div v-if="journal">
            <p class="text-xs font-semibold uppercase tracking-wide text-[#a68e73] mb-1">Related journal entry</p>
            <RouterLink :to="{ name: 'journal.edit', params: { id: journal.id } }"
              class="text-sm font-bold text-[#7B0323] hover:underline" style="font-family:'Playfair Display',serif;">
              {{ journal.title }}
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

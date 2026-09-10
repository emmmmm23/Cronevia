import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import type { JournalEntry, Trip, Memory } from '@/types'

export const useTimelineStore = defineStore('timeline', () => {
  const journals = ref<JournalEntry[]>([])
  const trips = ref<Trip[]>([])
  const memories = ref<Memory[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch full timeline data (all journals, trips, memories)
   */
  async function fetchTimeline() {
    loading.value = true
    error.value = null
    try {
      const response = await axios.get('/api/v1/timeline')
      journals.value = response.data.data.journals || []
      trips.value = response.data.data.trips || []
      memories.value = response.data.data.memories || []
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch timeline'
      console.error('Timeline fetch error:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch "On This Day" data (items from same date in previous years)
   */
  async function fetchOnThisDay() {
    loading.value = true
    error.value = null
    try {
      const response = await axios.get('/api/v1/on-this-day')
      journals.value = response.data.data.journal_entries || []
      trips.value = response.data.data.trips || []
      memories.value = response.data.data.memories || []
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch "On This Day" data'
      console.error('On This Day fetch error:', err)
    } finally {
      loading.value = false
    }
  }

  return {
    journals,
    trips,
    memories,
    loading,
    error,
    fetchTimeline,
    fetchOnThisDay,
  }
})

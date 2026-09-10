import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api.service'
import type { Trip, TripDay, ItineraryItem, PaginatedResponse } from '../types'

/**
 * Trips store — all data comes from MySQL via the Laravel API.
 * Handles trips, trip days, and itinerary items (destinations).
 */
export const useTripsStore = defineStore('trips', () => {
  const trips = ref<Trip[]>([])
  const currentTrip = ref<Trip | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const totalPages = ref(1)
  const total = ref(0)

  /**
   * Fetch all trips for the authenticated user
   */
  async function fetchTrips(params?: Record<string, string | number>) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<PaginatedResponse<Trip>>('/trips', { params })
      trips.value = data.data
      total.value = data.meta.total
      totalPages.value = data.meta.last_page
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } }
      if (e?.response?.status === 401) {
        trips.value = []
      } else {
        error.value = `We couldn't load your trips right now. Please try again.`
        console.error('[TripsStore] fetchTrips error:', err)
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch a single trip with its days and itinerary items
   */
  async function fetchTrip(id: string) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<{ data: Trip }>(`/trips/${id}`)
      currentTrip.value = data.data
      return data.data
    } catch (err) {
      error.value = `We couldn't load this trip. Please try again.`
      console.error('[TripsStore] fetchTrip error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new trip
   */
  async function createTrip(payload: Partial<Trip> & { title: string; start_date: string }) {
    saving.value = true
    error.value = null
    try {
      const { data } = await api.post<{ data: Trip }>('/trips', payload)
      const created = data.data
      trips.value = [created, ...trips.value]
      total.value++
      return created
    } finally {
      saving.value = false
    }
  }

  /**
   * Update an existing trip
   */
  async function updateTrip(id: string, payload: Partial<Trip>) {
    saving.value = true
    error.value = null
    try {
      const { data } = await api.put<{ data: Trip }>(`/trips/${id}`, payload)
      const updated = data.data
      const idx = trips.value.findIndex(t => t.id === id)
      if (idx !== -1) trips.value[idx] = updated
      if (currentTrip.value?.id === id) currentTrip.value = updated
      return updated
    } finally {
      saving.value = false
    }
  }

  /**
   * Delete a trip
   */
  async function deleteTrip(id: string) {
    await api.delete(`/trips/${id}`)
    trips.value = trips.value.filter(t => t.id !== id)
    total.value = Math.max(0, total.value - 1)
    if (currentTrip.value?.id === id) currentTrip.value = null
  }

  /**
   * Create a trip day
   */
  async function createTripDay(tripId: string, payload: Partial<TripDay>) {
    const { data } = await api.post<{ data: TripDay }>(`/trips/${tripId}/days`, payload)
    return data.data
  }

  /**
   * Fetch trip days for a trip
   */
  async function fetchTripDays(tripId: string) {
    const { data } = await api.get<{ data: TripDay[] }>(`/trips/${tripId}/days`)
    return data.data
  }

  /**
   * Fetch itinerary items for a trip day
   */
  async function fetchItineraryItems(tripId: string, dayId: string) {
    const { data } = await api.get<{ data: ItineraryItem[] }>(`/trips/${tripId}/days/${dayId}/itinerary`)
    return data.data
  }

  /**
   * Create an itinerary item (destination)
   */
  async function createItineraryItem(tripId: string, dayId: string, payload: Partial<ItineraryItem>) {
    const { data } = await api.post<{ data: ItineraryItem }>(
      `/trips/${tripId}/days/${dayId}/itinerary`,
      payload
    )
    return data.data
  }

  /**
   * Update an itinerary item
   */
  async function updateItineraryItem(
    tripId: string,
    dayId: string,
    itemId: string,
    payload: Partial<ItineraryItem>
  ) {
    const { data } = await api.put<{ data: ItineraryItem }>(
      `/trips/${tripId}/days/${dayId}/itinerary/${itemId}`,
      payload
    )
    return data.data
  }

  /**
   * Delete an itinerary item
   */
  async function deleteItineraryItem(tripId: string, dayId: string, itemId: string) {
    await api.delete(`/trips/${tripId}/days/${dayId}/itinerary/${itemId}`)
  }

  /**
   * Reorder itinerary items
   */
  async function reorderItineraryItems(tripId: string, dayId: string, order: string[]) {
    const { data } = await api.patch<{ data: ItineraryItem[] }>(
      `/trips/${tripId}/days/${dayId}/itinerary/reorder`,
      { order }
    )
    return data.data
  }

  function clearTrips() {
    trips.value = []
    currentTrip.value = null
    total.value = 0
  }

  return {
    trips,
    currentTrip,
    loading,
    saving,
    error,
    total,
    totalPages,
    fetchTrips,
    fetchTrip,
    createTrip,
    updateTrip,
    deleteTrip,
    createTripDay,
    fetchTripDays,
    fetchItineraryItems,
    createItineraryItem,
    updateItineraryItem,
    deleteItineraryItem,
    reorderItineraryItems,
    clearTrips,
  }
})

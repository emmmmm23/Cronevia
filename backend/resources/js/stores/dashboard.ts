import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api.service'

interface DashboardData {
  journal_count: number
  trip_count: number
  memory_count: number
  place_count: number
  recent_journals: Array<{
    id: string
    title: string
    entry_date: string
    mood: string | null
    trip_id: string | null
  }>
  recent_trips: Array<{
    id: string
    title: string
    start_date: string | null
    end_date: string | null
    status: string
  }>
  on_this_day: Array<{
    id: string
    title: string
    memory_date: string
    type: string
  }>
}

/**
 * Dashboard Store
 *
 * Manages dashboard data fetching and state for the authenticated user's home page.
 * All data is retrieved from GET /api/v1/dashboard which is user-isolated server-side.
 */
export const useDashboardStore = defineStore('dashboard', () => {
  const journalCount = ref(0)
  const tripCount = ref(0)
  const memoryCount = ref(0)
  const placeCount = ref(0)
  const recentJournals = ref<DashboardData['recent_journals']>([])
  const recentTrips = ref<DashboardData['recent_trips']>([])
  const onThisDay = ref<DashboardData['on_this_day']>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Computed: isEmpty
   *
   * Returns true if all counts are 0 (new/empty user account).
   * Used to determine whether to show empty state or populated dashboard.
   */
  const isEmpty = computed(
    () =>
      journalCount.value === 0 &&
      tripCount.value === 0 &&
      memoryCount.value === 0 &&
      placeCount.value === 0
  )

  /**
   * Action: fetchDashboardData
   *
   * Fetches dashboard statistics and recent items from GET /api/v1/dashboard.
   *
   * Preconditions:
   *   - User must be authenticated (enforced by API middleware)
   *   - API endpoint returns user-isolated data
   *
   * Postconditions:
   *   - All state fields populated with data from API
   *   - loading set to false
   *   - error cleared on success, set on failure
   *   - No partial state on error (error message shown instead)
   */
  const fetchDashboardData = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      const { data } = await api.get<DashboardData>('/dashboard')

      journalCount.value = data.journal_count
      tripCount.value = data.trip_count
      memoryCount.value = data.memory_count
      placeCount.value = data.place_count
      recentJournals.value = data.recent_journals
      recentTrips.value = data.recent_trips
      onThisDay.value = data.on_this_day
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load dashboard data'
      error.value = message
      console.error('[Dashboard] Error fetching data:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Action: resetDashboardData
   *
   * Clears all dashboard state to prevent data from previous user being visible.
   * Called on logout to ensure private data is not accessible to the next user.
   *
   * Postconditions:
   *   - All counts reset to 0
   *   - All recent item arrays emptied
   *   - on_this_day array emptied
   *   - loading and error cleared
   *   - isEmpty computed returns true
   */
  const resetDashboardData = (): void => {
    journalCount.value = 0
    tripCount.value = 0
    memoryCount.value = 0
    placeCount.value = 0
    recentJournals.value = []
    recentTrips.value = []
    onThisDay.value = []
    loading.value = false
    error.value = null
  }

  return {
    journalCount,
    tripCount,
    memoryCount,
    placeCount,
    recentJournals,
    recentTrips,
    onThisDay,
    isEmpty,
    loading,
    error,
    fetchDashboardData,
    resetDashboardData,
  }
})

import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api.service'
import type { JournalEntry, PaginatedResponse } from '../types'

/**
 * Journal store — all data comes from MySQL via the Laravel API.
 * No demo data. Every entry belongs to the authenticated user.
 */
export const useJournalStore = defineStore('journal', () => {
  const entries    = ref<JournalEntry[]>([])
  const loading    = ref(false)
  const saving     = ref(false)
  const error      = ref<string | null>(null)
  const totalPages = ref(1)
  const total      = ref(0)

  /**
   * Fetch the authenticated user's journal entries from the API.
   * Returns an empty array for brand-new accounts.
   */
  async function fetchEntries(params?: Record<string, string | number>) {
    loading.value = true
    error.value   = null
    try {
      const { data } = await api.get<PaginatedResponse<JournalEntry>>('/journal', { params })
      entries.value  = data.data
      total.value    = data.meta.total
      totalPages.value = data.meta.last_page
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } }
      if (e?.response?.status === 401) {
        entries.value = []  // unauthenticated — clear state
      } else {
        error.value = `We couldn't load your journal right now. Please try again.`
        console.error('[JournalStore] fetchEntries error:', err)
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new journal entry.
   * Returns the created entry on success, throws on failure.
   */
  async function createEntry(payload: Partial<JournalEntry> & { title: string; content: string; entry_date: string }) {
    saving.value = true
    error.value  = null
    try {
      const { data } = await api.post<{ message: string; data: JournalEntry }>('/journal', payload)
      const created = data.data
      // Prepend to list so the new entry appears first
      entries.value = [created, ...entries.value]
      total.value++
      return created
    } finally {
      saving.value = false
    }
  }

  /**
   * Update an existing entry.
   * created_at is never changed — only updated_at (handled by Laravel).
   */
  async function updateEntry(id: string, payload: Partial<JournalEntry>) {
    saving.value = true
    error.value  = null
    try {
      const { data } = await api.put<{ message: string; data: JournalEntry }>(`/journal/${id}`, payload)
      const updated = data.data
      const idx = entries.value.findIndex(e => e.id === id)
      if (idx !== -1) entries.value[idx] = updated
      return updated
    } finally {
      saving.value = false
    }
  }

  /**
   * Delete an entry.
   */
  async function deleteEntry(id: string) {
    await api.delete(`/journal/${id}`)
    entries.value = entries.value.filter(e => e.id !== id)
    total.value = Math.max(0, total.value - 1)
  }

  /**
   * Archive an entry.
   */
  async function archiveEntry(id: string) {
    const { data } = await api.patch<{ message: string; data: JournalEntry }>(`/journal/${id}/archive`)
    const archived = data.data
    // Remove from current list (will be filtered out)
    entries.value = entries.value.filter(e => e.id !== id)
    total.value = Math.max(0, total.value - 1)
    return archived
  }

  /**
   * Restore an archived entry.
   */
  async function restoreEntry(id: string) {
    const { data } = await api.patch<{ message: string; data: JournalEntry }>(`/journal/${id}/restore`)
    const restored = data.data
    // Add back to the list if we're viewing non-archived entries
    entries.value = [restored, ...entries.value]
    total.value++
    return restored
  }

  function clearEntries() {
    entries.value = []
    total.value   = 0
  }

  return {
    entries,
    loading,
    saving,
    error,
    total,
    totalPages,
    fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    archiveEntry,
    restoreEntry,
    clearEntries,
  }
})

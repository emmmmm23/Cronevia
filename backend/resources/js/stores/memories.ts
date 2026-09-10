import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api.service'
import type { Memory, PaginatedResponse } from '../types'

/**
 * Memories store — all data comes from MySQL via the Laravel API.
 */
export const useMemoriesStore = defineStore('memories', () => {
  const memories = ref<Memory[]>([])
  const currentMemory = ref<Memory | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const totalPages = ref(1)
  const total = ref(0)

  /**
   * Fetch memories for the authenticated user
   */
  async function fetchMemories(params?: Record<string, string | number>) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<PaginatedResponse<Memory>>('/memories', { params })
      memories.value = data.data
      total.value = data.meta.total
      totalPages.value = data.meta.last_page
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } }
      if (e?.response?.status === 401) {
        memories.value = []
      } else {
        error.value = `We couldn't load your memories right now. Please try again.`
        console.error('[MemoriesStore] fetchMemories error:', err)
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch a single memory
   */
  async function fetchMemory(id: string) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<{ data: Memory }>(`/memories/${id}`)
      currentMemory.value = data.data
      return data.data
    } catch (err) {
      error.value = `We couldn't load this memory. Please try again.`
      console.error('[MemoriesStore] fetchMemory error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new memory
   */
  async function createMemory(payload: Partial<Memory> & { title: string; memory_date: string }) {
    saving.value = true
    error.value = null
    try {
      const { data } = await api.post<{ message: string; data: Memory }>('/memories', payload)
      const created = data.data
      memories.value = [created, ...memories.value]
      total.value++
      return created
    } finally {
      saving.value = false
    }
  }

  /**
   * Update an existing memory
   */
  async function updateMemory(id: string, payload: Partial<Memory>) {
    saving.value = true
    error.value = null
    try {
      const { data } = await api.put<{ data: Memory }>(`/memories/${id}`, payload)
      const updated = data.data
      const idx = memories.value.findIndex(m => m.id === id)
      if (idx !== -1) memories.value[idx] = updated
      if (currentMemory.value?.id === id) currentMemory.value = updated
      return updated
    } finally {
      saving.value = false
    }
  }

  /**
   * Delete a memory
   */
  async function deleteMemory(id: string) {
    await api.delete(`/memories/${id}`)
    memories.value = memories.value.filter(m => m.id !== id)
    total.value = Math.max(0, total.value - 1)
    if (currentMemory.value?.id === id) currentMemory.value = null
  }

  /**
   * Archive a memory
   */
  async function archiveMemory(id: string) {
    const { data } = await api.patch<{ message: string; data: Memory }>(`/memories/${id}/archive`)
    const archived = data.data
    memories.value = memories.value.filter(m => m.id !== id)
    total.value = Math.max(0, total.value - 1)
    return archived
  }

  /**
   * Restore an archived memory
   */
  async function restoreMemory(id: string) {
    const { data } = await api.patch<{ message: string; data: Memory }>(`/memories/${id}/restore`)
    const restored = data.data
    memories.value = [restored, ...memories.value]
    total.value++
    return restored
  }

  function clearMemories() {
    memories.value = []
    currentMemory.value = null
    total.value = 0
  }

  return {
    memories,
    currentMemory,
    loading,
    saving,
    error,
    total,
    totalPages,
    fetchMemories,
    fetchMemory,
    createMemory,
    updateMemory,
    deleteMemory,
    archiveMemory,
    restoreMemory,
    clearMemories,
  }
})

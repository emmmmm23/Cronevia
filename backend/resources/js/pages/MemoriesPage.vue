<script setup lang="ts">
/**
 * MemoriesPage — CRUD operations for memories with archive functionality.
 * Supports creating, viewing, archiving, and deleting memories.
 */
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useMemoriesStore } from '@/stores/memories'
import type { Memory } from '@/types'

const store = useMemoriesStore()
const router = useRouter()

const viewMode = ref<'active' | 'archived'>('active')
const activeFilter = ref('All')
const filters = ['All', 'Photos', 'Places']

const confirmDelete = ref<string | null>(null)
const confirmArchive = ref<string | null>(null)
const processing = ref(false)

onMounted(() => {
  loadMemories()
})

async function loadMemories() {
  const params = viewMode.value === 'archived' ? { archived: 'true' } : {}
  await store.fetchMemories(params)
}

async function switchView(mode: 'active' | 'archived') {
  viewMode.value = mode
  activeFilter.value = 'All'
  await loadMemories()
}

const filtered = computed(() => {
  if (activeFilter.value === 'Photos') {
    return store.memories.filter(m => m.media && m.media.length > 0)
  }
  return store.memories
})

async function handleArchive(memoryId: string) {
  if (processing.value) return
  processing.value = true
  try {
    await store.archiveMemory(memoryId)
    confirmArchive.value = null
  } catch (err) {
    console.error('Archive failed:', err)
  } finally {
    processing.value = false
  }
}

async function handleRestore(memoryId: string) {
  if (processing.value) return
  processing.value = true
  try {
    await store.restoreMemory(memoryId)
  } catch (err) {
    console.error('Restore failed:', err)
  } finally {
    processing.value = false
  }
}

async function handleDelete(memoryId: string) {
  if (processing.value) return
  processing.value = true
  try {
    await store.deleteMemory(memoryId)
    confirmDelete.value = null
  } catch (err) {
    console.error('Delete failed:', err)
  } finally {
    processing.value = false
  }
}

function formatDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
}

const cardColors = ['#efe2cf', '#e5d4bb', '#d7c7b3', '#c4ad94']
</script>

<template>
  <div class="min-h-screen bg-[#f5ebdd]">

    <div class="bg-[#fdfaf5] border-b border-[#e5d4bb]">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-1">Your archive</p>
            <h1 class="text-3xl font-bold text-[#2b1a10]" style="font-family:'Playfair Display',Georgia,serif;">Memories</h1>
            <p class="mt-1 text-sm text-[#6b4423]">Little moments that became part of your story.</p>
          </div>
          <RouterLink :to="{ name: 'journal.create' }"
            class="inline-flex items-center gap-2 bg-[#7B0323] text-[#fdfaf5] text-sm font-semibold px-5 py-2.5 rounded border border-[#5a0019] hover:bg-[#5a0019] transition-colors shrink-0">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create a Memory
          </RouterLink>
        </div>
        <div class="flex flex-wrap gap-2 mt-6" role="group" aria-label="Filter memories">
          <button v-for="f in filters" :key="f" type="button" :aria-pressed="activeFilter === f"
            :class="['px-3 py-1.5 text-xs font-semibold rounded border transition-colors', activeFilter === f ? 'bg-[#7B0323] text-[#fdfaf5] border-[#5a0019]' : 'bg-[#fdfaf5] text-[#6b4423] border-[#d7c7b3] hover:border-[#7B0323] hover:text-[#7B0323]']"
            @click="activeFilter = f">{{ f }}</button>
        </div>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8">

      <!-- View mode tabs -->
      <div class="flex items-center gap-2 mb-6 border-b border-[#e5d4bb] pb-0">
        <button
          type="button"
          :class="[
            'px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors',
            viewMode === 'active'
              ? 'text-[#7B0323] border-[#7B0323]'
              : 'text-[#a68e73] border-transparent hover:text-[#7B0323]',
          ]"
          @click="switchView('active')"
        >
          Active Memories
        </button>
        <button
          type="button"
          :class="[
            'px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors',
            viewMode === 'archived'
              ? 'text-[#7B0323] border-[#7B0323]'
              : 'text-[#a68e73] border-transparent hover:text-[#7B0323]',
          ]"
          @click="switchView('archived')"
        >
          Archive
        </button>
      </div>

      <!-- Loading -->
      <div v-if="store.loading" class="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div v-for="i in 3" :key="i" class="bg-[#fdfaf5] border border-[#e5d4bb] rounded-sm overflow-hidden animate-pulse">
          <div class="h-32 bg-[#e5d4bb]" />
          <div class="p-4">
            <div class="h-3 bg-[#e5d4bb] rounded w-24 mb-2" />
            <div class="h-4 bg-[#e5d4bb] rounded w-3/4 mb-2" />
            <div class="h-3 bg-[#e5d4bb] rounded w-full" />
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="store.error" class="text-center py-16">
        <p class="text-sm text-[#7B0323] mb-4">{{ store.error }}</p>
        <button type="button" class="text-sm font-semibold text-[#7B0323] hover:underline" @click="loadMemories">Try Again</button>
      </div>

      <!-- Grid -->
      <div v-else-if="filtered.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <article v-for="(memory, i) in filtered" :key="memory.id"
          class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm overflow-hidden">
          
          <!-- Visual header -->
          <div class="h-32 flex items-center justify-center border-b border-[#e5d4bb]"
            :style="{ backgroundColor: cardColors[i % cardColors.length] }" aria-hidden="true">
            <svg v-if="!memory.media || memory.media.length === 0" class="w-8 h-8 text-[#c4ad94]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.25">
              <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            <img v-else :src="`/storage/${memory.media[0].path}`" :alt="memory.title" class="w-full h-full object-cover" />
          </div>

          <!-- Content -->
          <div class="p-5">
            <time class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] block mb-1">
              {{ formatDate(memory.memory_date) }}
            </time>
            <h2 class="text-base font-bold text-[#2b1a10] mb-2" style="font-family:'Playfair Display',Georgia,serif;">
              {{ memory.title }}
            </h2>
            <p v-if="memory.description" class="text-sm text-[#6b4423] italic line-clamp-2 mb-4">
              "{{ memory.description }}"
            </p>
            
            <!-- Actions -->
            <div class="flex items-center gap-3 flex-wrap">
              <RouterLink :to="{ name: 'memories.show', params: { id: memory.id } }"
                class="text-xs font-semibold text-[#7B0323] hover:underline inline-flex items-center gap-1">
                View Memory
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                </svg>
              </RouterLink>
              
              <button
                v-if="viewMode === 'archived'"
                type="button"
                :disabled="processing"
                class="text-xs font-semibold text-[#8a5c2e] hover:text-[#7B0323] hover:underline disabled:opacity-50"
                @click="handleRestore(memory.id)"
              >
                Restore
              </button>
              
              <button
                v-if="viewMode === 'active'"
                type="button"
                :disabled="processing"
                class="text-xs font-semibold text-[#a68e73] hover:text-[#7B0323] hover:underline disabled:opacity-50"
                @click="confirmArchive = memory.id"
              >
                Archive
              </button>
              
              <button
                type="button"
                :disabled="processing"
                class="text-xs font-semibold text-[#c4ad94] hover:text-[#7B0323] hover:underline disabled:opacity-50"
                @click="confirmDelete = memory.id"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Archive confirmation -->
          <div v-if="confirmArchive === memory.id" class="bg-[#fdf2f3] border-t border-[#eeaab5] px-5 py-4">
            <p class="text-sm text-[#7B0323] mb-3">
              <strong>Archive this memory?</strong><br>
              It will be moved to your Archive.
            </p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                :disabled="processing"
                class="px-4 py-2 text-sm font-semibold bg-[#7B0323] text-[#fdfaf5] rounded border border-[#5a0019] hover:bg-[#5a0019] disabled:opacity-50 transition-colors"
                @click="handleArchive(memory.id)"
              >
                Archive Memory
              </button>
              <button
                type="button"
                :disabled="processing"
                class="px-4 py-2 text-sm font-semibold text-[#8a5c2e] hover:text-[#7B0323] disabled:opacity-50"
                @click="confirmArchive = null"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- Delete confirmation -->
          <div v-if="confirmDelete === memory.id" class="bg-[#fdf2f3] border-t border-[#eeaab5] px-5 py-4">
            <p class="text-sm text-[#7B0323] mb-3">
              <strong>Delete this memory?</strong><br>
              This action cannot be undone.
            </p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                :disabled="processing"
                class="px-4 py-2 text-sm font-semibold bg-[#7B0323] text-[#fdfaf5] rounded border border-[#5a0019] hover:bg-[#5a0019] disabled:opacity-50 transition-colors"
                @click="handleDelete(memory.id)"
              >
                Delete Memory
              </button>
              <button
                type="button"
                :disabled="processing"
                class="px-4 py-2 text-sm font-semibold text-[#8a5c2e] hover:text-[#7B0323] disabled:opacity-50"
                @click="confirmDelete = null"
              >
                Cancel
              </button>
            </div>
          </div>
        </article>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-20">
        <div class="w-14 h-14 mx-auto mb-5 rounded border border-[#d7c7b3] bg-[#fdfaf5] flex items-center justify-center text-[#c4ad94]">
          <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path v-if="viewMode === 'active'" stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
        </div>
        <h3 class="text-base font-bold text-[#2b1a10] mb-1" style="font-family:'Playfair Display',serif;">
          {{ viewMode === 'archived' ? 'Your archive is empty.' : (activeFilter !== 'All' ? 'No memories here yet.' : 'No memories yet.') }}
        </h3>
        <p class="text-sm text-[#8a5c2e] mb-5">
          {{ viewMode === 'archived' ? 'Archived memories will appear here.' : (activeFilter !== 'All' ? 'Try a different filter.' : 'The moments worth keeping will appear here.') }}
        </p>
        <RouterLink v-if="activeFilter === 'All' && viewMode === 'active'" :to="{ name: 'journal.create' }"
          class="inline-flex items-center gap-2 bg-[#7B0323] text-[#fdfaf5] text-sm font-semibold px-5 py-2.5 rounded border border-[#5a0019] hover:bg-[#5a0019] transition-colors">
          Create a Memory
        </RouterLink>
        <button v-else-if="activeFilter !== 'All'" type="button" class="text-sm font-semibold text-[#7B0323] hover:underline" @click="activeFilter = 'All'">Clear filter</button>
      </div>
    </div>
  </div>
</template>

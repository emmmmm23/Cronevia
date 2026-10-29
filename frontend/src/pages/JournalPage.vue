<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useJournalStore } from '@/stores/journal'
import type { JournalEntry } from '@/types'

import JournalSharing from '@/components/journal/JournalSharing.vue'
import AppSheet from '@/components/shared/AppSheet.vue'
import {listJournals,manageSharing,type SharedJournal} from '@/services/shared-journals'
import {journalDestination,journalEntryDestination,newJournalEntryDestination,isJournalId} from '@/services/journal-routes'
import {useAuthStore} from '@/stores/auth'
const store=useJournalStore(),route=useRoute(),router=useRouter(),auth=useAuthStore()
const journals=ref<SharedJournal[]>([]),sharingOpen=ref(false),leaveOpen=ref(false),journalError=ref('')
const selectedJournal=computed(()=>route.query.journal?journals.value.find(j=>j.id===route.query.journal):journals.value.find(j=>j.role==='owner'))
const isOwner=computed(()=>selectedJournal.value?.role==='owner'),canWrite=computed(()=>['owner','editor'].includes(selectedJournal.value?.role||''))
async function refreshJournals(){
 try{journals.value=(await listJournals())||[];if(!selectedJournal.value){store.clearEntries();journalError.value='This journal is unavailable or you no longer have access.'}else journalError.value=''}catch(e){journalError.value=(e as Error).message;store.clearEntries()}
}
async function openCollection(){store.clearEntries();viewMode.value='active';search.value='';await refreshJournals();if(selectedJournal.value)await loadEntries()}
async function leave(){processing.value=true;try{await manageSharing(selectedJournal.value!.id,'leave',auth.user!.id);leaveOpen.value=false;store.clearEntries();await router.replace(journalDestination())}catch(e){journalError.value=(e as Error).message}finally{processing.value=false}}
let accessTimer:ReturnType<typeof setInterval>|undefined
function checkAccess(){if(document.visibilityState==='visible')void refreshJournals()}
watch(()=>route.query.journal,openCollection)

const search = ref('')
const activeMood = ref('')
const viewMode = ref<'active' | 'archived'>('active')
const confirmDelete = ref<string | null>(null)
const confirmArchive = ref<string | null>(null)
const processing = ref(false)

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

onMounted(()=>{void openCollection();accessTimer=setInterval(checkAccess,30000);window.addEventListener('focus',checkAccess)})
onBeforeUnmount(()=>{clearInterval(accessTimer);window.removeEventListener('focus',checkAccess);store.clearEntries()})

async function loadEntries() {
  const params: Record<string, string | number> = viewMode.value === 'archived' ? { archived: 'true' } : {}
  if(route.query.journal){if(!isJournalId(route.query.journal))return;params.journal=route.query.journal}
  await store.fetchEntries(params)
}

async function switchView(mode: 'active' | 'archived') {
  viewMode.value = mode
  search.value = ''
  activeMood.value = ''
  await loadEntries()
}

const filtered = computed(() => {
  return store.entries.filter((entry: JournalEntry) => {
    const matchesSearch =
      !search.value ||
      entry.title.toLowerCase().includes(search.value.toLowerCase()) ||
      entry.content.toLowerCase().includes(search.value.toLowerCase())
    const matchesMood =
      !activeMood.value ||
      entry.mood === activeMood.value ||
      entry.mood_label?.toLowerCase() === activeMood.value.toLowerCase()
    return matchesSearch && matchesMood
  })
})

async function handleArchive(entryId: string) {
  if (processing.value) return
  processing.value = true
  try {
    await store.archiveEntry(entryId)
    confirmArchive.value = null
  } catch (err) {
    console.error('Archive failed:', err)
  } finally {
    processing.value = false
  }
}

async function handleRestore(entryId: string) {
  if (processing.value) return
  processing.value = true
  try {
    await store.restoreEntry(entryId)
  } catch (err) {
    console.error('Restore failed:', err)
  } finally {
    processing.value = false
  }
}

async function handleDelete(entryId: string) {
  if (processing.value) return
  processing.value = true
  try {
    await store.deleteEntry(entryId)
    confirmDelete.value = null
  } catch (err) {
    console.error('Delete failed:', err)
  } finally {
    processing.value = false
  }
}

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
            :to="newJournalEntryDestination(selectedJournal?.id)" v-if="canWrite"
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

      <nav class="journal-collections" aria-label="Journal collections"><div><h2>My journals</h2><RouterLink v-for="j in journals.filter(item=>item.role==='owner')" :key="j.id" :to="journalDestination(j.id)" :aria-current="selectedJournal?.id===j.id?'page':undefined">{{j.title}} <span v-if="j.shared">Shared · Owner</span></RouterLink></div><div><h2>Shared with me</h2><RouterLink v-for="j in journals.filter(item=>item.role!=='owner')" :key="j.id" :to="journalDestination(j.id)" :aria-current="selectedJournal?.id===j.id?'page':undefined">{{j.title}} <span>{{j.role}}</span></RouterLink><p v-if="!journals.some(j=>j.role!=='owner')">Journals you accept will appear here.</p></div></nav>
      <div class="journal-sharing-bar" v-if="selectedJournal"><p>{{selectedJournal.title}} · <strong>{{selectedJournal.role}}</strong></p><button v-if="isOwner" @click="sharingOpen=true">Share journal</button><button v-else @click="leaveOpen=true">Leave journal</button></div>
      <p v-if="journalError" role="alert" class="journal-access-error">{{journalError}} <RouterLink :to="journalDestination()">Back to my journal</RouterLink></p>
      <JournalSharing v-if="selectedJournal&&isOwner" v-model="sharingOpen" :journal="selectedJournal" @changed="refreshJournals" />
      <AppSheet v-model="leaveOpen" title="Leave this journal?"><p>You will lose access to its shared pages. Your personal journal will stay with you. You’ll need a new invitation to rejoin.</p><p v-if="journalError" role="alert">{{journalError}}</p><template #footer><button :disabled="processing" @click="leaveOpen=false">Cancel</button><button :disabled="processing" @click="leave">Leave journal</button></template></AppSheet>
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
          Recent Entries
        </button>
        <button
          type="button"
          :class="[
            'px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors',
            viewMode === 'archived'
              ? 'text-[#7B0323] border-[#7B0323]'
              : 'text-[#a68e73] border-transparent hover:text-[#7B0323]',
          ]"
          v-if="isOwner" @click="switchView('archived')"
        >
          Archive
        </button>
      </div>

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
          @click="loadEntries"
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
                <div class="flex items-center gap-3">
                  <RouterLink
                    :to="journalEntryDestination(entry.id)"
                    class="text-xs font-semibold text-[#7B0323] hover:underline inline-flex items-center gap-1"
                  >
                    {{ viewMode === 'archived' ? 'View Entry' : 'Read Entry' }}
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                    </svg>
                  </RouterLink>

                  <!-- Restore button (archived view) -->
                  <button
                    v-if="isOwner && viewMode === 'archived'"
                    type="button"
                    :disabled="processing"
                    class="text-xs font-semibold text-[#8a5c2e] hover:text-[#7B0323] hover:underline disabled:opacity-50"
                    @click="handleRestore(entry.id)"
                  >
                    Restore
                  </button>

                  <!-- Archive button (active view) -->
                  <button
                    v-if="isOwner && viewMode === 'active'"
                    type="button"
                    :disabled="processing"
                    class="text-xs font-semibold text-[#a68e73] hover:text-[#7B0323] hover:underline disabled:opacity-50"
                    @click="confirmArchive = entry.id"
                  >
                    Archive
                  </button>

                  <!-- Delete button -->
                  <button
                    type="button"
                    :disabled="processing"
                    class="text-xs font-semibold text-[#c4ad94] hover:text-[#7B0323] hover:underline disabled:opacity-50"
                    v-if="isOwner" @click="confirmDelete = entry.id"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
            <div class="h-0.5 bg-gradient-to-r from-[#7B0323]/20 via-[#7B0323]/40 to-transparent" aria-hidden="true" />

            <!-- Archive confirmation -->
            <div v-if="confirmArchive === entry.id" class="bg-[#fdf2f3] border-t border-[#eeaab5] px-6 py-4">
              <p class="text-sm text-[#7B0323] mb-3">
                <strong>Archive this entry?</strong><br>
                It will be moved to your Archive and won't appear in your recent entries.
              </p>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  :disabled="processing"
                  class="px-4 py-2 text-sm font-semibold bg-[#7B0323] text-[#fdfaf5] rounded border border-[#5a0019] hover:bg-[#5a0019] disabled:opacity-50 transition-colors"
                  @click="handleArchive(entry.id)"
                >
                  Archive Entry
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
            <div v-if="confirmDelete === entry.id" class="bg-[#fdf2f3] border-t border-[#eeaab5] px-6 py-4">
              <p class="text-sm text-[#7B0323] mb-3">
                <strong>Delete this journal entry?</strong><br>
                This entry will be permanently removed. This action cannot be undone.
              </p>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  :disabled="processing"
                  class="px-4 py-2 text-sm font-semibold bg-[#7B0323] text-[#fdfaf5] rounded border border-[#5a0019] hover:bg-[#5a0019] disabled:opacity-50 transition-colors"
                  @click="handleDelete(entry.id)"
                >
                  Delete Entry
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

        <!-- Empty state — no filter active -->
        <div v-else-if="store.entries.length === 0 && !search && !activeMood" class="text-center py-20">
          <div class="w-16 h-16 mx-auto mb-5 rounded border border-[#d7c7b3] bg-[#fdfaf5] flex items-center justify-center text-[#c4ad94]">
            <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.25" aria-hidden="true">
              <path v-if="viewMode === 'active'" stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-[#2b1a10] mb-2" style="font-family:'Playfair Display',serif;">
            {{ viewMode === 'active' ? 'Your journal is still empty.' : 'Your archive is empty.' }}
          </h3>
          <p class="text-sm text-[#8a5c2e] mb-6">
            {{ viewMode === 'active' ? 'Every story starts with a first page.' : 'Archived entries will appear here.' }}
          </p>
          <RouterLink
            v-if="viewMode === 'active'"
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

<style scoped>.journal-collections{display:grid;gap:20px;margin-bottom:26px}.journal-collections>div{display:flex;gap:8px;flex-wrap:wrap;align-content:start}.journal-collections h2{width:100%;font:20px Georgia,serif;margin-bottom:5px}.journal-collections a{padding:12px 16px;min-height:48px;display:grid;gap:4px;border:1px solid var(--vintage-line,#c9b08a);border-radius:5px;background:var(--vintage-card,#fbf2df)}.journal-collections a[aria-current=page]{outline:2px solid #967047;outline-offset:2px}.journal-collections span{font-size:11px;text-transform:capitalize}.journal-collections p{font-size:13px;opacity:.8}.journal-sharing-bar{display:flex;gap:12px;justify-content:space-between;align-items:center;flex-wrap:wrap;margin-bottom:22px}.journal-sharing-bar button,.journal-access-error a{min-height:48px;display:inline-flex;align-items:center;padding:10px 16px;border:1px solid currentColor;border-radius:5px}.journal-access-error{padding:18px;border:1px solid #b37b54;margin-bottom:18px}@media(min-width:640px){.journal-collections{grid-template-columns:1fr 1fr}}.journal-sharing-bar button:focus-visible,.journal-collections a:focus-visible{outline:2px solid #a6773f;outline-offset:4px}</style>

<style scoped>.journal-collections a{min-width:0;max-width:100%;overflow-wrap:anywhere}.journal-sharing-bar p{min-width:0;overflow-wrap:anywhere;flex:1}</style>

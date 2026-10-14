<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, RouterLink, onBeforeRouteLeave } from 'vue-router'
import api from '@/services/api.service'
import { useAuthStore } from '@/stores/auth'
import ScrapbookNotebook from '@/components/journal/ScrapbookNotebook.vue'
import { scrapbookError } from '@/services/scrapbook-errors'
import { emptyLayout, type ScrapbookLayout } from '@/types/scrapbook'
import type { Memory } from '@/types'
const route = useRoute(), auth = useAuthStore()
const memoryId = route.params.id as string
const memory = ref<Memory | null>(null), title = ref(''), text = ref(''), date = ref('')
const layout = ref<ScrapbookLayout>(emptyLayout()), viewMode = ref(true), loading = ref(true), saving = ref(false), error = ref('')
const notebook = ref<InstanceType<typeof ScrapbookNotebook> | null>(null)
const baseline = ref(''), uploadBusy=ref(false)
const snapshot = () => JSON.stringify({ title:title.value,text:text.value,date:date.value,layout:layout.value })
const dirty = computed(() => !!memory.value && snapshot() !== baseline.value)
function restore() {
  if (!memory.value) return
  title.value=memory.value.title; text.value=memory.value.description || ''; date.value=memory.value.memory_date
  layout.value=JSON.parse(JSON.stringify(memory.value.scrapbook_layout || emptyLayout()))
  notebook.value?.reset(layout.value); baseline.value=snapshot(); viewMode.value=true
}
async function load() {
  loading.value=true;error.value=''
  try { memory.value=(await api.get<{data:Memory}>(`/memories/${memoryId}`)).data.data; restore() }
  catch(e) { error.value=scrapbookError(e,'load') }
  finally { loading.value=false }
}
onMounted(load)
async function save() {
  if (!title.value.trim() || !date.value || saving.value) return
  saving.value=true; error.value=''
  try {
    const composition=await notebook.value!.prepareSave(memoryId)
    memory.value=(await api.put<{data:Memory}>(`/memories/${memoryId}`,{title:title.value,description:text.value,memory_date:date.value,scrapbook_layout:composition})).data.data
    notebook.value?.markSaved(); restore()
  } catch(e) { error.value=scrapbookError(e,'save') }
  finally { saving.value=false }
}
function preventUnload(event:BeforeUnloadEvent) {if(dirty.value){event.preventDefault();event.returnValue=''}}
onMounted(()=>window.addEventListener('beforeunload',preventUnload))
onBeforeUnmount(()=>window.removeEventListener('beforeunload',preventUnload))
onBeforeRouteLeave(() => !dirty.value || window.confirm('Leave without saving your memory changes?'))
</script>
<template>
  <main class="min-h-screen bg-[#e7dccb] p-3 sm:p-6">
    <header class="max-w-6xl mx-auto flex flex-wrap justify-between gap-3 mb-5">
      <RouterLink :to="{name:'memories'}">← All memories</RouterLink>
      <button v-if="memory && viewMode" class="bg-[#7b0323] text-white rounded px-4 py-2" @click="viewMode=false">Edit memory</button>
      <div v-if="memory && !viewMode" class="flex gap-3"><button :disabled="saving || uploadBusy" @click="restore">Cancel</button><button :disabled="saving || uploadBusy || !title.trim()" class="bg-[#7b0323] text-white rounded px-4 py-2" @click="save">{{saving?'Saving…':'Save memory'}}</button></div>
    </header>
    <p v-if="error" role="alert" class="max-w-6xl mx-auto text-red-800 mb-4">{{error}} <button v-if="!memory" @click="load">Retry loading</button></p>
    <p v-if="loading">Loading your memory…</p>
    <template v-if="memory">
      <div class="max-w-6xl mx-auto mb-4"><time v-if="viewMode">{{date}}</time><label v-else>Date <input v-model="date" type="date" /></label></div>
      <ScrapbookNotebook ref="notebook" v-model="layout" v-model:title="title" v-model:text="text" resource="memories" :entry-id="memoryId" :user-id="auth.user?.id" :media="memory.media" :view-mode="viewMode" :disabled="saving" @busy-change="uploadBusy=$event" />
      <nav class="max-w-6xl mx-auto mt-5 flex gap-4" aria-label="Related records"><RouterLink v-if="memory.trip_id" :to="{name:'trips.show',params:{id:memory.trip_id}}">Related trip</RouterLink><RouterLink v-if="memory.journal_entry" :to="{name:'journal.edit',params:{id:memory.journal_entry.id}}">{{memory.journal_entry.title}}</RouterLink></nav>
    </template>
  </main>
</template>

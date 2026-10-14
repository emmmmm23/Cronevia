<script setup lang="ts">
import { ref } from 'vue'
import { useMemoriesStore } from '@/stores/memories'
import { useAuthStore } from '@/stores/auth'
import ScrapbookNotebook from '@/components/journal/ScrapbookNotebook.vue'
import { scrapbookError } from '@/services/scrapbook-errors'
import { emptyLayout } from '@/types/scrapbook'
const emit = defineEmits<{ saved: [] }>()
const store = useMemoriesStore(), auth = useAuthStore()
const title = ref(''), description = ref(''), date = ref(new Date().toISOString().slice(0,10)), error = ref('')
let draftKey=crypto.randomUUID()
const uploadBusy=ref(false)
const layout = ref(emptyLayout()), id = ref<string | null>(null), saving = ref(false)
const notebook = ref<InstanceType<typeof ScrapbookNotebook> | null>(null)
async function save() {
  if (!title.value.trim() || saving.value) return
  error.value='';saving.value=true
  try {
    if (!id.value) id.value=(await store.createMemory({ title:title.value, description:description.value, memory_date:date.value, draft_key:draftKey })).id
    const composition=await notebook.value!.prepareSave(id.value)
    await store.updateMemory(id.value,{ title:title.value,description:description.value,memory_date:date.value,scrapbook_layout:composition })
    notebook.value?.markSaved(); title.value='';description.value='';id.value=null;layout.value=emptyLayout();draftKey=crypto.randomUUID();emit('saved')
  } catch(e) { error.value=scrapbookError(e,'save') }
  finally { saving.value=false }
}
</script>
<template><section class="border rounded p-3 sm:p-5 space-y-3 mb-6 bg-white/60">
  <h2 class="text-xl">Save a memory</h2>
  <label class="block">Date <input v-model="date" type="date" required class="border rounded p-2" /></label>
  <ScrapbookNotebook ref="notebook" v-model="layout" v-model:title="title" v-model:text="description" resource="memories" :entry-id="id" :user-id="auth.user?.id" :disabled="saving" @busy-change="uploadBusy=$event" />
  <p v-if="error" role="alert" class="text-red-700">{{error}}</p><button :disabled="saving || uploadBusy || !title.trim()" class="bg-[#7b0323] text-white rounded px-4 py-2" @click="save">{{saving?'Saving…':'Save memory'}}</button>
</section></template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMemoriesStore } from '@/stores/memories'
const emit = defineEmits<{ saved: [] }>()
const store = useMemoriesStore()
const title = ref(''), description = ref(''), date = ref(new Date().toISOString().slice(0,10)), error = ref('')
async function save() {
  error.value=''
  try { await store.createMemory({ title:title.value, description:description.value, memory_date:date.value }); title.value='';description.value='';emit('saved') }
  catch(e) { error.value=(e as Error).message }
}
</script>
<template><form @submit.prevent="save" class="border rounded p-5 space-y-3 mb-6 bg-white/60">
  <h2 class="text-xl">Save a memory</h2>
  <label class="block">Title<input v-model="title" required maxlength="255" class="block border rounded p-2 w-full" /></label>
  <label class="block">Date<input v-model="date" type="date" required class="block border rounded p-2" /></label>
  <label class="block">What happened?<textarea v-model="description" class="block border rounded p-2 w-full" rows="3" /></label>
  <p v-if="error" role="alert" class="text-red-700">{{ error }}</p><button :disabled="store.saving" class="bg-[#7b0323] text-white rounded px-4 py-2">{{ store.saving ? 'Saving…' : 'Save memory' }}</button>
</form></template>

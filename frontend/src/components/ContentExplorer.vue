<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { requireUser } from '@/services/supabase-api'
const props = defineProps<{ mode: 'timeline' | 'search' | 'anniversary' | 'map' }>()
const route = useRoute()
type Item = { id: string; title: string; date: string; type: string; to: string; latitude?: number | null; longitude?: number | null; location?: string | null }
const items = ref<Item[]>([])
const query = ref('')
const error = ref('')
const loading = ref(true)
const titles = { timeline: 'Your timeline', search: 'Search your memories', anniversary: 'On this day', map: 'Your places' }
const visible = computed(() => items.value.filter(item => {
  const date = new Date()
  const today = `${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  if (props.mode === 'anniversary' && (item.date.slice(5,10) !== today || Number(item.date.slice(0,4)) >= date.getFullYear())) return false
  if (props.mode === 'map' && (item.latitude == null || item.longitude == null)) return false
  return `${item.title} ${item.location || ''}`.toLowerCase().includes(query.value.toLowerCase())
}))
onMounted(async () => {
  try {
    const user = await requireUser()
    // Fetch all pages; PostgREST caps each request, so a single select silently truncates timelines.
    for (const table of ['journal_entries','trips','memories'] as const) {
      for (let offset=0; ; offset+=500) {
        let request = supabase.from(table).select('*').eq('user_id',user.id).is('deleted_at',null).order('id').range(offset,offset+499)
        if (route.params.tripId) request = table === 'trips' ? request.eq('id',String(route.params.tripId)) : request.filter('trip_id','eq',String(route.params.tripId))
        const { data, error: failure } = await request
        if (failure) throw failure
        for (const row of data || []) {
          items.value.push({ id: row.id, title: row.title, type: table === 'journal_entries' ? 'Journal' : table === 'trips' ? 'Trip' : 'Memory',
            date: ('entry_date' in row ? row.entry_date : 'start_date' in row ? row.start_date : 'memory_date' in row ? row.memory_date : null) || row.created_at.slice(0,10),
            to: `/${table === 'journal_entries' ? 'journal' : table}/${row.id}`,
            latitude: 'latitude' in row ? row.latitude : null, longitude: 'longitude' in row ? row.longitude : null,
            location: 'location_name' in row ? row.location_name : 'destination' in row ? row.destination : null })
        }
        if (!data || data.length<500) break
      }
    }
    items.value.sort((a,b) => b.date.localeCompare(a.date))
  } catch (e) { error.value = (e as Error).message }
  finally { loading.value=false }
})
</script>
<template>
  <section class="space-y-5">
    <h1 class="text-3xl">{{ titles[mode] }}</h1>
    <label class="block">Find a title or place<input v-model="query" type="search" class="block border rounded p-3 w-full mt-2" /></label>
    <p v-if="error" role="alert" class="text-red-700">{{ error }}</p>
    <p v-else-if="loading">Loading your memories…</p>
    <template v-else>
      <svg v-if="mode==='map' && visible.length" viewBox="0 0 720 360" role="img" aria-label="Locations by longitude and latitude" class="w-full bg-amber-50 border rounded">
        <path d="M0 180H720M360 0V360" stroke="#d7c7b3" />
        <a v-for="item in visible" :key="item.id" :href="item.to"><circle :cx="(item.longitude!+180)*2" :cy="(90-item.latitude!)*2" r="5" fill="#7b0323"><title>{{ item.title }} — {{ item.location }}</title></circle></a>
      </svg>
      <p v-if="!visible.length">No matching memories yet.</p>
      <ul class="grid gap-4 md:grid-cols-2"><li v-for="item in visible" :key="item.id" class="p-5 border rounded bg-white/60">
        <span class="text-sm">{{ item.type }} · {{ item.date }}</span>
        <RouterLink :to="item.to" class="block text-xl underline mt-2">{{ item.title }}</RouterLink><p v-if="item.location">{{ item.location }}</p>
      </li></ul>
    </template>
  </section>
</template>

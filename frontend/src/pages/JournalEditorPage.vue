<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { useJournalStore } from '@/stores/journal'
import { useAuthStore } from '@/stores/auth'
import NotebookHeader from '@/components/shared/NotebookHeader.vue'
import AppSheet from '@/components/shared/AppSheet.vue'
import ScrapbookNotebook from '@/components/journal/ScrapbookNotebook.vue'
import { emptyLayout } from '@/types/scrapbook'
import { journalLayout } from '@/services/scrapbook.service'
import { scrapbookError } from '@/services/scrapbook-errors'
import type { JournalEntry, Media } from '@/types'
import api from '@/services/api.service'

const route=useRoute(), router=useRouter(), store=useJournalStore(), auth=useAuthStore()
const entryId=route.params.id as string | undefined
const savedEntryId=ref(entryId), draftKey=crypto.randomUUID()
const title=ref(''), content=ref(''), date=ref(new Date().toLocaleDateString('en-CA'))
const tags=ref<string[]>([]), tagInput=ref(''), moodEmoji=ref(''), moodLabel=ref('')
const locationName=ref(''), latitude=ref<number|null>(null), longitude=ref<number|null>(null)
const locationSource=ref<JournalEntry['location_source']>(null), visibility=ref<JournalEntry['visibility']>('private')
const layout=ref(emptyLayout()), existingPhotos=ref<Media[]>([])
const notebook=ref<InstanceType<typeof ScrapbookNotebook>|null>(null)
const ready=ref(false), loading=ref(false), loadFailed=ref(false), saving=ref(false), uploadBusy=ref(false), viewMode=ref(!!entryId)
const detailsOpen=ref(false)
const saveError=ref(''), locationError=ref(''), locationLoading=ref(false), savedDraft=ref('')
function snapshot() { return JSON.stringify({title:title.value,content:content.value,date:date.value,tags:tags.value,moodEmoji:moodEmoji.value,moodLabel:moodLabel.value,locationName:locationName.value,latitude:latitude.value,longitude:longitude.value,locationSource:locationSource.value,visibility:visibility.value,layout:layout.value}) }
const dirty=computed(()=>ready.value && !!savedDraft.value && snapshot()!==savedDraft.value)
const canSave=computed(()=>ready.value && !loadFailed.value && !saving.value && !uploadBusy.value && !!title.value.trim() && !!content.value.trim() && !!date.value)
const dateLabel=computed(()=>new Date(date.value+'T00:00:00').toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric',year:'numeric'}))
async function load() {
  if(loading.value) return
  loading.value=true; saveError.value=''; loadFailed.value=false
  try {
    if(entryId) {
      const entry=(await api.get<{data:JournalEntry}>(`/journal/${entryId}`)).data.data
      title.value=entry.title;content.value=entry.content;date.value=entry.entry_date
      tags.value=entry.tags || [];moodEmoji.value=entry.mood_emoji || '';moodLabel.value=entry.mood_label || entry.mood || ''
      locationName.value=entry.location_name || '';latitude.value=entry.latitude;longitude.value=entry.longitude
      locationSource.value=entry.location_source;visibility.value=entry.visibility
      existingPhotos.value=entry.media || []
      layout.value=await journalLayout(entryId,entry.scrapbook_layout)
      notebook.value?.reset(layout.value)
    }
    savedDraft.value=snapshot(); ready.value=true
  } catch(e) {loadFailed.value=true;saveError.value=scrapbookError(e,'load')}
  finally {loading.value=false}
}
onMounted(load)
function cancelEdit() {
  if(!savedDraft.value) return
  const d=JSON.parse(savedDraft.value)
  title.value=d.title;content.value=d.content;date.value=d.date;tags.value=d.tags;moodEmoji.value=d.moodEmoji;moodLabel.value=d.moodLabel
  locationName.value=d.locationName;latitude.value=d.latitude;longitude.value=d.longitude;locationSource.value=d.locationSource;visibility.value=d.visibility
  layout.value=d.layout;notebook.value?.reset(d.layout);viewMode.value=!!savedEntryId.value;saveError.value=''
}
async function handleSave() {
  if(!canSave.value) return
  saving.value=true;saveError.value=''
  const payload={title:title.value,content:content.value,entry_date:date.value,tags:tags.value,mood_emoji:moodEmoji.value || null,mood_label:moodLabel.value || null,location_name:locationName.value || null,latitude:latitude.value,longitude:longitude.value,location_source:locationSource.value,visibility:visibility.value}
  try {
    if(!savedEntryId.value) savedEntryId.value=(await store.createEntry({...payload,draft_key:draftKey})).id
    const composition=await notebook.value!.prepareSave(savedEntryId.value)
    // Writing and the entire composition replace together in one PostgreSQL UPDATE.
    const updated=await store.updateEntry(savedEntryId.value,{...payload,scrapbook_layout:composition})
    layout.value=composition;existingPhotos.value=updated.media || existingPhotos.value
    notebook.value?.markSaved();savedDraft.value=snapshot();viewMode.value=true
    if(!entryId) await router.replace({name:'journal.edit',params:{id:savedEntryId.value}})
  } catch(e) {saveError.value=scrapbookError(e,'save')}
  finally {saving.value=false}
}
function addTag() {
  const value=tagInput.value.trim().replace(/,/g,'')
  if(value && !tags.value.includes(value) && tags.value.length<10) tags.value.push(value)
  tagInput.value=''
}
function selectMood(event:Event) {
  const select=event.target as HTMLSelectElement
  moodEmoji.value=select.value;moodLabel.value=select.value ? select.selectedOptions[0].text.replace(select.value,'').trim() : ''
}
function requestGeolocation() {
  if(!navigator.geolocation) {locationError.value='Location is unavailable on this device.';return}
  locationLoading.value=true;locationError.value=''
  navigator.geolocation.getCurrentPosition(position=>{
    latitude.value=position.coords.latitude;longitude.value=position.coords.longitude;locationSource.value='geolocation'
    if(!locationName.value) locationName.value='A place to remember'
    locationLoading.value=false
  },()=>{locationLoading.value=false;locationError.value='We couldn’t get your location. You can type a place instead.'},{timeout:10000})
}
function preventUnload(event:BeforeUnloadEvent) { if(dirty.value) {event.preventDefault();event.returnValue=''} }
onMounted(()=>window.addEventListener('beforeunload',preventUnload))
onBeforeUnmount(()=>window.removeEventListener('beforeunload',preventUnload))
onBeforeRouteLeave(()=>!dirty.value || window.confirm('Leave without saving your journal changes?'))
interface MoodCategory {
  name: string
  moods: { emoji: string; label: string }[]
}

const moodCategories: MoodCategory[] = [
  { name: 'Happy', moods: [
    { emoji: '😀', label: 'Grinning' },
    { emoji: '😃', label: 'Big smile' },
    { emoji: '😄', label: 'Laughing' },
    { emoji: '😁', label: 'Beaming' },
    { emoji: '😆', label: 'Grinning squinting' },
    { emoji: '🙂', label: 'Slightly smiling' },
    { emoji: '😊', label: 'Blushing smile' },
    { emoji: '😇', label: 'Innocent' },
  ]},
  { name: 'Loved', moods: [
    { emoji: '🥰', label: 'Smiling with hearts' },
    { emoji: '😍', label: 'Heart eyes' },
    { emoji: '😘', label: 'Blowing kiss' },
    { emoji: '❤️', label: 'Red heart' },
    { emoji: '🧡', label: 'Orange heart' },
    { emoji: '💛', label: 'Yellow heart' },
    { emoji: '💚', label: 'Green heart' },
    { emoji: '💙', label: 'Blue heart' },
    { emoji: '💜', label: 'Purple heart' },
  ]},
  { name: 'Calm', moods: [
    { emoji: '😌', label: 'Relieved' },
    { emoji: '🫶', label: 'Heart hands' },
    { emoji: '🌿', label: 'Peaceful' },
    { emoji: '☺️', label: 'Warm smile' },
    { emoji: '🌸', label: 'Gentle' },
    { emoji: '🕊️', label: 'At peace' },
  ]},
  { name: 'Excited', moods: [
    { emoji: '🤩', label: 'Star-struck' },
    { emoji: '🥳', label: 'Celebrating' },
    { emoji: '😎', label: 'Cool' },
    { emoji: '🚀', label: 'Energized' },
    { emoji: '🔥', label: 'Fired up' },
    { emoji: '✨', label: 'Sparkling' },
    { emoji: '⚡', label: 'Electric' },
  ]},
  { name: 'Nostalgic', moods: [
    { emoji: '🥹', label: 'Touched' },
    { emoji: '🥲', label: 'Happy-sad' },
    { emoji: '🌙', label: 'Nostalgic' },
    { emoji: '📷', label: 'Remembering' },
    { emoji: '🎞️', label: 'Old memories' },
  ]},
  { name: 'Grateful', moods: [
    { emoji: '🙏', label: 'Thankful' },
    { emoji: '🫶', label: 'Grateful' },
    { emoji: '💝', label: 'Deeply touched' },
    { emoji: '🌻', label: 'Warm gratitude' },
  ]},
  { name: 'Tired', moods: [
    { emoji: '😴', label: 'Sleeping' },
    { emoji: '🥱', label: 'Yawning' },
    { emoji: '😪', label: 'Sleepy' },
    { emoji: '😩', label: 'Weary' },
    { emoji: '😮‍💨', label: 'Exhausted' },
  ]},
  { name: 'Sad', moods: [
    { emoji: '😔', label: 'Pensive' },
    { emoji: '😞', label: 'Disappointed' },
    { emoji: '😢', label: 'Crying' },
    { emoji: '😭', label: 'Sobbing' },
    { emoji: '🥺', label: 'Pleading' },
    { emoji: '💔', label: 'Heartbroken' },
  ]},
  { name: 'Anxious', moods: [
    { emoji: '😰', label: 'Anxious sweat' },
    { emoji: '😟', label: 'Worried' },
    { emoji: '😬', label: 'Nervous' },
    { emoji: '😨', label: 'Fearful' },
    { emoji: '🫠', label: 'Melting stress' },
  ]},
  { name: 'Angry', moods: [
    { emoji: '😤', label: 'Steaming' },
    { emoji: '😠', label: 'Angry' },
    { emoji: '😡', label: 'Pouting' },
    { emoji: '🤬', label: 'Furious' },
  ]},
  { name: 'Confused', moods: [
    { emoji: '🤔', label: 'Thinking' },
    { emoji: '😐', label: 'Neutral' },
    { emoji: '😶', label: 'Speechless' },
    { emoji: '🫤', label: 'Uncertain' },
    { emoji: '🤷', label: 'Unsure' },
  ]},
]


</script>
<template>
  <main class="journal-desk">
    <NotebookHeader back-to="/journal" back-label="My journal" :status="saving?'Saving…':uploadBusy?'Uploading…':dirty?'Unsaved changes':savedEntryId?'All changes saved':'New entry'" save-label="Save entry" edit-label="Edit journal" :view-mode="viewMode" :ready="ready" :disabled="!canSave" :busy="saving || uploadBusy" @save="handleSave" @edit="viewMode=false" @cancel="cancelEdit" @details="detailsOpen=true" />
    <p class="compact-date" v-if="ready">{{dateLabel}}</p>
    <AppSheet v-model="detailsOpen" title="Entry details"><div class="details-fields">
          <template v-if="!viewMode">
            <label>Date<input v-model="date" type="date" :disabled="saving" /></label>
            <label>Mood<select :value="moodEmoji" @change="selectMood" :disabled="saving"><option value="">How did it feel?</option><optgroup v-for="group in moodCategories" :key="group.name" :label="group.name"><option v-for="m in group.moods" :key="m.label" :value="m.emoji">{{m.emoji}} {{m.label}}</option></optgroup></select></label>
            <label>Place<input v-model="locationName" placeholder="Somewhere worth remembering" @input="locationSource='manual'" :disabled="saving" /></label>
            <button class="location-button" @click="requestGeolocation" :disabled="locationLoading || saving">{{locationLoading?'Finding your place…':'Use my location'}}</button>
            <p v-if="locationError" role="alert">{{locationError}}</p>
            <label>Tags<input v-model="tagInput" placeholder="Add a tag, then press Enter" @keydown.enter.prevent="addTag" @blur="addTag" :disabled="saving" /></label>
            <div class="tag-list"><button v-for="tag in tags" :key="tag" :aria-label="'Remove tag '+tag" @click="tags=tags.filter(t=>t!==tag)">{{tag}} ×</button></div>
          </template>
          <template v-else><p>{{moodEmoji}} {{moodLabel || 'No mood added'}}</p><p>{{locationName || 'No place added'}}</p><p>{{tags.join(' · ') || 'No tags added'}}</p></template>

    </div></AppSheet>
    <div v-if="saveError" class="entry-notice" role="alert"><span>{{saveError}}</span><button v-if="loadFailed" @click="load">Retry loading</button></div>
    <ScrapbookNotebook v-if="ready" ref="notebook" v-model="layout" v-model:title="title" v-model:text="content" :entry-id="savedEntryId || null" resource="journal" :media="existingPhotos" :user-id="auth.user?.id" :view-mode="viewMode" :disabled="saving" @busy-change="uploadBusy=$event" />
    <div v-else-if="loading" class="loading-page">Opening your journal…</div>
  </main>
</template>
<style scoped>
.journal-desk{min-height:calc(100vh - 58px);padding:24px 36px 64px;background:radial-gradient(ellipse at 50% 30%,#f2ede3,transparent 68%),#e9e4da;color:#4e4940}
.entry-header,.entry-meta,.entry-notice{max-width:1320px;margin:auto;display:flex;align-items:center}
.entry-header{gap:20px;min-height:48px}.back-link{font-size:13px;color:#6a665d;display:flex;gap:10px;align-items:center}.back-link span{font-size:20px}.entry-status{font-size:11px;color:#7d8175;margin-left:auto}.entry-actions{display:flex;gap:12px;align-items:center}button{font:inherit;cursor:pointer}.save-button{border:0;border-radius:7px;background:#74283c;color:#fff7ee;padding:12px 19px;font-size:13px;font-weight:500;box-shadow:0 3px 5px #74283c14}.save-button span{margin-left:14px}.save-button:disabled{opacity:.45;cursor:default}.cancel-button{background:none;border:0;padding:12px;color:#787368;font-size:13px}.entry-meta{justify-content:center;gap:18px;margin-top:13px;margin-bottom:16px}.entry-date{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#756f63}.entry-details{position:relative;font-size:12px}.entry-details summary{cursor:pointer;color:#71695b;padding:8px;list-style:none}.entry-details summary::-webkit-details-marker{display:none}.details-panel{position:absolute;top:36px;right:0;z-index:35;background:#fffaf1;border:1px solid #ddd4c6;border-radius:10px;padding:20px;box-shadow:0 12px 35px #45352420;width:300px;display:grid;gap:12px}.details-panel label{display:grid;gap:6px;font-size:12px;color:#6c6253}.details-panel input,.details-panel select{width:100%;padding:9px;border:1px solid #ded4c3;border-radius:5px;background:#fffcf7;color:#51483a}.location-button{background:#edf0e6;border:0;padding:9px;color:#5e6d56;border-radius:5px}.tag-list{display:flex;gap:6px;flex-wrap:wrap}.tag-list button{background:#ece8dc;border:0;border-radius:4px;padding:5px 8px}.entry-notice{margin:14px auto;gap:12px;background:#f8edda;border:1px solid #e2d5be;border-radius:8px;padding:14px 18px;font-size:13px;max-width:960px}.entry-notice button{border:0;background:transparent;color:#74283c;text-decoration:underline;white-space:nowrap}.loading-page{text-align:center;padding:150px 0;font:italic 24px Georgia,serif;color:#827663}button:focus-visible,summary:focus-visible,a:focus-visible{outline:2px solid #8b4859;outline-offset:4px}
@media(max-width:767px){.journal-desk{padding:12px 14px 36px}.entry-header{gap:8px;flex-wrap:wrap}.entry-status{order:3;width:100%;text-align:center;font-size:10px}.entry-actions{margin-left:auto;gap:4px}.save-button{padding:11px 14px}.entry-meta{margin:8px 0 14px;gap:5px}.details-panel{right:-5px;width:280px}.entry-notice{font-size:12px}.back-link{font-size:12px}}
.compact-date{text-align:center;color:#7d735f;font-size:12px;letter-spacing:.07em;margin:0 0 18px}.details-fields{display:grid;gap:18px}.details-fields label{display:grid;gap:7px;font-size:14px}.details-fields input,.details-fields select{width:100%;font-size:16px;min-height:48px;padding:10px;border:1px solid #d7ccba;border-radius:6px;background:#fffaf1}.details-fields button{min-height:44px}
@media(max-width:959px){.journal-desk{padding:12px;min-height:100dvh}.compact-date{display:none}}
</style>

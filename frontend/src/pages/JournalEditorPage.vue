<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { RouterLink, useRouter, useRoute, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
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
import {entryAccess,listJournals,type JournalAccess} from '@/services/shared-journals'
import {journalDestination,isJournalId} from '@/services/journal-routes'
import JournalSharing from '@/components/journal/JournalSharing.vue'
import type {SharedJournal} from '@/services/shared-journals'

const route=useRoute(), router=useRouter(), store=useJournalStore(), auth=useAuthStore()
let entryId=route.params.id as string | undefined
const access=ref<JournalAccess|null>(null),journalId=ref(''),version=ref<number|undefined>(),conflict=ref(false),draftOpen=ref(false),draftCopy=ref('')
const role=computed(()=>access.value?.role),canEdit=computed(()=>role.value==='owner'||role.value==='editor')
const backTo=computed(()=>router.resolve(journalDestination(journalId.value)).href)
const sharingOpen=ref(false),sharingJournal=ref<SharedJournal|null>(null)
async function openSharing(){try{sharingJournal.value=(await listJournals()).find(j=>j.id===journalId.value)||null;sharingOpen.value=!!sharingJournal.value}catch(e){saveError.value=(e as Error).message}}
let accessTimer:ReturnType<typeof setInterval>|undefined,loadGeneration=0
function showDraft(){if(!draftCopy.value)draftCopy.value=snapshot();draftOpen.value=true}
async function loadLatest(){if(window.confirm('Replace the current draft with the latest saved entry? Copy your draft first if you want to keep it.')){conflict.value=false;draftCopy.value='';viewMode.value=true;await load();if(!entryId&&savedEntryId.value&&ready.value)await router.replace({name:'journal.edit',params:{id:savedEntryId.value}})}}
function clearDenied(){ready.value=false;loadFailed.value=true;title.value='';content.value='';layout.value=emptyLayout();existingPhotos.value=[];trackerLinks.value=[];savedDraft.value='';store.clearEntries();saveError.value='This entry is unavailable or your access has ended.'}
async function checkAccess(){
 if(saving.value||loading.value||document.visibilityState!=='visible')return
 const checkingId=entryId||savedEntryId.value
 try{
  if(!checkingId){if(journalId.value){const selected=(await listJournals()).find(j=>j.id===journalId.value);if(!selected||selected.role==='viewer')clearDenied()}return}
  const fresh=await entryAccess(checkingId);if(checkingId!==(entryId||savedEntryId.value))return;if(!fresh){clearDenied();return}
  if(canEdit.value&&fresh.role==='viewer'&&dirty.value){draftCopy.value=snapshot();conflict.value=true;saveError.value='Your access is now read only. Copy your draft before loading the latest page.'}
  access.value=fresh
  if(fresh.role==='viewer')viewMode.value=true
  if(viewMode.value&&!dirty.value&&fresh.version!==version.value)await load()
  else if(ready.value){const entry=(await api.get<{data:JournalEntry}>(`/journal/${checkingId}`)).data.data;existingPhotos.value=entry.media||[]}
 }catch(e){const error=e as {code?:string;response?:{status?:number}};if(error.code==='PGRST116'||error.response?.status===403)clearDenied() /* Transient failures keep drafts. */}
}
watch(()=>[route.params.id,route.query.journal],async ([value])=>{if(value===entryId&&value)return;entryId=value as string|undefined;loading.value=false;ready.value=false;access.value=null;savedEntryId.value=entryId;version.value=undefined;conflict.value=false;draftCopy.value='';viewMode.value=!!entryId;if(!entryId){draftKey=crypto.randomUUID();title.value='';content.value='';layout.value=emptyLayout();existingPhotos.value=[];tags.value=[];trackerLinks.value=[];moodEmoji.value='';moodLabel.value='';locationName.value='';latitude.value=null;longitude.value=null;linkedTrip.value='';linkedDay.value='';linkedActivity.value='';date.value=new Date().toLocaleDateString('en-CA')}await load()})
const savedEntryId=ref(entryId)
let draftKey=crypto.randomUUID()
const linkedTrip=ref(String(route.query.trip_id||'')),linkedDay=ref(String(route.query.trip_day_id||'')),linkedActivity=ref(String(route.query.itinerary_item_id||''))
const title=ref(''), content=ref(''), date=ref(new Date().toLocaleDateString('en-CA'))
const trackerLinks=ref<{id:string;month:string}[]>(route.query.tracker&&/^(board|[0-9a-f-]{36})$/.test(String(route.query.tracker))?[{id:String(route.query.tracker),month:/^\d{4}-(0[1-9]|1[0-2])$/.test(String(route.query.month))?String(route.query.month):date.value.slice(0,7)}]:[])
const tags=ref<string[]>([]), tagInput=ref(''), moodEmoji=ref(''), moodLabel=ref('')
const locationName=ref(''), latitude=ref<number|null>(null), longitude=ref<number|null>(null)
const locationSource=ref<JournalEntry['location_source']>(null), visibility=ref<JournalEntry['visibility']>('private')
const layout=ref(emptyLayout()), existingPhotos=ref<Media[]>([])
const notebook=ref<InstanceType<typeof ScrapbookNotebook>|null>(null)
const ready=ref(false), loading=ref(false), loadFailed=ref(false), saving=ref(false), uploadBusy=ref(false), viewMode=ref(!!entryId)
const detailsOpen=ref(false)
const saveError=ref(''), locationError=ref(''), locationLoading=ref(false), savedDraft=ref('')
function snapshot() { return JSON.stringify({trackerLinks:trackerLinks.value,title:title.value,content:content.value,date:date.value,tags:tags.value,moodEmoji:moodEmoji.value,moodLabel:moodLabel.value,locationName:locationName.value,latitude:latitude.value,longitude:longitude.value,locationSource:locationSource.value,visibility:visibility.value,layout:layout.value}) }
const dirty=computed(()=>ready.value && !!savedDraft.value && snapshot()!==savedDraft.value)
const canSave=computed(()=>canEdit.value && !conflict.value && ready.value && !loadFailed.value && !saving.value && !uploadBusy.value && !!title.value.trim() && !!content.value.trim() && !!date.value)
const dateLabel=computed(()=>new Date(date.value+'T00:00:00').toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric',year:'numeric'}))
async function load() {
  if(loading.value) return
  const generation=++loadGeneration
  loading.value=true; saveError.value=''; loadFailed.value=false
  try {
    const loadingId=entryId||savedEntryId.value
    if(loadingId) {
      if(!isJournalId(loadingId)){clearDenied();return}
      const entry=(await api.get<{data:JournalEntry}>(`/journal/${loadingId}`)).data.data
      if(generation!==loadGeneration)return
      const permissions=await entryAccess(loadingId)
      if(generation!==loadGeneration)return
      if(!permissions){clearDenied();return}
      access.value=permissions;journalId.value=permissions.journal_id;version.value=entry.version??permissions.version
      linkedTrip.value=role.value==='owner'?entry.trip_id||'':'';linkedDay.value=role.value==='owner'?entry.trip_day_id||'':'';linkedActivity.value=role.value==='owner'?entry.itinerary_item_id||'':''
      title.value=entry.title;content.value=entry.content;date.value=entry.entry_date;trackerLinks.value=role.value==='owner'?entry.tracker_links||[]:[]
      tags.value=entry.tags || [];moodEmoji.value=entry.mood_emoji || '';moodLabel.value=entry.mood_label || entry.mood || ''
      locationName.value=entry.location_name || '';latitude.value=entry.latitude;longitude.value=entry.longitude
      locationSource.value=entry.location_source;visibility.value=entry.visibility
      existingPhotos.value=entry.media || []
      layout.value=await journalLayout(loadingId,entry.scrapbook_layout)
      if(generation!==loadGeneration)return
      notebook.value?.reset(layout.value)
    } else {
      const journals=await listJournals()
      const selected=route.query.journal?journals.find(j=>isJournalId(route.query.journal)&&j.id===route.query.journal):journals.find(j=>j.role==='owner')
      if(!selected||selected.role==='viewer'){clearDenied();return}
      journalId.value=selected.id;access.value={journal_id:selected.id,role:selected.role,version:0,last_editor:''}
      visibility.value=selected.role==='editor'||selected.share_future?'shared':'private'
    }
    savedDraft.value=snapshot(); ready.value=true
  } catch(e) {clearDenied();const error=e as {code?:string;response?:{status?:number}};if(error.code!=='PGRST116'&&error.response?.status!==403)saveError.value=scrapbookError(e,'load')}
  finally {if(generation===loadGeneration)loading.value=false}
}
onMounted(()=>{void load();accessTimer=setInterval(checkAccess,30000);window.addEventListener('focus',checkAccess)})
onBeforeUnmount(()=>{clearInterval(accessTimer);window.removeEventListener('focus',checkAccess)})
function cancelEdit() {
  if(!savedDraft.value) return
  const d=JSON.parse(savedDraft.value)
  title.value=d.title;content.value=d.content;date.value=d.date;trackerLinks.value=d.trackerLinks||[];tags.value=d.tags;moodEmoji.value=d.moodEmoji;moodLabel.value=d.moodLabel
  locationName.value=d.locationName;latitude.value=d.latitude;longitude.value=d.longitude;locationSource.value=d.locationSource;visibility.value=d.visibility
  layout.value=d.layout;notebook.value?.reset(d.layout);viewMode.value=!!savedEntryId.value;saveError.value=''
}
async function handleSave() {
  if(!canSave.value) return
  saving.value=true;saveError.value=''
  let accessDenied=false
  const payload={journal_id:journalId.value,version:version.value,...(role.value==='owner'?{tracker_links:trackerLinks.value,trip_id:linkedTrip.value||null,trip_day_id:linkedDay.value||null,itinerary_item_id:linkedActivity.value||null,visibility:visibility.value}:{}),title:title.value,content:content.value,entry_date:date.value,tags:tags.value,mood_emoji:moodEmoji.value||null,mood_label:moodLabel.value||null,location_name:locationName.value||null,latitude:latitude.value,longitude:longitude.value,location_source:locationSource.value}
  try {
    if(!savedEntryId.value){const created=await store.createEntry({...payload,draft_key:draftKey});savedEntryId.value=created.id;version.value=created.version;payload.version=created.version}
    const composition=await notebook.value!.prepareSave(savedEntryId.value)
    // Writing and the entire composition replace together in one PostgreSQL UPDATE.
    const updated=await store.updateEntry(savedEntryId.value,{...payload,status:'published',scrapbook_layout:composition})
    version.value=updated.version;layout.value=composition;existingPhotos.value=updated.media || existingPhotos.value
    notebook.value?.markSaved();savedDraft.value=snapshot()
    if(!entryId) await router.replace({name:'journal.edit',params:{id:savedEntryId.value}})
    viewMode.value=true
  } catch(e) {const error=e as {code?:string;response?:{status:number}};if(error.code==='40001'||error.response?.status===409){conflict.value=true;saveError.value='Someone saved this entry while you were editing. Your draft is still here.'}else{saveError.value=error.code==='22023'?(e as Error).message:scrapbookError(e,'save');accessDenied=error.response?.status===403}}
  finally {saving.value=false;if(accessDenied)await checkAccess()}
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
onBeforeRouteUpdate((to,from)=>to.params.id===from.params.id&&to.query.journal===from.query.journal||!dirty.value||window.confirm('Leave without saving your journal changes?'))
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
    <NotebookHeader :back-to="backTo" back-label="Journal" :read-only="!canEdit" :status="loading?'Opening…':!ready?'Couldn’t load':saving?'Saving…':uploadBusy?'Uploading…':dirty?'Unsaved changes':savedEntryId?'All changes saved':'New entry'" save-label="Save entry" edit-label="Edit journal" :view-mode="viewMode" :ready="ready" :disabled="!canSave" :busy="saving || uploadBusy" @save="handleSave" @edit="canEdit && (viewMode=false)" @cancel="cancelEdit" @details="detailsOpen=true" />
    <p class="compact-date" v-if="ready">{{dateLabel}}<span v-if="role"> · {{role}}<template v-if="access?.last_editor"> · Last edited by {{access.last_editor}}</template></span></p>
    <div v-if="ready && role==='owner'" class="entry-share"><button @click="openSharing">Share journal</button></div>
    <JournalSharing v-if="sharingJournal" v-model="sharingOpen" :journal="sharingJournal" />
    <div v-if="ready&&trackerLinks.length" class="journal-tracker-links"><span>✧ Live links · your tracker records stay in your notebook</span><div v-for="(link,i) in trackerLinks" :key="link.id"><RouterLink :to="{path:link.id==='board'?'/trackers':'/trackers/'+link.id,query:{month:link.month,...(link.id==='board'?{view:'board'}:{})}}">{{link.id==='board'?'Open monthly tracker board':'Open linked tracker'}} · {{link.month}} ↗</RouterLink><button v-if="!viewMode" :disabled="saving" aria-label="Remove tracker link from journal" @click="trackerLinks.splice(i,1)">×</button></div></div>
    <AppSheet v-model="detailsOpen" title="Entry details"><div class="details-fields">
          <template v-if="!viewMode">
            <label v-if="role==='owner'">Who can read this entry?<select v-model="visibility" :disabled="saving"><option value="private">Private · only me</option><option v-if="visibility==='public'" value="public">Only me · previous setting</option><option value="shared">Shared with journal</option></select><small>Shared entries are visible to this journal’s members. Personal trackers and trips stay private.</small></label>
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
    <div v-if="conflict" class="entry-notice" role="status"><span>Your draft will not overwrite the newer entry.</span><button @click="showDraft">Copy draft</button><button @click="loadLatest">Load latest</button></div>
    <AppSheet v-model="draftOpen" title="Keep a copy of your draft"><p>Select and copy this draft before loading the latest saved entry.</p><textarea class="draft-copy" readonly :value="draftCopy" aria-label="Your unsaved draft" @focus="($event.target as HTMLTextAreaElement).select()" /></AppSheet>
    <ScrapbookNotebook v-if="ready" ref="notebook" v-model="layout" v-model:title="title" v-model:text="content" :entry-id="savedEntryId || null" resource="journal" :media="existingPhotos" :user-id="auth.user?.id" :view-mode="viewMode" :disabled="saving || !canEdit" @busy-change="uploadBusy=$event" />
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

<style scoped>.journal-tracker-links{max-width:960px;margin:15px auto;padding:12px 17px;background:#f7f2e7;border:1px solid #d3c5aa;border-radius:6px;display:grid;gap:7px;color:#8c795a}.journal-tracker-links>span{font-size:10px}.journal-tracker-links>div{display:flex;align-items:center;gap:12px}.journal-tracker-links a{display:flex;align-items:center;min-height:44px;font-size:13px;color:#74283c}.journal-tracker-links button{margin-left:auto;min-width:44px;min-height:44px;font-size:23px;color:#895365}</style>

<style scoped>.draft-copy{width:100%;min-height:280px;padding:16px;font-size:16px;border:1px solid var(--vintage-line,#cab18b);background:var(--vintage-card,#fbf2df);resize:vertical}.compact-date span{text-transform:capitalize}</style>

<style scoped>.entry-share{max-width:1320px;margin:0 auto 16px;display:flex;justify-content:flex-end}.entry-share button{min-height:44px;padding:10px 16px;font-size:14px;border:1px solid #d7c7b3;border-radius:5px;background:#fdfaf5;color:#704624}.entry-share button:focus-visible{outline:2px solid #a6773f;outline-offset:3px}</style>

<style scoped>.compact-date{overflow-wrap:anywhere}</style>

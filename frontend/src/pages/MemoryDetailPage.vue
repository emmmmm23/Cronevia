<script setup lang="ts">
import {ref,computed,onMounted,onBeforeUnmount} from 'vue'
import {useRoute,useRouter,RouterLink,onBeforeRouteLeave} from 'vue-router'
import {useAuthStore} from '@/stores/auth'
import api from '@/services/api.service'
import {emptyLayout,validateScrapbook} from '@/types/scrapbook'
import {scrapbookError} from '@/services/scrapbook-errors'
import type {Memory} from '@/types'
import ScrapbookNotebook from '@/components/journal/ScrapbookNotebook.vue'
import NotebookHeader from '@/components/shared/NotebookHeader.vue'
import AppSheet from '@/components/shared/AppSheet.vue'
const route=useRoute(),router=useRouter(),auth=useAuthStore()
const id=ref(route.params.id as string|undefined),draftKey=crypto.randomUUID()
const memory=ref<Memory|null>(null),title=ref(''),text=ref(''),date=ref(new Date().toLocaleDateString('en-CA')),place=ref('')
const layout=ref(emptyLayout()),viewMode=ref(!!id.value && route.name!=='memories.edit')
const ready=ref(false),loading=ref(true),saving=ref(false),uploadBusy=ref(false),error=ref(''),detailsOpen=ref(false)
const baseline=ref(''),notebook=ref<InstanceType<typeof ScrapbookNotebook>|null>(null)
const snapshot=()=>JSON.stringify({title:title.value,text:text.value,date:date.value,place:place.value,layout:layout.value})
const dirty=computed(()=>ready.value && snapshot()!==baseline.value)
const photos=computed(()=>memory.value?.media?.filter(m=>m.type==='image'||m.mime_type?.startsWith('image/')) || [])
const photoIndex=ref(0),viewer=ref(false),photoFailed=ref(false)
const currentPhoto=computed(()=>photos.value[photoIndex.value])
const dateLabel=computed(()=>new Date(date.value+'T00:00:00').toLocaleDateString('en',{month:'long',day:'numeric',year:'numeric'}))
function restore(){
 if(!memory.value)return
 title.value=memory.value.title;text.value=memory.value.description || '';date.value=memory.value.memory_date;place.value=memory.value.location_name || ''
 layout.value=JSON.parse(JSON.stringify(memory.value.scrapbook_layout || emptyLayout()))
 notebook.value?.reset(layout.value);baseline.value=snapshot();viewMode.value=true
}
async function load(){
 loading.value=true;error.value=''
 try{
  if(id.value){const row=(await api.get<{data:Memory}>('/memories/'+id.value)).data.data;if(row.scrapbook_layout)validateScrapbook(row.scrapbook_layout);memory.value=row;restore();if(route.name==='memories.edit')viewMode.value=false}
  else baseline.value=snapshot()
  ready.value=true
 }catch(e){error.value=scrapbookError(e,'load')}finally{loading.value=false}
}
onMounted(load)
async function save(){
 if(!ready.value||saving.value||uploadBusy.value||!title.value.trim()||!date.value)return
 saving.value=true;error.value=''
 try{
  if(!id.value)id.value=(await api.post<{data:Memory}>('/memories',{title:title.value,description:text.value,memory_date:date.value,draft_key:draftKey})).data.data.id
  const composition=await notebook.value!.prepareSave(id.value)
  memory.value=(await api.put<{data:Memory}>('/memories/'+id.value,{title:title.value,description:text.value,memory_date:date.value,location_name:place.value || null,scrapbook_layout:composition})).data.data
  notebook.value?.markSaved();restore()
  if(!route.params.id)await router.replace({name:'memories.show',params:{id:id.value}})
 }catch(e){error.value=scrapbookError(e,'save')}finally{saving.value=false}
}
function cancel(){
 if(memory.value){restore();error.value='';return}
 if(dirty.value&&!window.confirm('Discard this unsaved memory?'))return
 baseline.value=snapshot();router.push('/memories')
}
function nextPhoto(direction:number){photoIndex.value=(photoIndex.value+direction+photos.value.length)%photos.value.length;photoFailed.value=false}
function preventUnload(event:BeforeUnloadEvent){if(dirty.value){event.preventDefault();event.returnValue=''}}
onMounted(()=>window.addEventListener('beforeunload',preventUnload));onBeforeUnmount(()=>window.removeEventListener('beforeunload',preventUnload))
onBeforeRouteLeave(()=>!dirty.value||window.confirm('Leave without saving your memory changes?'))
</script>
<template>
 <main class="memory-studio">
  <NotebookHeader back-to="/memories" back-label="All memories" :status="loading?'Opening…':!ready?'Couldn’t load':saving?'Saving…':uploadBusy?'Uploading…':dirty?'Unsaved changes':id?'All changes saved':'New memory'" save-label="Save memory" edit-label="Edit memory" :view-mode="viewMode" :ready="ready" :disabled="!ready || saving || uploadBusy || !title.trim() || !date" :busy="saving || uploadBusy" @save="save" @edit="viewMode=false" @cancel="cancel" @details="detailsOpen=true" />
  <p v-if="error" class="notice" role="alert">{{error}} <button v-if="!ready" @click="load">Retry loading</button></p>
  <p v-if="loading" class="loading" role="status">Opening your memory…</p>
  <template v-if="ready">
   <p class="memory-date">{{dateLabel}}<span v-if="place"> · {{place}}</span></p>
   <p v-if="!id && !title.trim() && !text.trim() && !layout.pages.some(p=>p.elements.length)" class="creation-note">A photograph, a few words. Start with what you want to keep.</p>
   <section v-if="viewMode && photos.length" class="photo-story" aria-label="Memory photographs">
    <button class="hero-photo" :aria-label="'View photo '+(photoIndex+1)+' full screen'" @click="viewer=true"><img v-if="!photoFailed" :src="currentPhoto?.file_path" :alt="currentPhoto?.original_filename || title" @error="photoFailed=true" /><span v-else>Photo unavailable. Reopen this memory to refresh its private link.</span><span class="photo-expand" aria-hidden="true">⤢</span></button>
    <div class="photo-navigation"><button v-if="photos.length>1" aria-label="Previous photo" @click="nextPhoto(-1)">←</button><span>{{photoIndex+1}} / {{photos.length}}</span><button v-if="photos.length>1" aria-label="Next photo" @click="nextPhoto(1)">→</button></div>
    <div v-if="photos.length>1" class="photo-thumbnails"><button v-for="(photo,index) in photos" :key="photo.id" :aria-label="'Show photo '+(index+1)" :aria-pressed="photoIndex===index" @click="photoIndex=index;photoFailed=false"><img :src="photo.file_path" alt="" loading="lazy" /></button></div>
   </section>
   <ScrapbookNotebook ref="notebook" v-model="layout" v-model:title="title" v-model:text="text" resource="memories" :entry-id="id" :user-id="auth.user?.id" :media="memory?.media || []" :view-mode="viewMode" :disabled="saving" @busy-change="uploadBusy=$event" />
   <nav v-if="viewMode" class="related-links" aria-label="Related records"><RouterLink v-if="memory?.trip_id" :to="{name:'trips.show',params:{id:memory.trip_id}}">Explore the related trip ↗</RouterLink><RouterLink v-if="memory?.journal_entry" :to="{name:'journal.edit',params:{id:memory.journal_entry.id}}">{{memory.journal_entry.title}} ↗</RouterLink></nav>
  </template>
  <AppSheet v-model="detailsOpen" title="Memory details"><div class="detail-fields"><label>Date<input v-model="date" type="date" :disabled="saving || viewMode" /></label><label>Place <span>optional</span><input v-model="place" placeholder="Where was this moment?" :disabled="saving || viewMode" /></label><p>Only you can access your private photos and keepsakes.</p></div></AppSheet>
  <AppSheet v-model="viewer" :title="'Photographs · '+(photoIndex+1)+' of '+photos.length" fullscreen><div class="full-photo" @keydown.left.prevent="nextPhoto(-1)" @keydown.right.prevent="nextPhoto(1)"><img :src="currentPhoto?.file_path" :alt="currentPhoto?.original_filename || title" /><div class="photo-navigation"><button :disabled="photos.length<2" aria-label="Previous full-screen photo" @click="nextPhoto(-1)">←</button><span>{{photoIndex+1}} / {{photos.length}}</span><button :disabled="photos.length<2" aria-label="Next full-screen photo" @click="nextPhoto(1)">→</button></div></div></AppSheet>
 </main>
</template>
<style scoped>
.memory-studio{min-height:100dvh;padding:24px 36px 60px;background:radial-gradient(ellipse at 50% 30%,#f3eee4,transparent 70%),#e9e4da;color:#51493f}.memory-date{text-align:center;font-size:13px;color:#796f5d;margin:0 0 24px}.creation-note{text-align:center;font:23px 'Caveat',cursive;color:#727c64;margin:12px auto 24px;max-width:500px}.notice{max-width:1000px;margin:16px auto;padding:16px;background:#f4e3cf;border-radius:8px}.notice button{padding:10px;background:none;border:0;text-decoration:underline;min-height:44px}.loading{text-align:center;padding:90px 20px;font:24px Georgia,serif}.photo-story{max-width:1020px;margin:0 auto 32px}.hero-photo{display:flex;position:relative;align-items:center;justify-content:center;width:100%;height:clamp(240px,45vw,480px);padding:16px;background:#deded2;border:0;border-radius:9px;color:#51493f;cursor:zoom-in}.hero-photo img{max-width:100%;height:100%;object-fit:contain;box-shadow:0 8px 24px #28261921}.photo-expand{position:absolute;bottom:12px;right:12px;background:#faf6ede8;border-radius:50%;width:44px;height:44px;display:grid;place-items:center;font-size:24px}.photo-navigation{display:flex;align-items:center;justify-content:center;gap:20px;margin:12px auto;font-size:13px}.photo-navigation button{min-width:48px;min-height:44px;background:#f6f1e6;border:1px solid #d8cfbf;border-radius:50%;font-size:22px;color:#74283c}.photo-thumbnails{display:flex;overflow-x:auto;gap:8px;justify-content:safe center}.photo-thumbnails button{width:64px;height:64px;flex-shrink:0;padding:3px;background:#f5eee1;border:2px solid transparent;border-radius:6px}.photo-thumbnails button[aria-pressed=true]{border-color:#74283c}.photo-thumbnails img{width:100%;height:100%;object-fit:cover}.related-links{max-width:1020px;margin:24px auto;display:flex;gap:20px;flex-wrap:wrap}.related-links a{font-size:14px;padding:12px 0;color:#74283c}.detail-fields{display:grid;gap:20px}.detail-fields label{display:grid;gap:8px;font-size:14px}.detail-fields label span{color:#857b67}.detail-fields input{font-size:16px;min-height:48px;border:1px solid #d4caba;padding:10px;border-radius:6px;background:#fffbf3}.detail-fields p{font-size:13px;color:#7c735e}.full-photo{height:100%;min-height:0;display:flex;flex-direction:column}.full-photo img{object-fit:contain;flex:1;min-height:0;width:100%}button:focus-visible,a:focus-visible{outline:2px solid #975569;outline-offset:3px}
@media(max-width:959px){.memory-studio{padding:12px;min-height:100dvh}.memory-date{margin:8px 0 18px;font-size:13px}.creation-note{font-size:21px;padding:0 16px}.hero-photo{padding:8px;height:clamp(240px,70vw,480px)}.photo-story{margin-bottom:22px}}
</style>

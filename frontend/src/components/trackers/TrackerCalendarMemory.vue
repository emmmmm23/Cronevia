<script setup lang="ts">
import {computed,onBeforeUnmount,ref,watch} from 'vue'
import {trackerAssetUrl} from '@/services/trackers.service'
import type {TrackerLog} from '@/types/trackers'
const props=defineProps<{date:string;logs:TrackerLog[]}>()
const note=computed(()=>props.logs.map(log=>log.values.note?.trim()).filter(Boolean).join(' · '))
const photo=computed(()=>props.logs.find(log=>log.values.photo)?.values.photo||'')
const label=computed(()=>new Date(props.date+'T12:00:00').toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'}))
const url=ref(''),failed=ref(false)
let generation=0
watch(photo,async path=>{
 const current=++generation;url.value='';failed.value=false
 if(!path)return
 try{const signed=await trackerAssetUrl(path);if(current===generation)url.value=signed}catch{if(current===generation)failed.value=true}
},{immediate:true})
onBeforeUnmount(()=>generation++)
</script>
<template>
 <span class="calendar-cell-memory">
  <img v-if="photo&&url&&!failed" class="calendar-photo" :src="url" :alt="'Photo for '+label" loading="lazy" decoding="async" @error="failed=true"/>
  <span v-else-if="photo" class="calendar-photo-state">{{failed?'Photo unavailable':'Opening photo…'}}</span>
  <span v-if="note" class="calendar-note" :title="note">{{note}}</span>
 </span>
</template>
<style scoped>
.calendar-cell-memory{display:flex;flex-direction:column;gap:6px;min-width:0;max-width:100%;text-align:left;overflow:hidden;color:#514b40}
.calendar-photo{display:block;width:100%;height:64px;object-fit:cover;border-radius:3px;background:#eee8d8}
.calendar-note{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;overflow-wrap:anywhere;white-space:normal;font:12px/1.4 Inter,sans-serif;color:#514b40}
.calendar-photo-state{font:11px/1.4 Inter,sans-serif;color:#796548;overflow-wrap:anywhere}
@media(max-width:650px){.calendar-cell-memory{gap:4px}.calendar-photo{height:36px}.calendar-note{font-size:11px;-webkit-line-clamp:3}.calendar-photo-state{font-size:10px}}
</style>

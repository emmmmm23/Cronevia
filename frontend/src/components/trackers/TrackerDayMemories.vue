<script setup lang="ts">
import {computed,onBeforeUnmount,ref,watch} from 'vue'
import {trackerAssetUrl} from '@/services/trackers.service'
import type {TrackerLog} from '@/types/trackers'
const props=defineProps<{trackerId:string;month:string;logs:TrackerLog[]}>()
const entries=computed(()=>props.logs.filter(log=>log.tracker_id===props.trackerId&&log.log_date.startsWith(props.month)&&(log.values.note?.trim()||log.values.photo)).sort((a,b)=>a.log_date.localeCompare(b.log_date)||a.created_at.localeCompare(b.created_at)))
const urls=ref<Record<string,string>>({}),failed=ref<Record<string,boolean>>({})
const label=(date:string)=>new Date(date+'T12:00:00').toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'})
let generation=0
async function loadPhotos(){
 const current=++generation;urls.value={};failed.value={}
 const paths=[...new Set(entries.value.map(log=>log.values.photo).filter((path):path is string=>!!path))]
 const results=await Promise.allSettled(paths.map(async path=>({path,url:await trackerAssetUrl(path)})))
 if(current!==generation)return
 results.forEach((result,index)=>{if(result.status==='fulfilled')urls.value[result.value.path]=result.value.url;else failed.value[paths[index]]=true})
}
watch(()=>[props.trackerId,props.month,...entries.value.map(log=>log.values.photo||'')].join('|'),()=>void loadPhotos(),{immediate:true})
onBeforeUnmount(()=>generation++)
</script>
<template>
 <section v-if="entries.length" class="day-memories" aria-label="Notes and photos">
  <h4>Notes &amp; photos</h4>
  <div class="day-memory-list"><article v-for="log in entries" :key="log.id" class="day-memory" :aria-label="'Kept on '+label(log.log_date)">
   <time :datetime="log.log_date">{{label(log.log_date)}}</time>
   <p v-if="log.values.note?.trim()">{{log.values.note}}</p>
   <figure v-if="log.values.photo"><img v-if="urls[log.values.photo]&&!failed[log.values.photo]" :src="urls[log.values.photo]" :alt="'Photo kept on '+label(log.log_date)" loading="lazy" decoding="async" @error="failed[log.values.photo]=true"/><div v-else class="photo-state"><span>{{failed[log.values.photo]?'This photo couldn’t load.':'Opening your photo…'}}</span><button v-if="failed[log.values.photo]" type="button" @click="loadPhotos">Retry photo</button></div></figure>
  </article></div>
 </section>
</template>
<style scoped>
.day-memories{margin:28px auto 0;max-width:840px;padding-top:22px;border-top:1px solid #c8bda5;color:#514b40}
.day-memories h4{font:26px/1.3 Caveat,cursive;color:#796548;margin:0 0 16px}
.day-memory-list{display:grid;gap:18px;align-items:start}
.day-memory{min-width:0;padding:16px;border:1px solid #d7c9af;border-radius:5px;background:#fffdf3}
.day-memory time{display:block;font:21px/1.3 Caveat,cursive;color:#806443}
.day-memory p{font:14px/1.75 Inter,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere;margin:12px 0 0}
.day-memory figure{margin:14px 0 0;min-width:0}
.day-memory img{display:block;width:100%;height:auto;max-height:360px;object-fit:contain;border-radius:3px;background:#eee8d8}
.photo-state{display:grid;justify-items:start;gap:8px;font:13px/1.6 Inter,sans-serif;color:#817357;padding:12px 0}
.photo-state button{min-height:44px;padding:8px 12px;border:1px solid #c8bda5;border-radius:4px}
@media(min-width:651px){.day-memory-list{grid-template-columns:repeat(2,minmax(0,1fr))}.day-memory:only-child{grid-column:1/-1;max-width:560px;width:100%}}
</style>

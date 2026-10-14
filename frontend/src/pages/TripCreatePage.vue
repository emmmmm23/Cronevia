<script setup lang="ts">
import {ref,computed,onMounted,onBeforeUnmount} from 'vue'
import {useRoute,useRouter,RouterLink,onBeforeRouteLeave} from 'vue-router'
import api from '@/services/api.service'
import type {Trip} from '@/types'
import TripBasicsForm,{type TripDraft} from '@/components/trips/TripBasicsForm.vue'
import {dateError} from '@/composables/tripPlanner'
import {useEditingViewport} from '@/composables/useEditingViewport'
import '@/styles/field-notes.css'
const route=useRoute(),router=useRouter(),id=route.params.id as string|undefined,draftKey=crypto.randomUUID()
useEditingViewport()
const draft=ref<TripDraft>({title:'',destination:'',start:'',end:'',undecided:true,description:'',timezone:'',status:'planning'})
const loading=ref(!!id),ready=ref(!id),saving=ref(false),error=ref(''),baseline=ref(JSON.stringify(draft.value))
const dirty=computed(()=>ready.value&&JSON.stringify(draft.value)!==baseline.value)
onMounted(async()=>{if(!id)return;try{const t=(await api.get<{data:Trip}>('/trips/'+id)).data.data;draft.value={title:t.title,destination:t.destination||'',start:t.start_date||'',end:t.end_date||'',undecided:!t.start_date,description:t.description||'',timezone:t.timezone||'',status:t.status};baseline.value=JSON.stringify(draft.value);ready.value=true}catch{error.value='This trip couldn’t be opened. Reload to try again.'}finally{loading.value=false}})
async function save(){if(saving.value||!ready.value||!draft.value.title.trim())return;error.value=dateError(draft.value.start,draft.value.end,draft.value.undecided);if(error.value)return
 try{if(draft.value.timezone)new Intl.DateTimeFormat('en',{timeZone:draft.value.timezone})}catch{error.value='Use a timezone such as Asia/Manila.';return}
 saving.value=true;const d=draft.value,payload={title:d.title.trim(),destination:d.destination||null,description:d.description||null,start_date:d.undecided?null:d.start,end_date:d.undecided?null:d.end||d.start,timezone:d.timezone||null,status:d.status}
 try{let target=id;if(!target)target=(await api.post<{data:Trip}>('/trips',{...payload,draft_key:draftKey})).data.data.id;await api.put('/trips/'+target,payload);baseline.value=JSON.stringify(draft.value);await router.replace('/trips/'+target)}catch(e){console.warn('[trip setup]',e);error.value='Your trip couldn’t be saved. Your details are still here; please retry.'}finally{saving.value=false}}
function beforeUnload(e:BeforeUnloadEvent){if(dirty.value){e.preventDefault();e.returnValue=''}}
onMounted(()=>window.addEventListener('beforeunload',beforeUnload));onBeforeUnmount(()=>window.removeEventListener('beforeunload',beforeUnload));onBeforeRouteLeave(()=>!dirty.value||confirm('Leave without saving your trip details?'))
</script>
<template><main class="field-notes setup"><div class="topline"><RouterLink :to="id?'/trips/'+id:'/trips'" class="back">← {{id?'Back to trip':'All trips'}}</RouterLink><span class="status-note">{{saving?'Saving…':dirty?'Unsaved details':'Your next chapter'}}</span></div><header class="page-heading"><div><p class="eyebrow">A travel field notebook</p><h1>{{id?'A few details.':'Begin a journey.'}}</h1><p class="handnote">The rest can unfold along the way.</p></div></header><div v-if="loading" class="loading">Opening your trip…</div><form v-else-if="ready" class="paper-card" @submit.prevent="save"><TripBasicsForm v-model="draft" :editing="!!id" :disabled="saving" /><p v-if="error" role="alert" class="notice">{{error}}</p><div class="sheet-actions"><button class="primary" :disabled="saving || !draft.title.trim()">{{saving?'Saving…':id?'Save details':'Create trip'}}</button></div></form><p v-else role="alert" class="notice">{{error}}</p></main></template>
<style scoped>.setup{max-width:720px}.setup .paper-card{padding:24px}.setup .page-heading{margin-bottom:30px}</style>

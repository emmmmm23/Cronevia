<script setup lang="ts">
import {ref,computed,onMounted,onBeforeUnmount} from 'vue'
import {useRoute,useRouter,RouterLink,onBeforeRouteLeave} from 'vue-router'
import api from '@/services/api.service'
import type {Trip} from '@/types'
import {destinationFields} from '@/types/destination'
import TripBasicsForm,{type TripDraft} from '@/components/trips/TripBasicsForm.vue'
import {dateError,plannerError} from '@/composables/tripPlanner'
import {useEditingViewport} from '@/composables/useEditingViewport'
import '@/styles/field-notes.css'
const route=useRoute(),router=useRouter(),id=route.params.id as string|undefined,draftKey=crypto.randomUUID()
useEditingViewport()
const draft=ref<TripDraft>({title:'',destination:'',start:'',end:'',undecided:true,description:'',timezone:'',status:'planning'})
const snapshot=()=>JSON.stringify(draft.value)
const loading=ref(!!id),ready=ref(!id),saving=ref(false),error=ref(''),baseline=ref(snapshot())
const dirty=computed(()=>ready.value&&snapshot()!==baseline.value)
onMounted(async()=>{if(!id)return;try{const t=(await api.get<{data:Trip}>('/trips/'+id)).data.data;draft.value={title:t.title,destination:t.destination||'',...destinationFields(t),start:t.start_date||'',end:t.end_date||'',undecided:!t.start_date,description:t.description||'',timezone:t.timezone||'',status:t.status};baseline.value=snapshot();ready.value=true}catch{error.value='This trip couldn’t be opened. Reload to try again.'}finally{loading.value=false}})
async function save(){if(saving.value||!ready.value||!draft.value.title.trim())return;error.value=dateError(draft.value.start,draft.value.end,draft.value.undecided);if(error.value)return
 try{if(draft.value.timezone)new Intl.DateTimeFormat('en',{timeZone:draft.value.timezone})}catch{error.value='Use a timezone such as Asia/Manila.';return}
 saving.value=true;const d=draft.value,payload={title:d.title.trim(),destination:d.destination||null,...destinationFields(d),description:d.description||null,start_date:d.undecided?null:d.start,end_date:d.undecided?null:d.end||d.start,timezone:d.timezone||null,status:d.status}
 try{let target=id;if(!target)target=(await api.post<{data:Trip}>('/trips',{...payload,draft_key:draftKey})).data.data.id;await api.put('/trips/'+target,payload);baseline.value=snapshot();await router.replace('/trips/'+target)}catch(e){error.value=plannerError(e)}finally{saving.value=false}}
function beforeUnload(e:BeforeUnloadEvent){if(dirty.value){e.preventDefault();e.returnValue=''}}
onMounted(()=>window.addEventListener('beforeunload',beforeUnload));onBeforeUnmount(()=>window.removeEventListener('beforeunload',beforeUnload));onBeforeRouteLeave(()=>!dirty.value||confirm('Leave without saving your trip details?'))
</script>
<template><main class="field-notes setup"><div class="topline"><RouterLink :to="id?'/trips/'+id:'/trips'" class="back">← {{id?'Back to trip':'All trips'}}</RouterLink><span class="status-note">{{saving?'Saving…':dirty?'Unsaved details':'Your next chapter'}}</span></div><header class="page-heading"><div><p class="eyebrow">Your personal travel itinerary</p><h1>{{id?'A few details.':'Begin a journey.'}}</h1><p class="handnote">A few details. A world of possibilities.</p></div></header><div v-if="loading" class="loading">Opening your trip…</div><form v-else-if="ready" class="paper-card" @submit.prevent="save"><TripBasicsForm v-model="draft" :editing="!!id" :disabled="saving" /><p v-if="error" role="alert" class="notice">{{error}}</p><div class="sheet-actions"><button class="primary" :disabled="saving || !draft.title.trim()">{{saving?'Saving…':id?'Save details':'Create itinerary'}}</button></div></form><p v-else role="alert" class="notice">{{error}}</p></main></template>
<style scoped>.draft-ideas{margin-top:18px}.draft-ideas .muted{margin-bottom:14px}.draft-idea{display:grid;grid-template-columns:1fr 44px;gap:8px;margin:14px 0}.draft-idea label{grid-column:1/-1}.setup{max-width:720px}.setup .paper-card{padding:24px}.setup .page-heading{margin-bottom:22px}.setup h1{font-size:clamp(30px,4vw,42px);margin:6px 0}.setup .handnote{font-size:20px}.setup .paper-card{border-top:4px solid #74283c}.setup{max-width:680px;padding-top:22px}.setup .sheet-actions{position:static}</style>

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
const ideas=ref<{id:string;title:string}[]>([])
function addIdea(){ideas.value.push({id:crypto.randomUUID(),title:''})}
const snapshot=()=>JSON.stringify({details:draft.value,ideas:ideas.value})
const loading=ref(!!id),ready=ref(!id),saving=ref(false),error=ref(''),baseline=ref(snapshot())
const dirty=computed(()=>ready.value&&snapshot()!==baseline.value)
onMounted(async()=>{if(!id)return;try{const t=(await api.get<{data:Trip}>('/trips/'+id)).data.data;draft.value={title:t.title,destination:t.destination||'',...destinationFields(t),start:t.start_date||'',end:t.end_date||'',undecided:!t.start_date,description:t.description||'',timezone:t.timezone||'',status:t.status};baseline.value=snapshot();ready.value=true}catch{error.value='This trip couldn’t be opened. Reload to try again.'}finally{loading.value=false}})
async function save(){if(saving.value||!ready.value||!draft.value.title.trim())return;error.value=dateError(draft.value.start,draft.value.end,draft.value.undecided);if(error.value)return
 try{if(draft.value.timezone)new Intl.DateTimeFormat('en',{timeZone:draft.value.timezone})}catch{error.value='Use a timezone such as Asia/Manila.';return}
 saving.value=true;const d=draft.value,payload={title:d.title.trim(),destination:d.destination||null,...destinationFields(d),description:d.description||null,start_date:d.undecided?null:d.start,end_date:d.undecided?null:d.end||d.start,timezone:d.timezone||null,status:d.status}
 try{let target=id;if(!target)target=(await api.post<{data:Trip}>('/trips',{...payload,draft_key:draftKey,draft_ideas:ideas.value.filter(i=>i.title.trim())})).data.data.id;await api.put('/trips/'+target,payload);baseline.value=snapshot();await router.replace('/trips/'+target)}catch(e){error.value=plannerError(e)}finally{saving.value=false}}
function beforeUnload(e:BeforeUnloadEvent){if(dirty.value){e.preventDefault();e.returnValue=''}}
onMounted(()=>window.addEventListener('beforeunload',beforeUnload));onBeforeUnmount(()=>window.removeEventListener('beforeunload',beforeUnload));onBeforeRouteLeave(()=>!dirty.value||confirm('Leave without saving your trip details?'))
</script>
<template><main class="field-notes setup"><div class="topline"><RouterLink :to="id?'/trips/'+id:'/trips'" class="back">← {{id?'Back to trip':'All trips'}}</RouterLink><span class="status-note">{{saving?'Saving…':dirty?'Unsaved details':'Your next chapter'}}</span></div><header class="page-heading"><div><p class="eyebrow">A travel field notebook</p><h1>{{id?'A few details.':'Begin a journey.'}}</h1><p class="handnote">The rest can unfold along the way.</p></div></header><div v-if="loading" class="loading">Opening your trip…</div><form v-else-if="ready" class="paper-card" @submit.prevent="save"><TripBasicsForm v-model="draft" :editing="!!id" :disabled="saving" /><details v-if="!id" class="draft-ideas"><summary>Start an ideas list · optional</summary><p class="muted">Add a few possibilities now. They’ll be saved with this trip, ready to move into a day.</p><div v-for="(idea,index) in ideas" :key="idea.id" class="draft-idea"><label :for="idea.id">Idea {{index+1}}</label><input :id="idea.id" v-model="idea.title" maxlength="255" :disabled="saving" placeholder="A place, a meal, a moment" /><button type="button" :aria-label="'Remove idea '+(index+1)" @click="ideas=ideas.filter(i=>i.id!==idea.id)" :disabled="saving">×</button></div><button type="button" :disabled="saving||ideas.length>=20" @click="addIdea">＋ Add idea</button></details><p v-if="error" role="alert" class="notice">{{error}}</p><div class="sheet-actions"><button class="primary" :disabled="saving || !draft.title.trim()">{{saving?'Saving…':id?'Save details':'Create trip'}}</button></div></form><p v-else role="alert" class="notice">{{error}}</p></main></template>
<style scoped>.draft-ideas{margin-top:18px}.draft-ideas .muted{margin-bottom:14px}.draft-idea{display:grid;grid-template-columns:1fr 44px;gap:8px;margin:14px 0}.draft-idea label{grid-column:1/-1}.setup{max-width:720px}.setup .paper-card{padding:24px}.setup .page-heading{margin-bottom:30px}.setup .sheet-actions{position:static}</style>

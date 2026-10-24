<script setup lang="ts">
import {ref,computed,onMounted,onBeforeUnmount} from 'vue'
import {useRoute,useRouter,RouterLink,onBeforeRouteLeave} from 'vue-router'
import api from '@/services/api.service'
import type {Trip} from '@/types'
import {destinationFields} from '@/types/destination'
import TripBasicsForm,{type TripDraft} from '@/components/trips/TripBasicsForm.vue'
import AppSheet from '@/components/shared/AppSheet.vue'
import {dateError,plannerError} from '@/composables/tripPlanner'
import {useEditingViewport} from '@/composables/useEditingViewport'
import '@/styles/field-notes.css'
import SignInAgain from '@/components/shared/SignInAgain.vue'
import {isSignInRequired} from '@/services/request-errors'
import {discoveryHandoff} from '@/composables/discoverySession'
import type {Place} from '@/types/discovery'
import type {SuggestedVisit} from '@/composables/discovery'
function recommend(place:Place,date:string){discoveryHandoff.value={place,date};void router.push('/trips/'+id+'?discover=1')}
function review(visits:SuggestedVisit[]){discoveryHandoff.value={visits,date:''};void router.push('/trips/'+id+'?discover=1')}
const route=useRoute(),router=useRouter(),id=route.params.id as string|undefined,draftKey=crypto.randomUUID()
useEditingViewport()
const draft=ref<TripDraft>({title:'',destination:'',start:'',end:'',undecided:true,description:'',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',status:'planning'})
const snapshot=()=>JSON.stringify(draft.value)
const loading=ref(!!id),ready=ref(!id),saving=ref(false),error=ref(''),baseline=ref(snapshot())
const createdId=ref(''),createdTitle=ref(''),needsSignIn=ref(false)
const dirty=computed(()=>ready.value&&snapshot()!==baseline.value)
onMounted(async()=>{if(!id)return;try{const t=(await api.get<{data:Trip}>('/trips/'+id)).data.data;draft.value={title:t.title,destination:t.destination||'',...destinationFields(t),start:t.start_date||'',end:t.end_date||'',undecided:!t.start_date,description:t.description||'',timezone:t.timezone||'',status:t.status};baseline.value=snapshot();ready.value=true}catch{error.value='This trip couldn’t be opened. Reload to try again.'}finally{loading.value=false}})
async function save(){if(saving.value||needsSignIn.value||!ready.value||!draft.value.title.trim())return;error.value=id?dateError(draft.value.start,draft.value.end,draft.value.undecided):'';if(error.value)return
 saving.value=true;const d=draft.value
 try{
  if(id){await api.put('/trips/'+id,{title:d.title.trim(),destination:d.destination||null,...destinationFields(d),description:d.description||null,start_date:d.undecided?null:d.start,end_date:d.undecided?null:d.end||d.start,timezone:d.timezone||null,status:d.status})}
  else {
   if(!createdId.value){const saved=(await api.post<{data:Trip}>('/trips',{title:d.title.trim(),timezone:d.timezone,draft_key:draftKey})).data.data;createdId.value=saved.id;createdTitle.value=saved.title}
   if(createdTitle.value!==d.title.trim()){await api.put('/trips/'+createdId.value,{title:d.title.trim()});createdTitle.value=d.title.trim()}
  }
  baseline.value=snapshot()
 }catch(e){needsSignIn.value=isSignInRequired(e);error.value=needsSignIn.value?'':plannerError(e);saving.value=false;return}
 try{const failure=await router.replace('/trips/'+(id||createdId.value)+(route.query?.from==='discovery'?'?discover=1':''));if(failure)throw failure}
 catch{error.value='Your trip is saved. We couldn’t open it yet. Retry opening your itinerary.'}
 finally{saving.value=false}
}
function close(){if(!saving.value)void router.push('/trips')}
function beforeUnload(e:BeforeUnloadEvent){if(dirty.value){e.preventDefault();e.returnValue=''}}
onMounted(()=>window.addEventListener('beforeunload',beforeUnload));onBeforeUnmount(()=>window.removeEventListener('beforeunload',beforeUnload));onBeforeRouteLeave(()=>!dirty.value||confirm('Leave without saving your trip name?'))
</script>
<template><main class="field-notes setup"><RouterLink :to="id?'/trips/'+id:'/trips'" class="back">← Back to {{id?'trip':'Trips'}}</RouterLink>
 <template v-if="id"><h1>Trip details</h1><p v-if="loading" role="status">Opening your trip…</p><form v-else-if="ready" class="paper-card" @submit.prevent="save"><TripBasicsForm v-model="draft" @recommend="recommend" @plan="review" editing :disabled="saving" /><SignInAgain v-if="needsSignIn" @restored="needsSignIn=false" /><p v-if="error" role="alert" class="notice">{{error}}</p><button class="primary" :disabled="saving">{{saving?'Saving…':error?'Retry':'Save details'}}</button></form><p v-else role="alert">{{error}}</p></template>
 <template v-else><header class="creation-backdrop"><p class="eyebrow">Your personal travel collection</p><h1>A new folder.<br>A little possibility.</h1><p>Start with a name. Build the journey as you go.</p></header><AppSheet :model-value="true" title="Where are we going?" @update:model-value="close"><form class="form-grid" @submit.prevent="save"><p class="muted">Give your trip a name. Places and dates can come later.</p><label>Trip name<input v-model="draft.title" autofocus required maxlength="255" placeholder="A weekend in Tagaytay" :disabled="saving" /></label><SignInAgain v-if="needsSignIn" @restored="needsSignIn=false" /><p v-if="error" role="alert" class="notice">{{error}}</p><div class="create-actions"><button type="button" :disabled="saving" @click="close">Cancel</button><button class="primary" :disabled="saving||needsSignIn||!draft.title.trim()">{{saving?(createdId?'Opening…':'Creating…'):error?'Retry':createdId?'Open itinerary':'Create trip'}}</button></div></form></AppSheet></template>
</main></template>
<style scoped>.setup{max-width:720px}.creation-backdrop{padding:70px 0;color:#847662}.creation-backdrop h1{font-size:42px;line-height:1.15;margin:12px 0}.creation-backdrop p{line-height:1.7}.create-actions{display:flex;gap:10px;margin-top:8px}.create-actions .primary{flex:1}.setup input{font-size:16px}.setup .paper-card{margin-top:20px}@media(max-width:600px){.creation-backdrop{padding:35px 0}.creation-backdrop h1{font-size:32px}}</style>

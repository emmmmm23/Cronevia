<script setup lang="ts">
import {ref,onMounted} from 'vue'
import {useRouter} from 'vue-router'
import ContentExplorer from '@/components/ContentExplorer.vue'
import DestinationPicker from '@/components/trips/DestinationPicker.vue'
import AppSheet from '@/components/shared/AppSheet.vue'
import {allRecords} from '@/services/planner.service'
import {discoveryHandoff,discoverySelection} from '@/composables/discoverySession'
import type {Trip} from '@/types'
import type {Place} from '@/types/discovery'
import type {SuggestedVisit} from '@/composables/discovery'
import {useEditingViewport} from '@/composables/useEditingViewport'
useEditingViewport()
const router=useRouter(),picker=ref<InstanceType<typeof DestinationPicker>>(),choose=ref(false),trips=ref<Trip[]>([]),loading=ref(false),error=ref(''),opening=ref(false)
async function loadTrips(){loading.value=true;error.value='';try{trips.value=await allRecords<Trip>('trips')}catch{error.value='Your trips couldn’t load. Retry to choose a folder.'}finally{loading.value=false}}
function add(place:Place,date:string){discoveryHandoff.value={place,date};choose.value=true;void loadTrips()}
function plan(visits:SuggestedVisit[]){discoveryHandoff.value={visits,date:''};choose.value=true;void loadTrips()}
async function go(path:string){if(opening.value)return;opening.value=true;try{await router.push(path)}finally{opening.value=false}}
onMounted(()=>picker.value?.show())
</script>
<template><main class="field-notes exploration"><p class="eyebrow">Your next little adventure</p><h1>Explore the Philippines</h1><p>Find a place, then make room for it in your travel folder.</p><DestinationPicker ref="picker" :destination="discoverySelection?.name||''" :location="{destination_latitude:discoverySelection?.latitude,destination_longitude:discoverySelection?.longitude,destination_source:discoverySelection?'map':null}" @remember="discoverySelection=$event" @change="(name,pin)=>discoverySelection=pin.destination_latitude!=null&&pin.destination_longitude!=null?{name,latitude:pin.destination_latitude,longitude:pin.destination_longitude}:null" @recommend="add" @plan="plan" /><details class="saved-places"><summary>Your saved places & memories</summary><ContentExplorer mode="map" /></details><AppSheet :model-value="choose" title="Choose a trip folder" @update:model-value="choose=$event"><p>Review the place and choose its date and times inside your trip.</p><p v-if="loading" role="status">Opening your folders…</p><p v-if="error" role="alert">{{error}} <button @click="loadTrips">Retry</button></p><div class="trip-choices"><button v-for="trip in trips" :key="trip.id" :disabled="opening" @click="go('/trips/'+trip.id+'?discover=1')">{{trip.title}}</button><button class="primary" :disabled="opening" @click="go('/trips/new?from=discovery')">New trip</button></div></AppSheet></main></template>
<style scoped>.exploration{max-width:1000px}.exploration h1{font:36px Georgia,serif;margin:12px 0}.exploration>p{margin-bottom:18px}.saved-places{margin-top:30px}.saved-places>summary{min-height:44px;cursor:pointer}.trip-choices{display:grid;gap:10px;margin-top:18px}.trip-choices button{text-align:left;min-height:44px;font-size:16px}.exploration :deep(.destination-picker){max-width:700px}</style>

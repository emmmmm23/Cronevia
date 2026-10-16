<script setup lang="ts">
import {computed,ref} from 'vue'
const model=defineModel<string>({required:true})
defineProps<{disabled?:boolean}>()
const query=ref(''),picker=ref<HTMLDetailsElement>()
const fallback=['UTC','Asia/Manila','Asia/Tokyo','Asia/Singapore','Europe/London','Europe/Paris','America/New_York','America/Los_Angeles','Australia/Sydney']
const supported=(Intl as typeof Intl & {supportedValuesOf?:(key:string)=>string[]}).supportedValuesOf
const zones=[...new Set([...fallback,...(supported?supported('timeZone'):[])])].sort()
const friendly=(zone:string)=>zone==='UTC'?'Universal time · UTC':zone.split('/').at(-1)!.replace(/_/g,' ')+' · '+zone
const matches=computed(()=>zones.filter(z=>friendly(z).toLowerCase().includes(query.value.toLowerCase())).slice(0,40))
function select(zone:string){model.value=zone;if(picker.value)picker.value.open=false;query.value=''}
</script>
<template><div class="zone-field"><span class="zone-label">Trip timezone</span><details ref="picker"><summary :aria-disabled="disabled" @click="disabled&&$event.preventDefault()">{{model?friendly(model):'Use this device’s timezone'}}</summary><div class="zone-options"><label>Find a city or timezone<input v-model="query" type="search" placeholder="Try Manila or London" :disabled="disabled" /></label><button type="button" :disabled="disabled" @click="select('')">Use this device’s timezone</button><ul aria-label="Timezones"><li v-for="zone in matches" :key="zone"><button type="button" :aria-pressed="model===zone" :disabled="disabled" @click="select(zone)">{{friendly(zone)}}</button></li></ul><p v-if="!matches.length" role="status">No timezone found. Try a nearby major city.</p></div></details><p class="zone-help">Activity times follow this timezone.</p></div></template>
<style scoped>.zone-label{font-size:14px}.zone-field>details{border:1px solid #d5cbb9;border-radius:8px;margin-top:8px;background:#fffaf2}.zone-field summary{padding:10px 12px;font-size:16px}.zone-options{padding:12px}.zone-options ul{max-height:210px;overflow:auto;list-style:none;padding:0;margin:8px 0}.zone-options button{width:100%;text-align:left;justify-content:flex-start;min-height:44px;margin:2px 0}.zone-options button[aria-pressed=true]{background:#e8ede2}.zone-help{font-size:13px;color:#776e60;margin-top:7px}</style>

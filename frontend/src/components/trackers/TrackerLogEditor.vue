<script setup lang="ts">
import { cloneTracker } from '@/types/trackers'
import { computed, ref, watch } from 'vue'
import AppSheet from '@/components/shared/AppSheet.vue'
import TrackerSelectedDay from './TrackerSelectedDay.vue'
import { sleepHours, wallTime, zonedInstant, type CreativeTracker, type TrackerLog, type TrackerValues, type TrackerField, type FieldValue } from '@/types/trackers'
import { removeLog, saveLog, trackerError, trackerAssetUrl, uploadTrackerImage } from '@/services/trackers.service'
const props=defineProps<{tracker:CreativeTracker;date:string;logs:TrackerLog[];timezone:string;fieldId?:string}>()
const emit=defineEmits<{saved:[TrackerLog];removed:[string];close:[]}>()
const logDate=computed(()=>props.date),timezone=ref(props.timezone||'UTC')
const id=ref<string>(crypto.randomUUID()),editing=ref<string|null>(null),value=ref<string|number>(''),habit=ref<boolean|null>(null),category=ref('')
const note=ref(''),fields=ref<Record<string,FieldValue>>({}),start=ref(''),end=ref(''),awake=ref(0),quality=ref<string|number>(''),sleepType=ref<'night'|'nap'>('night'),repeated=ref<'earlier'|'later'>('earlier')
const photo=ref(''),photoUrl=ref(''),busy=ref(false),uploading=ref(false),error=ref(''),pendingPhoto=ref<File|null>(null)
const allLogs=computed(()=>props.logs)
const existing=computed(()=>allLogs.value.filter(l=>l.tracker_id===props.tracker.id&&l.log_date===logDate.value))
const multiple=computed(()=>props.tracker.kind==='sleep'||(props.tracker.kind==='custom'&&props.tracker.config.multiple))
const entryConfig=computed(()=>allLogs.value.find(l=>l.id===editing.value)?.config_snapshot||props.tracker.config)
const fieldHabit=computed(()=>props.tracker.kind==='custom'&&props.fieldId?entryConfig.value.fields.find(f=>f.id===props.fieldId&&f.type==='checkbox'):undefined)
function fill(log?:TrackerLog){
 editing.value=log?.id||null;id.value=log?.id||crypto.randomUUID();value.value=typeof log?.values.value==='number'?log.values.value:'';habit.value=typeof log?.values.value==='boolean'?log.values.value:null
 category.value=log?.values.category||'';note.value=log?.values.note||'';fields.value=cloneTracker(log?.values.fields||{})
 if(fieldHabit.value)habit.value=typeof fields.value[fieldHabit.value.id]==='boolean'?fields.value[fieldHabit.value.id] as boolean:null
 timezone.value=log?.timezone||props.timezone||'UTC';start.value=log?.started_at?wallTime(log.started_at,timezone.value):'';end.value=log?.ended_at?wallTime(log.ended_at,timezone.value):''
 awake.value=log?.values.awakeMinutes||0;quality.value=log?.values.quality||'';sleepType.value=log?.values.sleepType||'night';photo.value=log?.values.photo||'';photoUrl.value='';error.value=''
 if(photo.value)trackerAssetUrl(photo.value).then(url=>photoUrl.value=url).catch(()=>{})
}
watch(logDate,()=>fill(!multiple.value?existing.value[0]:undefined),{immediate:true})
function fieldValue(field:TrackerField,event:Event){
 const raw=(event.target as HTMLInputElement).value
 if(raw===''){delete fields.value[field.id];return}
 fields.value[field.id]=field.type==='checkbox'?raw==='true':['number','duration','rating'].includes(field.type)?Number(raw):raw
}
function toggleChoice(field:TrackerField,option:string){
 const selected=Array.isArray(fields.value[field.id])?[...fields.value[field.id] as string[]]:[]
 fields.value[field.id]=selected.includes(option)?selected.filter(v=>v!==option):[...selected,option]
}
const duration=computed(()=>{
 if(!start.value||!end.value)return ''
 try{
  const a=zonedInstant(start.value,timezone.value,repeated.value),b=zonedInstant(end.value,timezone.value,repeated.value)
  const hours=(Date.parse(b)-Date.parse(a))/3600000-Number(awake.value||0)/60
  return hours>0&&hours<=24?hours.toFixed(2)+' hours of sleep':'Review the start, wake, and awake times.'
 }catch(e){return trackerError(e)}
})
async function uploadPhoto(event?:Event){
 const file=event?(event.target as HTMLInputElement).files?.[0]:pendingPhoto.value;if(!file)return
 pendingPhoto.value=file;uploading.value=true;error.value=''
 try{photo.value=await uploadTrackerImage(file);photoUrl.value=await trackerAssetUrl(photo.value);pendingPhoto.value=null}catch(e){error.value=trackerError(e)}finally{uploading.value=false}
}
async function save(){
 if(busy.value||uploading.value)return
 error.value='';let values:TrackerValues={note:note.value,photo:photo.value||undefined},a:string|null=null,b:string|null=null
 try{
  if(props.tracker.kind==='habit'||fieldHabit.value){if(habit.value===null)throw new Error('Choose Yes or No. An unlogged day is different from No.');if(fieldHabit.value)values.fields={...fields.value,[fieldHabit.value.id]:habit.value};else values.value=habit.value}
  else if(props.tracker.kind==='category'){if(!category.value)throw new Error('Choose a color from your key.');values.category=category.value}
  else if(props.tracker.kind==='custom'){if(!Object.keys(fields.value).length&&!note.value&&!photo.value)throw new Error('Record a field, note, or photo.');values.fields=fields.value}
  else if(props.tracker.kind==='sleep'){
   a=zonedInstant(start.value,timezone.value,repeated.value);b=zonedInstant(end.value,timezone.value,repeated.value)
   const minutes=(Date.parse(b)-Date.parse(a))/60000
   if(minutes<=0||minutes>1440||Number(awake.value)<0||Number(awake.value)>=minutes)throw new Error('Choose a sleep session up to 24 hours, with shorter awake time.')
   values={...values,awakeMinutes:Number(awake.value),sleepType:sleepType.value,...(quality.value!==''?{quality:Number(quality.value)}:{})}
  }else{
   if(value.value===''||!Number.isFinite(Number(value.value))||Number(value.value)<0)throw new Error('Enter a number, including 0 if that is what you recorded.')
   values.value=Number(value.value)
  }
  busy.value=true
  emit('saved',await saveLog(props.tracker.id,id.value,logDate.value,values,timezone.value,a,b))
 }catch(e){error.value=trackerError(e)}finally{busy.value=false}
}
async function clear(){
 if(!editing.value||!window.confirm(fieldHabit.value?'Clear this habit’s answer? The other habits on this date will stay.':'Remove this entry? It will become an unlogged day.'))return
 busy.value=true;error.value=''
 try{
  if(fieldHabit.value){const original=existing.value.find(l=>l.id===editing.value)!,next=cloneTracker(original.values.fields||{});delete next[fieldHabit.value.id];if(Object.keys(next).length||original.values.note||original.values.photo){emit('saved',await saveLog(props.tracker.id,original.id,logDate.value,{...cloneTracker(original.values),fields:next},original.timezone));return}}
  await removeLog(editing.value);emit('removed',editing.value);fill()
 }catch(e){error.value=trackerError(e)}finally{busy.value=false}
}
</script>
<template><AppSheet :model-value="true" :title="tracker.name+(fieldHabit?' · '+fieldHabit.label:'')+' · '+(editing?'Edit entry':'Log a day')" @update:model-value="emit('close')"><form id="tracker-log-form" class="log-form" @submit.prevent="save"><TrackerSelectedDay :date="logDate" /><div v-if="multiple&&existing.length" class="existing-sessions"><p>Already kept on this day</p><button v-for="log in existing" :key="log.id" type="button" :aria-pressed="editing===log.id" @click="fill(log)">{{tracker.kind==='sleep'?(log.values.sleepType==='nap'?'Nap':'Night')+' · '+sleepHours(log).toFixed(1)+' h':'Entry · '+(log.values.note?.slice(0,40)||'Custom log')}} <span>Edit ↗</span></button><button type="button" @click="fill()">＋ Add another {{tracker.kind==='sleep'?'sleep session':'entry'}}</button></div><template v-if="tracker.kind==='habit'||fieldHabit"><fieldset><legend>Did you do it?</legend><div class="binary-options"><button type="button" :aria-pressed="habit===true" @click="habit=true">✓ Yes</button><button type="button" :aria-pressed="habit===false" @click="habit=false">○ No</button></div></fieldset><p class="help">Choosing No records a real answer. Removing an entry leaves the day unlogged.</p></template><label v-else-if="['count','quantity','duration','steps'].includes(tracker.kind)">Daily total{{tracker.unit?' ('+tracker.unit+')':''}}<input v-model="value" type="number" min="0" :step="tracker.kind==='count'||tracker.kind==='steps'?1:'any'" required placeholder="0" /><small>This replaces this date’s total. It is not added again.</small></label><template v-else-if="tracker.kind==='category'"><fieldset><legend>Choose your color</legend><div class="category-options"><button v-for="item in entryConfig.categories" :key="item.id" type="button" :aria-pressed="category===item.id" @click="category=item.id"><i :style="{background:item.color}"></i>{{item.label}}<span v-if="category===item.id">✓</span></button></div></fieldset></template><template v-else-if="tracker.kind==='sleep'"><p class="help">Sleep belongs to your wake-up date. Separate naps are welcome; overlapping sessions need correction.</p><label>Session<select v-model="sleepType"><option value="night">Night sleep</option><option value="nap">Nap</option></select></label><label>Time zone<input v-model="timezone" required placeholder="Asia/Manila" /></label><label>Fell asleep<input v-model="start" type="datetime-local" required /></label><label>Woke up<input v-model="end" type="datetime-local" required /></label><label>Minutes awake during the session<input v-model.number="awake" type="number" min="0" required /></label><label>How did it feel? (optional)<select v-model="quality"><option value="">Not rated</option><option value="1">1 · Restless</option><option value="2">2 · Light</option><option value="3">3 · Okay</option><option value="4">4 · Rested</option><option value="5">5 · Refreshed</option></select></label><details><summary>Clocks changing during this session?</summary><label>If a clock time occurs twice<select v-model="repeated"><option value="earlier">Use its first occurrence</option><option value="later">Use its second occurrence</option></select></label><p class="help">Nonexistent local times are rejected. Duration uses the actual elapsed time in your chosen zone.</p></details><p v-if="duration" role="status" class="sleep-preview">{{duration}}</p></template><template v-else-if="tracker.kind==='custom'"><div v-for="field in entryConfig.fields" :key="field.id"><fieldset v-if="field.type==='multi'"><legend>{{field.label}}</legend><div class="multi-options"><label v-for="option in field.options" :key="option"><input type="checkbox" :checked="Array.isArray(fields[field.id])&&(fields[field.id] as string[]).includes(option)" @change="toggleChoice(field,option)" />{{option}}</label></div></fieldset><label v-else>{{field.label}}{{field.unit?' ('+field.unit+')':''}}<select v-if="field.type==='checkbox'" :value="fields[field.id]===undefined?'':String(fields[field.id])" @change="fieldValue(field,$event)"><option value="">Not logged</option><option value="true">Yes</option><option value="false">No</option></select><select v-else-if="field.type==='choice'" :value="fields[field.id]??''" @change="fieldValue(field,$event)"><option value="">Not selected</option><option v-for="option in field.options" :key="option" :value="option">{{option}}</option></select><input v-else :type="field.type==='text'?'text':'number'" :value="fields[field.id]??''" :min="field.type==='rating'?1:0" :max="field.type==='rating'?field.max:undefined" :maxlength="field.type==='text'?2000:undefined" step="any" @input="fieldValue(field,$event)" /><small v-if="field.type==='rating'">1 to {{field.max}}</small></label></div></template><label>A little note (optional)<textarea v-model="note" rows="3" maxlength="5000" placeholder="Something you want to remember…" /></label><label class="photo-upload">＋ Add a private photo<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" :disabled="uploading" @change="uploadPhoto" /></label><div v-if="photoUrl" class="photo-preview"><img :src="photoUrl" alt="Your log attachment" /><button type="button" @click="photo='';photoUrl=''">Remove photo</button></div><p v-if="uploading" role="status">Keeping your photo…</p><p v-if="error" role="alert" class="log-error">{{error}} <button v-if="pendingPhoto" type="button" @click="uploadPhoto()">Retry photo</button></p><button v-if="editing" type="button" class="clear-entry" :disabled="busy" @click="clear">{{fieldHabit?'Clear this habit':'Remove this entry'}}</button></form><template #footer><div class="actions"><button type="button" :disabled="busy||uploading" @click="emit('close')">Cancel</button><button type="submit" form="tracker-log-form" class="primary" :disabled="busy||uploading">{{busy?'Saving…':uploading?'Uploading…':'Keep this day'}}</button></div></template></AppSheet></template>
<style scoped>
.log-form{display:grid;gap:17px}.log-form label{display:grid;gap:7px;font-size:13px;color:#6f6049}.log-form input:not([type=checkbox]):not([type=file]),.log-form select,.log-form textarea{width:100%;padding:11px 12px;min-height:46px;border:1px solid #d7c9af;border-radius:4px;background:#fffdf6;color:#544c40;font-size:16px}.log-form small,.help{font-size:12px;line-height:1.6;color:#8e7f68}.help{margin:0}.log-form fieldset{padding:12px;border:1px solid #d6c9af;border-radius:5px}.log-form legend{padding:0 5px;font:19px 'Crimson Text',Georgia,serif}.log-form button,.actions button{min-height:44px;border:1px solid #d2c2a5;padding:9px 14px;border-radius:4px;background:#f4edde;font-size:13px;cursor:pointer;color:#7c4256}.binary-options{display:flex;gap:9px}.binary-options button{flex:1}.log-form button[aria-pressed=true]{background:#e1ead8;border-color:#91a57e;color:#4c6947}.category-options{display:grid;gap:7px}.category-options button{display:flex;align-items:center;gap:10px;text-align:left;background:#fffdf5}.category-options i{display:block;width:22px;height:22px;border:1px solid #9d967e77}.category-options button>span{margin-left:auto}.multi-options{display:grid;gap:10px}.multi-options label{display:flex;gap:10px;align-items:center;min-height:40px}.multi-options input{width:20px;height:20px;accent-color:#6c855c}.existing-sessions{padding:12px;border:1px dashed #b5bd9c;display:grid;gap:8px;border-radius:5px}.existing-sessions p{margin:0;font-size:12px;color:#6d7c5d}.existing-sessions button{display:flex;justify-content:space-between;gap:10px;font-size:12px}.existing-sessions button span{font-size:10px}.log-form .photo-upload{position:relative;display:flex;align-items:center;justify-content:center;border:1px dashed #baac8e;min-height:44px;overflow:hidden;border-radius:4px}.photo-upload input{position:absolute;inset:0;opacity:0;width:100%;cursor:pointer}.photo-preview img{max-height:180px;max-width:100%;border:5px solid #fff9ec}.photo-preview button{display:block;margin-top:8px}.log-error{padding:12px;background:#f6e4dd;border-radius:4px;color:#91394e;font-size:13px;line-height:1.6}.sleep-preview{padding:12px;background:#e9e8f2;color:#6e6d95;border-radius:4px;font-size:13px}.clear-entry{justify-self:start;color:#91475b!important;background:transparent!important;border:0!important}.actions{display:flex;justify-content:space-between;gap:12px}.actions .primary{background:#79283e;color:#fff9eb;border-color:#71273d}.log-form summary{min-height:44px;font-size:12px;color:#8b7354;cursor:pointer}button:disabled{opacity:.5;cursor:wait}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid #8a5c70;outline-offset:3px}
</style>

<script setup lang="ts">
import { cloneTracker } from '@/types/trackers'
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEditingViewport } from '@/composables/useEditingViewport'
import AppSheet from '@/components/shared/AppSheet.vue'
import TrackerChart from '@/components/trackers/TrackerChart.vue'
import TrackerPaper from '@/components/trackers/TrackerPaper.vue'
import TrackerEditor from '@/components/trackers/TrackerEditor.vue'
import TrackerLogEditor from '@/components/trackers/TrackerLogEditor.vue'
import TrackerDesignEditor from '@/components/trackers/TrackerDesignEditor.vue'
import { loadTrackers, saveTracker, saveBoard, removeTracker, trackerError } from '@/services/trackers.service'
import { defaultDesign, displayValue, fromStarter, kindLabels, localDate, monthDays, monthLabel, onSchedule, shiftMonth, starters, summarize, type CreativeTracker, type TrackerBoard, type TrackerLog, type TrackerStarter, type TrackerDesign } from '@/types/trackers'
import './trackers.css'
useEditingViewport()
const auth=useAuthStore(),route=useRoute(),router=useRouter()
const timezone=computed(()=>auth.profile?.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC')
const today=computed(()=>localDate(new Date(),timezone.value))
const month=ref(/^\d{4}-(0[1-9]|1[0-2])$/.test(String(route.query.month))?String(route.query.month):today.value.slice(0,7))
const selectedDay=ref(today.value),tab=ref<'today'|'notebooks'|'board'>(route.query.view==='board'?'board':'notebooks'),showArchived=ref(false),yearly=ref(false)
const trackers=ref<CreativeTracker[]>([]),logs=ref<TrackerLog[]>([]),board=ref<TrackerBoard>({user_id:'',name:'My little rhythms',tracker_ids:[],wide_ids:[],design:defaultDesign()})
const loading=ref(true),error=ref(''),notice=ref(''),actionBusy=ref(false)
const draft=ref<Omit<CreativeTracker,'user_id'|'created_at'>|null>(null),logging=ref<{tracker:CreativeTracker;date:string}|null>(null)
const boardDraft=ref<TrackerBoard|null>(null),boardError=ref(''),uploading=ref(false)
const stickerDraft=ref<TrackerDesign|null>(null),stickerSelection=ref(''),stickerError=ref('')
const stickerHistory=ref<TrackerDesign[]>([]),stickerCursor=ref(0)
const selectedSticker=computed(()=>stickerDraft.value?.decorations.find(d=>d.id===stickerSelection.value))
watch(()=>route.params.id,()=>{stickerDraft.value=null;stickerSelection.value=''})
function arrangeStickers(){
 if(!selected.value)return
 stickerDraft.value=cloneTracker(selected.value.design);stickerSelection.value='';stickerError.value=''
 stickerHistory.value=[cloneTracker(stickerDraft.value)];stickerCursor.value=0
}
function rememberStickers(){
 if(!stickerDraft.value||JSON.stringify(stickerDraft.value)===JSON.stringify(stickerHistory.value[stickerCursor.value]))return
 stickerHistory.value=stickerHistory.value.slice(0,stickerCursor.value+1).concat(cloneTracker(stickerDraft.value))
 if(stickerHistory.value.length>40)stickerHistory.value.shift()
 stickerCursor.value=stickerHistory.value.length-1
}
function undoStickers(delta:number){
 stickerCursor.value=Math.max(0,Math.min(stickerHistory.value.length-1,stickerCursor.value+delta))
 stickerDraft.value=cloneTracker(stickerHistory.value[stickerCursor.value])
}
async function keepStickers(){
 if(!selected.value||!stickerDraft.value||actionBusy.value)return
 actionBusy.value=true;stickerError.value=''
 try{trackerSaved(await saveTracker({...cloneTracker(selected.value),design:cloneTracker(stickerDraft.value)}));stickerDraft.value=null;notice.value='Your stickers are right where you want them.'}
 catch(e){stickerError.value=trackerError(e)}finally{actionBusy.value=false}
}
const active=computed(()=>trackers.value.filter(t=>!t.is_template&&!t.archived))
const personalTemplates=computed(()=>trackers.value.filter(t=>t.is_template&&!t.archived))
const collection=computed(()=>trackers.value.filter(t=>!t.is_template&&t.archived===showArchived.value))
const selected=computed(()=>trackers.value.find(t=>t.id===route.params.id&&!t.is_template)||null)
const boardTrackers=computed(()=>board.value.tracker_ids.map(id=>active.value.find(t=>t.id===id)).filter(Boolean) as CreativeTracker[])
const selectedLogs=computed(()=>logs.value.filter(l=>l.tracker_id===selected.value?.id))
const currentLogs=(tracker:CreativeTracker,date=selectedDay.value)=>logs.value.filter(l=>l.tracker_id===tracker.id&&l.log_date===date)
const dueToday=computed(()=>active.value.filter(t=>onSchedule(t,selectedDay.value)))
const recordedToday=computed(()=>dueToday.value.filter(t=>currentLogs(t).length).length)
const selectedSummary=computed(()=>selected.value?summarize(selected.value,selectedLogs.value,month.value,today.value):null)
let generation=0
async function load(){
 const current=++generation;loading.value=true;error.value=''
 try{const data=await loadTrackers(Number(month.value.slice(0,4)));if(current!==generation)return;trackers.value=data.trackers;logs.value=data.logs;board.value=data.board}
 catch(e){if(current===generation)error.value=trackerError(e)}finally{if(current===generation)loading.value=false}
}
watch(()=>month.value.slice(0,4),()=>void load())
watch(selectedDay,value=>{if(/^\d{4}-\d{2}-\d{2}$/.test(value)&&value.slice(0,4)!==month.value.slice(0,4))month.value=value.slice(0,7)})
onMounted(()=>void load())
function moveMonth(delta:number){month.value=shiftMonth(month.value,delta)}
function changeMonth(event:Event){const value=(event.target as HTMLInputElement).value;if(/^\d{4}-(0[1-9]|1[0-2])$/.test(value))month.value=value}
function start(starter:TrackerStarter){draft.value=fromStarter(starter)}
function editTracker(tracker:CreativeTracker){draft.value=cloneTracker(tracker)}
function useTemplate(template:CreativeTracker){draft.value={...cloneTracker(template),id:crypto.randomUUID(),is_template:false,name:template.name.replace(/ design$/,'')}}
function setTab(value:string){if(value==='today'||value==='notebooks'||value==='board')tab.value=value}
function trackerSaved(tracker:CreativeTracker){
 const index=trackers.value.findIndex(t=>t.id===tracker.id)
 if(index<0)trackers.value.push(tracker);else trackers.value[index]=tracker
 draft.value=null;notice.value=tracker.is_template?'Your personal template is ready.':'Your tracker is saved. Ready for a little of today.'
}
function logSaved(log:TrackerLog){
 logs.value=logs.value.filter(l=>l.id!==log.id).concat(log);logging.value=null;notice.value='Saved. A little of this day, kept.'
 if(log.log_date.slice(0,7)!==month.value)month.value=log.log_date.slice(0,7)
}
function logRemoved(id:string){logs.value=logs.value.filter(l=>l.id!==id);logging.value=null;notice.value='Entry removed. This day is now unlogged.'}
function openLog(tracker:CreativeTracker,date?:string){
 if(tracker.archived)return
 const day=date||(month.value===today.value.slice(0,7)?today.value:monthDays(month.value).filter(d=>d<=today.value).at(-1)||today.value)
 logging.value={tracker,date:day}
}
function openTracker(tracker:CreativeTracker){yearly.value=false;void router.push({path:'/trackers/'+tracker.id,query:{month:month.value}})}
function duplicate(tracker:CreativeTracker,template=false){draft.value={...cloneTracker(tracker),id:crypto.randomUUID(),name:tracker.name+(template?' design':' copy'),is_template:template,archived:false}}
async function archive(tracker:CreativeTracker){
 if(actionBusy.value)return
 actionBusy.value=true;error.value=''
 try{trackerSaved(await saveTracker({...tracker,archived:!tracker.archived}));notice.value=tracker.archived?'Tracker restored.':'Tracker archived. Its days are kept safely.'}
 catch(e){error.value=trackerError(e)}finally{actionBusy.value=false}
}
async function destroy(tracker:CreativeTracker){
 if(actionBusy.value||!window.confirm('Permanently delete “'+tracker.name+'” and all its logs? This cannot be undone.'))return
 actionBusy.value=true;error.value=''
 try{await removeTracker(tracker.id);trackers.value=trackers.value.filter(t=>t.id!==tracker.id);logs.value=logs.value.filter(l=>l.tracker_id!==tracker.id);notice.value='Tracker deleted.';if(route.params.id===tracker.id)await router.push('/trackers')}
 catch(e){error.value=trackerError(e)}finally{actionBusy.value=false}
}
function summary(tracker:CreativeTracker){
 const data=summarize(tracker,logs.value.filter(l=>l.tracker_id===tracker.id),month.value,today.value)
 if(!data.days)return 'An open page. No days logged yet.'
 if(tracker.kind==='habit')return data.yes+' days marked Yes · '+data.days+' days logged'
 if(tracker.kind==='sleep')return data.average.toFixed(1)+' h/day (including naps) · '+data.days+' wake-up dates logged'
 if(tracker.kind==='category')return data.days+' days in color · '+data.missing+' scheduled days unlogged'
 if(tracker.kind==='custom')return data.days+' days with entries'
 return data.total.toLocaleString('en-PH',{maximumFractionDigits:1})+' '+tracker.unit+' total · '+data.days+' days logged'
}
function configureBoard(){boardDraft.value=cloneTracker(board.value);boardError.value=''}
function toggleBoard(id:string){
 if(!boardDraft.value)return
 const ids=boardDraft.value.tracker_ids
 boardDraft.value.tracker_ids=ids.includes(id)?ids.filter(v=>v!==id):[...ids,id]
 boardDraft.value.wide_ids=boardDraft.value.wide_ids.filter(v=>boardDraft.value!.tracker_ids.includes(v))
}
async function keepBoard(){
 if(!boardDraft.value||actionBusy.value||uploading.value)return
 actionBusy.value=true;boardError.value=''
 try{board.value=await saveBoard(boardDraft.value);boardDraft.value=null;notice.value='Your monthly board is saved.'}catch(e){boardError.value=trackerError(e)}finally{actionBusy.value=false}
}
async function moveWidget(id:string,delta:number){
 if(actionBusy.value)return
 const copy=cloneTracker(board.value),i=copy.tracker_ids.indexOf(id),j=i+delta
 if(j<0||j>=copy.tracker_ids.length)return
 ;[copy.tracker_ids[i],copy.tracker_ids[j]]=[copy.tracker_ids[j],copy.tracker_ids[i]]
 actionBusy.value=true
 try{board.value=await saveBoard(copy)}catch(e){error.value=trackerError(e)}finally{actionBusy.value=false}
}
async function resizeWidget(id:string){
 if(actionBusy.value)return
 const copy=cloneTracker(board.value);copy.wide_ids=copy.wide_ids.includes(id)?copy.wide_ids.filter(v=>v!==id):[...copy.wide_ids,id]
 actionBusy.value=true
 try{board.value=await saveBoard(copy)}catch(e){error.value=trackerError(e)}finally{actionBusy.value=false}
}
function journalLink(tracker?:CreativeTracker){return {path:'/journal/new',query:{tracker:tracker?.id||'board',month:month.value}}}
const weeklySteps=computed(()=>{
 if(selected.value?.kind!=='steps')return []
 const dates=monthDays(month.value)
 return Array.from({length:Math.ceil(dates.length/7)},(_,week)=>{
  const days=dates.slice(week*7,week*7+7),values=selectedLogs.value.filter(l=>days.includes(l.log_date))
  return {label:days[0].slice(-2)+'–'+days.at(-1)!.slice(-2),total:values.reduce((n,l)=>n+Number(l.values.value||0),0),coverage:values.length}
 })
})
</script>
<template>
 <section class="trackers-page">
  <div class="trackers-wrap">
   <header class="trackers-hero"><div><p class="tracker-eyebrow"><span>✦</span> YOUR EVERYDAY NOTEBOOK</p><h1>Your days, <em>in color.</em></h1><p class="tracker-intro">Little rituals. Restful nights. The things that make a life.<br />Keep them in a notebook that feels like you.</p><span class="hero-handnote">a little more noticing, a little less measuring.</span></div><div class="hero-swatches" aria-hidden="true"><span class="tape"></span><p>little things<br /><em>add up.</em></p><div><i></i><i></i><i></i><i></i><i></i></div><small>YOUR DAYS, IN YOUR OWN RHYTHM</small></div></header>
   <div v-if="notice" role="status" class="tracker-notice"><span>✓</span>{{notice}}<button aria-label="Dismiss confirmation" @click="notice=''">×</button></div>
   <nav v-if="!selected" class="tracker-navigation" aria-label="Tracker workspace"><div><button v-for="item in [{id:'today',label:'Today'},{id:'notebooks',label:'My trackers'},{id:'board',label:'Monthly board'}]" :key="item.id" :aria-pressed="tab===item.id" @click="setTab(item.id)">{{item.label}}</button></div><button class="tracker-primary" @click="start(starters.at(-1)!)">＋ Create tracker</button></nav>
   <div class="tracker-period"><div><RouterLink v-if="route.params.id" to="/trackers" class="back-to-trackers">← My trackers</RouterLink><span v-else class="period-note">{{tab==='today'?'A small check-in with yourself.':tab==='board'?'Your month, on one lovely spread.':'Pages for the things you care about.'}}</span></div><div class="month-switcher"><button aria-label="Previous month" @click="moveMonth(-1)">‹</button><label><span class="sr-only">View month</span><input :value="month" type="month" min="1900-01" max="2100-12" @change="changeMonth" /></label><button aria-label="Next month" @click="moveMonth(1)">›</button></div></div>
   <div v-if="error" class="tracker-load-error" role="alert"><h2>Your notebook couldn’t open just yet.</h2><p>{{error}}</p><button class="tracker-secondary" @click="load">Try again</button></div>
   <div v-if="loading" role="status" class="tracker-loading"><span>✧</span> Gathering your pages…</div>
   <template v-else>
    <template v-if="selected">
     <div class="tracker-detail-toolbar"><div><span class="tracker-type">{{kindLabels[selected.kind]}}{{selected.archived?' · Archived':''}}</span><h2>{{selected.name}}</h2><p>{{summary(selected)}} · {{monthLabel(month)}}</p></div><div><button v-if="selected.kind==='category'" class="tracker-secondary" :aria-pressed="yearly" @click="yearly=!yearly">{{yearly?'Monthly page':'A year in pixels'}}</button><button v-if="!selected.archived" class="tracker-primary" @click="openLog(selected)">＋ Log a day</button><button v-if="!stickerDraft && selected.design.decorations.length" class="tracker-secondary" @click="arrangeStickers">Arrange stickers</button><button class="tracker-secondary" :disabled="!!stickerDraft" @click="editTracker(selected)">✎ Design &amp; settings</button></div></div>
     <section v-if="stickerDraft" class="sticker-arrangement" aria-label="Arrange stickers"><div><strong>A little rearranging.</strong><p>Drag a sticker to move it. Use ↗ to resize and ↻ to rotate. Arrow keys work too.</p></div><div class="sticker-arrangement-actions"><button class="tracker-secondary" :disabled="!stickerCursor || actionBusy" @click="undoStickers(-1)">↶ Undo</button><button class="tracker-secondary" :disabled="stickerCursor===stickerHistory.length-1 || actionBusy" @click="undoStickers(1)">↷ Redo</button><button v-if="selectedSticker" class="tracker-secondary" :disabled="actionBusy" @click="selectedSticker.locked=!selectedSticker.locked;rememberStickers()">{{selectedSticker.locked?'Unlock sticker':'Lock sticker'}}</button><button class="tracker-secondary" :disabled="actionBusy" @click="stickerDraft=null">Cancel</button><button class="tracker-primary" :disabled="actionBusy" @click="keepStickers">{{actionBusy?'Saving…':'Save stickers'}}</button></div><p v-if="stickerError" role="alert">{{stickerError}}</p></section>
     <div class="detail-layout"><TrackerPaper :design="stickerDraft||selected.design" :title="selected.name" :editable="!!stickerDraft && !actionBusy" v-model:selected-id="stickerSelection" @update:decorations="stickerDraft && (stickerDraft.decorations=$event)" @commit="rememberStickers"><div class="paper-month"><span>{{yearly?month.slice(0,4):monthLabel(month)}}</span><span>{{selected.kind==='sleep'?'☾':'✧'}}</span></div><TrackerChart :tracker="selected" :logs="selectedLogs" :month="month" :today="today" :yearly="yearly" @log="openLog(selected!,$event)" /></TrackerPaper><aside class="tracker-sidebar"><p class="tracker-eyebrow">A LITTLE PERSPECTIVE</p><h3>A page of your life.</h3><p>{{summary(selected)}}</p><p v-if="selectedSummary" class="coverage">{{selectedSummary.days}} logged days · {{selectedSummary.missing}} scheduled days unlogged.<br />Future dates are left out.</p><p v-if="selected.kind==='steps'" class="fine">Steps are entered manually. Saving a daily total replaces that date’s number.</p><p v-if="selected.kind==='sleep'" class="fine">The dates shown are wake-up dates. Sleep hours use actual elapsed time, including clock changes. These are your notes, not a medical assessment.</p><div v-if="weeklySteps.length" class="weekly-steps"><h4>Weekly totals</h4><div v-for="week in weeklySteps" :key="week.label"><span>Days {{week.label}}</span><strong>{{week.total.toLocaleString()}}</strong><small>{{week.coverage}} logged days</small></div></div><RouterLink :to="journalLink(selected)" class="tracker-secondary">＋ Connect to a journal page</RouterLink><button class="text-action" @click="duplicate(selected)">Duplicate design</button><button class="text-action" @click="duplicate(selected,true)">Save as a personal template</button><button class="text-action" :disabled="actionBusy" @click="archive(selected)">{{selected.archived?'Restore tracker':'Archive tracker'}}</button><button class="text-action danger" :disabled="actionBusy" @click="destroy(selected)">Delete tracker &amp; entries</button></aside></div>
    </template>
    <div v-else-if="route.params.id" class="tracker-empty"><h2>This tracker isn’t in your notebook.</h2><RouterLink to="/trackers">Return to my trackers</RouterLink></div>
    <template v-else-if="tab==='today'">
     <div class="today-heading"><div><p class="tracker-eyebrow">ONE DAY AT A TIME</p><h2>A little of today.</h2><p>{{recordedToday}} of {{dueToday.length}} scheduled trackers have a log. No rush.</p></div><label>Check-in date<input v-model="selectedDay" type="date" :max="today" /></label></div>
     <div v-if="!active.length" class="tracker-empty"><span>☘</span><h3>Your first little ritual starts here.</h3><p>Pick a page below, or create a tracker of your own.</p><button class="tracker-primary" @click="tab='notebooks'">Choose a starter page</button></div>
     <div class="today-grid"><article v-for="tracker in active" :key="tracker.id" :style="{'--ink-accent':tracker.design.accent}"><div><span>{{kindLabels[tracker.kind]}}</span><h3>{{tracker.name}}</h3><p :class="{unlogged:!currentLogs(tracker).length}">{{displayValue(tracker,currentLogs(tracker))}}</p></div><button :aria-label="(currentLogs(tracker).length?'Edit ':'Log ')+tracker.name" @click="openLog(tracker,selectedDay)">{{currentLogs(tracker).length?'Edit day':'Log day'}} ↗</button></article></div>
    </template>
    <template v-else-if="tab==='notebooks'">
     <div class="collection-topline"><h2>{{showArchived?'Pages kept safely':'Your little collection'}} <span>{{collection.length.toString().padStart(2,'0')}}</span></h2><button class="text-action" @click="showArchived=!showArchived">{{showArchived?'Show active trackers':'Archived trackers'}}</button></div>
     <div v-if="collection.length" class="notebook-collection"><article v-for="tracker in collection" :key="tracker.id" class="notebook-card"><button class="open-notebook" :style="{'--ink-accent':tracker.design.accent}" @click="openTracker(tracker)"><div class="mini-paper" :class="'mini-'+tracker.kind"><span class="mini-tape"></span><h3>{{tracker.design.heading||tracker.name}}</h3><div class="mini-cells"><i v-for="day in 28" :key="day" :class="{colored:currentLogs(tracker,month+'-'+String(day).padStart(2,'0')).length}"><span>{{day}}</span></i></div><small>{{monthLabel(month)}}</small></div><span class="notebook-label">{{kindLabels[tracker.kind]}}</span><strong>{{tracker.name}}</strong><p>{{summary(tracker)}}</p><span class="open-page-label">Open this page <b>↗</b></span></button><div class="notebook-actions"><button @click="editTracker(tracker)">Edit</button><button @click="duplicate(tracker)">Duplicate design</button><button :disabled="actionBusy" @click="archive(tracker)">{{tracker.archived?'Restore':'Archive'}}</button></div></article></div>
     <div v-else-if="showArchived" class="tracker-empty"><h3>No pages in the archive.</h3><p>Archived trackers keep their past entries.</p></div>
     <div v-else class="first-notebook-note"><span>↙</span><p>Pick your first page.<br /><em>Leave it beautifully blank until you’re ready.</em></p></div>
     <section v-if="!showArchived" class="starter-section" aria-labelledby="starter-title"><div><p class="tracker-eyebrow">INSPIRED BY REAL PAPER JOURNALS</p><h2 id="starter-title">A page for every little thing.</h2><p>Choose a starting point. Make the name, colors, and rhythm yours.</p></div><div class="starter-grid"><button v-for="starter in starters" :key="starter.key" :style="{'--ink-accent':starter.color}" @click="start(starter)"><span class="starter-icon">{{starter.icon}}</span><strong>{{starter.name}}</strong><p>{{starter.description}}</p><span class="starter-add">Start this page ＋</span></button></div></section>
     <section v-if="personalTemplates.length" class="personal-templates"><h2>Your personal templates</h2><p>A design to use again. Your entries stay in their original tracker.</p><button v-for="template in personalTemplates" :key="template.id" class="tracker-secondary" @click="useTemplate(template)">{{template.name}} ＋</button></section>
    </template>
    <template v-else>
     <div class="board-topline"><div><p class="tracker-eyebrow">A SPREAD OF LITTLE RHYTHMS</p><h2>{{board.name}}</h2></div><div><RouterLink :to="journalLink()" class="tracker-secondary">Link in journal</RouterLink><button class="tracker-primary" @click="configureBoard">✎ Arrange my board</button></div></div>
     <div v-if="!boardTrackers.length" class="tracker-empty"><span>✦</span><h3>A month with room for you.</h3><p>Bring your coffee, walks, sleep, and feelings together on one spread.</p><button class="tracker-primary" @click="configureBoard">Choose my trackers</button></div>
     <TrackerPaper v-else :design="board.design" :title="board.name"><div class="paper-month">{{monthLabel(month)}}</div><div class="monthly-board"><article v-for="(tracker,i) in boardTrackers" :key="tracker.id" :class="{wide:board.wide_ids.includes(tracker.id)}"><div class="widget-toolbar"><button :disabled="i===0||actionBusy" :aria-label="'Move '+tracker.name+' earlier'" @click="moveWidget(tracker.id,-1)">↑</button><button :disabled="i===boardTrackers.length-1||actionBusy" :aria-label="'Move '+tracker.name+' later'" @click="moveWidget(tracker.id,1)">↓</button><button class="desktop-widget-size" :disabled="actionBusy" @click="resizeWidget(tracker.id)">{{board.wide_ids.includes(tracker.id)?'Half width':'Full width'}}</button></div><TrackerPaper :design="tracker.design" :title="tracker.name"><TrackerChart :tracker="tracker" :logs="logs" :month="month" :today="today" compact /><p class="board-summary">{{summary(tracker)}}</p><button class="widget-open" @click="openTracker(tracker)">Open tracker <span>↗</span></button><button class="widget-open" @click="openLog(tracker)">＋ Log a day</button></TrackerPaper></article></div></TrackerPaper>
    </template>
   </template>
   <footer class="trackers-footer">✧ KEEP THE LITTLE THINGS. THEY MAKE A LIFE. ✧</footer>
  </div>
  <TrackerEditor v-if="draft" :initial="draft" @saved="trackerSaved" @close="draft=null" />
  <TrackerLogEditor v-if="logging" :tracker="logging.tracker" :date="logging.date" :logs="logs" :timezone="timezone" @saved="logSaved" @removed="logRemoved" @close="logging=null" />
  <AppSheet :model-value="!!boardDraft" title="Make room for your little rhythms" @update:model-value="boardDraft=null"><form v-if="boardDraft" id="board-form" class="board-form" @submit.prevent="keepBoard"><label>Board name<input v-model="boardDraft.name" required maxlength="100" /></label><fieldset><legend>Pages on this spread</legend><label v-for="tracker in active" :key="tracker.id" class="board-choice"><input type="checkbox" :checked="boardDraft.tracker_ids.includes(tracker.id)" @change="toggleBoard(tracker.id)" />{{tracker.name}}</label><p v-if="!active.length">Create a tracker first, then add it to your board.</p></fieldset><TrackerDesignEditor v-model="boardDraft.design" @busy="uploading=$event" /><p v-if="boardError" class="tracker-load-error" role="alert">{{boardError}}</p></form><template #footer><div class="sheet-actions"><button class="tracker-secondary" :disabled="actionBusy||uploading" @click="boardDraft=null">Cancel</button><button class="tracker-primary" form="board-form" type="submit" :disabled="actionBusy||uploading">{{actionBusy?'Saving…':'Keep this spread'}}</button></div></template></AppSheet>
 </section>
</template>

<script setup lang="ts">
import {computed,ref,watch,nextTick,onBeforeUnmount} from 'vue'
import {onBeforeRouteLeave} from 'vue-router'
import {useMediaQuery} from '@vueuse/core'
import {dailyValue,displayValue,goalMet,monthDays,cloneTracker,type CreativeTracker,type TrackerLog} from '@/types/trackers'
import {rangesForLogs,covers,modeCovers,paintSleep,sleepGridEntries,validateSleepSelection,type SleepRange,type GridEntry} from '@/types/tracker-grid'
import {saveGridDay,trackerError} from '@/services/trackers.service'
import TrackerCalendarMemory from './TrackerCalendarMemory.vue'
const props=withDefaults(defineProps<{tracker:CreativeTracker;logs:TrackerLog[];month:string;today:string;compact?:boolean;timezone?:string;selectedDate?:string}>(),{compact:false,timezone:'UTC',selectedDate:''})
const emit=defineEmits<{log:[string];saved:[string,TrackerLog[]]}>()
const days=computed(()=>monthDays(props.month)),isSleep=computed(()=>props.tracker.kind==='sleep')
const wide=useMediaQuery('(min-width:1024px)')
const mobile=computed(()=>!wide.value&&!props.compact)
const calendar=ref<HTMLElement>(),dayEditor=ref<HTMLElement>()
const mobileDate=computed(()=>activeDay.value||(days.value.includes(props.today)?props.today:days.value.find(day=>day<=props.today)||days.value[0]))
const monthOffset=computed(()=>new Date(props.month+'-01T12:00:00').getDay())
const dayLabel=(date:string)=>new Date(date+'T12:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric',weekday:'short'})
const dayLogs=(day:string)=>props.logs.filter(l=>l.tracker_id===props.tracker.id&&l.log_date===day)
const dayHasMemory=(day:string)=>dayLogs(day).some(log=>log.values.note?.trim()||log.values.photo)
const activeDay=ref(''),snapshot=ref<TrackerLog[]>([]),ranges=ref<SleepRange[]>([]),number=ref(0),dirty=ref(false),busy=ref(false),error=ref(''),status=ref(''),focusCol=ref(0)
const sleepType=ref<'night'|'nap'>('night')
const step=ref(props.tracker.kind==='steps'?500:props.tracker.kind==='duration'?5:props.tracker.kind==='quantity'?50:1)
const columns=computed(()=>isSleep.value?24:20),maximum=computed(()=>step.value*columns.value)
const viewport=ref<HTMLDivElement>(),gesture=ref<{date:string;start:number;end:number;fill:boolean;pointer:number}|null>(null)
const options=computed(()=>props.tracker.kind==='steps'?[100,500,1000,2000]:props.tracker.kind==='duration'?[1,5,15,30]:props.tracker.kind==='quantity'?[10,50,100,250]:[1,2,3,5])
const shownRanges=computed(()=>gesture.value&&isSleep.value?paintSleep(ranges.value,Math.min(gesture.value.start,gesture.value.end)*60,(Math.max(gesture.value.start,gesture.value.end)+1)*60,gesture.value.fill,sleepType.value):ranges.value)
const shownNumber=computed(()=>gesture.value&&!isSleep.value?(gesture.value.end+1)*step.value:number.value)
const state=(day:string)=>day>props.today?'future':!dayLogs(day).length?'missing':!isSleep.value&&Number(dailyValue(props.tracker,dayLogs(day)))===0?'zero':'recorded'
function selected(day:string,col:number){return isSleep.value?covers(day===activeDay.value?shownRanges.value:rangesForLogs(dayLogs(day)),col*60,(col+1)*60):(day===activeDay.value&&dirty.value||gesture.value?.date===day?shownNumber.value:Number(dailyValue(props.tracker,dayLogs(day)))||0)>=(col+1)*step.value}
function partial(day:string,col:number){if(isSleep.value)return !selected(day,col)&&(day===activeDay.value?shownRanges.value:rangesForLogs(dayLogs(day))).some(r=>r.start<(col+1)*60&&r.end>col*60);const n=day===activeDay.value&&dirty.value?shownNumber.value:Number(dailyValue(props.tracker,dayLogs(day)))||0;return n>col*step.value&&n<(col+1)*step.value}
function nap(day:string,col:number){const r=day===activeDay.value?shownRanges.value:rangesForLogs(dayLogs(day));return modeCovers(r,col*60,(col+1)*60,'nap')}
const hour=(h:number)=>String(h%12||12)+(h<12?' AM':' PM')
const cellLabel=(day:string,col:number)=>day+' · '+(isSleep.value?hour(col)+'–'+hour((col+1)%24):(col+1)*step.value+' '+props.tracker.unit)
function choose(day:string){
 if(props.compact||day>props.today||busy.value)return false
 if(dirty.value&&day===activeDay.value)return true
 if(dirty.value&&day!==activeDay.value){error.value='Save or cancel this selection before choosing another day.';return false}
 activeDay.value=day;snapshot.value=cloneTracker(dayLogs(day));ranges.value=rangesForLogs(snapshot.value);number.value=Number(dailyValue(props.tracker,snapshot.value))||0;dirty.value=false;error.value='';status.value='';return true
}
function prepare(day:string){return day===activeDay.value?!busy.value:choose(day)}
function apply(col:number){if(!activeDay.value||busy.value)return;if(isSleep.value)ranges.value=paintSleep(ranges.value,col*60,(col+1)*60,!modeCovers(ranges.value,col*60,(col+1)*60,sleepType.value),sleepType.value);else number.value=(col+1)*step.value;dirty.value=true;error.value='';focusCol.value=col}
function activate(e:MouseEvent,day:string,col:number){if(e.detail===0&&prepare(day))apply(col)}
function down(e:PointerEvent,day:string,col:number){if(!prepare(day))return;gesture.value={date:day,start:col,end:col,fill:!modeCovers(ranges.value,col*60,(col+1)*60,sleepType.value),pointer:e.pointerId};(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}
function drag(e:PointerEvent){if(!gesture.value||e.pointerId!==gesture.value.pointer)return;const el=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-grid-col]');if(el?.dataset.gridDay===gesture.value.date)gesture.value.end=Number(el.dataset.gridCol)}
function up(e:PointerEvent){const g=gesture.value;if(!g||g.pointer!==e.pointerId)return;if(isSleep.value)ranges.value=paintSleep(ranges.value,Math.min(g.start,g.end)*60,(Math.max(g.start,g.end)+1)*60,g.fill,sleepType.value);else number.value=(g.end+1)*step.value;focusCol.value=g.end;dirty.value=true;error.value='';gesture.value=null}
function cancel(){gesture.value=null;dirty.value=false;if(activeDay.value)choose(activeDay.value)}
function chooseMobileDay(day:string){if(choose(day))nextTick(()=>dayEditor.value?.scrollIntoView({block:'start',behavior:'instant'}))}
function mobileKey(event:KeyboardEvent,col:number){
 const perRow=window.matchMedia('(max-width:359px)').matches?(isSleep.value?4:3):isSleep.value?6:4
 const delta=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:event.key==='ArrowDown'?perRow:event.key==='ArrowUp'?-perRow:0
 if(!delta)return
 event.preventDefault();const next=Math.max(0,Math.min(columns.value-1,col+delta));viewport.value?.querySelector<HTMLElement>('[data-grid-col="'+next+'"]')?.focus()
}
function key(e:KeyboardEvent,day:string,col:number){
 const dx=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0,dy=e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0;if(!dx&&!dy)return;e.preventDefault()
 const next=days.value[days.value.indexOf(day)+dy],c=Math.max(0,Math.min(columns.value-1,col+dx));if(!next||next>props.today)return
 if(next!==activeDay.value&&dirty.value){error.value='Save or cancel this selection before choosing another day.';return}
 if(prepare(next)){focusCol.value=c;nextTick(()=>viewport.value?.querySelector<HTMLElement>('[data-grid-day="'+next+'"][data-grid-col="'+c+'"]')?.focus())}
}
async function save(){
 if(!dirty.value||busy.value)return;busy.value=true;error.value=''
 try{
  const entries:GridEntry[]=isSleep.value?sleepGridEntries(activeDay.value,ranges.value,snapshot.value,props.timezone):[{id:snapshot.value[0]?.id||crypto.randomUUID(),values:{...snapshot.value[0]?.values,value:Number(number.value)},started_at:null,ended_at:null,timezone:snapshot.value[0]?.timezone||props.timezone}]
  if(!isSleep.value&&(!Number.isFinite(number.value)||number.value<0))throw new Error('Choose a total of zero or more.')
  if(isSleep.value)validateSleepSelection(entries)
  const rows=await saveGridDay(props.tracker.id,activeDay.value,snapshot.value,entries);dirty.value=false;snapshot.value=cloneTracker(rows);ranges.value=rangesForLogs(rows);emit('saved',activeDay.value,rows);status.value='Selection saved.'
 }catch(e){error.value=trackerError(e)}finally{busy.value=false}
}
onBeforeRouteLeave(()=>!busy.value&&(!dirty.value||window.confirm('Leave without saving this selection?')))
const leaving=(e:BeforeUnloadEvent)=>{if(dirty.value||busy.value){e.preventDefault();e.returnValue=''}}
window.addEventListener('beforeunload',leaving);onBeforeUnmount(()=>window.removeEventListener('beforeunload',leaving))
watch(()=>props.selectedDate,day=>{if(day&&day.startsWith(props.month)){choose(day);nextTick(()=>viewport.value?.querySelector<HTMLElement>('[data-grid-day="'+day+'"][data-grid-col="0"]')?.focus())}},{immediate:true})
watch(()=>props.logs,()=>{if(activeDay.value&&!dirty.value&&!busy.value){snapshot.value=cloneTracker(dayLogs(activeDay.value));ranges.value=rangesForLogs(snapshot.value);number.value=Number(dailyValue(props.tracker,snapshot.value))||0}})
watch(()=>props.month,()=>{if(!dirty.value){if(props.selectedDate.startsWith(props.month))choose(props.selectedDate);else activeDay.value=''}})
</script>
<template>
 <div class="value-grid-frame" :class="{'mobile-frame':mobile}">
  <div v-if="!compact&&!tracker.archived" class="grid-guide">
   <p>{{mobile?'Choose a day below to '+(isSleep?'mark your sleep hours.':'record your total.'):isSleep?'Mark the hours you slept. Tap again to clear.':'Choose a box for your daily total. Drag across a row to adjust.'}}</p>
   <label v-if="isSleep&&!mobile" class="nap-toggle"><input type="checkbox" :checked="sleepType==='nap'" :disabled="busy" @change="sleepType=($event.target as HTMLInputElement).checked?'nap':'night'" />Mark as a nap</label>
   <label v-else-if="!isSleep">Each box<input v-model.number="step" type="number" :min="tracker.kind==='steps'||tracker.kind==='count'?1:.5" @change="step=Math.max(tracker.kind==='steps'||tracker.kind==='count'?1:.5,Number.isFinite(Number(step))?Number(step):1);if(tracker.kind==='steps'||tracker.kind==='count')step=Math.round(step)" :step="tracker.kind==='steps'||tracker.kind==='count'?1:'any'" :list="'box-sizes-'+tracker.id" :disabled="busy"/>{{tracker.unit}}<datalist :id="'box-sizes-'+tracker.id"><option v-for="v in options" :key="v" :value="v"/></datalist></label>
  </div>
  <div v-if="activeDay&&!compact&&(dirty||dayLogs(activeDay).length)" class="grid-edit-bar" :aria-label="'Edit '+activeDay"><strong>{{new Date(activeDay+'T12:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric'})}}</strong><span v-if="isSleep">{{(shownRanges.reduce((s,r)=>s+r.end-r.start,0)/60).toFixed(1)}} hours selected</span><label v-else>Exact total<input v-model.number="number" type="number" min="0" :step="tracker.kind==='steps'||tracker.kind==='count'?1:'any'" :disabled="busy" @input="dirty=true"/></label><button v-if="!isSleep" :disabled="busy" @click="number=0;dirty=true">0 {{tracker.unit}}</button><button :disabled="busy||dirty||!dayLogs(activeDay).length" @click="emit('log',activeDay)">Note / photo</button><template v-if="dirty"><button :disabled="busy" @click="cancel">Cancel</button><button class="keep-selection" :disabled="busy" @click="save">{{busy?'Saving…':'Save selection'}}</button></template><span v-if="status&&!dirty" role="status" class="grid-status">{{status}}</span></div>
  <p v-if="error" role="alert" class="grid-error">{{error}} <button v-if="dirty&&!busy" @click="save">Retry save</button></p>
  <div v-if="mobile" ref="viewport" class="mobile-tracker">
   <section ref="calendar" class="mobile-month" aria-label="Choose a tracker day">
    <div class="mobile-weekdays" aria-hidden="true"><span v-for="(day,index) in ['S','M','T','W','T','F','S']" :key="index">{{day}}</span></div>
    <div class="mobile-calendar"><span v-for="blank in monthOffset" :key="'blank'+blank"></span><button v-for="day in days" :key="day" type="button" :class="[state(day),{'current-day':day===mobileDate,'has-memory':dayHasMemory(day)}]" :disabled="busy||day>today" :aria-label="'Choose '+day" :aria-pressed="day===mobileDate" @click="chooseMobileDay(day)"><span>{{Number(day.slice(-2))}}</span><small>{{dayLogs(day).length?displayValue(tracker,dayLogs(day)):'·'}}</small><TrackerCalendarMemory v-if="dayHasMemory(day)" :date="day" :logs="dayLogs(day)" /></button></div>
   </section>
   <section ref="dayEditor" class="mobile-day-editor" :aria-label="dayLabel(mobileDate)+' · '+(isSleep?'Sleep hours':'Daily total')">
    <header><div><span>{{isSleep?'SLEEP HOURS':'DAILY TOTAL'}}</span><h4>{{dayLabel(mobileDate)}}</h4></div><button type="button" class="calendar-return" @click="calendar?.scrollIntoView({block:'start',behavior:'instant'})">Calendar ↑</button></header>
    <label v-if="isSleep&&!tracker.archived" class="nap-toggle"><input type="checkbox" :checked="sleepType==='nap'" :disabled="busy" @change="sleepType=($event.target as HTMLInputElement).checked?'nap':'night'" />Mark as a nap</label>
    <template v-if="isSleep"><section v-for="period in [0,1]" :key="period" class="mobile-period"><h5>{{period?'PM':'AM'}} <small>{{period?'noon–midnight':'midnight–noon'}}</small></h5><div class="mobile-hour-grid"><button v-for="offset in 12" :key="offset" type="button" class="grid-box mobile-box" :class="{filled:selected(mobileDate,period*12+offset-1),partial:partial(mobileDate,period*12+offset-1),nap:nap(mobileDate,period*12+offset-1)}" :data-grid-day="mobileDate" :data-grid-col="period*12+offset-1" :aria-label="cellLabel(mobileDate,period*12+offset-1)" :aria-pressed="selected(mobileDate,period*12+offset-1)" :disabled="busy||tracker.archived||mobileDate>today" @pointerdown="down($event,mobileDate,period*12+offset-1)" @pointermove="drag" @pointerup="up" @pointercancel="gesture=null" @keydown="mobileKey($event,period*12+offset-1)" @click="activate($event,mobileDate,period*12+offset-1)">{{hour(period*12+offset-1)}}</button></div></section></template>
    <div v-else class="mobile-number-grid"><button v-for="(_,col) in columns" :key="col" type="button" class="grid-box mobile-box" :class="{filled:selected(mobileDate,col),partial:partial(mobileDate,col)}" :data-grid-day="mobileDate" :data-grid-col="col" :aria-label="cellLabel(mobileDate,col)" :aria-pressed="selected(mobileDate,col)" :disabled="busy||tracker.archived||mobileDate>today" @pointerdown="down($event,mobileDate,col)" @pointermove="drag" @pointerup="up" @pointercancel="gesture=null" @keydown="mobileKey($event,col)" @click="activate($event,mobileDate,col)">{{((col+1)*step).toLocaleString('en-PH')}}</button></div>
   </section>
  </div>
  <div v-else ref="viewport" class="grid-scroll" :class="{compact}" tabindex="0" :aria-label="tracker.name+' grid. Scroll horizontally for more boxes.'">
   <div class="value-grid" :class="{'sleep-grid':isSleep}" :style="{'--columns':columns,'--tracker-accent':tracker.design.accent}">
    <div class="plot-scale"><span>{{isSleep?'HOURS OF THE DAY':tracker.unit||'DAILY TOTAL'}}</span><span v-if="!isSleep">{{'0–'+maximum.toLocaleString()}}</span></div>
    <div v-if="isSleep" class="sleep-periods" aria-hidden="true"><span></span><strong>AM <small>midnight–noon</small></strong><strong>PM <small>noon–midnight</small></strong><span></span></div>
    <div class="plot-axis" aria-hidden="true"><span>DAY</span><div class="plot-axis-track"><span v-for="col in columns" :key="col">{{isSleep?(col-1)%12||12:(col*step).toLocaleString('en-PH',{notation:'compact'})}}</span></div><span>{{isSleep?'SLEPT':'TOTAL'}}</span></div>
    <div class="plot-body">
     <div v-for="day in days" :key="day" class="plot-row" :class="[isSleep?'sleep-row':'number-row',state(day),{'active-day':day===activeDay}]"><button class="row-day" :disabled="compact||tracker.archived||day>today" :aria-label="'Choose '+day" @click="choose(day)">{{Number(day.slice(-2))}}</button><div class="plot-track" :class="isSleep?'sleep-track':'number-track'"><button v-for="(_,col) in columns" :key="col" type="button" :data-grid-col="col" :data-grid-day="day" class="grid-box" :class="{filled:selected(day,col),partial:partial(day,col),nap:nap(day,col),'noon-divider':isSleep&&col===12}" :aria-label="cellLabel(day,col)" :aria-pressed="selected(day,col)" :disabled="busy||compact||tracker.archived||day>today" :tabindex="day===(activeDay||days.find(d=>d<=today))&&col===focusCol?0:-1" @pointerdown="down($event,day,col)" @pointermove="drag" @pointerup="up" @pointercancel="gesture=null" @keydown="key($event,day,col)" @click="activate($event,day,col)"></button></div><span class="row-value">{{day===activeDay&&dirty&&!isSleep?shownNumber.toLocaleString():dayLogs(day).length?displayValue(tracker,dayLogs(day)):''}}<b v-if="goalMet(tracker,dayLogs(day))" aria-label="Goal met"> ✓</b></span></div>
    </div>
   </div>
  </div>
  <p class="plot-caption">{{isSleep?mobile?'Each box is one hour. Choose the day you woke up.':'One box = one hour. Rows use the wake-up date; overnight evening blocks are kept with the following morning. Partial hours remain as recorded until you edit them.':'Blank = not logged. A saved zero is different from an empty day. Save your selection above the grid.'}}</p>
 </div>
</template>
<style scoped>
.value-grid-frame{min-width:0;background:var(--paper-color,#fffdf3);--grid-cell:28px;--grid-row:56px;--day-column:36px;--total-column:85px}.grid-guide{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}.grid-guide p{font:12px/1.6 Inter,sans-serif;margin:0;max-width:450px;color:#837a65}.grid-guide label,.grid-edit-bar label{display:flex;align-items:center;gap:7px;font:12px Inter,sans-serif}.value-grid-frame input{width:100px;min-height:44px;padding:8px;border:1px solid #c7b99c;border-radius:4px;background:#fffdf3;color:#514b40;font-size:16px}.value-grid-frame button{min-height:44px;color:#6f6049;cursor:pointer}.period-jumps{display:flex;gap:8px;flex-wrap:wrap}.period-jumps button,.grid-edit-bar>button,.grid-error button{padding:8px 12px;border:1px solid #c7b99c;border-radius:4px;background:#f5eddd;font:12px Inter,sans-serif}.grid-edit-bar{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:12px;margin:0 0 12px;background:#f5eddd;border:1px solid #d1c4a9;border-radius:5px;position:sticky;top:78px;z-index:4}.grid-edit-bar strong{font:20px Caveat,cursive}.grid-edit-bar>span{font:12px Inter,sans-serif}.grid-edit-bar .keep-selection{background:#79283e;color:#fff9eb}.grid-error,.grid-status{font:12px/1.6 Inter,sans-serif;padding:12px;border-radius:4px}.grid-error{background:#f6e4dd;color:#91394e}.grid-status{background:#e8eee2;color:#476044}.grid-edit-bar .grid-status{margin-left:auto;padding:7px 10px}.grid-scroll{overflow-x:auto;max-width:100%;overscroll-behavior-x:contain;padding-bottom:8px}.value-grid{--plot-width:calc(var(--grid-cell)*var(--columns));width:calc(var(--day-column) + var(--plot-width) + var(--total-column));margin:auto}.plot-scale{display:flex;justify-content:space-between;padding:8px var(--total-column) 12px var(--day-column);font:9px Inter,sans-serif;letter-spacing:.1em;color:#8a7656}.plot-axis,.plot-row{display:grid;grid-template-columns:var(--day-column) var(--plot-width) var(--total-column)}.plot-axis{font:9px Inter,sans-serif;color:#8a7656;align-items:center;min-height:36px;text-align:center}.plot-axis-track,.plot-track{display:grid;grid-template-columns:repeat(var(--columns),var(--grid-cell));width:var(--plot-width)}.plot-axis-track>span{display:grid;place-items:center;min-height:32px;font:13px Caveat,cursive}.sleep-periods{display:grid;grid-template-columns:var(--day-column) repeat(2,calc(var(--plot-width)/2)) var(--total-column);text-align:center}.sleep-periods strong{padding:10px;background:#eee8d8;font:600 15px Inter,sans-serif;border:1px solid #b3aa8c}.sleep-periods strong:nth-child(3){border-left:3px solid #9a835c}.sleep-periods small{font:10px Inter,sans-serif;margin-left:8px}.plot-row{min-height:var(--grid-row)}.row-day{position:sticky;left:0;z-index:2;background:var(--paper-color,#fffdf3);border:0;font:17px Caveat,cursive;padding:0}.plot-track{min-width:0}.grid-box{padding:0;min-width:0;width:var(--grid-cell);height:var(--grid-row);background:transparent;border:1px solid #aaa88d55;border-left:0;touch-action:pan-y}.grid-box:first-child{border-left:1px solid #aaa88d55}.grid-box.filled{background:color-mix(in srgb,var(--tracker-accent) 60%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--tracker-accent) 60%,transparent)}.grid-box.partial{background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--tracker-accent) 45%,transparent) 0 3px,transparent 3px 6px)}.grid-box.noon-divider{border-left:3px solid #9a835c}.active-day .row-day{font-weight:700;color:var(--tracker-accent)}.row-value{display:flex;align-items:center;justify-content:flex-end;gap:3px;padding:4px 7px;text-align:right;overflow-wrap:anywhere;font:10px/1.4 Inter,sans-serif;color:#756348}.row-value b{font-weight:400;color:#668051}.future{opacity:.45}.plot-caption{font:11px/1.7 Inter,sans-serif;color:#8b7a5e;margin:14px 0}.value-grid-frame button:disabled{cursor:default;opacity:.6}.value-grid-frame button:focus-visible,.value-grid-frame input:focus-visible,.grid-scroll:focus-visible{outline:2px solid #79283e;outline-offset:2px}.compact{--grid-cell:13px;--grid-row:26px}.compact .value-grid{margin:0}.compact .grid-box{min-height:26px}.compact .row-day{font-size:12px}.compact .sleep-periods small{display:none}@media(max-width:650px){.value-grid-frame{--grid-cell:44px;--grid-row:44px;--day-column:32px}.grid-edit-bar{top:68px}.grid-edit-bar label{flex:1}.row-value{font-size:10px}}
</style>

<style scoped>
.value-grid-frame{container-type:inline-size;color:#514b40}
.grid-scroll:not(.compact) .value-grid{--grid-cell:max(32px,calc((100cqi - var(--day-column) - var(--total-column)) / var(--columns)));--grid-row:max(44px,var(--grid-cell))}
.nap-toggle{display:inline-flex;align-items:center;gap:8px;min-height:44px;cursor:pointer;white-space:nowrap}
.value-grid-frame .nap-toggle input{appearance:auto;width:18px;min-height:18px;height:18px;padding:0;accent-color:var(--tracker-accent)}
.sleep-periods strong{color:#5f533e}
.sleep-periods small{color:#716349}
.grid-edit-bar{color:#514b40}
.grid-box.nap.filled{background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--tracker-accent) 70%,transparent) 0 5px,transparent 5px 8px)}
@media(max-width:650px){.grid-scroll:not(.compact) .value-grid{--grid-cell:44px;--grid-row:44px}.sleep-periods small{font-size:11px}.grid-guide{align-items:flex-start}.grid-guide p{flex:1;min-width:160px}}
</style>

<style scoped>
.mobile-tracker{display:grid;gap:24px;min-width:0;max-width:720px;width:100%;margin-inline:auto}.mobile-month{max-width:480px;width:100%;margin-inline:auto}
.mobile-weekdays,.mobile-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
.mobile-weekdays{margin-bottom:6px;text-align:center;font:13px/1.5 Inter,sans-serif;color:#817357}
.mobile-calendar button{min-height:54px;padding:7px 2px;border:1px solid #c9c4aa;border-radius:5px;display:grid;align-content:center;gap:3px;justify-items:center;background:#fffdf3;color:#514b40;font:14px/1.2 Inter,sans-serif}
.mobile-calendar small{font-size:10px;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;color:#796b51}
.mobile-calendar .recorded{background:color-mix(in srgb,var(--tracker-accent) 15%,#fffdf3)}
.mobile-calendar .zero{border-style:dashed}
.mobile-calendar .current-day{border:2px solid var(--tracker-accent);box-shadow:0 0 0 1px var(--tracker-accent);font-weight:600}
.mobile-calendar .current-day small{font-weight:400}
.mobile-day-editor{min-width:0;scroll-margin-top:210px;border-top:1px solid #c9c4aa;padding-top:18px}
.mobile-day-editor>header{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px}
.mobile-day-editor header span{font:10px/1.5 Inter,sans-serif;letter-spacing:.12em;color:#837354}
.mobile-day-editor h4{margin:5px 0 0;font:25px/1.2 Caveat,cursive;color:#514b40}
.calendar-return{padding:8px;border:0;background:none;font:12px Inter,sans-serif;text-decoration:underline;text-underline-offset:3px}
.mobile-period{margin-top:15px}.mobile-period h5{display:flex;align-items:center;gap:10px;margin:0 0 9px;font:600 14px/1.5 Inter,sans-serif;color:#5f533e}
.mobile-period h5 small{font-weight:400;font-size:12px;color:#817357}
.mobile-hour-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px}
.mobile-number-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.value-grid-frame .mobile-box{width:auto;height:auto;min-height:48px;padding:10px 2px;border:1px solid #b5b196;border-radius:5px;font:12px/1.4 Inter,sans-serif;color:#514b40}
.mobile-frame .grid-guide p{font-size:13px;max-width:none}.mobile-frame .plot-caption{font-size:12px}
@media(max-width:650px){.mobile-frame .grid-edit-bar{top:72px;z-index:5}.mobile-frame .grid-edit-bar strong{font-size:22px}.mobile-frame .grid-edit-bar label{flex-wrap:wrap}.mobile-frame .grid-edit-bar input{flex:1;min-width:75px}.mobile-frame .grid-edit-bar .keep-selection{margin-left:auto}}
@media(max-width:359px){.mobile-hour-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.mobile-calendar button{min-height:52px}.mobile-number-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
</style>

<style scoped>.mobile-calendar button.has-memory{align-content:start;gap:5px;padding:7px 3px}.mobile-calendar .calendar-cell-memory{width:100%;justify-self:stretch}</style>

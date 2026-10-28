<script setup lang="ts">
import { computed } from 'vue'
import TrackerValueGrid from './TrackerValueGrid.vue'
import { dailyValue, displayValue, monthDays, onSchedule, type CreativeTracker, type TrackerLog } from '@/types/trackers'
const props=withDefaults(defineProps<{tracker:CreativeTracker;logs:TrackerLog[];month:string;today:string;yearly?:boolean;compact?:boolean;timezone?:string;selectedDate?:string}>(),{yearly:false,compact:false,timezone:'UTC',selectedDate:''})
const emit=defineEmits<{log:[date:string];notes:[date:string];saved:[date:string,logs:TrackerLog[]]}>()
const days=computed(()=>monthDays(props.month))
const byDay=computed(()=>new Map(days.value.map(day=>[day,props.logs.filter(l=>l.tracker_id===props.tracker.id&&l.log_date===day)])))
const dayLogs=(day:string)=>byDay.value.get(day)||[]
const value=(day:string)=>dailyValue(props.tracker,dayLogs(day))
const display=(day:string)=>displayValue(props.tracker,dayLogs(day))
const startOffset=computed(()=>new Date(props.month+'-01T12:00:00').getDay())
const habitGroup=computed(()=>props.tracker.kind==='custom'&&!props.tracker.config.multiple&&props.tracker.config.fields.length>0&&props.tracker.config.fields.every(f=>f.type==='checkbox'))
const habitField=(day:string,id:string)=>dayLogs(day).at(-1)?.values.fields?.[id]
const habitState=(day:string,id:string)=>day>props.today?'future':typeof habitField(day,id)==='boolean'?habitField(day,id)?'recorded':'zero':onSchedule(props.tracker,day)?'missing':'unscheduled'
const categoryColor=(logs:TrackerLog[])=>{
 const log=logs.at(-1)
 return (log?.config_snapshot??props.tracker.config).categories.find(c=>c.id===log?.values.category)?.color||'transparent'
}
const color=(day:string)=>props.tracker.kind==='category'?categoryColor(dayLogs(day)):props.tracker.design.accent
const state=(day:string)=>day>props.today?'future':!dayLogs(day).length?onSchedule(props.tracker,day)?'missing':'unscheduled':value(day)===0||value(day)===false?'zero':'recorded'
const label=(day:string)=>day+': '+(day>props.today?'Future date':display(day))+(state(day)==='unscheduled'?' · Not scheduled':'')
const year=computed(()=>Number(props.month.slice(0,4)))
const legend=computed(()=>{
 const items=[...props.tracker.config.categories]
 for(const log of props.logs.filter(l=>l.tracker_id===props.tracker.id)){
  const item=log.config_snapshot.categories.find(c=>c.id===log.values.category)
  if(item&&!items.some(c=>c.id===item.id&&c.color===item.color&&c.label===item.label))items.push({...item,id:item.id+'-'+item.color,label:item.label+' (earlier key)'})
 }
 return items
})
const yearColumns=computed(()=>Array.from({length:12},(_,i)=>{
 const month=year.value+'-'+String(i+1).padStart(2,'0')
 return {month,label:new Date(month+'-01T12:00:00').toLocaleDateString('en-PH',{month:'short'}),days:monthDays(month)}
}))
function yearCell(month:string,day:number){
 const date=month+'-'+String(day).padStart(2,'0'), logs=props.logs.filter(l=>l.tracker_id===props.tracker.id&&l.log_date===date)
 return {date,exists:day<=monthDays(month).length,color:categoryColor(logs),label:displayValue(props.tracker,logs),logged:logs.length>0}
}
</script>
<template>
 <figure class="tracker-chart" :class="{compact}" :style="{'--tracker-accent':tracker.design.accent}">
  <template v-if="yearly&&tracker.kind==='category'">
   <div class="year-key"><span v-for="category in legend" :key="category.id"><i :style="{background:category.color}"></i>{{category.label}}</span></div>
   <div class="year-pixels" role="img" :aria-label="tracker.name+' in '+year+'. Use Log a day to edit a date.'">
    <div class="year-numbers"><span></span><span v-for="day in 31" :key="day">{{day}}</span></div>
    <div v-for="column in yearColumns" :key="column.month" class="year-column"><strong>{{column.label}}</strong><span v-for="day in 31" :key="day" class="year-pixel" :class="{invalid:!yearCell(column.month,day).exists,unlogged:!yearCell(column.month,day).logged}" :style="{background:yearCell(column.month,day).color}" :title="yearCell(column.month,day).date+': '+yearCell(column.month,day).label"></span></div>
   </div>
   <figcaption>One square, one day. Empty paper means not logged. Impossible dates are crossed out.</figcaption>
  </template>
  <template v-else-if="habitGroup">
   <section v-for="field in tracker.config.fields" :key="field.id" class="habit-group"><h4>{{field.label}} <span>?</span></h4><div class="calendar-weekdays" aria-hidden="true"><span v-for="(d,i) in ['S','M','T','W','T','F','S']" :key="i">{{d}}</span></div><div class="habit-calendar"><span v-for="i in startOffset" :key="'blank'+i"></span><button v-for="day in days" :key="day" type="button" :class="habitState(day,field.id)" :disabled="day>today||compact||tracker.archived" :style="{'--cell-color':tracker.design.accent}" :aria-label="day+' · '+field.label+': '+(habitField(day,field.id)===true?'Yes':habitField(day,field.id)===false?'No':'Not logged')" @click="emit('log',day)"><span>{{Number(day.slice(-2))}}</span><strong>{{habitField(day,field.id)===true?'✓':habitField(day,field.id)===false?'No':'·'}}</strong></button></div></section><figcaption>Each habit keeps its own answer. A blank Coffee square says nothing about Gym, Walk, or Coke.</figcaption>
  </template>
  <TrackerValueGrid v-else-if="['sleep','steps','duration','quantity','count'].includes(tracker.kind)" :tracker="tracker" :logs="logs" :month="month" :today="today" :compact="compact" :timezone="timezone" :selected-date="selectedDate" @log="emit('notes',$event)" @saved="(date,rows)=>emit('saved',date,rows)" />
  <template v-else>
   <div class="calendar-weekdays" aria-hidden="true"><span v-for="(d,i) in ['S','M','T','W','T','F','S']" :key="i">{{d}}</span></div>
   <div class="habit-calendar"><span v-for="i in startOffset" :key="'blank'+i"></span><button v-for="day in days" :key="day" type="button" :class="state(day)" :disabled="day>today||compact||tracker.archived" :aria-label="label(day)" :style="{'--cell-color':color(day)}" @click="emit('log',day)"><span>{{Number(day.slice(-2))}}</span><strong>{{dayLogs(day).length?(tracker.kind==='habit'?(value(day)?'✓':'No'):tracker.kind==='category'?'●':String(dayLogs(day).length)):state(day)==='unscheduled'?'∕':'·'}}</strong></button></div>
   <div v-if="tracker.kind==='category'" class="year-key"><span v-for="category in legend" :key="category.id"><i :style="{background:category.color}"></i>{{category.label}}</span></div>
   <figcaption>✓ / color = logged · No = recorded no · dot = not logged · slash = not scheduled.</figcaption>
  </template>
 </figure>
</template>
<style scoped>
.tracker-chart{margin:0;min-width:0;background-color:var(--paper-color,#fffdf3);--chart-grid:#b5b49e55}
.tracker-chart button{color:#514b40;cursor:pointer}.tracker-chart button:disabled{cursor:default}
.tracker-chart button:focus-visible{outline:2px solid #74283c;outline-offset:2px;z-index:2}
.tracker-chart figcaption{font:11px/1.65 'Inter',sans-serif;color:#837a65;margin:15px 0 0}
.calendar-weekdays,.habit-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}
.calendar-weekdays span{text-align:center;font:13px 'Caveat',cursive;color:#7e7b68;padding:7px}
.habit-calendar button{min-height:53px;display:grid;place-items:center;padding:5px 2px;border:1px solid #bbbba285;border-radius:3px;background:#fffdf449;font:16px 'Caveat',cursive}
.habit-calendar button span{font-size:12px;justify-self:start;padding-left:5px}.habit-calendar button strong{font-weight:400;line-height:1.05}
.habit-calendar .recorded{background:color-mix(in srgb,var(--cell-color) 36%,#fffdf3);border:1px solid var(--cell-color)}
.habit-calendar .zero{background:#e8e3d780;border-style:dashed}.habit-calendar .future{opacity:.42}
.habit-calendar .unscheduled{background:repeating-linear-gradient(135deg,transparent 0 4px,#bbb49d22 4px 5px);color:#aaa28e}
.year-key{display:flex;flex-wrap:wrap;gap:10px 15px;margin:12px 0 18px}.year-key>span{display:flex;align-items:center;gap:6px;font:12px 'Caveat',cursive}
.year-key i{display:inline-block;width:12px;height:12px;border:1px solid #77705c88}
.year-pixels{display:grid;grid-template-columns:21px repeat(12,minmax(0,1fr));border-bottom:1px solid #aba68e;min-width:0;background:var(--paper-color,#fffdf3)}
.year-column,.year-numbers{display:grid;grid-template-rows:24px repeat(31,17px)}.year-column strong{font:12px 'Caveat',cursive;text-align:center}
.year-numbers span{font:11px 'Caveat',cursive;align-self:center;text-align:center}.year-pixel{border:1px solid #a7aa9166;min-width:0}
.year-pixel.unlogged{background:var(--paper-color,#fffdf3)!important}.year-pixel.invalid{background:repeating-linear-gradient(135deg,transparent 0 3px,#aaa28d55 3px 4px)!important}
.compact .habit-calendar button{min-height:44px}
@media(max-width:650px){.habit-calendar button{min-height:44px}.year-column strong{font-size:10px}.year-key>span{font-size:14px}}
</style>
<style scoped>.habit-group{margin:0 0 25px}.habit-group h4{margin:0 0 4px;font:600 27px 'Caveat',cursive;color:var(--tracker-accent);letter-spacing:.04em;text-transform:uppercase}.habit-group h4 span{font-weight:400;opacity:.6}.compact .habit-group h4{font-size:23px}</style>

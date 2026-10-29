import {cloneTracker,sleepSegments,wallTime,zonedInstant,type TrackerLog,type TrackerValues} from './trackers'
export interface SleepRange {start:number;end:number;source:string|null;sleepType?:'night'|'nap'}
export interface GridEntry {id:string;values:TrackerValues;started_at:string|null;ended_at:string|null;timezone:string}
export const directGridKinds=['count','quantity','duration','steps','sleep']
export const rangesForLogs=(logs:TrackerLog[]):SleepRange[]=>logs.flatMap(log=>sleepSegments(log).map(s=>({start:Math.round(s.start*60),end:Math.round((s.start+s.width)*60),source:log.id,sleepType:log.values.sleepType||'night'})))
export function mergedRanges(ranges:SleepRange[]):{start:number;end:number}[]{
 const result:{start:number;end:number}[]=[]
 for(const r of [...ranges].sort((a,b)=>a.start-b.start)){const last=result.at(-1);if(last&&r.start<=last.end)last.end=Math.max(last.end,r.end);else result.push({start:r.start,end:r.end})}
 return result
}
export function covers(ranges:SleepRange[],start:number,end:number){return mergedRanges(ranges).some(r=>r.start<=start&&r.end>=end)}
export const modeCovers=(ranges:SleepRange[],start:number,end:number,mode:'night'|'nap')=>covers(ranges.filter(r=>(r.sleepType||'night')===mode),start,end)
export function paintSleep(ranges:SleepRange[],start:number,end:number,fill:boolean,sleepType:'night'|'nap'='night'):SleepRange[]{
 if(!fill)return ranges.flatMap(r=>r.end<=start||r.start>=end?[r]:[{...r,end:Math.min(r.end,start)},{...r,start:Math.max(r.start,end)}].filter(p=>p.end>p.start))
 ranges=ranges.flatMap(r=>r.end<=start||r.start>=end||(r.sleepType||'night')===sleepType?[r]:[{...r,end:Math.min(r.end,start)},{...r,start:Math.max(r.start,end)},{...r,start:Math.max(start,r.start),end:Math.min(end,r.end),sleepType}].filter(p=>p.end>p.start))
 const missing=mergedRanges(ranges).reduce((parts,r)=>parts.flatMap(p=>p.end<=r.start||p.start>=r.end?[p]:[{start:p.start,end:r.start},{start:r.end,end:p.end}].filter(v=>v.end>v.start)),[{start,end}])
 return [...ranges,...missing.map(r=>({...r,source:null,sleepType}))]
}
const previousDate=(day:string)=>new Date(Date.parse(day+'T12:00:00Z')-86400000).toISOString().slice(0,10)
const time=(minutes:number)=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`
export function sleepGridEntries(date:string,ranges:SleepRange[],logs:TrackerLog[],timezone:string):GridEntry[]{
 const result:GridEntry[]=[],working=ranges.map(r=>({...r,sleepType:r.sleepType||logs.find(l=>l.id===r.source)?.values.sleepType||'night'}))
 // Newly painted hours extend an adjacent recording of the same kind, including
 // across midnight. Otherwise an evening fragment gets the wrong wake-up date.
 for(let pass=0;pass<working.length;pass++){
  let changed=false
  for(const range of working.filter(r=>!r.source)){
   const neighbor=working.find(r=>r.source&&r.sleepType===range.sleepType&&(r.end===range.start||r.start===range.end||r.end===1440&&range.start===0||range.end===1440&&r.start===0))
   if(neighbor){range.source=neighbor.source;changed=true}
  }
  if(!changed)break
 }
 const groupKey=(r:SleepRange)=>(r.source||'new')+'|'+r.sleepType
 const groups=new Set(working.map(groupKey)),used=new Set<string>()
 for(const group of groups){
  const items=working.filter(r=>groupKey(r)===group),source=logs.find(l=>l.id===items[0].source)
  const old=source,parts=mergedRanges(items)
  const spans:{start:number;end:number;overnight:boolean}[]=[]
  if(parts.length>1&&parts[0].start===0&&parts.at(-1)!.end===1440){const first=parts.shift()!,last=parts.pop()!;spans.push({start:last.start,end:first.end,overnight:true})}
  spans.push(...parts.map(r=>({...r,overnight:r.end===1440})))
  for(const [i,span] of spans.entries()){
   const zone=old?.timezone||timezone,startDate=span.overnight?previousDate(date):date
   const start=zonedInstant(startDate+'T'+time(span.start),zone),end=zonedInstant((span.overnight?date:startDate)+'T'+time(span.end===1440?0:span.end),zone)
   const reuse=old&&!used.has(old.id),values:TrackerValues=old?{...cloneTracker(old.values),sleepType:items[0].sleepType}:{awakeMinutes:0,sleepType:items[0].sleepType}
   if(i||old&&!reuse){delete values.note;delete values.photo;values.awakeMinutes=0}
   const same=old&&wallTime(old.started_at!,zone)===wallTime(start,zone)&&wallTime(old.ended_at!,zone)===wallTime(end,zone)
   result.push({id:reuse?old.id:crypto.randomUUID(),values,started_at:same?old.started_at:start,ended_at:same?old.ended_at:end,timezone:zone})
   if(old)used.add(old.id)
  }
 }
 return result
}
export function validateSleepSelection(entries:GridEntry[],now=new Date()){
 for(const e of entries){const duration=Date.parse(e.ended_at!)-Date.parse(e.started_at!);if(duration<=0||duration>86400000)throw new Error('Choose a sleep block ending after it begins, up to 24 hours.');if(Date.parse(e.ended_at!)>now.getTime()+300000)throw new Error('These hours end in the future in '+e.timezone+'. Check the wake-up date or time zone. You can record this sleep once it has ended.')}
}

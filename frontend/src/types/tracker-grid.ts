import {cloneTracker,sleepSegments,wallTime,zonedInstant,type TrackerLog,type TrackerValues} from './trackers'
export interface SleepRange {start:number;end:number;source:string|null}
export interface GridEntry {id:string;values:TrackerValues;started_at:string|null;ended_at:string|null;timezone:string}
export const directGridKinds=['count','quantity','duration','steps','sleep']
export const rangesForLogs=(logs:TrackerLog[]):SleepRange[]=>logs.flatMap(log=>sleepSegments(log).map(s=>({start:Math.round(s.start*60),end:Math.round((s.start+s.width)*60),source:log.id})))
export function mergedRanges(ranges:SleepRange[]):{start:number;end:number}[]{
 const result:{start:number;end:number}[]=[]
 for(const r of [...ranges].sort((a,b)=>a.start-b.start)){const last=result.at(-1);if(last&&r.start<=last.end)last.end=Math.max(last.end,r.end);else result.push({start:r.start,end:r.end})}
 return result
}
export function covers(ranges:SleepRange[],start:number,end:number){return mergedRanges(ranges).some(r=>r.start<=start&&r.end>=end)}
export function paintSleep(ranges:SleepRange[],start:number,end:number,fill:boolean):SleepRange[]{
 if(!fill)return ranges.flatMap(r=>r.end<=start||r.start>=end?[r]:[{...r,end:Math.min(r.end,start)},{...r,start:Math.max(r.start,end)}].filter(p=>p.end>p.start))
 const missing=mergedRanges(ranges).reduce((parts,r)=>parts.flatMap(p=>p.end<=r.start||p.start>=r.end?[p]:[{start:p.start,end:r.start},{start:r.end,end:p.end}].filter(v=>v.end>v.start)),[{start,end}])
 return [...ranges,...missing.map(r=>({...r,source:null}))]
}
const previousDate=(day:string)=>new Date(Date.parse(day+'T12:00:00Z')-86400000).toISOString().slice(0,10)
const time=(minutes:number)=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`
export function sleepGridEntries(date:string,ranges:SleepRange[],logs:TrackerLog[],timezone:string):GridEntry[]{
 const result:GridEntry[]=[],tail=mergedRanges(ranges).find(r=>r.end===1440)
 for(const source of new Set(ranges.map(r=>r.source))){
  const old=logs.find(l=>l.id===source),parts=mergedRanges(ranges.filter(r=>r.source===source))
  const spans:{start:number;end:number;overnight:boolean}[]=[]
  if(parts.length>1&&parts[0].start===0&&parts.at(-1)!.end===1440){const first=parts.shift()!,last=parts.pop()!;spans.push({start:last.start,end:first.end,overnight:true})}
  spans.push(...parts.map(r=>({...r,overnight:r.end===1440})))
  for(const [i,span] of spans.entries()){
   const zone=old?.timezone||timezone,startDate=span.overnight||!!tail&&span.start>=tail.start?previousDate(date):date
   const start=zonedInstant(startDate+'T'+time(span.start),zone),end=zonedInstant((span.overnight?date:startDate)+'T'+time(span.end===1440?0:span.end),zone)
   const values:TrackerValues=old?cloneTracker(old.values):{awakeMinutes:0,sleepType:'night'}
   if(i){delete values.note;delete values.photo;values.awakeMinutes=0}
   const same=old&&wallTime(old.started_at!,zone)===wallTime(start,zone)&&wallTime(old.ended_at!,zone)===wallTime(end,zone)
   result.push({id:old&&i===0?old.id:crypto.randomUUID(),values,started_at:same?old.started_at:start,ended_at:same?old.ended_at:end,timezone:zone})
  }
 }
 return result
}

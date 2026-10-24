import type {Place,Preferences,Interest} from '@/types/discovery'
import type {ItineraryItem,TripDay} from '@/types'
import {activityDuration,timeMinutes} from './tripPlanner'
export function placeKey(p:Place){return p.providerId?`${p.provider}:${p.providerId}`:`${p.name.toLowerCase()}:${p.latitude.toFixed(5)}:${p.longitude.toFixed(5)}`}
export function distanceKm(a:Pick<Place,'latitude'|'longitude'>,b:Pick<Place,'latitude'|'longitude'>){
 const rad=Math.PI/180,dLat=(b.latitude-a.latitude)*rad,dLon=(b.longitude-a.longitude)*rad
 return 6371*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(dLat/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dLon/2)**2)))
}
export function interestsFor(p:Place):Interest[]{const c=p.categories||[];return [...new Set<Interest>([
 ...(p.category==='food'?['food' as const]:[]),...(p.category==='nature'?['nature' as const]:[]),...(p.category==='culture'?['culture' as const]:[]),
 ...(c.some(x=>x.includes('beach'))?['beaches' as const]:[]),...(c.some(x=>/hiking|climbing|adventure/.test(x))?['adventure' as const]:[]),...(c.some(x=>x.startsWith('commercial'))?['shopping' as const]:[]),
 ])]}
export function visitEstimate(p:Place){return {minutes:p.visitMinutes||({food:60,nature:90,culture:90,attractions:60}[p.category||'attractions']),source:p.visitMinutes?'provider':'category estimate'} }
export function alreadyPlanned(p:Place,items:ItineraryItem[]){return items.some(i=>i.provider_place_id&&i.provider_place_id===p.providerId&&i.place_provider===p.provider||i.title.toLowerCase()===p.name.toLowerCase()&&i.latitude!=null&&i.longitude!=null&&distanceKm(p,{latitude:i.latitude,longitude:i.longitude})<.1)}
// Wall-clock calendar minutes: no local/UTC conversion of user date-only values.
export const calendarMinute=(date:string,time:string)=>Date.parse(date+'T00:00:00Z')/60000+timeMinutes(time)
function intervals(items:ItineraryItem[],days:TripDay[]){return items.flatMap(i=>{
 const day=days.find(d=>d.id===i.trip_day_id),duration=activityDuration(i)
 return day?.date&&!day.is_ideas&&i.scheduled_time&&duration&&!['cancelled','skipped'].includes(i.status)?[{id:i.id,title:i.title,start:calendarMinute(day.date,i.scheduled_time),end:calendarMinute(day.date,i.scheduled_time)+duration}]:[]
 })}
export function freeWindows(p:Preferences,items:ItineraryItem[],days:TripDay[]){
 if(!p.date||!p.start||!p.end)return []
 let cursor=calendarMinute(p.date,p.start);const end=calendarMinute(p.date,p.end)+(p.nextDay?1440:0)
 if(end<=cursor)return []
 // A scheduled stop with an unknown end cannot establish a verified free window.
 if(items.some(i=>i.scheduled_time&&!activityDuration(i)&&!['cancelled','skipped'].includes(i.status)&&days.some(d=>d.id===i.trip_day_id&&!d.is_ideas&&d.date===p.date)))return []
 const windows:{start:number;end:number}[]=[]
 for(const row of intervals(items,days).filter(r=>r.end>cursor&&r.start<end).sort((a,b)=>a.start-b.start)){
  if(row.start>cursor)windows.push({start:cursor,end:Math.min(row.start,end)});cursor=Math.max(cursor,row.end)
 }
 if(cursor<end)windows.push({start:cursor,end});return windows
}
export function clockLabel(minutes:number){const n=((minutes%1440)+1440)%1440;return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`}
export function scheduleAdvice(draft:Partial<ItineraryItem>,date:string,items:ItineraryItem[],days:TripDay[],style:Preferences['style']='balanced',place?:Place){
 const advice:string[]=[]
 const duration=activityDuration(draft)
 if(date&&draft.scheduled_time&&duration){
  const start=calendarMinute(date,draft.scheduled_time),end=start+duration
  const conflicts=intervals(items.filter(i=>i.id!==draft.id),days).filter(i=>i.start<end&&start<i.end)
  conflicts.forEach(i=>advice.push(`This overlaps with ${i.title}. Keep both if intended.`))
  if(conflicts.length)advice.push('Choose another time or date to leave space between visits.')
 }
 const count=items.filter(i=>i.id!==draft.id&&days.some(d=>d.id===i.trip_day_id&&!d.is_ideas&&d.date===date)&&!['cancelled','skipped'].includes(i.status)).length
 if(date&&count+1>({relaxed:3,balanced:5,packed:7}[style]))advice.push(`This day may feel busy for a ${style} pace. Consider another day.`)
 if(place){advice.push(place.openingHours==='24/7'?'Provider lists 24/7 opening; confirm before visiting.':place.openingHours?`Provider hours: ${place.openingHours}. Date-specific opening is unverified.`:'Opening hours unavailable—check before visiting.')}
 advice.push('Route feasibility unknown. Straight-line distance does not account for roads, ferries or flights.')
 return advice
}
export function rankPlaces(places:Place[],origin:Place,prefs:Preferences,items:ItineraryItem[]=[],days:TripDay[]=[]){
 const seen=new Set<string>(),windows=freeWindows(prefs,items,days)
 const ranked=places.filter(p=>{const k=placeKey(p);if(seen.has(k))return false;seen.add(k);return true}).map(place=>{
  let score=0;const reasons:string[]=[],unknown:string[]=[];const distance=distanceKm(origin,place),matched=interestsFor(place).filter(i=>prefs.interests.includes(i)),estimate=visitEstimate(place)
  if(matched.length){score+=matched.length*40;reasons.push(`Matches your interest in ${matched.join(', ')}.`)}
  score+=Math.max(0,20*(1-distance/Math.max(1,prefs.distanceKm)))
  reasons.push(`About ${distance<1?Math.round(distance*1000)+' m':distance.toFixed(1)+' km'} away in a straight line.`)
  if(distance>prefs.distanceKm)reasons.push('Beyond your preferred distance.')
  if(prefs.date&&prefs.start&&prefs.end){if(windows.some(w=>w.end-w.start>=estimate.minutes)){score+=10;reasons.push('Estimated visit fits a free window, excluding travel.')}else reasons.push('No verified free window long enough for the estimated visit; some stop durations may be unknown.')}
  if(place.openingHours==='24/7'){score+=5;reasons.push('Provider lists 24/7 opening; confirm before visiting.')}else unknown.push(place.openingHours?`Provider hours: ${place.openingHours}; date-specific opening unverified.`:'Opening hours unavailable—check before visiting.')
  if(place.price&&prefs.budget!=='any'){if(place.price.level===prefs.budget){score+=10;reasons.push('Provider price level matches your budget.')}else reasons.push('Provider price level differs from your preference.')}else if(!place.price)unknown.push('Price unavailable.')
  if(prefs.accessibility){if(place.accessibility==='yes'){score+=10;reasons.push('Provider marks wheelchair access; confirm your needs.')}else unknown.push(place.accessibility?`Provider wheelchair access: ${place.accessibility}.`:'Accessibility information unavailable.')}
  const planned=alreadyPlanned(place,items);if(planned){score-=25;reasons.push('Already in this itinerary; repeat visits are welcome.')}
  return {place,score,reasons,unknown,distance,estimate,planned,match:matched.length?'Strong interest match':'Nearby possibility'}
 })
 // Greedy diversity bonus is explicit and small compared with a real interest match.
 const result:typeof ranked=[],counts=new Map<string,number>()
 while(ranked.length){ranked.sort((a,b)=>(b.score-(counts.get(b.place.category||'')||0)*8)-(a.score-(counts.get(a.place.category||'')||0)*8)||placeKey(a.place).localeCompare(placeKey(b.place)));const next=ranked.shift()!;if(!counts.get(next.place.category||'')&&result.length)next.reasons.push('Adds category variety to these suggestions.');counts.set(next.place.category||'',(counts.get(next.place.category||'')||0)+1);result.push(next)}
 return result
}
export function suggestCandidates(ranked:ReturnType<typeof rankPlaces>,prefs:Preferences,items:ItineraryItem[],days:TripDay[]){
 const existing=prefs.date?items.filter(i=>days.some(d=>d.id===i.trip_day_id&&d.date===prefs.date&&!d.is_ideas)&&!['cancelled','skipped'].includes(i.status)).length:0
 const count=Math.max(0,({relaxed:3,balanced:5,packed:7}[prefs.style])-existing)
 let available=prefs.date?freeWindows(prefs,items,days).reduce((n,w)=>n+w.end-w.start,0):Infinity
 return ranked.filter(r=>!r.planned).filter(r=>{if(r.estimate.minutes>available)return false;available-=r.estimate.minutes;return true}).slice(0,count).map(r=>({id:crypto.randomUUID(),place:r.place,date:prefs.date,start:'',end:'',nextDay:false,selected:true,notes:'',estimate:r.estimate}))
}
export type SuggestedVisit=ReturnType<typeof suggestCandidates>[number]
export function placeDraft(place:Place):Partial<ItineraryItem>{return {title:place.name.slice(0,255),location_name:(place.address||place.name).slice(0,255),latitude:place.latitude,longitude:place.longitude,location_source:'search',place_provider:place.provider||null,provider_place_id:place.providerId||null,item_type:place.category==='food'?'meal':'activity',status:'planned',description:''}}

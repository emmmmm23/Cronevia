import type {Trip,TripDay,ItineraryItem} from '@/types'
export function localClock(timezone?:string|null,now=new Date()){
 const zone=timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now)
 const part=(type:string)=>parts.find(p=>p.type===type)?.value || ''
 return {date:part('year')+'-'+part('month')+'-'+part('day'),time:part('hour')+':'+part('minute'),zone}
}
export type TripGroup='Drafts'|'Upcoming'|'In progress'|'Past trips'|'Archived'
export function tripGroup(trip:Trip,now=new Date()):TripGroup{
 if(trip.status==='archived')return 'Archived';if(trip.status==='completed')return 'Past trips';if(trip.status==='active')return 'In progress'
 if(!trip.start_date)return 'Drafts';const today=localClock(trip.timezone,now).date
 if(trip.start_date>today)return 'Upcoming';if((trip.end_date || trip.start_date)<today)return 'Past trips';return 'In progress'
}
export function dateError(start:string,end:string,undecided:boolean){if(undecided)return '';if(!start)return 'Choose a start date or select Dates undecided.';if(end && end<start)return 'The end date must be on or after the start date.';if(end && (Date.parse(end)-Date.parse(start))/86400000>365)return 'Keep this trip within 366 days.';return ''}
export function dayLabel(day:TripDay){return day.is_ideas?'Ideas':'Day '+day.day_number}
export function outsideRange(day:TripDay,trip:Trip){return !!(day.date && trip.start_date && (day.date<trip.start_date || (trip.end_date && day.date>trip.end_date)))}
export function timeMinutes(time:string){const [h,m]=time.split(':').map(Number);return h*60+m}
export function overlapping(items:ItineraryItem[],days:TripDay[]=[]){
 const ordinal=new Map(days.map(d=>[d.id,d.day_number]));const ids=new Set<string>()
 for(const a of items)for(const b of items){if(a.id>=b.id||!a.scheduled_time||!b.scheduled_time||['cancelled','skipped'].includes(a.status)||['cancelled','skipped'].includes(b.status))continue
  const ad=activityDuration(a),bd=activityDuration(b);if(!ad||!bd)continue
  // Without day metadata, compare only within a day. Ideas are not dated intervals.
  if(!days.length&&a.trip_day_id!==b.trip_day_id)continue
  if(days.some(d=>d.is_ideas&&(d.id===a.trip_day_id||d.id===b.trip_day_id)))continue
  const x=(ordinal.get(a.trip_day_id)||0)*1440+timeMinutes(a.scheduled_time),y=(ordinal.get(b.trip_day_id)||0)*1440+timeMinutes(b.scheduled_time)
  if(x<y+bd&&y<x+ad){ids.add(a.id);ids.add(b.id)}
 }return ids
}
export function nextActivity(items:ItineraryItem[],time:string){return [...items].filter(i=>i.status==='planned'&&i.scheduled_time&&timeMinutes(i.scheduled_time)>=timeMinutes(time)).sort((a,b)=>a.scheduled_time!.localeCompare(b.scheduled_time!))[0]}
export function directions(item:ItineraryItem){const l=item.location;return l&&Number.isFinite(l.latitude)&&Number.isFinite(l.longitude)&&Math.abs(l.latitude)<=90&&Math.abs(l.longitude)<=180?'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(l.latitude+','+l.longitude):item.location_name?'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(item.location_name):null}

/** Timed rows are chronological; flexible rows keep their persisted manual order. */
export function orderedActivities(items:ItineraryItem[]){return [...items].sort((a,b)=>{
 if(a.scheduled_time&&b.scheduled_time)return timeMinutes(a.scheduled_time)-timeMinutes(b.scheduled_time)||a.sort_order-b.sort_order||a.id.localeCompare(b.id)
 if(a.scheduled_time)return -1;if(b.scheduled_time)return 1
 return a.sort_order-b.sort_order||a.id.localeCompare(b.id)
})}
export function activityDuration(item:Partial<ItineraryItem>){return item.scheduled_time&&item.end_time?timeMinutes(item.end_time)+(item.end_day_offset||0)*1440-timeMinutes(item.scheduled_time):item.duration_minutes||null}
export function activityTimeError(item:Partial<ItineraryItem>){
 const valid=(s:string)=>/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(s)
 if(item.scheduled_time&&!valid(item.scheduled_time)||item.end_time&&!valid(item.end_time))return 'Use a valid time, or leave the activity flexible.'
 if(item.end_time&&!item.scheduled_time)return 'Add a start time before setting an end time.'
 if(item.end_day_offset&&!item.end_time)return 'Add an end time for an overnight activity.'
 if(item.end_time&&(activityDuration(item)||0)<=0)return 'End time must follow the start. Choose Next day for an overnight activity.'
 if(item.duration_minutes!=null&&(!Number.isInteger(Number(item.duration_minutes))||Number(item.duration_minutes)<1||Number(item.duration_minutes)>2880))return 'Duration should be 1–2880 minutes.'
 return ''
}
export function timeLabel(item:ItineraryItem){return item.scheduled_time?item.scheduled_time.slice(0,5)+(item.end_time?' – '+item.end_time.slice(0,5)+(item.end_day_offset?' (+1 day)':''):''):item.time_label||'Any time'}
export function plannerError(error:unknown){const e=error as {message?:string;response?:{data?:{message?:string}}};const message=e?.response?.data?.message||e?.message||''
 return /create_trip_draft|ensure_trip_days|save_trip_activity|schema cache|column .* does not exist/i.test(message)?'Trip planning needs a one-time service update. Your details are kept. Contact the app owner, then retry saving.':'Your changes couldn’t be saved. They are still here; please retry.'
}

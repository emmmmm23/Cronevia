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
export function overlapping(items:ItineraryItem[]){const ids=new Set<string>();for(const a of items)for(const b of items){if(a.id>=b.id||!a.scheduled_time||!b.scheduled_time||!a.duration_minutes||!b.duration_minutes)continue;const x=timeMinutes(a.scheduled_time),y=timeMinutes(b.scheduled_time);if(x<y+b.duration_minutes&&y<x+a.duration_minutes){ids.add(a.id);ids.add(b.id)}}return ids}
export function nextActivity(items:ItineraryItem[],time:string){return [...items].filter(i=>i.status==='planned'&&i.scheduled_time&&timeMinutes(i.scheduled_time)>=timeMinutes(time)).sort((a,b)=>a.scheduled_time!.localeCompare(b.scheduled_time!))[0]}
export function directions(item:ItineraryItem){const l=item.location;return l&&Number.isFinite(l.latitude)&&Number.isFinite(l.longitude)&&Math.abs(l.latitude)<=90&&Math.abs(l.longitude)<=180?'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(l.latitude+','+l.longitude):item.location_name?'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(item.location_name):null}

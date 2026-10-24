import {supabase} from '@/lib/supabase'
import api from './api.service'
import type {Trip,TripDay,ItineraryItem,PaginatedResponse} from '@/types'
import type {Json} from '@/types/database.types'
import {requestError} from './request-errors'
export async function allRecords<T>(resource:string,params:Record<string,string|number>={}){
 const rows:T[]=[];for(let page=1;;page++){const result=(await api.get<PaginatedResponse<T>>('/'+resource,{params:{...params,per_page:100,page}})).data;rows.push(...result.data);if(page>=result.meta.last_page)break}return rows
}
export async function loadPlan(id:string){
 const ensured=await supabase.rpc('ensure_trip_days',{target_trip_id:id});if(ensured.error)throw ensured.error
 const trip=(await api.get<{data:Trip}>('/trips/'+id)).data.data
 const days=(await api.get<{data:TripDay[]}>('/trips/'+id+'/days')).data.data
 const items:ItineraryItem[]=[]
 // Page through the whole plan; the API's default row cap must not hide later activities.
 for(let offset=0;days.length;offset+=500){
  const result=await supabase.from('itinerary_items').select('*, location:locations(*)').in('trip_day_id',days.map(d=>d.id)).order('sort_order').order('id').range(offset,offset+499)
  if(result.error)throw result.error
  const rows=result.data||[]
  items.push(...rows.map(i=>({...i,scheduled_time:i.start_time,category:i.item_type,converted_to_memory:false,status:i.status==='completed'?'visited':i.status})) as ItineraryItem[])
  if(rows.length<500)break
 }
 return {trip,days,items}
}
export async function saveActivity(tripId:string,dayId:string,id:string,details:Partial<ItineraryItem>){
 const result=await supabase.rpc('save_trip_activity',{target_trip_id:tripId,target_day_id:dayId,activity_id:id,details:{...details,status:details.status==='visited'?'completed':details.status} as Json});if(result.error)throw result.error
 return {...result.data,category:result.data.item_type,converted_to_memory:false,scheduled_time:result.data.start_time,status:result.data.status==='completed'?'visited':result.data.status} as ItineraryItem
}
export async function moveActivity(id:string,dayId:string){const result=await supabase.rpc('move_trip_activity',{activity_id:id,target_day_id:dayId});if(result.error)throw result.error}

export async function nameDay(tripId:string,dayId:string,title:string){const r=await supabase.rpc('name_trip_day',{target_trip_id:tripId,target_day_id:dayId,day_title:title});if(r.error)throw r.error;return r.data as TripDay}

export async function savePlace(tripId:string,id:string,date:string,details:Partial<ItineraryItem>){
 const result=await supabase.rpc(details.provider_place_id?'save_discovered_trip_place':'save_trip_place',{target_trip_id:tripId,activity_id:id,place_date:date||null,details:{...details,status:details.status==='visited'?'completed':details.status} as Json})
 if(result.error)throw result.error
 const data=result.data as unknown as {item:ItineraryItem & {start_time:string|null};day:TripDay}
 return {day:data.day,item:{...data.item,location:data.item.location_id&&data.item.location_id===details.location_id?details.location:undefined,scheduled_time:data.item.start_time,category:data.item.item_type,converted_to_memory:false,status:data.item.status as string==='completed'?'visited':data.item.status} as ItineraryItem}
}
export async function folderSummaries(){const r=await supabase.rpc('trip_folder_summaries');if(r.error)throw requestError(r.error.message,r.status,r.error.code);return r.data}
export async function reorderPlaces(tripId:string,date:string|null,ids:string[]){const r=await supabase.rpc('reorder_trip_places',{target_trip_id:tripId,place_date:date,item_ids:ids});if(r.error)throw r.error}

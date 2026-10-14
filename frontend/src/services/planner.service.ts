import {supabase} from '@/lib/supabase'
import api from './api.service'
import type {Trip,TripDay,ItineraryItem,PaginatedResponse} from '@/types'
import type {Json} from '@/types/database.types'
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

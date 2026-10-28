import { supabase } from '@/lib/supabase'
import { requireUser } from '@/services/supabase-api'
import { defaultDesign, localDate, type CreativeTracker, type TrackerLog, type TrackerBoard, type TrackerValues } from '@/types/trackers'
import type { Json } from '@/types/database.types'
import {safeServiceMessage} from './request-errors'

const asJson = (value: unknown) => value as Json
export function trackerError(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message=String(error.message)
    if (/schema cache|does not exist|Could not find the table/i.test(message)) return 'The tracker collection is temporarily unavailable. Your draft is still here. Please try again shortly.'
    return safeServiceMessage(message,'That change could not be saved. Your draft is still here; please try again.')
  }
  return 'That could not be saved. Your draft is still here; please try again.'
}
export async function loadTrackers(year: number) {
  const user=await requireUser()
  const trackers:CreativeTracker[]=[], logs:TrackerLog[]=[]
  for(let offset=0;;offset+=500){
    const r=await supabase.from('creative_trackers').select('*').eq('user_id',user.id).order('created_at').order('id').range(offset,offset+499)
    if(r.error)throw r.error
    trackers.push(...r.data);if(r.data.length<500)break
  }
  for(let offset=0;;offset+=500){
    const r=await supabase.from('tracker_logs').select('*').eq('user_id',user.id).gte('log_date',year+'-01-01').lte('log_date',year+'-12-31').order('log_date').order('id').range(offset,offset+499)
    if(r.error)throw r.error
    logs.push(...r.data);if(r.data.length<500)break
  }
  const r=await supabase.from('tracker_boards').select('*').eq('user_id',user.id).maybeSingle()
  if(r.error)throw r.error
  const board:TrackerBoard=r.data??{user_id:user.id,name:'My little rhythms',tracker_ids:[],wide_ids:[],design:defaultDesign()}
  return {trackers,logs,board}
}
export async function saveTracker(tracker: Omit<CreativeTracker,'user_id'|'created_at'>) {
  const r=await supabase.rpc('save_creative_tracker',{target_id:tracker.id,details:asJson({...tracker,effective_date:localDate()})})
  if(r.error)throw r.error
  return r.data as unknown as CreativeTracker
}
export async function logsForDate(trackerId:string,date:string) {
 const user=await requireUser(),rows:TrackerLog[]=[]
 for(let offset=0;;offset+=500){const r=await supabase.from('tracker_logs').select('*').eq('user_id',user.id).eq('tracker_id',trackerId).eq('log_date',date).order('id').range(offset,offset+499);if(r.error)throw r.error;rows.push(...r.data);if(r.data.length<500)break}
 return rows
}
export async function saveLog(trackerId:string,id:string,date:string,values:TrackerValues,timezone:string,start:string|null=null,end:string|null=null) {
  const r=await supabase.rpc('save_tracker_log',{target_tracker:trackerId,entry_id:id,entry_date:date,entry_values:asJson(values),entry_timezone:timezone,session_start:start,session_end:end})
  if(r.error)throw r.error
  return r.data as unknown as TrackerLog
}
export async function removeLog(id:string) { const r=await supabase.rpc('remove_tracker_log',{target_id:id});if(r.error)throw r.error }
export async function saveGridDay(trackerId:string,date:string,previous:TrackerLog[],entries:import('@/types/tracker-grid').GridEntry[]){
 const r=await supabase.rpc('save_tracker_grid_day',{target_tracker:trackerId,entry_date:date,expected_rows:asJson(previous.map(l=>({id:l.id,updated_at:l.updated_at}))),new_entries:asJson(entries)})
 if(r.error){if(r.error.code==='40001')throw new Error('This day changed in another tab. Reload before editing.');throw r.error}
 return r.data as unknown as TrackerLog[]
}
export async function removeTracker(id:string) { const r=await supabase.rpc('delete_creative_tracker',{target_id:id});if(r.error)throw r.error }
export async function saveBoard(board:TrackerBoard) {
  const r=await supabase.rpc('save_tracker_board',{details:asJson(board)})
  if(r.error)throw r.error
  return r.data as unknown as TrackerBoard
}
export async function uploadTrackerImage(file:File) {
  if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)||file.size>5*1024*1024)throw new Error('Choose a JPG, PNG, WebP, or GIF under 5 MB.')
  const user=await requireUser(), path=user.id+'/trackers/'+crypto.randomUUID()+'.'+file.type.split('/')[1]
  const r=await supabase.storage.from('cronevia-media').upload(path,file,{contentType:file.type,upsert:false})
  if(r.error)throw r.error
  return path
}
const signedCache=new Map<string,{url:string;until:number}>()
export async function trackerAssetUrl(path:string) {
  if(path.startsWith('/stickers-builtin/'))return path
  const cached=signedCache.get(path)
  if(cached&&cached.until>Date.now())return cached.url
  const r=await supabase.storage.from('cronevia-media').createSignedUrl(path,3600)
  if(r.error)throw r.error
  signedCache.set(path,{url:r.data.signedUrl,until:Date.now()+3000000})
  return r.data.signedUrl
}

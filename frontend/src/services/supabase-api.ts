/** Adapts the existing screens to Supabase Auth, Postgres and private Storage. */
import { destinationFields } from '@/types/destination'
import { validateScrapbook } from '@/types/scrapbook'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import {requestError} from './request-errors'
import {journalRpc} from './shared-journals'
import {isJournalId} from './journal-routes'

type Table = 'trips' | 'journal_entries' | 'memories'
type RecordData = Record<string, any>
type Options = { params?: Record<string, string | number>; headers?: Record<string, string> }
const tables: Record<string, Table> = { trips: 'trips', journal: 'journal_entries', memories: 'memories' }
const writable: Record<Table, string[]> = {
  trips: ['destination_latitude', 'destination_longitude', 'destination_source', 'timezone', 'preparation', 'title', 'description', 'destination', 'start_date', 'end_date', 'status', 'budget', 'currency', 'visibility'],
  journal_entries: ['tracker_links', 'scrapbook_layout', 'title', 'content', 'entry_date', 'trip_id', 'trip_day_id', 'itinerary_item_id', 'memory_id', 'mood_emoji', 'mood_name', 'mood_enum', 'location_name', 'latitude', 'longitude', 'weather', 'visibility', 'status', 'is_archived', 'location_source', 'tags'],
  memories: ['itinerary_item_id', 'journal_entry_id', 'scrapbook_layout', 'title', 'description', 'trip_id', 'memory_date', 'location_name', 'latitude', 'longitude', 'is_archived'],
}
export function preparePayload(table: Table, input: RecordData) {
  const source = { ...input }
  if (table === 'trips') {
    const hasLocation = ['destination_latitude','destination_longitude','destination_source'].some(key => key in source)
    if (hasLocation) Object.assign(source, destinationFields(source))
    else if ('destination' in source) Object.assign(source, destinationFields({}))
  }
  if (source.scrapbook_layout) validateScrapbook(source.scrapbook_layout)
  if ('mood_label' in source) source.mood_name = source.mood_label
  if ('mood' in source) source.mood_enum = source.mood
  if (source.visibility === 'shared') source.visibility = 'friends'
  return Object.fromEntries(writable[table].filter(key => source[key] !== undefined).map(key => [key, source[key]]))
}
function failure(message: string, status = 400, code?:string): never {
  throw requestError(message,status,code)
}
function check<T>(result: { data: T; error: { message: string;code?:string } | null; status?: number }): NonNullable<T> {
  if (result.error) failure(result.error.message, result.status || 400,result.error.code)
  return result.data as NonNullable<T>
}
export async function requireUser() {
  const result = await supabase.auth.getUser()
  if(result.error){
    const status=result.error.status
    if(!status||status>=500||status===429)failure('Sign-in verification is temporarily unavailable.',503,result.error.code)
    failure('Please sign in to continue.',401,result.error.code)
  }
  if (!result.data.user) failure('Please sign in to continue.', 401)
  return result.data.user
}
async function mediaFor(table: Table, id: string) {
  const column = table === 'trips' ? 'trip_id' : table === 'journal_entries' ? 'journal_entry_id' : 'memory_id'
  const rows = check(await supabase.from('media').select('*').eq(column, id).order('sort_order')) || []
  return Promise.all(rows.map(async row => {
    const signed = check(await supabase.storage.from('cronevia-media').createSignedUrl(row.storage_path, table==='journal_entries'?60:3600))
    return { ...row, file_path: signed.signedUrl, thumbnail_path: signed.signedUrl, thumbnail_url: signed.signedUrl,
      original_filename: row.file_name, file_size: row.size_bytes, type: row.mime_type.startsWith('image/') ? 'image' : 'video' }
  }))
}
async function present(table: Table, row: RecordData) {
  const media = await mediaFor(table, row.id)
  return { ...row, media, mood_label: row.mood_name ?? null, mood: row.mood_enum ?? null,
    visibility: row.visibility === 'friends' ? 'shared' : row.visibility,
    cover_media_id: media.find(item => item.is_cover)?.id ?? null,
    cover_image_path: media.find(item => item.is_cover)?.file_path ?? media[0]?.file_path ?? null }
}
async function list(table: Table, userId: string, params: Record<string, string | number> = {}) {
  const page = Math.max(1, Number(params.page) || 1)
  const perPage = Math.min(100, Math.max(1, Number(params.per_page) || 20))
  const dateColumn = table === 'trips' ? 'start_date' : table === 'memories' ? 'memory_date' : 'entry_date'
  let query = supabase.from(table).select('*', { count: 'exact' }).is('deleted_at', null)
  if(table==='journal_entries'&&params.journal){
    if(!isJournalId(params.journal)||!await journalRpc('journal_role',{target_journal:params.journal}))failure('This journal is unavailable or access has ended.',403)
    query=query.filter('journal_id','eq',params.journal)
  }else query=query.eq('user_id',userId)
  if (table !== 'trips') query = query.filter('is_archived', 'eq', String(params.archived) === 'true')
  if (params.trip_id && table !== 'trips') query = query.filter('trip_id', 'eq', String(params.trip_id))
  if (params.search) query = query.ilike('title', `%${String(params.search).replace(/[%_]/g, '\\$&')}%`)
  if (params.status && table === 'trips') query = query.filter('status', 'eq', String(params.status))
  const result = await query.order(dateColumn, { ascending: false, nullsFirst: false }).range((page - 1) * perPage, page * perPage - 1)
  const rows = check(result) || []
  return { data: await Promise.all(rows.map(row => present(table, row))), meta: {
    current_page: page, per_page: perPage, total: result.count || 0, last_page: Math.max(1, Math.ceil((result.count || 0) / perPage)),
  } }
}
async function count(table: Table | 'locations', userId: string) {
  let query = supabase.from(table).select('id', { count: 'exact', head: true }).eq('user_id', userId)
  if (table !== 'locations') query = query.is('deleted_at', null)
  const result = await query
  check(result)
  return result.count || 0
}
async function upload(table: Table, parentId: string, body: FormData, userId: string) {
  const file = body.get('file')
  if (!(file instanceof File)) failure('Choose a file to upload.', 422)
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 10 * 1024 * 1024) failure('Choose a JPG, PNG, WebP or GIF image under 10 MB.', 422)
  const uploadId = String(body.get('upload_id') || crypto.randomUUID())
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uploadId)) failure('Invalid upload reference.',422)
  const path = table==='journal_entries'?`${userId}/journals/${parentId}/${uploadId}.${file.type.split('/')[1]}`:`${userId}/${uploadId}.${file.type.split('/')[1]}`
  if(table==='journal_entries'){
    const existing=check(await supabase.from('media').select('*').eq('id',uploadId).eq('journal_entry_id',parentId).maybeSingle())
    if(existing)return {data:existing}
    const uploaded=await supabase.storage.from('cronevia-media').upload(path,file,{contentType:file.type,upsert:false})
    if(uploaded.error&&String((uploaded.error as {statusCode?:string}).statusCode)!=='409')check(uploaded)
  }else check(await supabase.storage.from('cronevia-media').upload(path, file, { contentType: file.type, upsert: true }))
  const foreignKey = table === 'trips' ? 'trip_id' : table === 'journal_entries' ? 'journal_entry_id' : 'memory_id'
  const metadata={id:uploadId,user_id:userId,[foreignKey]:parentId,storage_path:path,file_name:file.name,mime_type:file.type,size_bytes:file.size} as Database['public']['Tables']['media']['Insert']
  const result=table==='journal_entries'?await supabase.from('media').insert(metadata).select().single():await supabase.from('media').upsert(metadata).select().single()
  // Keep the private object when a response is uncertain; the same upload ID safely retries.
  check(result)
  return { data: result.data }
}
function itineraryPayload(input: RecordData) {
  const keys = ['latitude', 'longitude', 'location_source', 'end_day_offset', 'location_name', 'time_label', 'booking_reference', 'title', 'description', 'location_id', 'duration_minutes', 'sort_order', 'start_time', 'end_time', 'cost', 'currency', 'item_type', 'status']
  const source = { ...input }
  if ('scheduled_time' in source) source.start_time = source.scheduled_time
  if (source.status === 'visited') source.status = 'completed'
  return Object.fromEntries(keys.filter(key => source[key] !== undefined).map(key => [key, source[key]]))
}
const presentItem = (item: RecordData) => ({ ...item, scheduled_time: item.start_time, status: item.status === 'completed' ? 'visited' : item.status })
async function writeRecord(table: Table, payload: RecordData, id?: string, userId?: string) {
  if (table === 'trips') {
    const query = id ? supabase.from('trips').update(payload as Database['public']['Tables']['trips']['Update']).eq('id', id).eq('user_id', userId!)
      : supabase.from('trips').insert(payload as Database['public']['Tables']['trips']['Insert'])
    return check(await query.select().single())
  }
  if (table === 'journal_entries') {
    const query = id ? supabase.from('journal_entries').update(payload as Database['public']['Tables']['journal_entries']['Update']).eq('id', id).eq('user_id', userId!)
      : supabase.from('journal_entries').insert(payload as Database['public']['Tables']['journal_entries']['Insert'])
    return check(await query.select().single())
  }
  const query = id ? supabase.from('memories').update(payload as Database['public']['Tables']['memories']['Update']).eq('id', id).eq('user_id', userId!)
    : supabase.from('memories').insert(payload as Database['public']['Tables']['memories']['Insert'])
  return check(await query.select().single())
}
async function request(method: string, path: string, body?: RecordData | FormData, options: Options = {}): Promise<unknown> {
  const user = await requireUser()
  const [resource, id, child, childId, action, itemId] = path.replace(/^\/api\/v1/, '').split('/').filter(Boolean)
  const input = (body || {}) as RecordData
  if (resource === 'dashboard' && method === 'GET') {
    const [journal_count, trip_count, memory_count, place_count, journals, trips, anniversary] = await Promise.all([
      count('journal_entries', user.id), count('trips', user.id), count('memories', user.id), count('locations', user.id),
      list('journal_entries', user.id, { per_page: 5 }), list('trips', user.id, { per_page: 5 }), supabase.rpc('get_on_this_day'),
    ])
    return { journal_count, trip_count, memory_count, place_count, recent_journals: journals.data, recent_trips: trips.data, on_this_day: check(anniversary) }
  }
  const table = tables[resource]
  if (!table) failure(`Unsupported operation: ${method} ${path}`, 404)
  if (child === 'media') {
    let parentQuery=supabase.from(table).select('id,user_id').eq('id',id)
    if(table!=='journal_entries')parentQuery=parentQuery.eq('user_id',user.id)
    const parent=check(await parentQuery.single())
    if(table==='journal_entries'&&!await journalRpc('can_edit_journal_entry',{target_entry:id}))failure('This entry is read only.',403)
    if (method === 'POST' && body instanceof FormData) return upload(table, id, body, parent.user_id)
    const foreignKey = table === 'trips' ? 'trip_id' : table === 'journal_entries' ? 'journal_entry_id' : 'memory_id'
    const row = check(await supabase.from('media').select('*').eq('id', childId).eq(foreignKey, id).eq('user_id', parent.user_id).single())
    if (method === 'DELETE') {
      // Check database reference protection before removing the underlying reusable file.
      check(await supabase.from('media').delete().eq('id', row.id).eq('user_id', parent.user_id))
      check(await supabase.storage.from('cronevia-media').remove([row.storage_path]))
      return { data: null }
    }
    if (method === 'PATCH' && action === 'set-cover' && table === 'trips') {
      check(await supabase.rpc('set_trip_cover', { target_trip_id: id, target_media_id: row.id }))
      return { data: null }
    }
    failure('Unsupported media operation.', 404)
  }
  if (table === 'trips' && child === 'days') {
    check(await supabase.from('trips').select('id').eq('id', id).eq('user_id', user.id).single())
    if (action === 'itinerary') {
      check(await supabase.from('trip_days').select('id').eq('id', childId).eq('trip_id', id).single())
      if (method === 'GET') return { data: (check(await supabase.from('itinerary_items').select('*').eq('trip_day_id', childId).order('sort_order')) || []).map(presentItem) }
      if (method === 'PATCH' && itemId === 'reorder') {
        check(await supabase.rpc('reorder_itinerary', { target_day_id: childId, item_ids: input.order }))
        return { data: [] }
      }
      if (method === 'DELETE') {
        check(await supabase.from('itinerary_items').delete().eq('id', itemId).eq('trip_day_id', childId))
        return { data: null }
      }
      const payload = itineraryPayload(input)
      const result = method === 'POST'
        ? await supabase.from('itinerary_items').insert({ ...payload, title: String(payload.title || ''), trip_day_id: childId }).select().single()
        : await supabase.from('itinerary_items').update(payload as Database['public']['Tables']['itinerary_items']['Update']).eq('id', itemId).eq('trip_day_id', childId).select().single()
      return { data: presentItem(check(result)) }
    }
    if (method === 'GET') return { data: check(await supabase.from('trip_days').select('*').eq('trip_id', id).order('day_number')) }
    if (method === 'POST') return { data: check(await supabase.from('trip_days').upsert({ id:input.id || crypto.randomUUID(),trip_id: id, day_number: input.day_number,
      date: input.date, title: input.title, notes: input.notes }).select().single()) }
  }
  if (method === 'GET') {
    if (!id) return list(table, user.id, options.params)
    let query=supabase.from(table).select('*').eq('id',id).is('deleted_at',null)
    if(table!=='journal_entries')query=query.eq('user_id',user.id)
    const row=check(await query.single())
    return { data: await present(table, row) }
  }
  if (method === 'DELETE') {
    if(table==='journal_entries'){
      const access=await journalRpc<{version:number}|null>('journal_entry_access',{target_entry:id})
      if(!access)failure('This entry is unavailable.',403)
      await journalRpc('save_journal_entry',{target_entry:id,expected_version:access.version,details:{deleted_at:new Date().toISOString()}})
      return {data:null}
    }
    check(await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id).select('id').single())
    return { data: null }
  }
  const payload = preparePayload(table, input)
  if(table==='journal_entries'){
    if(method==='POST')payload.status='draft'
    if(child==='archive'||child==='restore')payload.is_archived=child==='archive'
    let version=input.version??null
    if(id&&version===null){
      if(child!=='archive'&&child!=='restore')failure('Reload this entry before saving. Your draft has been kept.',409,'40001')
      const access=await journalRpc<{version:number}|null>('journal_entry_access',{target_entry:id});if(!access)failure('This entry is unavailable.',403);version=access.version
    }
    const row=await journalRpc<RecordData>('save_journal_entry',{target_entry:id||String(input.draft_key||crypto.randomUUID()),expected_version:version,details:payload,target_journal:isJournalId(input.journal_id)?input.journal_id:null})
    return {data:await present(table,row)}
  }
  if (child === 'archive' || child === 'restore') payload.is_archived = child === 'archive'
  if (method === 'POST') {
    if (!String(payload.title || '').trim()) failure('A title is required.', 422)
    if (table === 'trips') payload.slug = `${String(payload.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0,100)}-${crypto.randomUUID()}`
    const row = table === 'trips' && input.draft_key
      ? check(await supabase.rpc('create_trip_draft',{draft_id:String(input.draft_key),details:{...payload,draft_ideas:input.draft_ideas||[]}}))
      : table === 'memories' && input.draft_key
        ? check(await supabase.rpc('create_memory_draft', {draft_id:String(input.draft_key),draft_title:String(payload.title),draft_description:String(payload.description || ''),draft_date:String(payload.memory_date)}))
        : await writeRecord(table, { ...payload, user_id: user.id })
    // Confirm creation independently of optional media hydration on the trip page.
    if(table==='trips'&&input.draft_key)return {data:row}
    return { data: await present(table, row) }
  }
  if ((method === 'PUT' || method === 'PATCH') && id) {
    const row = await writeRecord(table, payload, id, user.id)
    return { data: await present(table, row) }
  }
  failure(`Unsupported operation: ${method} ${path}`, 404)
}
async function call<T>(method: string, path: string, body?: RecordData | FormData, options?: Options): Promise<{ data: T }> {
  try { return { data: await request(method, path, body, options) as T } }
  catch (error) {
    if (error instanceof Error && !('response' in error)) failure(error.message, 503)
    throw error
  }
}
export default {
  get: <T = unknown>(path: string, options?: Options) => call<T>('GET', path, undefined, options),
  post: <T = unknown>(path: string, body?: RecordData | FormData, options?: Options) => call<T>('POST', path, body, options),
  put: <T = unknown>(path: string, body?: RecordData) => call<T>('PUT', path, body),
  patch: <T = unknown>(path: string, body?: RecordData) => call<T>('PATCH', path, body),
  delete: <T = unknown>(path: string) => call<T>('DELETE', path),
}

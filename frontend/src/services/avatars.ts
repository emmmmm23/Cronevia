import {supabase} from '@/lib/supabase'
import {avatarPath,normalizeAppearance,type AvatarAppearance} from '@/types/avatar'
import type {Database,Json} from '@/types/database.types'
export type AvatarRecord=Database['public']['Tables']['profiles']['Row']
export const avatarBucket='cronevia-avatars'
const cache=new Map<string,{url:string;expires:number}>()
const pending=new Map<string,Promise<string>>()
let cacheGeneration=0
export function clearAvatarUrls(){cacheGeneration++;cache.clear();pending.clear()}
export async function avatarUrl(path:string,force=false){
 if(!avatarPath(path))throw new Error('Invalid photo reference.')
 const {data:{session}}=await supabase.auth.getSession()
 if(!session)throw new Error('Please sign in again.')
 const key=`${session.user.id}:${path}`,existing=cache.get(key),generation=cacheGeneration
 if(!force&&existing&&existing.expires>Date.now())return existing.url
 if(pending.has(key))return pending.get(key)!
 const request=(async()=>{
  const {data,error}=await supabase.storage.from(avatarBucket).createSignedUrl(path,3600)
  if(error||!data)throw new Error('Your photo is temporarily unavailable.')
  if(generation===cacheGeneration)cache.set(key,{url:data.signedUrl,expires:Date.now()+40*60*1000})
  return data.signedUrl
 })()
 pending.set(key,request)
 try{return await request}finally{if(pending.get(key)===request)pending.delete(key)}
}
function extension(blob:Blob){if(blob.type==='image/webp')return 'webp';if(blob.type==='image/png')return 'png';throw new Error('Prepare a PNG or WebP photo before saving.')}
export async function saveAvatar(profile:AvatarRecord,appearance:AvatarAppearance,options:{source?:Blob;photo?:Blob;remove:boolean}){
 const {data,error:userError}=await supabase.auth.getUser()
 if(userError||!data.user||data.user.id!==profile.user_id)throw new Error('Please sign in again before saving.')
 let photo=profile.avatar_storage_path??null,source=profile.avatar_source_path??null
 const uploaded:string[]=[],folder=`${data.user.id}/avatars/${crypto.randomUUID()}`
 const cleanup=async(paths:string[])=>{if(paths.length){const {error}=await supabase.storage.from(avatarBucket).remove(paths);return !error}return true}
 try{
  for(const [name,blob] of [['source',options.source],['avatar',options.photo]] as const){
   if(!blob)continue
   if(blob.size>2097152)throw new Error('This optimized photo exceeds 2 MB. Choose a smaller photo.')
   const path=`${folder}/${name}.${extension(blob)}`
   const {error}=await supabase.storage.from(avatarBucket).upload(path,blob,{contentType:blob.type,upsert:false,cacheControl:'3600'})
   if(error)throw new Error('Your photo could not be uploaded. Your current photo is unchanged. Please retry.')
   uploaded.push(path);if(name==='source')source=path;else photo=path
  }
  if(options.remove){photo=null;source=null}
  const {data:result,error}=await supabase.rpc('save_profile_avatar',{expected_revision:profile.avatar_revision??0,appearance:appearance as unknown as Json,photo_path:photo,source_path:source,remove_photo:options.remove})
  let saved:AvatarRecord|undefined,retired:(string|null)[]=[profile.avatar_storage_path??null,profile.avatar_source_path??null]
  if(!error&&result){const response=result as unknown as {profile:AvatarRecord;retired_paths:(string|null)[]};saved=response.profile;retired=response.retired_paths}
  else{
   // A dropped response can follow a committed transaction. Never delete a
   // newly referenced image just because the client did not receive the reply.
   const {data:current}=await supabase.from('profiles').select('*').eq('user_id',profile.user_id).single()
   if(current&&(current.avatar_revision??0)===(profile.avatar_revision??0)+1&&current.avatar_storage_path===photo&&current.avatar_source_path===source&&JSON.stringify(normalizeAppearance(current.avatar_appearance))===JSON.stringify(normalizeAppearance(appearance)))saved=current
   if(!saved)throw new Error(error?.code==='40001'?'Your avatar changed in another tab. Close this editor and reopen it.':'Your avatar could not be saved. Your current photo is unchanged. Please retry.')
  }
  const old=retired.filter((p):p is string=>!!p&&p!==photo&&p!==source&&avatarPath(p))
  const cleaned=await cleanup(old).catch(()=>false)
  return {profile:saved!,cleanupPending:!cleaned}
 }catch(error){await cleanup(uploaded).catch(()=>false);throw error}
}

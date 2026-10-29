import {supabase} from '@/lib/supabase'
import type {Json} from '@/types/database.types'
import {requestError} from './request-errors'
export type JournalRole='owner'|'editor'|'viewer'
export interface SharedJournal{id:string;title:string;owner_id:string;role:JournalRole;share_future:boolean;shared:boolean}
export interface JournalAccess{journal_id:string;role:JournalRole;version:number;last_editor:string|null}
export interface SharingDetails{private_count:number;invitations:{id:string;role:'viewer'|'editor';status:string;expires_at:string;created_at:string}[];members:{user_id:string;role:'viewer'|'editor';name:string}[]}
export interface InviteContext{status:string;journal_id?:string;invitation_id?:string;role?:JournalRole;journal_title?:string;expires_at?:string}
// New RPCs have an explicit typed boundary until the hosted schema types are regenerated.
export async function journalRpc<T>(name:string,args:Record<string,Json>={}):Promise<T>{
 const rpc=supabase.rpc.bind(supabase) as unknown as (name:string,args:Record<string,Json>)=>Promise<{data:T;error:{message:string;code:string}|null;status:number}>
 const result=await rpc(name,args)
 if(result.error)throw requestError(result.error.message,result.error.code==='40001'?409:result.error.code==='42501'?403:result.status||400,result.error.code)
 return result.data
}
export const listJournals=()=>journalRpc<SharedJournal[]>('list_my_journals')
export const entryAccess=(id:string)=>journalRpc<JournalAccess|null>('journal_entry_access',{target_entry:id})
export const sharingDetails=(id:string)=>journalRpc<SharingDetails>('journal_sharing_details',{target_journal:id})
export const createInvitation=(id:string,role:'viewer'|'editor',shareFuture:boolean,title:string)=>journalRpc<{id:string;token:string;role:'viewer'|'editor';expires_at:string}>('create_journal_invite',{target_journal:id,invited_role:role,share_future_entries:shareFuture,journal_title:title})
export const manageSharing=(id:string,action:'revoke'|'remove'|'role'|'leave',target:string,role?:string)=>journalRpc<void>('manage_journal_sharing',{target_journal:id,action,target_id:target,new_role:role||null})
export async function invitationRequest(action:'context'|'accept',invitationId?:string):Promise<InviteContext>{
 const {data}=await supabase.auth.getSession()
 const response=await fetch('/api/journal-invites',{method:'POST',credentials:'same-origin',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json',...(data.session?{Authorization:'Bearer '+data.session.access_token}:{})},body:JSON.stringify({action,...(invitationId?{invitation_id:invitationId}:{})})})
 const result=await response.json()
 if(!response.ok)throw requestError(result.error||'The invitation could not be checked.',response.status)
 return result
}

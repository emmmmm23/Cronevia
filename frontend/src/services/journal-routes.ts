/** Preserve existing journal route names and URLs; only collection selection is new. */
export const invitationPath='/journal/invitations/accept'
export const isJournalId=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
export const journalDestination=(id?:string)=>({name:'journal',query:id&&isJournalId(id)?{journal:id}:{}})
export const journalEntryDestination=(id:string)=>({name:'journal.edit',params:{id}})
export const newJournalEntryDestination=(id?:string)=>({name:'journal.create',query:id&&isJournalId(id)?{journal:id}:{}})
export const invitationDestination=(id?:unknown)=>invitationPath+(isJournalId(id)?'?invitation='+id:'')
export const invitationAuthDestination=(register=false,id?:unknown)=>({name:register?'register':'login',query:{redirect:invitationDestination(id)}})
export function invitationLink(token:string,id:string){if(!/^[0-9a-f]{96}$/.test(token)||!isJournalId(id))throw new Error('Invalid invitation');return new URL(invitationDestination(id)+'#invite='+token,window.location.origin).href}

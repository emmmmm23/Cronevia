import {describe,it,expect,vi} from 'vitest'
vi.mock('@/lib/supabase',()=>({supabase:{}}))
import {safeReturnPath} from './account-security'
import {invitationPath,journalDestination,journalEntryDestination,newJournalEntryDestination,invitationAuthDestination,isJournalId} from './journal-routes'
describe('compatible journal destinations',()=>{
 const id='11111111-1111-4111-8111-111111111111'
 it('keeps the established list, creation and entry route names',()=>{
  expect(journalDestination(id)).toEqual({name:'journal',query:{journal:id}})
  expect(journalEntryDestination(id)).toEqual({name:'journal.edit',params:{id}})
  expect(newJournalEntryDestination(id)).toEqual({name:'journal.create',query:{journal:id}})
  for(const bad of ['new','invitations','../../settings','https://untrusted.example',['a']]){expect(isJournalId(bad)).toBe(false);expect(journalDestination(String(bad)).query).toEqual({})}
 })
 it('uses a distinct invitation path and clean authentication return',()=>{
  expect(invitationPath.split('/')).toHaveLength(4)
  expect(invitationAuthDestination()).toEqual({name:'login',query:{redirect:invitationPath}})
  expect(invitationAuthDestination(true)).toEqual({name:'register',query:{redirect:invitationPath}})
  expect(safeReturnPath(invitationPath+'#invite=private')).toBe(invitationPath)
  expect(safeReturnPath('/journal?journal='+id+'&page=2#entries')).toBe('/journal?journal='+id+'&page=2#entries')
  for(const bad of ['//untrusted.example','/\\untrusted.example','https://untrusted.example','/login?redirect=/login'])expect(safeReturnPath(bad,invitationPath)).toBe(invitationPath)
 })
})

import {beforeEach,describe,it,expect,vi} from 'vitest'
const mocks=vi.hoisted(()=>({password:vi.fn(),list:vi.fn(),verify:vi.fn(),update:vi.fn(),signOut:vi.fn()}))
vi.mock('@/lib/supabase',()=>({verifyCurrentPassword:mocks.password,supabase:{auth:{mfa:{listFactors:mocks.list,challengeAndVerify:mocks.verify},updateUser:mocks.update,signOut:mocks.signOut}}}))
import {safeReturnPath,accountError,changeAccountPassword,verifyFactor} from './account-security'
beforeEach(()=>{vi.resetAllMocks();mocks.password.mockResolvedValue(undefined);mocks.list.mockResolvedValue({data:{totp:[]},error:null});mocks.verify.mockResolvedValue({error:null});mocks.update.mockResolvedValue({error:null});mocks.signOut.mockResolvedValue({error:null})})
describe('account boundaries',()=>{
 it('accepts internal return paths and rejects external, protocol-relative and backslash paths',()=>{
  for(const path of ['https://untrusted.example','//untrusted.example','/\\untrusted.example','/\n/untrusted.example','/login','/verify-2fa?redirect=/'])expect(safeReturnPath(path)).toBe('/')
  expect(safeReturnPath('/trips?id=1#notes')).toBe('/trips?id=1#notes')
  expect(safeReturnPath('/reset-password#access_token=private&refresh_token=private')).toBe('/reset-password')
  expect(safeReturnPath('/reset-password?code=private&month=2026-10')).toBe('/reset-password?month=2026-10')
 })
 it('never includes an untrusted error message in account feedback',()=>{
  expect(accountError({message:'password=private-token-stack-trace'})).not.toContain('private')
  expect(accountError({status:429})).toContain('Too many attempts')
 })
 it('refuses malformed authenticator codes without making a verification request',async()=>{
  await expect(verifyFactor('factor','123')).rejects.toThrow('six-digit')
  expect(mocks.verify).not.toHaveBeenCalled()
 })
 it('does not update a password when current-password verification fails',async()=>{
  mocks.password.mockRejectedValue(new Error('incorrect'))
  await expect(changeAccountPassword('a-new-long-password','wrong')).rejects.toThrow()
  expect(mocks.update).not.toHaveBeenCalled()
 })
 it('requires a fresh verified factor and preserves the main session while revoking other sessions',async()=>{
  mocks.list.mockResolvedValue({data:{totp:[{id:'factor',status:'verified'}]},error:null})
  await expect(changeAccountPassword('a-new-long-password','current','other','123456')).rejects.toThrow('Choose your authenticator')
  expect(mocks.update).not.toHaveBeenCalled()
  await changeAccountPassword('a-new-long-password','current','factor','123456','email-nonce')
  expect(mocks.verify).toHaveBeenCalledWith({factorId:'factor',code:'123456'})
  expect(mocks.update).toHaveBeenCalledWith({password:'a-new-long-password',current_password:'current',nonce:'email-nonce'})
  expect(mocks.signOut).toHaveBeenCalledWith({scope:'others'})
 })
 it('does not update credentials when factor discovery fails',async()=>{
  mocks.list.mockResolvedValue({data:null,error:new Error('unavailable')})
  await expect(changeAccountPassword('a-new-long-password','current')).rejects.toThrow()
  expect(mocks.update).not.toHaveBeenCalled()
 })
})

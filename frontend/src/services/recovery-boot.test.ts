import {describe,it,expect} from 'vitest'
import {readRecoveryCallback,isRecoveryAccessToken} from './recovery-boot'
describe('password recovery callback boundaries',()=>{
 it('recognizes reset links even when Supabase falls back to the landing URL',()=>{
  expect(readRecoveryCallback(new URL('https://cronevia.vercel.app/#type=recovery&access_token=access&refresh_token=refresh'))).toEqual({access_token:'access',refresh_token:'refresh'})
  expect(readRecoveryCallback(new URL('https://cronevia.vercel.app/reset-password?type=recovery&token_hash=one-time'))).toEqual({token_hash:'one-time'})
 })
 it('does not capture normal sign-in or journal invitation callbacks',()=>{
  expect(readRecoveryCallback(new URL('https://cronevia.vercel.app/#type=signup&access_token=access&refresh_token=refresh'))).toBeNull()
  expect(readRecoveryCallback(new URL('https://cronevia.vercel.app/journal/invitations/accept#invite=secret'))).toBeNull()
  expect(readRecoveryCallback(new URL('https://cronevia.vercel.app/reset-password'))).toBeNull()
  expect(readRecoveryCallback(new URL('https://cronevia.vercel.app/#error=access_denied&error_code=otp_expired'))).toBeNull()
 })
 it('fails closed for errors and incomplete or incorrectly marked credentials',()=>{
  for(const value of ['/reset-password#access_token=a&refresh_token=b','/#type=recovery&access_token=a','/reset-password#error=access_denied&error_code=otp_expired','/reset-password?code=unsupported'])expect(readRecoveryCallback(new URL(value,'https://cronevia.vercel.app'))).toEqual({invalid:true})
 })
 it('classifies recovery from the authentication method, never user-editable metadata',()=>{
  const token=(claims:unknown)=>'header.'+btoa(JSON.stringify(claims))+'.signature'
  expect(isRecoveryAccessToken(token({amr:[{method:'recovery'},{method:'totp'}]}))).toBe(true)
  expect(isRecoveryAccessToken(token({amr:['recovery','totp']}))).toBe(true)
  expect(isRecoveryAccessToken(token({amr:[{method:'otp'}]}))).toBe(false)
  expect(isRecoveryAccessToken(token({amr:[{method:'otp'}]}),true)).toBe(true)
  expect(isRecoveryAccessToken(token({amr:['otp']}),true)).toBe(true)
  expect(isRecoveryAccessToken(token({amr:[{method:'password'}],user_metadata:{recovery:true}}))).toBe(false)
  for(const value of ['bad','a.b.c',token({amr:null})])expect(isRecoveryAccessToken(value)).toBe(false)
 })
})

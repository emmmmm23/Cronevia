import {beforeEach,describe,it,expect,vi} from 'vitest'
const mocks=vi.hoisted(()=>({callback:vi.fn(),session:vi.fn(),otp:vi.fn(),user:vi.fn(),assurance:vi.fn(),verify:vi.fn(),update:vi.fn(),signOut:vi.fn(),clear:vi.fn()}))
vi.mock('./recovery-boot',()=>({takeRecoveryCallback:mocks.callback,isRecoveryAccessToken:(token:string)=>token.startsWith('recovery-')}))
vi.mock('./account-security',()=>({accountError:()=> 'Safe verification error'}))
vi.mock('@/lib/supabase',()=>({clearBrowserSession:mocks.clear,createRecoveryClient:()=>({auth:{setSession:mocks.session,verifyOtp:mocks.otp,getUser:mocks.user,mfa:{getAuthenticatorAssuranceLevel:mocks.assurance,challengeAndVerify:mocks.verify},updateUser:mocks.update,signOut:mocks.signOut}})}))
const account={id:'account-a',factors:[] as unknown[]}
beforeEach(()=>{
 vi.resetModules();vi.resetAllMocks()
 mocks.callback.mockReturnValue({access_token:'recovery-access',refresh_token:'recovery-refresh'})
 mocks.session.mockResolvedValue({data:{session:{access_token:'recovery-access',user:account}},error:null})
 mocks.otp.mockImplementation(mocks.session)
 mocks.user.mockResolvedValue({data:{user:account},error:null})
 mocks.assurance.mockResolvedValue({data:{currentLevel:'aal1'},error:null})
 mocks.verify.mockResolvedValue({error:null});mocks.update.mockResolvedValue({error:null});mocks.signOut.mockResolvedValue({error:null})
})
describe('isolated password recovery',()=>{
 it('refuses normal login tokens even when a URL labels them recovery',async()=>{
  mocks.callback.mockReturnValue({access_token:'normal-access',refresh_token:'normal-refresh'})
  const recovery=await import('./password-recovery');await recovery.openPasswordRecovery()
  expect(recovery.recoveryState.status).toBe('invalid');expect(mocks.session).not.toHaveBeenCalled()
  expect((await recovery.resetRecoveredPassword('a-new-password-12')).success).toBe(false);expect(mocks.update).not.toHaveBeenCalled()
 })
 it('requires a server-verified user matching the recovery session',async()=>{
  mocks.user.mockResolvedValue({data:{user:{id:'account-b'}},error:null})
  const recovery=await import('./password-recovery');await recovery.openPasswordRecovery()
  expect(recovery.recoveryState.status).toBe('invalid');expect(mocks.update).not.toHaveBeenCalled()
 })
 it('rechecks account identity immediately before changing a password',async()=>{
  const recovery=await import('./password-recovery');await recovery.openPasswordRecovery()
  mocks.user.mockResolvedValue({data:{user:{id:'account-b'}},error:null})
  expect((await recovery.resetRecoveredPassword('a-new-password-12')).success).toBe(false);expect(mocks.update).not.toHaveBeenCalled()
 })
 it('requires the existing verified authenticator and denies a failed challenge',async()=>{
  mocks.user.mockResolvedValue({data:{user:{...account,factors:[{id:'factor-a',factor_type:'totp',status:'verified'}]}},error:null})
  const recovery=await import('./password-recovery');await recovery.openPasswordRecovery()
  expect(recovery.recoveryState.requiresMfa).toBe(true)
  expect((await recovery.resetRecoveredPassword('a-new-password-12','other-factor','123456')).success).toBe(false)
  mocks.verify.mockResolvedValue({error:{code:'mfa_verification_failed'}})
  expect((await recovery.resetRecoveredPassword('a-new-password-12','factor-a','123456')).success).toBe(false)
  expect(mocks.update).not.toHaveBeenCalled()
 })
 it('updates only the isolated verified account and discards recovery after success',async()=>{
  const recovery=await import('./password-recovery');await recovery.openPasswordRecovery()
  expect((await recovery.resetRecoveredPassword('a-new-password-12')).success).toBe(true)
  expect(mocks.update).toHaveBeenCalledTimes(1);expect(mocks.update).toHaveBeenCalledWith({password:'a-new-password-12'})
  expect(mocks.signOut).toHaveBeenCalledWith({scope:'global'});expect(recovery.recoveryState.status).toBe('complete')
  expect((await recovery.resetRecoveredPassword('another-password-12')).success).toBe(false)
 })
 it('cancellation leaves no reset capability and does not promote a session',async()=>{
  const recovery=await import('./password-recovery');await recovery.openPasswordRecovery();await recovery.cancelPasswordRecovery()
  expect(recovery.recoveryState.status).toBe('idle');expect((await recovery.resetRecoveredPassword('a-new-password-12')).success).toBe(false)
  expect(mocks.signOut).toHaveBeenCalledWith({scope:'local'});expect(mocks.update).not.toHaveBeenCalled()
 })
})

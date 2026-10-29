import { reactive } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { createRecoveryClient, clearBrowserSession } from '@/lib/supabase'
import { accountError } from './account-security'
import { isRecoveryAccessToken, takeRecoveryCallback, type RecoveryCallback } from './recovery-boot'

const inactive = 'This reset link is missing, expired, or already used. Request a new password reset email.'
export const recoveryState = reactive({ status: 'idle' as 'idle'|'checking'|'ready'|'invalid'|'complete', error: '', canRetry:false, requiresMfa: false, factors: [] as {id:string;name:string}[] })
let client: ReturnType<typeof createRecoveryClient> | undefined
let accountId = ''
let opening: Promise<void> | undefined
let pendingCallback: RecoveryCallback | null = null
const invalidAuth = (error: {status?:number;code?:string} | null) => !!error && ([400,401,403].includes(error.status || 0) || ['otp_expired','bad_jwt','session_not_found','refresh_token_not_found'].includes(error.code || ''))

export function openPasswordRecovery(stored?: Session) {
  if(recoveryState.status==='ready')return Promise.resolve()
  if (opening) return opening
  opening = (async () => {
    recoveryState.status = 'checking'
    recoveryState.error = ''; recoveryState.canRetry = false
    let permanent = false
    try {
      const callback = stored ? {access_token:stored.access_token,refresh_token:stored.refresh_token} : pendingCallback || takeRecoveryCallback()
      if (!callback || 'invalid' in callback) {permanent=true;throw new Error(inactive)}
      pendingCallback = callback
      client = createRecoveryClient()
      const result = 'token_hash' in callback
        ? await client.auth.verifyOtp({token_hash:callback.token_hash,type:'recovery'})
        : isRecoveryAccessToken(callback.access_token,!stored)
          ? await client.auth.setSession(callback)
          : null
      if (!result || result.error || !result.data.session || !isRecoveryAccessToken(result.data.session.access_token,!stored)) {permanent=!result||!result.error||invalidAuth(result.error);throw new Error(inactive)}
      pendingCallback = {access_token:result.data.session.access_token,refresh_token:result.data.session.refresh_token}
      const verified = await client.auth.getUser()
      if (verified.error || !verified.data.user || verified.data.user.id !== result.data.session.user.id) {permanent=!verified.error||invalidAuth(verified.error);throw new Error(inactive)}
      // Implicit email recovery is issued as OTP by Supabase. Bind its verified
      // session ID to recovery-only database access before showing the form.
      const restricted = await client.rpc('restrict_password_recovery_session')
      if(restricted.error || restricted.data !== true)throw new Error('Recovery isolation unavailable')
      accountId = verified.data.user.id
      recoveryState.factors = (verified.data.user.factors || []).filter(f => f.factor_type === 'totp' && f.status === 'verified').map(f => ({id:f.id,name:f.friendly_name || 'Authenticator app'}))
      const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel()
      if (assurance.error) throw new Error(inactive)
      recoveryState.requiresMfa = recoveryState.factors.length > 0 && assurance.data.currentLevel !== 'aal2'
      recoveryState.status = 'ready'
      pendingCallback = null
    } catch {
      client = undefined; accountId = ''; recoveryState.status = 'invalid'; recoveryState.canRetry = !permanent
      recoveryState.error = permanent ? inactive : 'We could not verify this reset link right now. Please try again.'
    } finally { clearBrowserSession() }
  })()
  void opening.then(()=>{opening=undefined})
  return opening
}

export async function resetRecoveredPassword(password: string, factorId = '', code = '') {
  if (recoveryState.status !== 'ready' || !client || !accountId) return {success:false,error:inactive}
  if (password.length < 12 || password.length > 128) return {success:false,error:'Use a password between 12 and 128 characters.'}
  try {
    const verified = await client.auth.getUser()
    if (verified.error || verified.data.user?.id !== accountId) return {success:false,error:inactive}
    if (recoveryState.requiresMfa) {
      if (!recoveryState.factors.some(f => f.id === factorId) || !/^\d{6}$/.test(code)) return {success:false,error:'Enter the six-digit code from your authenticator app.'}
      const check = await client.auth.mfa.challengeAndVerify({factorId,code})
      if (check.error) return {success:false,error:accountError(check.error,'That authenticator code could not be verified.')}
      recoveryState.requiresMfa = false
    }
    const {error} = await client.auth.updateUser({password})
    if (error) return {success:false,error:accountError(error,'Your password could not be updated. Request a fresh reset link and try again.')}
    // No recovery session is promoted into an account login, including on sign-out failure.
    recoveryState.status = 'complete'
    try { await client.auth.signOut({scope:'global'}) } catch { /* The successful password change still stands. */ }
    client = undefined; accountId = ''; pendingCallback = null; clearBrowserSession()
    return {success:true}
  } catch { return {success:false,error:'Your password could not be updated. Please try again.'} }
}

export async function cancelPasswordRecovery() {
  const previous = client
  client = undefined; accountId = ''; pendingCallback = null; recoveryState.status = 'idle'; recoveryState.error = ''; recoveryState.canRetry = false; recoveryState.factors = []; recoveryState.requiresMfa = false
  clearBrowserSession()
  try { await previous?.auth.signOut({scope:'local'}) } catch { /* In-memory credentials have already been discarded. */ }
}

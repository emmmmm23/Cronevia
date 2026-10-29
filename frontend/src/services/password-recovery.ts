import { reactive } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { createRecoveryClient, clearBrowserSession } from '@/lib/supabase'
import { accountError } from './account-security'
import { isRecoveryAccessToken, takeRecoveryCallback } from './recovery-boot'

const inactive = 'This reset link is missing, expired, or already used. Request a new password reset email.'
export const recoveryState = reactive({ status: 'idle' as 'idle'|'checking'|'ready'|'invalid'|'complete', error: '', requiresMfa: false, factors: [] as {id:string;name:string}[] })
let client: ReturnType<typeof createRecoveryClient> | undefined
let accountId = ''
let opening: Promise<void> | undefined

export function openPasswordRecovery(stored?: Session) {
  if (opening) return opening
  opening = (async () => {
    recoveryState.status = 'checking'
    try {
      const callback = stored ? {access_token:stored.access_token,refresh_token:stored.refresh_token} : takeRecoveryCallback()
      if (!callback || 'invalid' in callback) throw new Error(inactive)
      client = createRecoveryClient()
      const result = 'token_hash' in callback
        ? await client.auth.verifyOtp({token_hash:callback.token_hash,type:'recovery'})
        : isRecoveryAccessToken(callback.access_token)
          ? await client.auth.setSession(callback)
          : null
      if (!result || result.error || !result.data.session || !isRecoveryAccessToken(result.data.session.access_token)) throw new Error(inactive)
      const verified = await client.auth.getUser()
      if (verified.error || !verified.data.user || verified.data.user.id !== result.data.session.user.id) throw new Error(inactive)
      accountId = verified.data.user.id
      recoveryState.factors = (verified.data.user.factors || []).filter(f => f.factor_type === 'totp' && f.status === 'verified').map(f => ({id:f.id,name:f.friendly_name || 'Authenticator app'}))
      const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel()
      if (assurance.error) throw new Error(inactive)
      recoveryState.requiresMfa = recoveryState.factors.length > 0 && assurance.data.currentLevel !== 'aal2'
      recoveryState.status = 'ready'
    } catch {
      client = undefined; accountId = ''; recoveryState.status = 'invalid'; recoveryState.error = inactive
    } finally { clearBrowserSession() }
  })()
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
    client = undefined; accountId = ''; clearBrowserSession()
    return {success:true}
  } catch { return {success:false,error:'Your password could not be updated. Please try again.'} }
}

export async function cancelPasswordRecovery() {
  const previous = client
  client = undefined; accountId = ''; recoveryState.status = 'idle'; recoveryState.error = ''; recoveryState.factors = []; recoveryState.requiresMfa = false
  clearBrowserSession()
  try { await previous?.auth.signOut({scope:'local'}) } catch { /* In-memory credentials have already been discarded. */ }
}

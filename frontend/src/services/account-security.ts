import { supabase, verifyCurrentPassword } from '@/lib/supabase'

export function safeReturnPath(value: unknown, fallback = '/') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return fallback
  const url = new URL(value, window.location.origin)
  // Never promote an implicit/PKCE callback credential into a redirect query.
  for(const key of ['access_token','refresh_token','token_hash','provider_token','provider_refresh_token','code','error_description','error_code'])url.searchParams.delete(key)
  if(/(?:access_token|refresh_token|token_hash|provider_token|error_description|invite)=/i.test(url.hash))url.hash=''
  return url.origin === window.location.origin && !/^\/(login|register|verify-2fa)(\/|$)/.test(url.pathname)
    ? url.pathname + url.search + url.hash : fallback
}
export function accountError(error: unknown, fallback = 'That could not be completed. Please try again.') {
  const e = error as { code?: string; status?: number }
  if (e?.status === 429 || e?.code === 'over_request_rate_limit' || e?.code === 'over_email_send_rate_limit') return 'Too many attempts. Please wait a moment and try again.'
  if (e?.code === 'mfa_verification_failed' || e?.code === 'mfa_challenge_expired') return 'That code could not be verified. Use the latest code from your authenticator app.'
  if (e?.code === 'reauthentication_needed' || e?.code === 'reauthentication_not_valid') return 'Please request a new email verification code and try again.'
  if (e?.code === 'weak_password') return 'Choose a stronger password of at least 12 characters.'
  return fallback
}
export async function verifiedFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw error
  return data.totp.filter(f => f.status === 'verified')
}
export async function verifyFactor(factorId: string, code: string) {
  if (!/^\d{6}$/.test(code)) throw new Error('Enter the six-digit code from your authenticator app.')
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
  if (error) throw error
}
export async function changeAccountPassword(password: string, current: string, factorId = '', code = '', nonce = '') {
  if (password.length < 12 || password.length > 128) throw new Error('Use a password between 12 and 128 characters.')
  await verifyCurrentPassword(current)
  const factors = await verifiedFactors()
  if (factors.length) {
    if (!factors.some(f => f.id === factorId)) throw new Error('Choose your authenticator to continue.')
    await verifyFactor(factorId, code)
  }
  const { error } = await supabase.auth.updateUser({ password, current_password: current, ...(nonce ? { nonce } : {}) })
  if (error) throw error
  // Revoke other refresh sessions after a successful password change. Existing access
  // JWTs last until expiry; use a short hosted JWT lifetime for prompt invalidation.
  const result = await supabase.auth.signOut({ scope: 'others' })
  return { otherSessionsRevoked: !result.error }
}

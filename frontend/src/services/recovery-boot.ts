// Run before the main Auth client: recovery credentials never become an app login.
export const recoveryPath = '/reset-password'
export type RecoveryCallback = { access_token: string; refresh_token: string } | { token_hash: string } | { invalid: true }

export function readRecoveryCallback(url: URL): RecoveryCallback | null {
  const hash = new URLSearchParams(url.hash.slice(1))
  const params = hash.get('type') === 'recovery' ? hash : url.searchParams
  const recovery = params.get('type') === 'recovery'
  const resetCallback = url.pathname === recoveryPath && ['access_token','refresh_token','token_hash','code','error','error_code'].some(key => hash.has(key) || url.searchParams.has(key))
  // Supabase can fall back to Site URL when the requested reset URL is not allowed.
  if (!recovery && !resetCallback) return null
  const source = hash.has('access_token') || hash.has('error') ? hash : params
  if (source.has('error') || source.has('error_code')) return { invalid: true }
  if (recovery && source.get('access_token') && source.get('refresh_token')) return {
    access_token: source.get('access_token')!, refresh_token: source.get('refresh_token')!,
  }
  if (recovery && source.get('token_hash')) return { token_hash: source.get('token_hash')! }
  return { invalid: true }
}

export function isRecoveryAccessToken(token: string, allowEmailOtp = false): boolean {
  try {
    const part = token.split('.')[1]!
    const claims = JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/')))
    return Array.isArray(claims.amr) && claims.amr.some((entry: unknown) => {
      const method = typeof entry === 'string' ? entry : (entry as {method?:string}|null)?.method
      return method === 'recovery' || (allowEmailOtp && method === 'otp')
    })
  } catch { return false }
}

let callback = readRecoveryCallback(new URL(window.location.href))
export const hasRecoveryCallback = callback !== null
if (hasRecoveryCallback) window.history.replaceState(window.history.state, '', recoveryPath)
export function takeRecoveryCallback() { const value = callback; callback = null; return value }

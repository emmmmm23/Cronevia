import { validCoordinates } from '@/types/destination'
import { supabase } from '@/lib/supabase'
export interface Place { name: string; latitude: number; longitude: number }
// Endpoint contract: GET ?q=... or ?lat=...&lon=... returns Place[].
export const placeProvider = import.meta.env.VITE_PLACE_PROVIDER_NAME || 'Geoapify'
let queue: Promise<unknown> = Promise.resolve(), lastRequest = 0
const cache = new Map<string, Place[]>()
export function lookupPlaces(params: Record<string, string>, signal: AbortSignal): Promise<Place[]> {
  const query = new URLSearchParams(params).toString()
  const run = async () => {
    signal.throwIfAborted()
    if (cache.has(query)) return cache.get(query)!
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 1100 - (Date.now() - lastRequest))))
    signal.throwIfAborted(); lastRequest = Date.now()
    const controller = new AbortController(), abort = () => controller.abort()
    signal.addEventListener('abort', abort, { once: true })
    const timeout = setTimeout(abort, 12000)
    try {
      const endpoint = import.meta.env.VITE_PLACES_ENDPOINT || '/api/places'
      const headers: Record<string,string> = {}
      // Never forward the app's access token to an external provider.
      if (new URL(endpoint, window.location.origin).origin === window.location.origin) {
        const { data } = await supabase.auth.getSession()
        if (data.session) headers.Authorization = 'Bearer ' + data.session.access_token
      }
      signal.throwIfAborted()
      const response = await fetch(endpoint + '?' + query, { signal: controller.signal, headers })
      if (!response.ok) throw new Error('Place lookup is unavailable. Please retry, use the map, or keep your text.')
      const data: unknown = await response.json()
      if (!Array.isArray(data)) throw new Error('Place lookup is not configured. You can keep your text or choose coordinates.')
      const places = data.filter((p): p is Place => typeof p?.name === 'string' && validCoordinates(p.latitude, p.longitude)).slice(0, 6)
      if (cache.size >= 50) cache.clear()
      cache.set(query, places)
      return places
    } finally { clearTimeout(timeout); signal.removeEventListener('abort', abort) }
  }
  const result = queue.then(run, run); queue = result.catch(() => undefined); return result
}
export function locateOnce(signal: AbortSignal): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext) return reject(new Error('Current location requires HTTPS or localhost.'))
    if (!navigator.geolocation) return reject(new Error('This browser does not support current location.'))
    if (signal.aborted) return reject(new DOMException('Cancelled', 'AbortError'))
    let done = false
    const finish = (error?: Error, position?: GeolocationPosition) => {
      if (done) return; done = true; clearTimeout(timer); signal.removeEventListener('abort', abort)
      if (error) reject(error); else resolve(position!)
    }
    const abort = () => finish(new DOMException('Cancelled', 'AbortError'))
    const timer = setTimeout(() => finish(new Error('Location timed out. Please retry or choose on the map.')), 12000)
    signal.addEventListener('abort', abort, { once: true })
    navigator.geolocation.getCurrentPosition(p => finish(undefined, p), e => finish(new Error(e.code === 1 ? 'Location permission was denied. You can choose on the map.' : e.code === 3 ? 'Location timed out. Please retry or choose on the map.' : 'Your position is unavailable. Please retry or choose on the map.')), { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 })
  })
}

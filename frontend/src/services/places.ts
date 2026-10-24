import { validCoordinates } from '@/types/destination'
import { supabase } from '@/lib/supabase'
import type {Place} from '@/types/discovery'
export type {Place} from '@/types/discovery'
// Endpoint contract: GET ?q=... or ?lat=...&lon=... returns Place[].
export const placeProvider = import.meta.env.VITE_PLACE_PROVIDER_NAME || 'Geoapify'
let queue: Promise<unknown> = Promise.resolve(), lastRequest = 0
const cache = new Map<string, {places:Place[];expires:number}>()
export function lookupPlaces(params: Record<string, string>, signal: AbortSignal): Promise<Place[]> {
  const query = new URLSearchParams(params).toString()
  const run = async () => {
    signal.throwIfAborted()
    const cached=cache.get(query)
    if (cached && cached.expires>Date.now()) return cached.places
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
      const places:Place[] = data.filter(p => typeof p?.name === 'string' && validCoordinates(p.latitude, p.longitude)).slice(0, params.mode==='nearby'?48:6).map(p=>({
        name:p.name.slice(0,255),latitude:p.latitude,longitude:p.longitude,
        address:typeof p.address==='string'?p.address.slice(0,500):undefined,
        countryCode:typeof p.countryCode==='string'?p.countryCode.toLowerCase():undefined,
        provider:typeof p.provider==='string'?p.provider.slice(0,40):undefined,
        providerId:typeof p.providerId==='string'?p.providerId.slice(0,2048):undefined,
        categories:Array.isArray(p.categories)?p.categories.filter((c:unknown)=>typeof c==='string'):[],
        category:['attractions','food','nature','culture'].includes(p.category)?p.category:'attractions',
        openingHours:typeof p.openingHours==='string'?p.openingHours:undefined,
        accessibility:['yes','no','limited'].includes(p.accessibility)?p.accessibility:undefined,
        price:p.price&&['low','medium','high'].includes(p.price.level)&&typeof p.price.text==='string'?{level:p.price.level,text:p.price.text}:undefined,
        visitMinutes:Number.isFinite(p.visitMinutes)&&p.visitMinutes>0&&p.visitMinutes<=2880?p.visitMinutes:undefined,
      }))
      if (cache.size >= 50) cache.clear()
      cache.set(query, {places,expires:Date.now()+300000})
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

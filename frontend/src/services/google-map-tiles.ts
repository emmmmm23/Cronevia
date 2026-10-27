import type { IControl, Map, RasterTileSource, StyleSpecification } from 'maplibre-gl'
import logo from '@/assets/google-maps-logo.svg'

const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
export const usesGoogleMaps = !!key
type Session = { session: string; expiry: string; tileWidth: number }
let current: Session | undefined
let pending: Promise<Session> | undefined

export class GoogleMapSetupError extends Error {}
export function mapSetupMessage(error: unknown, fallback: string) {
  return error instanceof GoogleMapSetupError ? error.message : fallback
}

async function session(): Promise<Session> {
  if (current && Number(current.expiry) * 1000 > Date.now() + 60000) return current
  if (pending) return pending
  pending = (async () => {
    const response = await fetch(`https://tile.googleapis.com/v1/createSession?key=${encodeURIComponent(key!)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapType: 'roadmap', language: 'en-US', region: 'PH' }),
      signal: AbortSignal.timeout(12000),
    })
    if (!response.ok) throw new GoogleMapSetupError('Google Maps is unavailable. Check the Map Tiles API, billing, and key settings. Search and manual planning remain available.')
    const data = await response.json() as Session
    if (!data.session || !Number.isFinite(Number(data.expiry)) || !data.tileWidth) throw new GoogleMapSetupError('Google Maps could not start. Please try again.')
    current = data
    return data
  })()
  try { return await pending } finally { pending = undefined }
}

function tiles(data: Session) {
  return [`https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${encodeURIComponent(data.session)}&key=${encodeURIComponent(key!)}`]
}

export async function googleMapStyle(): Promise<StyleSpecification> {
  const data = await session()
  return { version: 8, sources: { basemap: { type: 'raster', tiles: tiles(data), tileSize: data.tileWidth, maxzoom: 22 } }, layers: [{ id: 'basemap', type: 'raster', source: 'basemap', layout: { visibility: 'none' } }] }
}

// Each map owns its viewport requests, expiry timer, and attribution control.
export function addGoogleMapBranding(map: Map) {
  let disposed = false, sequence = 0
  let request: AbortController | undefined, timer: ReturnType<typeof setTimeout> | undefined
  let copyright: HTMLDivElement
  let element: HTMLDivElement
  const update = async () => {
    const version = ++sequence
    request?.abort()
    const controller = request = new AbortController()
    try {
      const data = await session()
      if (disposed || version !== sequence) return
      const bounds = map.getBounds()
      const longitude = (value: number) => ((value + 180) % 360 + 360) % 360 - 180
      const params = new URLSearchParams({ session: data.session, key: key!, zoom: String(Math.max(0, Math.floor(map.getZoom()))), north: String(Math.min(90, bounds.getNorth())), south: String(Math.max(-90, bounds.getSouth())), east: String(longitude(bounds.getEast())), west: String(longitude(bounds.getWest())) })
      const response = await fetch(`https://tile.googleapis.com/tile/v1/viewport?${params}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]) })
      if (!response.ok) throw new Error('Viewport attribution unavailable')
      const metadata = await response.json()
      if (typeof metadata.copyright !== 'string') throw new Error('Missing attribution')
      if (disposed || version !== sequence) return
      copyright.textContent = metadata.copyright
      map.setLayoutProperty('basemap', 'visibility', 'visible')
    } catch {
      if (!disposed && version === sequence) {
        // Keep pins and manual entry, but do not show tiles without their required credits.
        if (map.getLayer('basemap')) map.setLayoutProperty('basemap', 'visibility', 'none')
        copyright.textContent = 'Google Maps credits unavailable. Move the map to retry.'
      }
    }
  }
  const renew = () => {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      try {
        const data = await session()
        if (disposed) return
        ;(map.getSource('basemap') as RasterTileSource).setTiles(tiles(data))
        await update()
      } catch { if (!disposed && map.getLayer('basemap')) map.setLayoutProperty('basemap', 'visibility', 'none') }
      if (!disposed) renew()
    }, Math.min(2147483647, Math.max(30000, Number(current?.expiry || 0) * 1000 - Date.now() - 30000)))
  }
  const control: IControl = {
    onAdd() {
      element = document.createElement('div')
      element.className = 'maplibregl-ctrl'
      element.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;max-width:calc(100vw - 80px);gap:5px;pointer-events:auto'
      const link = document.createElement('a')
      link.href = 'https://maps.google.com/'
      link.target = '_blank'; link.rel = 'noopener noreferrer'
      link.style.cssText = 'display:block;padding:10px 10px 5px;background:white;border-radius:3px'
      const image = document.createElement('img')
      image.src = logo; image.alt = 'Google Maps'; image.height = 18
      image.style.cssText = 'height:18px;width:auto;max-width:none'
      link.append(image)
      copyright = document.createElement('div')
      copyright.style.cssText = 'max-width:100%;font:11px/1.5 Arial,sans-serif;color:#333;background:#fff;padding:3px 6px;white-space:normal;overflow-wrap:anywhere'
      copyright.textContent = 'Google Maps'
      element.append(link, copyright)
      map.on('load', update); map.on('moveend', update)
      renew()
      return element
    },
    onRemove() {
      disposed = true; sequence++; request?.abort(); clearTimeout(timer)
      map.off('load', update); map.off('moveend', update)
      element?.remove()
    },
  }
  map.addControl(control, 'bottom-left')
}

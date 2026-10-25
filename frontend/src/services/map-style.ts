import type { IControl, Map, StyleSpecification } from 'maplibre-gl'
import mapboxLogo from '@/assets/mapbox-logo.svg'

const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim()
export const usesMapbox = !!token
const mapboxAttribution = '© <a href="https://www.mapbox.com/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> <a href="https://apps.mapbox.com/feedback/">Improve this map</a>'

export function mapStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      basemap: {
        type: 'raster',
        tiles: [token
          ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}?access_token=${encodeURIComponent(token)}`
          : import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: token ? 512 : 256,
        maxzoom: token ? 22 : 19,
        attribution: token ? mapboxAttribution : import.meta.env.VITE_MAP_ATTRIBUTION || '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    },
    layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
  }
}

export function addMapBranding(map: Map) {
  if (!usesMapbox) return
  let element: HTMLAnchorElement | undefined
  const control: IControl = {
    onAdd() {
      element = document.createElement('a')
      element.className = 'maplibregl-ctrl'
      element.href = 'https://www.mapbox.com/'
      element.target = '_blank'
      element.rel = 'noopener noreferrer'
      element.setAttribute('aria-label', 'Mapbox')
      const logo = document.createElement('img')
      logo.src = mapboxLogo
      logo.alt = 'Mapbox'
      logo.width = 88
      logo.height = 23
      element.append(logo)
      return element
    },
    onRemove() { element?.remove() },
  }
  map.addControl(control, 'bottom-left')
}

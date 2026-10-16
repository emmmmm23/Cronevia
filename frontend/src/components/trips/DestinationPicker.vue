<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import type * as MapLibre from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { validCoordinates, type DestinationFields, type DestinationSource } from '@/types/destination'
import { lookupPlaces, locateOnce, placeProvider, type Place } from '@/services/places'
const props = defineProps<{ destination: string; location: DestinationFields; disabled?: boolean }>()
const inputId = 'destination-' + crypto.randomUUID()
const emit = defineEmits<{ change: [name: string, location: DestinationFields] }>()
const empty = () => ({ destination_latitude: null, destination_longitude: null, destination_source: null })
const input = ref<HTMLInputElement>(), dialog = ref<HTMLDialogElement>(), mapElement = ref<HTMLDivElement>()
const results = ref<Place[]>([]), searchState = ref(''), searchBusy = ref(false)
const open = ref(false), label = ref(''), latitude = ref(''), longitude = ref(''), source = ref<DestinationSource>('map')
const notice = ref(''), mapError = ref(''), locating = ref(false), accuracy = ref<number | null>(null)
let searchRequest: AbortController | undefined, draftRequest: AbortController | undefined
let maplibregl: typeof MapLibre.default
let map: MapLibre.Map | undefined, marker: MapLibre.Marker | undefined, previous: HTMLElement | null = null
let generation = 0, searchGeneration = 0, mapGeneration = 0, mapTimer: ReturnType<typeof setTimeout> | undefined
const pin = computed(() => validCoordinates(props.location.destination_latitude, props.location.destination_longitude))
const draftValid = computed(() => latitude.value.trim() !== '' && longitude.value.trim() !== '' && validCoordinates(Number(latitude.value), Number(longitude.value)))
function invalidateSearch() { searchRequest?.abort(); searchGeneration++; searchBusy.value = false; results.value = []; searchState.value = '' }
function edit(text: string) { invalidateSearch(); emit('change', text, empty()) }
async function search() {
  if (!props.destination.trim() || props.disabled) return
  invalidateSearch(); const token = searchGeneration; const controller = searchRequest = new AbortController()
  searchBusy.value = true; searchState.value = 'Searching places…'
  try {
    const places = await lookupPlaces({ q: props.destination.trim() }, controller.signal)
    if (token !== searchGeneration) return
    results.value = places; searchState.value = places.length ? 'Choose a destination below.' : 'No places found. Try a fuller address, choose on the map, or keep your text.'
  } catch { if (token === searchGeneration) searchState.value = 'Place lookup is unavailable. Retry Search, choose on the map, or keep your text.' }
  finally { if (token === searchGeneration) searchBusy.value = false }
}
function select(place: Place) { invalidateSearch(); emit('change', place.name.slice(0, 255), { destination_latitude: place.latitude, destination_longitude: place.longitude, destination_source: 'search' }); input.value?.focus() }
function syncMarker(center = false) {
  if (!map || !draftValid.value) { marker?.remove(); marker = undefined; return }
  const point: [number, number] = [Number(longitude.value), Number(latitude.value)]
  if (!marker) { marker = new maplibregl.Marker({ color: '#74283c', draggable: true }).setLngLat(point).addTo(map); marker.on('dragend', () => { const p = marker!.getLngLat(); setPoint(p.lat, p.lng) }) }
  else marker.setLngLat(point)
  if (center) map.jumpTo({ center: point, zoom: 12 })
}
function setPoint(lat: number, lng: number) {
  draftRequest?.abort(); generation++; locating.value = false; accuracy.value = null; notice.value = ''
  latitude.value = lat.toFixed(6); longitude.value = (((lng + 180) % 360 + 360) % 360 - 180).toFixed(6); source.value = 'map'; syncMarker()
}
function coordinatesEdited() { draftRequest?.abort(); generation++; locating.value = false; accuracy.value = null; source.value = 'map'; notice.value = ''; syncMarker(true) }
async function show(gps = false) {
  if (props.disabled) return
  invalidateSearch(); previous = document.activeElement as HTMLElement; open.value = true
  label.value = props.destination; latitude.value = pin.value ? String(props.location.destination_latitude) : ''; longitude.value = pin.value ? String(props.location.destination_longitude) : ''
  source.value = props.location.destination_source || 'map'; notice.value = ''; mapError.value = ''; accuracy.value = null
  await nextTick(); dialog.value?.showModal()
  const opening = ++mapGeneration
  try {
    maplibregl = (await import('maplibre-gl')).default
    if (!open.value || opening !== mapGeneration) return
    map = new maplibregl.Map({ container: mapElement.value!, center: draftValid.value ? [Number(longitude.value), Number(latitude.value)] : [0, 20], zoom: draftValid.value ? 10 : 1,
      style: { version: 8, sources: { paper: { type: 'raster', tiles: [import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19, attribution: import.meta.env.VITE_MAP_ATTRIBUTION || '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' } }, layers: [{ id: 'paper', type: 'raster', source: 'paper' }] } })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false })); map.on('click', e => setPoint(e.lngLat.lat, e.lngLat.lng))
    map.on('error', () => { mapError.value = 'Map tiles are unavailable. You can still enter coordinates below.' })
    mapTimer = setTimeout(() => { if (open.value) mapError.value = 'The map is taking longer than expected. Coordinate entry remains available.' }, 12000)
    map.on('load', () => { clearTimeout(mapTimer); map?.resize() }); syncMarker()
  } catch { mapError.value = 'This browser cannot display the map. Enter coordinates below or keep a text-only destination.' }
  if (gps && open.value && opening === mapGeneration) await gpsLocation()
}
async function gpsLocation() {
  draftRequest?.abort(); const token = ++generation, controller = draftRequest = new AbortController()
  locating.value = true; notice.value = 'Locating…'; accuracy.value = null
  try {
    const p = await locateOnce(controller.signal)
    if (!open.value || token !== generation) return
    if (!validCoordinates(p.coords.latitude, p.coords.longitude)) throw new Error('The device returned an invalid position. Try again.')
    latitude.value = String(p.coords.latitude); longitude.value = String(p.coords.longitude); source.value = 'gps'; label.value = ''
    accuracy.value = Number.isFinite(p.coords.accuracy) ? Math.round(p.coords.accuracy) : null; syncMarker(true)
    locating.value = false; notice.value = 'Pin ready. Looking up its name…'
    const originalLabel = label.value
    try {
      const places = await lookupPlaces({ lat: latitude.value, lon: longitude.value }, controller.signal)
      if (!open.value || token !== generation) return
      if (label.value === originalLabel && places[0]) label.value = places[0].name.slice(0, 255)
      notice.value = places.length ? 'Review this place before using it as your destination.' : 'No place name found. Your coordinates are kept; add a label.'
    } catch { if (open.value && token === generation) notice.value = 'Place name lookup failed. Your coordinates are kept; add a label.' }
  } catch (e) { if (open.value && token === generation) notice.value = (e as Error).message }
  finally { if (token === generation) locating.value = false }
}
function close() {
  open.value = false; generation++; mapGeneration++; draftRequest?.abort(); locating.value = false; clearTimeout(mapTimer)
  marker?.remove(); marker = undefined; map?.remove(); map = undefined; dialog.value?.close(); previous?.focus({ preventScroll: true })
}
function confirm() {
  if (!draftValid.value || !label.value.trim() || locating.value) return
  emit('change', label.value.trim(), { destination_latitude: Number(latitude.value), destination_longitude: Number(longitude.value), destination_source: source.value }); close()
}
onBeforeUnmount(() => { invalidateSearch(); close() })
</script>
<template>
  <div class="destination-picker">
    <label :for="inputId">Destination</label><div class="search-row"><input :id="inputId" ref="input" :value="destination" maxlength="255" placeholder="City, region, landmark, or address" :disabled="disabled" @input="edit(($event.target as HTMLInputElement).value)" @keydown.enter.prevent="search" /><button type="button" :disabled="disabled || searchBusy || !destination.trim()" @click="search">{{searchBusy ? 'Searching…' : 'Search'}}</button></div>
    <p role="status" aria-live="polite" class="hint">{{searchState}}</p>
    <ul v-if="results.length" class="results" aria-label="Destination search results"><li v-for="(place,index) in results" :key="index"><button type="button" @click="select(place)">{{place.name}}</button></li></ul>
    <div class="location-actions"><button type="button" :disabled="disabled" @click="show()">Choose on map</button><button type="button" :disabled="disabled" @click="show(true)">Use my current location</button></div>
    <div v-if="pin" class="pin-note"><span>Pin attached · {{location.destination_latitude?.toFixed(5)}}, {{location.destination_longitude?.toFixed(5)}}</span><button type="button" :disabled="disabled" @click="emit('change', destination, empty())">Remove pin</button></div>
    <p class="hint">A destination name is enough. Pins are optional.</p>
    <details class="location-disclosure"><summary>Search via {{placeProvider}} · location privacy</summary><p class="hint">Current location may be approximate; review it before choosing your destination. Search and GPS name lookup send the query or coordinates to {{placeProvider}}. <a href="https://www.geoapify.com/" target="_blank" rel="noopener">Place lookup</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a></p></details>
    <Teleport to="body"><dialog ref="dialog" class="destination-dialog" aria-label="Choose destination location" @cancel.prevent="close" @keydown.esc.stop>
      <header><h2>Find your destination</h2><button type="button" aria-label="Close location picker" @click="close">×</button></header>
      <div class="picker-body">
        <p class="hint">Pan and zoom, then tap to place a pin. Drag the pin to refine it. The starting view is not your current location.</p>
        <div ref="mapElement" class="destination-map" aria-label="Destination map" />
        <p v-if="mapError" role="status" class="hint">{{mapError}}</p>
        <button type="button" :disabled="locating" @click="gpsLocation">{{locating ? 'Locating…' : 'Use my current location'}}</button>
        <p role="status" aria-live="polite" class="hint">{{notice}}</p><p v-if="accuracy !== null" class="hint">Approximate GPS accuracy: {{accuracy}} metres.</p>
        <p class="hint">Current location may be approximate. Review the pin before confirming.</p>
        <label>Place label<input v-model="label" maxlength="255" placeholder="Name this destination" /></label>
        <div class="coordinates"><label>Latitude<input v-model="latitude" inputmode="decimal" placeholder="−90 to 90" @input="coordinatesEdited" /></label><label>Longitude<input v-model="longitude" inputmode="decimal" placeholder="−180 to 180" @input="coordinatesEdited" /></label></div>
        <p v-if="(latitude || longitude) && !draftValid" role="status" class="hint">Enter both coordinates: latitude −90 to 90, longitude −180 to 180.</p>
        <p class="hint">{{draftValid ? 'Review the pin and label, then confirm.' : 'No destination pin selected yet.'}}</p>
      </div>
      <footer><button type="button" @click="close">Cancel</button><button type="button" class="confirm" :disabled="!draftValid || !label.trim() || locating" @click="confirm">Use this location</button></footer>
    </dialog></Teleport>
  </div>
</template>
<style scoped>
.location-actions{margin-top:8px}
.location-disclosure summary{font-size:12px;color:#796f60;min-height:44px;cursor:pointer}.location-disclosure .hint{margin-top:0}
.destination-picker{min-width:0}.search-row{display:flex;gap:8px}.search-row input{min-width:0;flex:1}.location-actions{display:flex;flex-wrap:wrap;gap:8px}.hint{font-size:13px;line-height:1.5;color:#716b60;margin:8px 0;overflow-wrap:anywhere}.hint:empty{display:none}.results{list-style:none;padding:0;margin:8px 0;border:1px solid #d8d0c0;border-radius:12px;overflow:hidden;max-height:260px;overflow-y:auto}.results button{width:100%;text-align:left;border-radius:0;white-space:normal;overflow-wrap:anywhere}.pin-note{display:flex;align-items:center;flex-wrap:wrap;justify-content:space-between;gap:8px;background:#e8ede2;padding:8px 12px;border-radius:10px;font-size:13px;margin-top:10px}
button,input{font:inherit;min-height:44px;font-size:16px}button{cursor:pointer;padding:9px 12px;border:1px solid #d8d0c0;border-radius:9px;background:#faf6ed;color:#74283c}button:disabled{opacity:.55;cursor:default}button:focus-visible,input:focus-visible{outline:2px solid #74283c;outline-offset:3px}a{color:#74283c}label{display:block;font-size:14px;font-weight:600}input{box-sizing:border-box;width:100%;border:1px solid #d8d0c0;background:#fffdf7;color:#51493f;border-radius:8px;padding:10px;margin-top:5px}
.destination-dialog{box-sizing:border-box;position:fixed;inset:8dvh 0 auto;margin:auto;width:min(680px,calc(100% - 32px));max-width:100%;max-height:84dvh;padding:0;border:1px solid #d8d0c0;border-radius:18px;background:#faf6ed;color:#51493f;overflow:auto;overscroll-behavior:contain}.destination-dialog::backdrop{background:#2e282966}.destination-dialog header,.destination-dialog footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;background:#faf6ed;position:sticky;z-index:3}.destination-dialog header{top:0;border-bottom:1px solid #e2dbcd}.destination-dialog h2{font:26px Georgia,serif;margin:0}.destination-dialog header button{min-width:44px}.picker-body{padding:0 18px 12px}.destination-map{height:280px;margin:12px 0;border-radius:10px;overflow:hidden;background:#e8ede2;touch-action:none}.coordinates{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}.coordinates label{min-width:0}.destination-dialog footer{bottom:0;border-top:1px solid #e2dbcd;padding-bottom:max(12px,env(safe-area-inset-bottom))}.confirm{background:#74283c;color:#fffdf7}.destination-map :deep(.maplibregl-ctrl-group button){width:44px;height:44px}.destination-map :deep(.maplibregl-canvas):focus-visible{outline:3px solid #74283c}
@media(max-width:600px){.destination-dialog{inset:auto 0 var(--keyboard-inset,0px);width:100%;max-height:calc(var(--visual-height,100dvh) * .92);border-radius:18px 18px 0 0}.destination-map{height:220px}.destination-dialog h2{font-size:23px}.search-row button{padding-inline:10px}}
</style>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { fetchBuiltinAssets, fetchUserAssets, uploadStickerAsset } from '@/services/sticker.service'
import api from '@/services/api.service'
import { scrapbookError } from '@/services/scrapbook-errors'
import type { Media } from '@/types'
import { constrainElement, emptyLayout, validateScrapbook, type ScrapbookElement, type ScrapbookLayout, type PhotoFrame } from '@/types/scrapbook'

const props = withDefaults(defineProps<{ modelValue: ScrapbookLayout; title: string; text: string; viewMode?: boolean; userId?: string; entryId?: string | null; resource: 'journal' | 'memories'; media?: Media[]; disabled?: boolean }>(), { media: () => [] })
const emit = defineEmits<{ 'update:modelValue': [ScrapbookLayout]; 'update:title': [string]; 'update:text': [string]; 'dirty-change': [boolean]; 'busy-change': [boolean] }>()
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
const layout = ref<ScrapbookLayout>(clone(props.modelValue || emptyLayout()))
const decorate = ref(false), activePage = ref('page-left'), selectedId = ref<string | null>(null)
const showHelp = ref(false)
const tab = ref('library'), assetError = ref(''), photoError = ref('')
const builtins = ref<Awaited<ReturnType<typeof fetchBuiltinAssets>>>([])
const custom = ref<Awaited<ReturnType<typeof fetchUserAssets>>>([])
const urls = ref<Record<string,string>>({})
const history = ref<ScrapbookLayout[]>([clone(layout.value)]), cursor = ref(0)
const pending = ref<Record<string, { file: File; url: string; type: 'photo' | 'sticker'; status: 'pending' | 'uploading' | 'failed'; error?: string }>>({})
watch(pending, value => emit('busy-change', Object.values(value).some(p => p.status === 'uploading')), {deep:true})
const uploading = new Map<string, Promise<void>>()
const selected = computed(() => layout.value.pages.flatMap(p => p.elements).find(e => e.id === selectedId.value))
const selectedPage = computed(() => layout.value.pages.find(p => p.elements.some(e => e.id === selectedId.value)))
const canUndo = computed(() => cursor.value > 0), canRedo = computed(() => cursor.value < history.value.length - 1)
let baseline = JSON.stringify(layout.value)
let observer: ResizeObserver | undefined
const sheetWidth = ref(600)
const sheetRefs = new Map<string, HTMLElement>()
function sheetRef(id: string, el: unknown) { if (el instanceof HTMLElement) { sheetRefs.set(id, el); observer?.observe(el) } }
function publish() { emit('update:modelValue', clone(layout.value)); emit('dirty-change', JSON.stringify(layout.value) !== baseline) }
function commit() {
  if (JSON.stringify(history.value[cursor.value]) !== JSON.stringify(layout.value)) {
    history.value = history.value.slice(0,cursor.value + 1)
    history.value.push(clone(layout.value)); if (history.value.length > 60) history.value.shift()
    cursor.value = history.value.length - 1
  }
  publish()
}
watch(() => props.modelValue, value => {
  if (JSON.stringify(value) !== JSON.stringify(layout.value)) reset(value)
}, { deep: true })
watch(() => props.viewMode, () => { decorate.value = false; selectedId.value = null })
watch(() => props.media, media => { for (const m of media) urls.value[m.id] = m.file_path }, { immediate: true })
onMounted(async () => {
  observer = new ResizeObserver(entries => { if (entries[0]) sheetWidth.value = entries[0].contentRect.width })
  sheetRefs.forEach(el => observer!.observe(el))
  builtins.value = await fetchBuiltinAssets()
  builtins.value.forEach(a => urls.value[a.id] = a.url)
  await loadCustom()
})
async function loadCustom() {
  if (!props.userId) return
  try { const loaded = await fetchUserAssets(props.userId); custom.value = [...loaded,...custom.value.filter(a => !loaded.some(b => b.id === a.id))]; custom.value.forEach(a => urls.value[a.id] = a.url); assetError.value = '' }
  catch(e) { assetError.value = scrapbookError(e, 'stickers') }
}
function reset(value: ScrapbookLayout) {
  for (const id of Object.keys(pending.value)) if (!value.pages.some(p => p.elements.some(e => e.assetId === id))) delete pending.value[id]
  layout.value = clone(value); baseline = JSON.stringify(value); history.value = [clone(value)]; cursor.value = 0; selectedId.value = null
  emit('dirty-change', false)
}
function markSaved() { baseline = JSON.stringify(layout.value); emit('dirty-change', false) }
function undo() { if (!props.disabled && canUndo.value) { layout.value = clone(history.value[--cursor.value]); selectedId.value = null; publish() } }
function redo() { if (!props.disabled && canRedo.value) { layout.value = clone(history.value[++cursor.value]); selectedId.value = null; publish() } }
function add(type: 'sticker' | 'photo', assetId: string, ratio = 1) {
  if (props.disabled) return
  const page = layout.value.pages.find(p => p.id === activePage.value)!
  if (page.elements.length >= 100) { photoError.value = 'This page has reached 100 decorations.'; return }
  const e = constrainElement({ id: crypto.randomUUID(), type, assetId, x: .55, y: .55, width: type === 'photo' ? .38 : .2, aspectRatio: ratio, rotation: type === 'photo' ? -5 : 0, zIndex: Math.max(-1,...page.elements.map(e=>e.zIndex))+1, frame: 'plain' })
  page.elements.push(e); selectedId.value = e.id; commit()
}
function change(updates: Partial<ScrapbookElement>) {
  if (props.disabled) return
  if (!selected.value) return
  Object.assign(selected.value, constrainElement({ ...selected.value, ...updates })); commit()
}
function remove() {
  if (props.disabled) return
  if (!selectedPage.value) return
  selectedPage.value.elements = selectedPage.value.elements.filter(e => e.id !== selectedId.value); selectedId.value = null; commit()
}
function duplicate() {
  if (props.disabled) return
  if (!selected.value || !selectedPage.value || selectedPage.value.elements.length >= 100) return
  const copy = constrainElement({ ...selected.value, id: crypto.randomUUID(), x: selected.value.x + .04, y: selected.value.y + .04, zIndex: Math.max(-1,...selectedPage.value.elements.map(e=>e.zIndex))+1 })
  selectedPage.value.elements.push(copy); selectedId.value = copy.id; commit()
}
function layer(action: 'forward' | 'backward' | 'front' | 'back') {
  if (props.disabled) return
  if (!selected.value || !selectedPage.value) return
  const items = [...selectedPage.value.elements].sort((a,b) => a.zIndex - b.zIndex)
  const from = items.findIndex(e => e.id === selectedId.value)
  const to = action === 'front' ? items.length - 1 : action === 'back' ? 0 : Math.max(0,Math.min(items.length-1,from + (action === 'forward' ? 1 : -1)))
  items.splice(to,0,...items.splice(from,1)); items.forEach((e,i) => e.zIndex = i); commit()
}
function movePage() {
  if (props.disabled) return
  if (!selected.value || !selectedPage.value) return
  const source = selectedPage.value, target = layout.value.pages.find(p => p.id !== source.id)!
  if (target.elements.length >= 100) return
  const e = selected.value; source.elements = source.elements.filter(v => v.id !== e.id); e.zIndex = Math.max(-1,...target.elements.map(e=>e.zIndex))+1; target.elements.push(e); activePage.value = target.id; commit()
}
let gesture: { id: string; mode: string; start: ScrapbookElement; px: number; py: number; rect: DOMRect; angle: number; distance: number; target: HTMLElement; pointer: number } | null = null
function startGesture(event: PointerEvent, e: ScrapbookElement, page: string, mode = 'drag') {
  if (!decorate.value || props.viewMode || props.disabled || event.button !== 0) return
  event.preventDefault(); event.stopPropagation(); selectedId.value = e.id; activePage.value = page
  const rect = sheetRefs.get(page)!.getBoundingClientRect(), cx = rect.left + e.x * rect.width, cy = rect.top + e.y * rect.height
  const target = event.currentTarget as HTMLElement
  target.setPointerCapture(event.pointerId)
  gesture = { id: e.id, mode, start: {...e}, px: event.clientX, py: event.clientY, rect, angle: Math.atan2(event.clientY-cy,event.clientX-cx), distance: Math.hypot(event.clientX-cx,event.clientY-cy), target, pointer: event.pointerId }
}
function moveGesture(event: PointerEvent) {
  if (!gesture || !selected.value) return
  const g = gesture, rect = sheetRefs.get(activePage.value)!.getBoundingClientRect()
  const cx = rect.left + g.start.x*rect.width, cy = rect.top + g.start.y*rect.height
  let updates: Partial<ScrapbookElement> = {}
  if (g.mode === 'drag') updates = { x: g.start.x + (event.clientX-g.px + g.rect.left-rect.left)/rect.width, y: g.start.y + (event.clientY-g.py + g.rect.top-rect.top)/rect.height }
  if (g.mode === 'resize') updates.width = g.start.width * Math.hypot(event.clientX-cx,event.clientY-cy) / Math.max(1,g.distance)
  if (g.mode === 'rotate') updates.rotation = ((g.start.rotation+(Math.atan2(event.clientY-cy,event.clientX-cx)-g.angle)*180/Math.PI+540)%360)-180
  Object.assign(selected.value,constrainElement({...g.start,...updates}))
}
function endGesture() { if (gesture) { gesture = null; commit() } }
function keydown(e: KeyboardEvent) {
  if (!decorate.value || props.disabled || (e.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]')) return
  if (e.key === 'Escape') { if (gesture && selected.value) { Object.assign(selected.value,gesture.start); gesture = null } selectedId.value = null; return }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return }
  if (!selected.value) return
  const s = selected.value, step = e.shiftKey ? .02 : .005
  if (['Delete','Backspace','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','[',']','PageUp','PageDown'].includes(e.key)) e.preventDefault()
  if (['Delete','Backspace'].includes(e.key)) remove()
  if (e.key === 'ArrowLeft') change({x:s.x-step}); if (e.key === 'ArrowRight') change({x:s.x+step})
  if (e.key === 'ArrowUp') change({y:s.y-step}); if (e.key === 'ArrowDown') change({y:s.y+step})
  if (e.key === '+' || e.key === '=') change({width:s.width+.02}); if (e.key === '-') change({width:s.width-.02})
  if (e.key === '[' || e.key === ']') change({rotation:Math.max(-180,Math.min(180,s.rotation+(e.key === '[' ? -5 : 5)))})
  if (e.key === 'PageUp') layer(e.shiftKey ? 'front':'forward'); if (e.key === 'PageDown') layer(e.shiftKey ? 'back':'backward')
}
async function choosePhoto(event: Event) {
  if (props.disabled) return
  decorate.value = true
  const input = event.target as HTMLInputElement
  for (const file of Array.from(input.files || [])) {
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type) || file.size > 10485760) { photoError.value = 'Choose a JPG, PNG, WebP or GIF under 10 MB.'; continue }
    const id = `pending:${crypto.randomUUID()}`, url = URL.createObjectURL(file)
    pending.value[id] = {file,url,type:'photo',status:'pending'}; urls.value[id] = url
    const img = new Image(); img.src = url
    try { await img.decode(); add('photo',id,Math.max(.1,Math.min(10,img.naturalWidth/img.naturalHeight))); if (props.entryId) void uploadOne(id, props.entryId) }
    catch { pending.value[id].status = 'failed'; pending.value[id].error = 'Cannot decode this image.' }
  }
  input.value = ''
}
async function uploadOne(id: string, entryId: string): Promise<void> {
  if (uploading.has(id)) return uploading.get(id)
  const task = (async () => {
    const item = pending.value[id]; if (!item) return
    item.status = 'uploading'; item.error = undefined
    try {
      let asset: {id:string;url?:string}
      if (item.type === 'sticker') {
        const uploaded = await uploadStickerAsset(item.file, id.slice(8))
        asset = uploaded
        custom.value = [uploaded,...custom.value.filter(a => a.id !== id && a.id !== uploaded.id)]
      } else {
        const body = new FormData(); body.append('file',item.file); body.append('upload_id',id.slice(8))
        asset = (await api.post<{data:{id:string}}>(`/${props.resource}/${entryId}/media`,body)).data.data
      }
      urls.value[asset.id] = asset.url || item.url
      // Resolve current layout and every history snapshot, without changing any transforms.
      for (const state of [layout.value,...history.value]) for (const page of state.pages) for (const e of page.elements) if (e.assetId === id) e.assetId = asset.id
      delete pending.value[id]; publish()
    } catch(e) { item.status = 'failed'; item.error = scrapbookError(e, 'upload') }
  })()
  uploading.set(id,task); await task; uploading.delete(id)
}
async function prepareSave(entryId: string) {
  const refs = new Set(layout.value.pages.flatMap(p => p.elements.map(e => e.assetId)))
  await Promise.all([...refs].filter(id => pending.value[id]).map(id => uploadOne(id,entryId)))
  if (layout.value.pages.some(p => p.elements.some(e => e.assetId.startsWith('pending:')))) throw new Error('An upload failed. Retry it or remove its placement before saving.')
  return clone(validateScrapbook(layout.value))
}
async function chooseSticker(event: Event) {
  if (props.disabled) return
  const input = event.target as HTMLInputElement, file = input.files?.[0]; if (!file) return
  input.value = ''
  if (!['image/png','image/webp'].includes(file.type) || file.size > 5*1024*1024) {
    assetError.value = 'Choose a transparent PNG or WebP under 5 MB.'; return
  }
  const id = 'pending:' + crypto.randomUUID(), url = URL.createObjectURL(file)
  const image = new Image(); image.src = url
  try { await image.decode() } catch { URL.revokeObjectURL(url); assetError.value = 'This image couldn’t be opened. Please choose another file.'; return }
  pending.value[id] = {file,url,type:'sticker',status:'pending'}
  urls.value[id] = url
  custom.value.unshift({id,user_id:props.userId || null,storage_path:file.name,mime_type:file.type,width:image.naturalWidth,height:image.naturalHeight,category:'custom',created_at:new Date().toISOString(),url})
  add('sticker',id,Math.max(.1,Math.min(10,image.naturalWidth/image.naturalHeight)))
  assetError.value = ''
  void uploadOne(id, props.entryId || '')
}
async function placeMedia(m: Media) {
  const image = new Image(); image.src = m.file_path
  try { await image.decode(); add('photo',m.id,Math.max(.1,Math.min(10,image.naturalWidth/image.naturalHeight))) }
  catch { photoError.value = 'This photo could not be loaded. Reload the notebook to refresh its private link.' }
}
function style(e: ScrapbookElement) { return { left: `${e.x*100}%`,top:`${e.y*100}%`,width:`${e.width*100}%`,aspectRatio:String(e.aspectRatio),transform:`translate(-50%,-50%) rotate(${e.rotation}deg)`,zIndex:e.zIndex } }
function src(e: ScrapbookElement) { return urls.value[e.assetId] || (e.assetId.startsWith('builtin-') ? `/stickers-builtin/${e.assetId.slice(8)}` : '') }
onBeforeUnmount(() => { observer?.disconnect(); new Set(Object.values(urls.value).filter(u => u.startsWith('blob:'))).forEach(URL.revokeObjectURL) })
defineExpose({ prepareSave, markSaved, reset })
</script>


<template>
  <section class="scrapbook" tabindex="-1" @keydown="keydown">
    <div v-if="!viewMode" class="workbench">
      <div class="mode-switch" role="group" aria-label="Notebook mode">
        <button :disabled="disabled" :aria-pressed="!decorate" @click="decorate=false;selectedId=null">Write</button>
        <button :disabled="disabled" :aria-pressed="decorate" @click="decorate=true">Decorate</button>
      </div>
      <span class="mode-note">{{decorate ? 'Make this page your own.' : 'A moment to slow down.'}}</span>
      <div class="bench-actions">
        <template v-if="decorate"><button class="icon-button" aria-label="Undo" :disabled="!canUndo || disabled" @click="undo">↶</button><button class="icon-button" aria-label="Redo" :disabled="!canRedo || disabled" @click="redo">↷</button></template>
        <label class="upload-button photo-upload"><span aria-hidden="true">＋</span> Add photo<input aria-label="Upload photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" :disabled="disabled" multiple @change="choosePhoto" /></label>
        <button class="icon-button help-button" aria-label="Keyboard help" :aria-expanded="showHelp" @click="showHelp=!showHelp">?</button>
      </div>
    </div>
    <div v-if="showHelp && !viewMode" class="keyboard-help">
      <strong>A few helpful shortcuts</strong>
      <p>Arrow keys move · + / − resize · [ / ] rotate · Delete removes a placement · Ctrl/Cmd Z undoes · Shift Ctrl/Cmd Z redoes · Page Up/Down changes layers (Shift for front/back) · Escape clears selection.</p>
      <p>Your writing scrolls inside the paper. Choose Decorate to move anything covering it. Switch pages with the page selector or “Move to left/right page”.</p>
    </div>
    <p v-if="photoError" class="friendly-notice" role="alert">{{photoError}}</p>
    <div class="workspace" :class="{'with-tools':decorate && !viewMode}">
      <div class="book-area">
        <div class="spread" :class="{decorating:decorate && !viewMode}" :style="{'--sheet-scale':sheetWidth/600}">
          <article v-for="(page,index) in layout.pages" :key="page.id" :ref="el=>sheetRef(page.id,el)" class="paper" :class="{active:decorate && activePage===page.id,right:index===1}" :aria-label="index===0?'Left notebook page':'Right notebook page'" @pointerdown.self="activePage=page.id;selectedId=null">
            <div class="writing" @pointerdown="activePage=page.id;selectedId=null">
              <template v-if="index===0">
                <span class="eyebrow">{{resource==='journal'?'The everyday, remembered':'A memory to keep'}}</span>
                <h1 v-if="viewMode">{{title}}</h1><textarea v-else rows="1" aria-label="Title" class="title" :value="title" maxlength="255" :disabled="disabled" :readonly="decorate" :tabindex="decorate?-1:0" @input="emit('update:title',($event.target as HTMLInputElement).value)" placeholder="Today, in a few words…" />
                <div v-if="viewMode" class="story" tabindex="0" aria-label="Your story">{{text}}</div>
                <textarea v-else aria-label="Your story" :value="text" :disabled="disabled" :readonly="decorate" :tabindex="decorate?-1:0" @input="emit('update:text',($event.target as HTMLTextAreaElement).value)" placeholder="Start anywhere. A place, a feeling, a little thing you want to remember." />
              </template>
              <template v-else>
                <span class="eyebrow keepsake-label">Keepsakes</span>
                <p class="caption">The little things.</p>
                <div v-if="!page.elements.length && !viewMode" class="empty-keepsakes"><span class="empty-photo" aria-hidden="true"><svg viewBox="0 0 80 60" fill="none"><path d="M10 45 30 24l16 16 11-12 15 17" stroke="currentColor" stroke-width="1.3"/><circle cx="55" cy="16" r="5" stroke="currentColor" stroke-width="1.3"/></svg></span><p>A photo. A sticker.<br>A little piece of your day.</p><button :disabled="disabled" @click="decorate=true;activePage='page-right'">Add a keepsake <span aria-hidden="true">↗</span></button></div>
                <slot name="right" />
              </template>
            </div>
            <span class="page-number" aria-hidden="true">{{index===0?'01':'02'}}</span>
            <div class="decoration-layer" @pointerdown.self="activePage=page.id;selectedId=null">
              <div v-for="e in page.elements" :key="e.id" class="decoration" :class="[{selected:decorate && selectedId===e.id,photo:e.type==='photo'},e.type==='photo'?'frame-'+e.frame:'']" :style="style(e)" :tabindex="decorate && !viewMode?0:undefined" :role="decorate && !viewMode?'button':undefined" :aria-label="e.type+' decoration'" @focus="selectedId=e.id;activePage=page.id" @pointerdown="startGesture($event,e,page.id)" @pointermove="moveGesture" @pointerup="endGesture" @pointercancel="endGesture" @lostpointercapture="endGesture">
                <div class="asset-surface"><img v-if="src(e)" :src="src(e)" :alt="e.type==='photo'?'Placed photo':'Placed sticker'" draggable="false" /><span v-else class="unavailable">Image unavailable</span></div>
                <template v-if="decorate && selectedId===e.id && !viewMode"><button class="handle resize" aria-label="Resize decoration" @pointerdown.stop="startGesture($event,e,page.id,'resize')">↔</button><button class="handle rotate" aria-label="Rotate decoration" @pointerdown.stop="startGesture($event,e,page.id,'rotate')">↻</button></template>
                <span v-if="pending[e.assetId] && !viewMode" class="placement-status">{{pending[e.assetId].status==='failed'?'Retry needed':'Adding…'}}</span>
              </div>
            </div>
          </article>
        </div>
        <p class="book-caption" v-if="!viewMode">{{decorate?'Small details, your own way.':'No perfect words needed. Just yours.'}}</p>
      </div>
      <aside v-if="decorate && !viewMode" class="tools-panel" aria-label="Decorating tools">
        <div class="panel-heading"><span class="eyebrow">A little collection</span><h2>Make it yours</h2></div>
        <div class="page-picker" role="group" aria-label="Active page">
          <button v-for="p in layout.pages" :key="p.id" :aria-pressed="activePage===p.id" @click="activePage=p.id;selectedId=null">{{p.id==='page-left'?'Left page':'Right page'}}</button>
        </div>
        <div class="library">
          <div role="tablist" aria-label="Sticker library"><button role="tab" :aria-selected="tab==='library'" @click="tab='library'">Library</button><button role="tab" :aria-selected="tab==='custom'" @click="tab='custom'">My stickers</button><button role="tab" :aria-selected="tab==='photos'" @click="tab='photos'">Photos</button></div>
          <template v-if="tab==='library'"><p class="library-hint">Pick a little something for your page.</p><div class="thumbnails"><button v-for="a in builtins" :key="a.id" :disabled="disabled" :aria-label="'Add '+a.storage_path" @click="add('sticker',a.id,a.width/a.height)"><img :src="a.url" :alt="a.storage_path.replace('.svg','').replace(/-/g,' ')" /></button></div></template>
          <div v-if="tab==='custom'">
            <label class="upload-button custom-upload">＋ Upload a sticker<input aria-label="Upload custom sticker" type="file" accept="image/png,image/webp" :disabled="disabled" @change="chooseSticker" /></label>
            <p class="library-hint">Transparent PNG or WebP · up to 5 MB</p>
            <div class="thumbnails"><button v-for="a in custom" :key="a.id" aria-label="Place custom sticker" :disabled="disabled || a.id.startsWith('pending:')" @click="add('sticker',a.id,a.width/a.height)"><img :src="a.url" alt="Custom sticker" /></button></div>
            <p v-if="!custom.length && !assetError" class="collection-empty">Your own little collection starts here.</p>
          </div>
          <div v-if="tab==='photos'" class="thumbnails"><button v-for="m in media" :key="m.id" :aria-label="'Place '+m.original_filename" @click="placeMedia(m)"><img :src="m.file_path" :alt="m.original_filename" /></button><p v-if="!media.length" class="collection-empty">Use Add photo to keep a moment on your page.</p></div>
          <div v-if="assetError" class="asset-notice"><p role="alert">{{assetError}}</p><button @click="loadCustom">Retry my stickers</button></div>
        </div>
        <div v-if="selected" class="context-tools" role="toolbar" aria-label="Selected decoration">
          <div class="selection-heading"><span>{{selected.type==='photo'?'Your photo':'Your sticker'}}</span><button class="icon-button" aria-label="Clear selection" @click="selectedId=null">×</button></div>
          <div class="transform-fields"><label>Size<input aria-label="Decoration size" type="range" min="0.06" max="0.8" step="0.01" :value="selected.width" @change="change({width:Number(($event.target as HTMLInputElement).value)})" /></label><label>Angle<input aria-label="Decoration rotation" type="number" min="-180" max="180" :value="Math.round(selected.rotation)" @input="change({rotation:Math.max(-180,Math.min(180,Number(($event.target as HTMLInputElement).value)))})" /></label></div>
          <label v-if="selected.type==='photo'" class="frame-field">Frame<select aria-label="Photo frame" :value="selected.frame" @change="change({frame:($event.target as HTMLSelectElement).value as PhotoFrame})"><option value="plain">Plain</option><option value="polaroid">Polaroid</option><option value="paper">Paper border</option><option value="washi">Washi tape</option></select></label>
          <div class="selection-actions"><button @click="duplicate">Duplicate</button><button @click="remove">Delete placement</button></div>
          <details class="arrange-menu"><summary>Arrange &amp; move <span aria-hidden="true">⌄</span></summary><div class="arrange-options"><button @click="layer('forward')">Bring forward</button><button @click="layer('backward')">Send backward</button><button @click="layer('front')">Bring to front</button><button @click="layer('back')">Send to back</button><button class="move-page" @click="movePage">Move to {{selectedPage?.id==='page-left'?'right':'left'}} page</button></div></details>
        </div>
        <div aria-live="polite"><div v-for="(item,id) in pending" :key="id" class="upload-status"><p>{{item.status==='pending'?'Ready to add when you save.':item.status==='uploading'?'Adding your keepsake…':item.error}}</p><button v-if="item.status==='failed' && (entryId || item.type==='sticker')" @click="uploadOne(String(id),entryId || '')">Retry upload</button></div></div>
        <button class="done-decorating" @click="decorate=false;selectedId=null">Done Decorating</button>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.done-decorating{width:100%;margin-top:14px;padding:11px;border:1px solid #c7c3b4;border-radius:6px;background:#f6f1e5;color:#702d3e}
.scrapbook{color:#4d483e;max-width:1320px;margin:auto;font-family:'Inter',sans-serif}
button,.upload-button{font:inherit;font-size:12px;cursor:pointer}button{color:inherit}button:disabled{opacity:.4;cursor:default}button:focus-visible,input:focus-visible,textarea:focus-visible,summary:focus-visible,select:focus-visible,.decoration:focus-visible{outline:2px solid #9b5d6c;outline-offset:4px}
.workbench{display:flex;align-items:center;gap:16px;max-width:1020px;margin:0 auto 26px;min-height:42px}
.mode-switch{display:flex;background:#dfdfd3;border:1px solid #d5d6c8;border-radius:8px;padding:3px;gap:2px}.mode-switch button{background:none;border:0;padding:9px 19px;border-radius:5px;font-size:12px}.mode-switch button[aria-pressed=true]{background:#fffdf7;box-shadow:0 1px 4px #47423014;color:#702d3e}.mode-note{font:18px 'Caveat',cursive;color:#868475}.bench-actions{display:flex;gap:8px;align-items:center;margin-left:auto}.icon-button{height:36px;width:36px;border:0;background:none;font-size:23px;color:#767267;border-radius:6px}.icon-button:hover{background:#e3ded1}.help-button{font:13px Georgia,serif;border:1px solid #cbc4b5;border-radius:50%;width:25px;height:25px;margin-left:10px}.upload-button{position:relative;display:flex;align-items:center;justify-content:center;gap:6px;min-height:38px;border:1px solid #d7cfc1;border-radius:6px;padding:8px 12px;background:#f4f0e7;color:#5b6354}.upload-button input{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden}.upload-button:focus-within{outline:2px solid #9b5d6c;outline-offset:3px}.photo-upload>span{font-size:19px}
.keyboard-help{max-width:1020px;margin:0 auto 20px;padding:16px 20px;background:#f8f5ed;border:1px solid #dcd4c5;border-radius:8px;font-size:12px;line-height:1.8;color:#766e5f}.keyboard-help strong{font-weight:500;color:#625447}.friendly-notice{padding:14px;background:#faf0df;border-radius:8px;font-size:12px}
.workspace{display:grid;grid-template-columns:minmax(0,1fr);max-width:1020px;margin:auto;gap:28px;align-items:start}.workspace.with-tools{max-width:1320px;grid-template-columns:minmax(0,1fr) 252px}.book-area{min-width:0;padding:6px 0 0}.spread{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0;position:relative;padding:6px 6px 9px;background:#8b8c73;border-radius:7px 12px 10px 7px;box-shadow:0 24px 45px -20px #4f40394a,0 7px 15px #4c423318,0 1px 2px #fff inset}
.spread:before{content:'';position:absolute;inset:10px 7px 3px;background:repeating-linear-gradient(0deg,#c8c0ad 0 1px,#eee8d9 1px 3px);border-radius:2px 8px 6px 2px;box-shadow:0 2px 1px #6d604750}.spread:after{content:'';position:absolute;z-index:2;top:6px;bottom:9px;left:calc(50% - 14px);width:28px;background:linear-gradient(90deg,transparent,#63574115 30%,#5e4c3e25 48%,#fffcf74d 54%,#5e4c3e0b 75%,transparent);pointer-events:none}
.paper{position:relative;aspect-ratio:3/4;min-width:0;isolation:isolate;container-type:inline-size;background-color:#fcf8ec;background-image:radial-gradient(#a28c6217 .45px,transparent .65px);background-size:4px 5px;box-shadow:inset -16px 0 24px -18px #66533c55;border-radius:2px 0 0 2px}
.paper.right{background-color:#faf5e7;box-shadow:inset 18px 0 25px -19px #66533c55;border-radius:0 5px 4px 0}.paper.active:after{content:'';position:absolute;bottom:0;left:8%;width:18px;height:28px;background:#7e8c704f;clip-path:polygon(0 0,100% 0,100% 100%,50% 78%,0 100%);pointer-events:none}
.writing{position:absolute;inset:9% 10% 10%;display:flex;flex-direction:column;gap:calc(var(--sheet-scale)*20px)}
.eyebrow{font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:#8d8a71;font-weight:500}.writing .eyebrow{font-size:2cqw;letter-spacing:.14em}.title,h1{font:400 6.3cqw/1.22 'Crimson Text',Georgia,serif;letter-spacing:-.025em;background:transparent;border:0;width:100%;color:#523b35;margin:0;padding:0}.title{field-sizing:content;resize:none;min-height:7.686cqw;max-height:24cqw;white-space:pre-wrap;overflow-wrap:anywhere;flex:none;overflow:auto}h1{max-height:24cqw;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}
.title::placeholder{color:#8b7963;opacity:1}
.story,textarea:not(.title){flex:1;min-height:0;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font:4.2cqw/1.8 'Crimson Text',Georgia,serif;background:repeating-linear-gradient(transparent 0 calc(7.56cqw - 1px),#aa94701a calc(7.56cqw - 1px) 7.56cqw);border:0;resize:none;width:100%;padding:0;color:#594f40;scrollbar-width:thin;scrollbar-color:#c9bea6 transparent}
textarea:not(.title)::placeholder{color:#b0a48e;opacity:1}textarea:focus,.title:focus{outline:none}.title:focus-visible,textarea:focus-visible{box-shadow:inset 0 -1px #9b5d6c50}.caption{font:5.5cqw/1.3 'Caveat','Segoe Print',cursive;color:#869071;margin:-1.5cqw 0 0;transform:rotate(-2deg)}.page-number{position:absolute;bottom:4%;left:10%;font:2cqw Georgia,serif;color:#b9ab91}.right .page-number{left:auto;right:10%}.keepsake-label{color:#90866e}
.empty-keepsakes{margin:auto;align-self:center;text-align:center;max-width:80%;color:#aa9f87;transform:translateY(-8%)}.empty-keepsakes p{font:3.8cqw/1.55 'Caveat',cursive;margin:5cqw 0 3cqw}.empty-keepsakes button{border:0;background:none;color:#7f846e;font-size:2.6cqw;padding:2cqw}.empty-photo{display:block;width:25cqw;height:29cqw;margin:auto;transform:rotate(-9deg);border:1px solid #c7bfa944;background:linear-gradient(#e9e4d34a,#f6f1e4);box-shadow:2px 4px 8px #887a5710;padding:3cqw 2cqw 8cqw;position:relative}.empty-photo:before{content:'';position:absolute;top:-2cqw;left:6cqw;width:13cqw;height:5cqw;background:#c4cab24d;transform:rotate(4deg)}.empty-photo svg{color:#b4b39b;height:100%;width:100%}
.book-caption{text-align:center;font:18px 'Caveat',cursive;color:#8e8a77;padding-top:18px}
.tools-panel{background:#f8f5ed;border:1px solid #dcd7ca;border-radius:10px;padding:20px 16px;box-shadow:0 8px 28px #54483a08;position:sticky;top:20px}.panel-heading{margin-bottom:18px}.panel-heading .eyebrow{font-size:9px}.panel-heading h2{font:400 25px 'Crimson Text',Georgia,serif;margin:5px 0 0;color:#695140}.page-picker{display:flex;background:#e9e9de;border-radius:6px;padding:3px;margin-bottom:18px}.page-picker button{width:50%;padding:8px;border:0;border-radius:4px;background:none;font-size:11px}.page-picker button[aria-pressed=true]{background:#fffdf6;color:#733548;box-shadow:0 1px 3px #59503b14}
.library [role=tablist]{display:flex;justify-content:space-between;border-bottom:1px solid #dfd8c9;margin-bottom:12px}.library [role=tab]{padding:9px 2px;border:0;border-bottom:2px solid transparent;background:none;font-size:11px;color:#8d8270}.library [aria-selected=true]{color:#74283c;border-bottom-color:#94586a}.library-hint{font-size:10px;line-height:1.6;color:#9a8d7a;margin:12px 0}
.thumbnails{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.thumbnails button{aspect-ratio:1;padding:5px;border:1px solid #e9e0cf;border-radius:7px;background:#fffaf0;transition:transform .15s,background .15s}.thumbnails button:hover{transform:rotate(-5deg);background:#f0ecdf;border-color:#bdbfa9}.thumbnails img{width:100%;height:100%;object-fit:contain}.custom-upload{margin-top:14px;border-style:dashed;background:#eeeede;min-height:44px}.collection-empty{grid-column:1/-1;font:16px/1.5 'Caveat',cursive;color:#9a957e;text-align:center;padding:12px 5px}.asset-notice{font-size:11px;line-height:1.6;padding:12px;background:#f2e9d9;border-radius:6px;margin-top:14px;color:#8a7259}.asset-notice button,.upload-status button{border:0;background:none;padding:6px 0;text-decoration:underline;color:#794254;font-size:11px}
.context-tools{margin-top:20px;border-top:1px solid #e0d6c4;padding-top:14px}.selection-heading{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#775246}.selection-heading .icon-button{height:25px;width:25px;font-size:18px}.transform-fields{display:grid;grid-template-columns:1fr 58px;gap:18px;margin:12px 0}.transform-fields label,.frame-field{font-size:10px;color:#958773;display:grid;gap:7px}.transform-fields input[type=range]{width:100%;accent-color:#8a5664}.transform-fields input[type=number]{width:100%;border:1px solid #dcd2c0;border-radius:4px;background:#fefaef;padding:5px;font-size:12px;color:#6e594e}.frame-field{grid-template-columns:1fr 140px;align-items:center;margin-bottom:14px}.frame-field select{padding:7px;border:1px solid #dcd2c0;background:#fefaef;border-radius:4px;color:#6e594e;font-size:11px}.selection-actions{display:flex;gap:7px}.selection-actions button{border:1px solid #dcd4c4;padding:8px 9px;border-radius:5px;background:#fffaf0;font-size:10px;flex:1}.arrange-menu{margin-top:12px;font-size:11px}.arrange-menu summary{cursor:pointer;list-style:none;padding:10px 0;color:#8b7d69;display:flex;justify-content:space-between}.arrange-options{display:grid;grid-template-columns:1fr 1fr;gap:5px}.arrange-options button{font-size:10px;padding:9px 4px;border:1px solid #e2dacb;background:#f3efe4;border-radius:4px}.arrange-options .move-page{grid-column:1/-1;background:#e8ecdf;color:#69745c}
.decoration-layer{position:absolute;inset:0;pointer-events:none}.decorating .decoration-layer{pointer-events:auto}.decoration{position:absolute;user-select:none;box-sizing:border-box;pointer-events:none;filter:drop-shadow(1px 3px 2px #33210d26)}.decorating .decoration{pointer-events:auto;touch-action:none;cursor:grab}.asset-surface{position:absolute;inset:0;box-sizing:border-box}.decoration img{width:100%;height:100%;object-fit:contain;display:block;pointer-events:none}.decoration.selected{outline:1.5px dashed #875368;outline-offset:5px}
.photo .asset-surface{background:#fffdf8;box-shadow:1px 3px 5px #4a39222b}.frame-polaroid .asset-surface{padding:4% 4% 14%}.frame-paper .asset-surface{padding:4%;background:#f0dfbc}.frame-washi .asset-surface{padding:2%}.frame-washi:before,.frame-washi:after{content:'';position:absolute;z-index:1;width:35%;height:13%;background:repeating-linear-gradient(45deg,#aeb59fbb 0 5px,#d0cfb2bb 5px 10px);top:-4%;left:-9%;transform:rotate(-35deg)}.frame-washi:after{left:auto;right:-9%;top:auto;bottom:-4%}
.handle{position:absolute;width:30px;height:30px;padding:0;background:#875368;color:#fff;border:2px solid #fffaf2;border-radius:50%;touch-action:none;font-size:15px;z-index:3}.resize{right:-18px;bottom:-18px;cursor:nwse-resize}.rotate{left:calc(50% - 15px);top:-39px;cursor:crosshair}.placement-status{position:absolute;bottom:-28px;left:0;white-space:nowrap;font-size:10px;padding:3px 6px;border-radius:4px;background:#f6ead3;color:#806147}.upload-status{font-size:11px;line-height:1.6;margin-top:14px;background:#f1e8d7;border-radius:6px;padding:10px}.unavailable{font-size:11px;color:#8b7659}
@media(max-width:1100px){.workspace.with-tools{grid-template-columns:minmax(0,1fr) 224px;gap:18px}.tools-panel{padding:17px 12px}.thumbnails{gap:5px}.mode-note{display:none}}
@media(max-width:767px){.workbench{gap:8px;margin-bottom:18px;flex-wrap:wrap}.bench-actions{gap:4px}.mode-switch button{padding:10px 13px}.help-button{margin-left:4px}.photo-upload{padding:8px;font-size:11px}.workspace.with-tools{grid-template-columns:1fr;gap:18px}.tools-panel{position:static;grid-row:1;padding:14px;max-height:450px;overflow:auto}.panel-heading{display:none}.page-picker{margin-bottom:10px}.thumbnails{grid-template-columns:repeat(6,minmax(0,1fr));gap:7px}.library-hint{margin:6px 0}.context-tools{margin-top:12px;padding-top:8px}.transform-fields{grid-template-columns:1fr 75px;margin:8px 0}.selection-actions button,.arrange-options button{min-height:40px}.spread{grid-template-columns:1fr;gap:12px;padding:5px 5px 10px}.spread:after{display:none}.handle{width:44px;height:44px}.resize{right:-24px;bottom:-24px}.rotate{left:calc(50% - 22px);top:-51px}.paper{border-radius:3px;box-shadow:inset 8px 0 20px -20px #66533c55}.paper.right{box-shadow:inset 8px 0 20px -20px #66533c55}.mode-switch button,.icon-button{min-height:40px}.writing .eyebrow{font-size:2.4cqw}.story,textarea:not(.title){font-size:4.2cqw;line-height:1.8;background:repeating-linear-gradient(transparent 0 calc(7.56cqw - 1px),#aa94701a calc(7.56cqw - 1px) 7.56cqw)}.book-caption{font-size:17px}.empty-keepsakes button{font-size:3.2cqw;min-height:40px}}
@media(prefers-reduced-motion:reduce){.thumbnails button{transition:none}}
</style>

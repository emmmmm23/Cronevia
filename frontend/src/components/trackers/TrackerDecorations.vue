<script setup lang="ts">
import { ref,nextTick,onBeforeUnmount } from 'vue'
import type { TrackerDecoration } from '@/types/trackers'

const props = withDefaults(defineProps<{
  decorations: TrackerDecoration[]; urls: Record<string, string>; editable?: boolean; selectedId?: string
}>(), { editable: false, selectedId: '' })
const emit = defineEmits<{
  'update:decorations': [TrackerDecoration[]]; 'update:selectedId': [string]; commit: []
}>()
const surface = ref<HTMLElement>()
type Gesture = {
  pointer: number; id: string; mode: 'move' | 'resize' | 'rotate'; start: TrackerDecoration
  x: number; y: number; width: number; height: number; cx: number; cy: number
  angle: number; distance: number; boxWidth: number; boxHeight: number
  scrollX:number;scrollY:number
}
let gesture: Gesture | null = null
let scrollFrame=0,pointer={x:0,y:0}
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
function update(id: string, values: Partial<TrackerDecoration>) {
  emit('update:decorations', props.decorations.map(d => d.id === id ? { ...d, ...values } : d))
}
function begin(event: PointerEvent, d: TrackerDecoration, mode: Gesture['mode']) {
  if (!props.editable || event.button !== 0 || gesture) return
  emit('update:selectedId', d.id)
  if (d.locked || !surface.value) return
  event.preventDefault()
  const area = surface.value.getBoundingClientRect()
  const box = (event.currentTarget as HTMLElement).closest<HTMLElement>('.decoration-item')!
  const cx = area.left + d.x * area.width, cy = area.top + d.y * area.height
  gesture = { pointer: event.pointerId, id: d.id, mode, start: { ...d },
    x: event.clientX, y: event.clientY, width: area.width, height: area.height, cx, cy,
    angle: Math.atan2(event.clientY - cy, event.clientX - cx),
    distance: Math.max(1, Math.hypot(event.clientX - cx, event.clientY - cy)),
    boxWidth: box.offsetWidth, boxHeight: box.offsetHeight,scrollX:window.scrollX,scrollY:window.scrollY }
  pointer={x:event.clientX,y:event.clientY}
  if(mode==='move')scrollFrame=requestAnimationFrame(autoScroll)
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
function move(event: PointerEvent) {
  const g = gesture
  if (!g || event.pointerId !== g.pointer) return
  event.preventDefault()
  pointer={x:event.clientX,y:event.clientY}
  if (g.mode === 'move') {
    const radians = g.start.rotation * Math.PI / 180
    const halfX = Math.min(.5, (Math.abs(Math.cos(radians)) * g.boxWidth + Math.abs(Math.sin(radians)) * g.boxHeight) / (2 * g.width))
    const halfY = Math.min(.5, (Math.abs(Math.sin(radians)) * g.boxWidth + Math.abs(Math.cos(radians)) * g.boxHeight) / (2 * g.height))
    update(g.id, { x: clamp(g.start.x + (event.clientX - g.x+window.scrollX-g.scrollX) / g.width, halfX, 1 - halfX),
      y: clamp(g.start.y + (event.clientY - g.y+window.scrollY-g.scrollY) / g.height, halfY, 1 - halfY) })
  } else if (g.mode === 'resize') {
    const ratio = Math.hypot(event.clientX - g.cx, event.clientY - g.cy) / g.distance
    const radians = g.start.rotation * Math.PI / 180
    const rotatedWidth = Math.abs(Math.cos(radians)) * g.boxWidth + Math.abs(Math.sin(radians)) * g.boxHeight
    const rotatedHeight = Math.abs(Math.sin(radians)) * g.boxWidth + Math.abs(Math.cos(radians)) * g.boxHeight
    const fits = Math.min(2 * Math.min(g.start.x, 1 - g.start.x) * g.width / Math.max(1, rotatedWidth),
      2 * Math.min(g.start.y, 1 - g.start.y) * g.height / Math.max(1, rotatedHeight))
    update(g.id, { width: clamp(g.start.width * Math.min(ratio, fits), .05, .5) })
  } else {
    const degrees = g.start.rotation + (Math.atan2(event.clientY - g.cy, event.clientX - g.cx) - g.angle) * 180 / Math.PI
    update(g.id, { rotation: Math.round(((degrees + 540) % 360) - 180) })
  }
}
function autoScroll(){
 const g=gesture;if(!g||g.mode!=='move')return
 const delta=pointer.y>innerHeight-64?18:pointer.y<88?-18:0
 if(delta){window.scrollBy({top:delta,behavior:'instant'});move({pointerId:g.pointer,clientX:pointer.x,clientY:pointer.y,preventDefault(){}} as PointerEvent)}
 scrollFrame=requestAnimationFrame(autoScroll)
}
function finish(event: PointerEvent, cancelled = false) {
  if (!gesture || event.pointerId !== gesture.pointer) return
  const g = gesture
  gesture = null
  cancelAnimationFrame(scrollFrame)
  if (cancelled) update(g.id, g.start)
  else emit('commit')
}
function key(event: KeyboardEvent, d: TrackerDecoration, mode: Gesture['mode']) {
  if (d.locked || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
  event.preventDefault()
  const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1
  if (mode === 'resize') update(d.id, { width: clamp(d.width + direction * .01, .05, .5) })
  else if (mode === 'rotate') update(d.id, { rotation: clamp(d.rotation + direction * (event.shiftKey ? 15 : 1), -180, 180) })
  else {
    const step = event.shiftKey ? .05 : .01
    const area=surface.value!.getBoundingClientRect(),box=(event.currentTarget as HTMLElement).closest<HTMLElement>('.decoration-item')!,rad=d.rotation*Math.PI/180
    const halfX=Math.min(.5,(Math.abs(Math.cos(rad))*box.offsetWidth+Math.abs(Math.sin(rad))*box.offsetHeight)/(2*area.width)),halfY=Math.min(.5,(Math.abs(Math.sin(rad))*box.offsetWidth+Math.abs(Math.cos(rad))*box.offsetHeight)/(2*area.height))
    update(d.id, event.key === 'ArrowLeft' || event.key === 'ArrowRight'
      ? { x: clamp(d.x + direction * step, halfX,1-halfX) } : { y: clamp(d.y + direction * step,halfY,1-halfY) })
    nextTick(()=>surface.value?.querySelector<HTMLElement>('[data-decoration-id="'+d.id+'"]')?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'}))
  }
  emit('commit')
}
onBeforeUnmount(()=>{gesture=null;cancelAnimationFrame(scrollFrame)})
</script>

<template>
  <div ref="surface" class="paper-decorations" :class="{ 'is-editable': editable }" :aria-hidden="editable ? undefined : true" @pointerdown.self="emit('update:selectedId', '')">
    <span v-for="d in decorations" :key="d.id" class="decoration-item" :class="{ chosen: editable && selectedId === d.id, locked: d.locked }"
      :data-decoration-id="d.id" :style="{ left: d.x * 100 + '%', top: d.y * 100 + '%', width: d.width * 100 + '%', transform: 'translate(-50%,-50%) rotate(' + d.rotation + 'deg)', zIndex: editable && selectedId === d.id ? 1001 : d.z, '--decoration-scale': d.width / .15 }">
      <component :is="editable ? 'button' : 'span'" :type="editable ? 'button' : undefined" class="decoration-art"
        :aria-label="editable ? 'Move ' + (d.text || 'sticker') + (d.locked ? ' (locked)' : '') : undefined" :aria-pressed="editable ? selectedId === d.id : undefined"
        @focus="editable && emit('update:selectedId', d.id)" @click="editable && emit('update:selectedId', d.id)"
        @pointerdown="begin($event, d, 'move')" @pointermove="move" @pointerup="finish($event)" @pointercancel="finish($event, true)" @lostpointercapture="finish($event, true)" @keydown="editable && key($event, d, 'move')">
        <img v-if="d.asset && urls[d.asset]" :src="urls[d.asset]" alt="" draggable="false" /><span v-else>{{ d.text }}</span>
      </component>
      <template v-if="editable && selectedId === d.id && !d.locked">
        <button type="button" class="decoration-handle rotate-handle" aria-label="Rotate sticker" title="Drag to rotate; arrow keys turn it"
          @pointerdown.stop="begin($event, d, 'rotate')" @pointermove="move" @pointerup="finish($event)" @pointercancel="finish($event, true)" @lostpointercapture="finish($event, true)" @keydown="key($event, d, 'rotate')">↻</button>
        <button type="button" class="decoration-handle resize-handle" aria-label="Resize sticker" title="Drag to resize; arrow keys change size"
          @pointerdown.stop="begin($event, d, 'resize')" @pointermove="move" @pointerup="finish($event)" @pointercancel="finish($event, true)" @lostpointercapture="finish($event, true)" @keydown="key($event, d, 'resize')">↗</button>
      </template>
    </span>
  </div>
</template>

<style scoped>
.paper-decorations{position:absolute;inset:0;pointer-events:none}.paper-decorations.is-editable{pointer-events:auto}
.decoration-item{position:absolute;display:block;text-align:center;line-height:1;color:var(--tracker-accent,inherit)}
.decoration-art{display:block!important;width:100%;min-height:0!important;padding:0!important;border:0!important;border-radius:1px!important;background:none!important;color:inherit!important;font:calc(30px * var(--decoration-scale)) / 1 'Caveat',cursive!important;text-align:center;user-select:none;-webkit-user-select:none}
.decoration-art img{display:block;width:100%;height:auto;max-height:calc(100px * var(--decoration-scale));object-fit:contain;pointer-events:none}
.is-editable .decoration-art{cursor:grab;touch-action:none}.is-editable .decoration-art:active{cursor:grabbing}.is-editable .locked .decoration-art{cursor:default}
.chosen .decoration-art{outline:1px dashed #79283e;outline-offset:4px}.locked.chosen .decoration-art{outline-style:dotted}
.decoration-handle{position:absolute!important;display:grid;place-items:center;width:30px!important;height:30px!important;min-height:30px!important;padding:0!important;border:1px solid #79283e!important;border-radius:50%!important;background:#fffaf0!important;color:#79283e!important;box-shadow:0 2px 5px #51322526;font:20px/1 sans-serif!important;cursor:grab;touch-action:none;z-index:2}
.decoration-handle::after{content:'';position:absolute;inset:-7px}.rotate-handle{right:-14px;top:-18px}.resize-handle{right:-14px;bottom:-18px}
button:focus-visible{outline:2px solid #79283e!important;outline-offset:5px}
@media(max-width:650px){.decoration-art img{max-height:calc(80px * var(--decoration-scale))}}
</style>

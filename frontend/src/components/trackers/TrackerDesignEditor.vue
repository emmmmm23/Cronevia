<script setup lang="ts">
import { cloneTracker } from '@/types/trackers'
import { computed, ref, watch } from 'vue'
import { fetchBuiltinAssets } from '@/services/sticker.service'
import { trackerAssetUrl, trackerError, uploadTrackerImage } from '@/services/trackers.service'
import { defaultDesign, type TrackerDesign, type TrackerDecoration } from '@/types/trackers'
const props=defineProps<{modelValue:TrackerDesign}>()
const emit=defineEmits<{'update:modelValue':[TrackerDesign];busy:[boolean]}>()
const draft=ref<TrackerDesign>(cloneTracker(props.modelValue||defaultDesign()))
const selectedId=ref(''), urls=ref<Record<string,string>>({}),error=ref(''),busy=ref(false)
const library=ref<Awaited<ReturnType<typeof fetchBuiltinAssets>>>([])
const history=ref<TrackerDesign[]>([cloneTracker(draft.value)]),cursor=ref(0)
const selected=computed(()=>draft.value.decorations.find(d=>d.id===selectedId.value))
const canvas=ref<HTMLElement>(),pendingFile=ref<File|null>(null),pendingKind=ref<'background'|'sticker'>('sticker')
fetchBuiltinAssets().then(items=>library.value=items).catch(()=>{})
watch(()=>props.modelValue,value=>{if(JSON.stringify(value)!==JSON.stringify(draft.value)){draft.value=cloneTracker(value);history.value=[cloneTracker(value)];cursor.value=0}},{deep:true})
watch(draft,async value=>{
 const paths=[value.background,...value.decorations.map(d=>d.asset)].filter(Boolean) as string[]
 for(const path of paths)if(!urls.value[path])try{urls.value[path]=await trackerAssetUrl(path)}catch{error.value='An image could not load. Your saved design is still here.'}
},{immediate:true,deep:true})
function publish(){emit('update:modelValue',cloneTracker(draft.value))}
function commit(){
 if(JSON.stringify(history.value[cursor.value])!==JSON.stringify(draft.value)){history.value=history.value.slice(0,cursor.value+1);history.value.push(cloneTracker(draft.value));if(history.value.length>40)history.value.shift();cursor.value=history.value.length-1}
 publish()
}
function undo(delta:number){cursor.value=Math.max(0,Math.min(history.value.length-1,cursor.value+delta));draft.value=cloneTracker(history.value[cursor.value]);publish()}
function add(asset='',text=''){
 if(draft.value.decorations.length>=50){error.value='Use up to 50 decorations.';return}
 const d:TrackerDecoration={id:crypto.randomUUID(),x:.85,y:.5,width:.15,rotation:-8,z:draft.value.decorations.length,locked:false,asset,text}
 draft.value.decorations.push(d);selectedId.value=d.id;commit()
}
function change(){commit()}
function remove(){draft.value.decorations=draft.value.decorations.filter(d=>d.id!==selectedId.value);selectedId.value='';commit()}
function layer(delta:number){if(selected.value){selected.value.z=Math.max(0,Math.min(1000,selected.value.z+delta));commit()}}
let drag:{id:string;left:number;top:number;width:number;height:number}|null=null
function startDrag(event:PointerEvent,d:TrackerDecoration){
 selectedId.value=d.id;if(d.locked||!canvas.value)return
 const r=canvas.value.getBoundingClientRect();drag={id:d.id,left:r.left,top:r.top,width:r.width,height:r.height}
 ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
function moveDrag(event:PointerEvent){if(!drag)return;const d=draft.value.decorations.find(v=>v.id===drag!.id);if(d){d.x=Math.max(.05,Math.min(.95,(event.clientX-drag.left)/drag.width));d.y=Math.max(.05,Math.min(.95,(event.clientY-drag.top)/drag.height))}}
function stopDrag(){if(drag){drag=null;commit()}}
async function upload(kind:'background'|'sticker',event?:Event){
 const file=event?(event.target as HTMLInputElement).files?.[0]:pendingFile.value
 if(!file)return
 pendingFile.value=file;pendingKind.value=kind;busy.value=true;emit('busy',true);error.value=''
 try{const path=await uploadTrackerImage(file);urls.value[path]=await trackerAssetUrl(path);if(kind==='background')draft.value.background=path;else add(path);commit();pendingFile.value=null}
 catch(e){error.value=trackerError(e)}finally{busy.value=false;emit('busy',false)}
}
</script>
<template><div class="design-editor"><p class="form-help">Make the heading band your own. Decorations stay separate from your logs and never intercept date controls.</p><div class="design-controls"><label>Paper<select v-model="draft.paper" @change="change"><option value="grid">Graph paper</option><option value="dot">Dotted</option><option value="lined">Lined</option><option value="blank">Blank</option></select></label><label>Lettering<select v-model="draft.font" @change="change"><option value="hand">Handwritten</option><option value="serif">Bookish serif</option><option value="sans">Simple sans</option></select></label><label>Paper color<input v-model="draft.color" type="color" @change="change" /></label><label>Ink color<input v-model="draft.accent" type="color" @change="change" /></label></div><label>Decorative heading<input v-model="draft.heading" maxlength="150" placeholder="Leave blank to use the tracker name" @change="change" /></label><div class="design-history"><button type="button" :disabled="!cursor" @click="undo(-1)">↶ Undo</button><button type="button" :disabled="cursor===history.length-1" @click="undo(1)">↷ Redo</button></div><div ref="canvas" class="design-canvas" :style="{backgroundColor:draft.color,color:draft.accent}"><strong>{{draft.heading||'YOUR LITTLE RHYTHMS'}}</strong><button v-for="d in draft.decorations" :key="d.id" type="button" :class="{chosen:d.id===selectedId}" :style="{left:d.x*100+'%',top:d.y*100+'%',width:d.width*100+'%',transform:'translate(-50%,-50%) rotate('+d.rotation+'deg)',zIndex:d.z}" :aria-label="'Select decoration '+(d.text||'sticker')" @pointerdown="startDrag($event,d)" @pointermove="moveDrag" @pointerup="stopDrag" @pointercancel="stopDrag" @click="selectedId=d.id"><img v-if="d.asset&&urls[d.asset]" :src="urls[d.asset]" alt="" draggable="false" /><span v-else>{{d.text}}</span></button></div><div class="design-stickers"><button v-for="item in library" :key="item.id" type="button" :aria-label="'Add '+item.category+' sticker'" @click="add(item.url)"><img :src="item.url" alt="" /></button><button v-for="glyph in ['✦','☾','♡','☘','✿']" :key="glyph" type="button" :aria-label="'Add '+glyph" @click="add('',glyph)">{{glyph}}</button></div><div class="design-uploads"><label class="file-button">Upload sticker<input type="file" accept="image/png,image/webp,image/jpeg,image/gif" :disabled="busy" @change="upload('sticker',$event)" /></label><label class="file-button">Upload background<input type="file" accept="image/png,image/webp,image/jpeg,image/gif" :disabled="busy" @change="upload('background',$event)" /></label><button v-if="draft.background" type="button" @click="draft.background=null;commit()">Remove background</button></div><p v-if="busy" role="status">Keeping your image…</p><p v-if="error" role="alert">{{error}} <button v-if="pendingFile" type="button" @click="upload(pendingKind)">Retry upload</button></p><fieldset v-if="selected" class="decoration-controls"><legend>Selected decoration</legend><label>Horizontal position<input v-model.number="selected.x" type="range" min=".05" max=".95" step=".01" :disabled="selected.locked" @change="change" /></label><label>Vertical position<input v-model.number="selected.y" type="range" min=".05" max=".95" step=".01" :disabled="selected.locked" @change="change" /></label><label>Size<input v-model.number="selected.width" type="range" min=".05" max=".5" step=".01" :disabled="selected.locked" @change="change" /></label><label>Rotate<input v-model.number="selected.rotation" type="range" min="-180" max="180" :disabled="selected.locked" @change="change" /></label><label><input v-model="selected.locked" type="checkbox" @change="change" /> Lock position</label><div><button type="button" @click="layer(-1)">Send back</button><button type="button" @click="layer(1)">Bring forward</button><button type="button" @click="remove">Remove sticker</button></div></fieldset></div></template>
<style scoped>
.design-editor{display:grid;gap:14px}.design-controls{display:grid;grid-template-columns:1fr 1fr;gap:12px}.design-editor label{display:grid;gap:6px;font-size:12px}.design-editor input:not([type=checkbox]):not([type=range]):not([type=file]),.design-editor select{width:100%;min-height:44px;padding:8px 10px;background:#fffdf6;border:1px solid #d6cbb6;border-radius:4px;font-size:16px}.design-editor input[type=color]{padding:3px!important}.form-help{font-size:12px;line-height:1.65;color:#89765d}.design-history{display:flex;gap:8px}.design-editor button,.file-button{min-height:44px;padding:7px 10px;border:1px solid #d7cbb5;background:#f3eddf;border-radius:4px;color:#754253;cursor:pointer;font-size:12px}.design-editor button:disabled{opacity:.4}.design-canvas{position:relative;isolation:isolate;aspect-ratio:5/1;min-height:120px;overflow:hidden;border:1px solid #bfc4aa;background-image:linear-gradient(#bac3a844 1px,transparent 1px),linear-gradient(90deg,#bac3a844 1px,transparent 1px);background-size:20px 20px;display:grid;place-items:center}.design-canvas>strong{font:26px 'Caveat',cursive;text-align:center;margin:0 30px}.design-canvas>button{position:absolute;padding:0;background:transparent;border:1px solid transparent;min-height:0;touch-action:none;font:30px 'Caveat',cursive;user-select:none}.design-canvas>button.chosen{outline:1px dashed #8d6371}.design-canvas img{width:100%;max-height:85px;object-fit:contain;pointer-events:none}.design-stickers{display:flex;gap:5px;flex-wrap:wrap}.design-stickers button{width:44px;padding:5px;font-size:25px}.design-stickers img{width:32px;height:32px;object-fit:contain}.design-uploads{display:flex;flex-wrap:wrap;gap:8px}.file-button{position:relative;display:flex!important;align-items:center;overflow:hidden}.file-button input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%}.decoration-controls{padding:12px;display:grid;gap:10px;border:1px solid #dbcfb7;border-radius:5px}.decoration-controls>div{display:flex;flex-wrap:wrap;gap:6px}.decoration-controls input[type=range]{width:100%;min-height:30px;accent-color:#74283c}.design-editor button:focus-visible,.file-button:focus-within{outline:2px solid #74283c;outline-offset:2px}
</style>

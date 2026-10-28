<script setup lang="ts">
import {ref,computed,watch,nextTick,onBeforeUnmount} from 'vue'
import AppSheet from '@/components/shared/AppSheet.vue'
import UserAvatar from '@/components/shared/UserAvatar.vue'
import {useEditingViewport} from '@/composables/useEditingViewport'
import {supabase} from '@/lib/supabase'
import {avatarBucket,saveAvatar,type AvatarRecord} from '@/services/avatars'
import {prepareAvatarSource,decodeAvatar,renderAvatar,canvasBlob} from '@/services/avatar-images'
import {normalizeAppearance,defaultFrame,defaultCrop,framePresets,bounded,cropGeometry,type FramePreset,type AvatarCrop} from '@/types/avatar'
const props=defineProps<{profile:AvatarRecord}>()
const emit=defineEmits<{close:[];saved:[AvatarRecord,boolean]}>()
useEditingViewport()
const snapshot:AvatarRecord=JSON.parse(JSON.stringify(props.profile)),draft=ref(normalizeAppearance(snapshot.avatar_appearance))
const tab=ref<'photo'|'frames'|'customize'>('photo'),busy=ref(false),preparing=ref(false),error=ref(''),notice=ref(''),removed=ref(false)
const preview=ref<string|undefined>(undefined),stage=ref<HTMLDivElement|null>(null),cropCanvas=ref<HTMLCanvasElement|null>(null)
const controls=computed(()=>framePresets.find(p=>p.id===draft.value.frame.preset)!.controls as readonly string[])
const valid=computed(()=>['primary','secondary','accent'].every(key=>/^#[\da-f]{6}$/i.test(draft.value.frame[key as 'primary']))&&Number.isFinite(draft.value.frame.thickness)&&draft.value.frame.thickness>=1&&draft.value.frame.thickness<=8&&Number.isFinite(draft.value.frame.gap)&&draft.value.frame.gap>=0&&draft.value.frame.gap<=10)
let source:HTMLCanvasElement|null=null,sourceBlob:Blob|undefined,photoChanged=false,previewUrl='',frame=0,epoch=0,alive=true
const canCrop=ref(false)
function close(){if(!busy.value&&!preparing.value)emit('close')}
function choosePreset(preset:FramePreset){draft.value.frame=defaultFrame(preset)}
function paint(){
 cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
  if(!source)return
  const canvas=renderAvatar(source,draft.value.crop),el=cropCanvas.value
  if(el){el.width=canvas.width;el.height=canvas.height;el.getContext('2d')!.drawImage(canvas,0,0)}
  const current=++epoch
  canvas.toBlob(blob=>{if(!alive||current!==epoch||!blob)return;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(blob);preview.value=previewUrl},'image/webp',.88)
 })
}
watch(()=>draft.value.crop,()=>{if(source){photoChanged=true;paint()}},{deep:true})
watch(tab,()=>nextTick(paint))
async function fileChosen(event:Event){
 const input=event.target as HTMLInputElement,file=input.files?.[0];input.value='';if(!file)return
 preparing.value=true;error.value='';notice.value=''
 try{
  const prepared=await prepareAvatarSource(file);if(!alive)return
  source=prepared.canvas;sourceBlob=prepared.blob;removed.value=false;canCrop.value=true;photoChanged=true;draft.value.crop=defaultCrop();await nextTick();paint()
 }catch(e){error.value=e instanceof Error?e.message:'This photo could not be opened. Try another image.'}
 finally{preparing.value=false}
}
async function editExisting(){
 if(source){tab.value='photo';return}
 if(!snapshot.avatar_source_path){notice.value='Upload the original photo to adjust its crop.';return}
 preparing.value=true;error.value=''
 try{
  const {data,error:downloadError}=await supabase.storage.from(avatarBucket).download(snapshot.avatar_source_path)
  if(downloadError||!data)throw new Error('Your original photo could not be opened. Try again or replace it.')
  const image=await decodeAvatar(data);if(!alive){if('close'in image)image.close();return}
  source=document.createElement('canvas');source.width=image.width;source.height=image.height;source.getContext('2d')!.drawImage(image,0,0)
  if('close'in image)image.close();canCrop.value=true;tab.value='photo';await nextTick();paint()
 }catch(e){error.value=e instanceof Error?e.message:'Your photo could not be opened.'}
 finally{preparing.value=false}
}
function remove(){source=null;sourceBlob=undefined;epoch++;cancelAnimationFrame(frame);canCrop.value=false;removed.value=true;photoChanged=false;preview.value='';draft.value.crop=defaultCrop();notice.value='Your initials will appear after you save.'}
function zoom(value:number){draft.value.crop.zoom=bounded(value,1,4)}
function move(axis:'x'|'y',amount:number){draft.value.crop[axis]=bounded(draft.value.crop[axis]+amount,-1,1)}
const pointers=new Map<number,{x:number;y:number}>()
let gesture:{crop:AvatarCrop;points:{x:number;y:number}[]}|null=null
function remember(){gesture={crop:{...draft.value.crop},points:[...pointers.values()].map(p=>({...p}))}}
function pointerDown(event:PointerEvent){if(!source||busy.value)return;event.preventDefault();(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});remember()}
function pointerMove(event:PointerEvent){
 if(!pointers.has(event.pointerId)||!gesture||!source||!stage.value)return
 pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});const points=[...pointers.values()],start=gesture.points,crop={...gesture.crop},rect=stage.value.getBoundingClientRect()
 if(points.length>=2&&start.length>=2){const distance=(p:{x:number;y:number}[])=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);crop.zoom=bounded(gesture.crop.zoom*distance(points)/Math.max(1,distance(start)),1,4)}
 const g=cropGeometry(source.width,source.height,crop,rect.width)
 const middle=(p:{x:number;y:number}[],axis:'x'|'y')=>p.reduce((s,v)=>s+v[axis],0)/p.length
 crop.x=g.excessX?bounded(gesture.crop.x+2*(middle(points,'x')-middle(start,'x'))/g.excessX,-1,1):0
 crop.y=g.excessY?bounded(gesture.crop.y+2*(middle(points,'y')-middle(start,'y'))/g.excessY,-1,1):0
 draft.value.crop=crop
}
function pointerUp(event:PointerEvent){pointers.delete(event.pointerId);remember()}
async function save(){
 if(busy.value||preparing.value||!valid.value)return
 busy.value=true;error.value=''
 try{
  const photo=source&&photoChanged?await canvasBlob(renderAvatar(source,draft.value.crop)):undefined
  const result=await saveAvatar(snapshot,normalizeAppearance(draft.value),{source:sourceBlob,photo,remove:removed.value})
  emit('saved',result.profile,result.cleanupPending)
 }catch(e){error.value=e instanceof Error?e.message:'Your avatar could not be saved. Please retry.'}
 finally{busy.value=false}
}
onBeforeUnmount(()=>{alive=false;epoch++;cancelAnimationFrame(frame);if(previewUrl)URL.revokeObjectURL(previewUrl)})
</script>
<template>
 <AppSheet :model-value="true" title="Photo & frame" @update:model-value="close">
  <div class="avatar-editor" :aria-busy="busy||preparing">
   <p class="intro">A little portrait for the stories you keep.</p>
   <div class="preview-strip"><div><UserAvatar :profile="snapshot" :appearance="draft" :image-url="preview" :size="104"/><span>On your profile</span></div><div><UserAvatar :profile="snapshot" :appearance="draft" :image-url="preview" :size="36"/><span>In navigation</span></div></div>
   <div class="editor-tabs" aria-label="Avatar editor sections"><button v-for="item in (['photo','frames','customize'] as const)" :key="item" :aria-pressed="tab===item" :disabled="busy||preparing" @click="tab=item">{{item==='photo'?'Photo':item==='frames'?'Frames':'Customize'}}</button></div>
   <p v-if="error" role="alert" class="editor-error">{{error}}</p><p v-if="notice" role="status" class="editor-note">{{notice}}</p>
   <section v-show="tab==='photo'" aria-label="Edit profile photo">
    <div class="upload-row"><label class="upload-button" :class="{disabled:busy||preparing}">{{preparing?'Preparing photo…':'Upload / replace photo'}}<input type="file" accept="image/jpeg,image/png,image/webp" :disabled="busy||preparing" @change="fileChosen"/></label><button v-if="!removed&&(snapshot.avatar_url||snapshot.avatar_storage_path||canCrop)" :disabled="busy||preparing" @click="remove">Remove photo</button></div>
    <p class="help">JPEG, PNG or WebP · up to 5 MB · at least 64 × 64 pixels. Your photo stays private.</p>
    <template v-if="canCrop">
     <p class="crop-instruction">Drag to reposition. Pinch to zoom, or use the controls below.</p>
     <div ref="stage" class="crop-stage" aria-label="Photo crop preview" @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerUp" @pointercancel="pointerUp" @lostpointercapture="pointerUp"><canvas ref="cropCanvas"/><div class="crop-guide" aria-hidden="true"/></div>
     <div class="crop-controls"><div class="zoom-controls"><button aria-label="Zoom out" :disabled="busy||draft.crop.zoom<=1" @click="zoom(draft.crop.zoom-.1)">−</button><label>Zoom<input type="range" aria-label="Photo zoom" min="1" max="4" step=".01" :value="draft.crop.zoom" :disabled="busy" @input="zoom(Number(($event.target as HTMLInputElement).value))"/></label><button aria-label="Zoom in" :disabled="busy||draft.crop.zoom>=4" @click="zoom(draft.crop.zoom+.1)">+</button></div><div class="move-controls" aria-label="Reposition photo"><button aria-label="Move photo left" :disabled="busy" @click="move('x',-.1)">←</button><button aria-label="Move photo up" :disabled="busy" @click="move('y',-.1)">↑</button><button aria-label="Move photo down" :disabled="busy" @click="move('y',.1)">↓</button><button aria-label="Move photo right" :disabled="busy" @click="move('x',.1)">→</button></div><div class="crop-actions"><button :disabled="busy" @click="draft.crop={...draft.crop,rotation:((draft.crop.rotation+90)%360) as AvatarCrop['rotation'],x:0,y:0}">Rotate 90°</button><button :disabled="busy" @click="draft.crop=defaultCrop()">Reset crop</button></div></div>
    </template>
    <button v-else-if="!removed&&snapshot.avatar_source_path" class="recrop-button" :disabled="busy||preparing" @click="editExisting">Adjust current photo crop</button>
    <div v-else class="photo-empty"><span aria-hidden="true">✧</span><p>{{removed?'A fresh start with your initials.':'Choose a photo, or make your initials your own with a frame.'}}</p></div>
   </section>
   <section v-show="tab==='frames'" aria-label="Choose an avatar frame"><p class="help">Original frames, made for Cronevia. Select one to preview it.</p><div class="preset-grid"><button v-for="preset in framePresets" :key="preset.id" :aria-label="preset.name" :aria-pressed="draft.frame.preset===preset.id" :disabled="busy" @click="choosePreset(preset.id)"><UserAvatar aria-hidden="true" :profile="snapshot" :image-url="preview" :appearance="{...draft,frame:defaultFrame(preset.id)}" :size="60"/><span>{{preset.name}}</span><b v-if="draft.frame.preset===preset.id" aria-hidden="true">✓</b></button></div></section>
   <section v-show="tab==='customize'" aria-label="Customize avatar frame"><p v-if="!controls.length" class="help">Choose a frame to customize its colors and border.</p><template v-else><h3>{{framePresets.find(p=>p.id===draft.frame.preset)?.name}}</h3><div v-for="key in (['primary','secondary','accent'] as const)" v-show="controls.includes(key)" :key="key" class="color-row"><label :for="`avatar-${key}`">{{key==='primary'?'Primary color':key==='secondary'?'Secondary color':'Accent color'}}</label><input type="color" :aria-label="`${key} color picker`" :value="draft.frame[key]" :disabled="busy" @input="draft.frame[key]=($event.target as HTMLInputElement).value"/><input :id="`avatar-${key}`" v-model="draft.frame[key]" :disabled="busy" maxlength="7" spellcheck="false" :aria-invalid="!/^#[\da-f]{6}$/i.test(draft.frame[key])"/></div><p v-if="!valid" role="alert" class="editor-error">Use a six-digit hex color, such as #79283e.</p><label v-for="key in (['thickness','gap'] as const)" v-show="controls.includes(key)" :key="key" class="number-row">{{key==='thickness'?'Border thickness':'Space around photo'}}<input v-model.number="draft.frame[key]" :disabled="busy" type="number" :min="key==='gap'?0:1" :max="key==='gap'?10:8" step=".5"/></label><button :disabled="busy" @click="draft.frame=defaultFrame(draft.frame.preset)">Reset frame to defaults</button></template></section>
  </div>
  <template #footer><div class="editor-footer"><span role="status">{{busy?'Saving your portrait…':'Changes stay a draft until you save.'}}</span><div><button :disabled="busy||preparing" @click="close">Cancel</button><button class="save-avatar" :disabled="busy||preparing||!valid" @click="save">{{busy?'Saving…':'Save appearance'}}</button></div></div></template>
 </AppSheet>
</template>
<style scoped>
.avatar-editor{color:#51493f;min-width:0}.intro{margin:0 0 16px;color:#827568;font:italic 17px Georgia,serif}.preview-strip{position:sticky;top:0;z-index:3;display:flex;justify-content:center;align-items:center;gap:44px;min-height:140px;padding:12px;background:#f2ebdf;border:1px solid #e2dbcd;border-radius:8px}.preview-strip>div{display:flex;align-items:center;flex-direction:column;gap:8px}.preview-strip span{font-size:11px;color:#827568}.editor-tabs{display:flex;gap:4px;margin:20px 0 16px;border-bottom:1px solid #d8d0c0}.editor-tabs button{flex:1;border:0;border-radius:4px 4px 0 0;background:transparent}.editor-tabs button[aria-pressed=true]{color:#74283c;background:#eee2d1;box-shadow:inset 0 -2px #74283c}.avatar-editor button,.editor-footer button,.upload-button{min-height:44px;padding:9px 12px;border:1px solid #d8c8b3;border-radius:5px;color:#74283c;background:#fffefa;font:inherit;font-size:14px;cursor:pointer}.avatar-editor button:disabled,.editor-footer button:disabled,.disabled{opacity:.55;cursor:wait}.avatar-editor button:focus-visible,.editor-footer button:focus-visible,.upload-button:focus-within{outline:2px solid #74283c;outline-offset:3px}.upload-row{display:flex;flex-wrap:wrap;gap:8px}.upload-button{display:inline-flex;align-items:center;position:relative}.upload-button input{position:absolute;width:1px;height:1px;opacity:0}.help,.crop-instruction{font-size:12px;line-height:1.6;color:#827568;margin:12px 0}.crop-instruction{color:#51493f}.photo-empty{text-align:center;padding:32px 10px;color:#827568;font:italic 16px/1.5 Georgia,serif}.photo-empty span{font-size:36px;color:#a29279}.crop-stage{position:relative;width:min(100%,280px);aspect-ratio:1;margin:16px auto;touch-action:none;cursor:grab;overflow:hidden;background:repeating-conic-gradient(#e1d9cd 0% 25%,#f7f1e8 0% 50%) 50% / 16px 16px;border-radius:4px}.crop-stage:active{cursor:grabbing}.crop-stage canvas{width:100%;height:100%;pointer-events:none}.crop-guide{position:absolute;inset:0;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 80px #201c2966;pointer-events:none}.crop-controls{display:grid;gap:8px}.zoom-controls{display:flex;align-items:center;gap:10px}.zoom-controls label{flex:1;font-size:12px;display:grid;gap:2px}.zoom-controls input{width:100%;min-height:30px;accent-color:#74283c}.zoom-controls button,.move-controls button{width:44px;font-size:20px}.move-controls,.crop-actions{display:flex;justify-content:center;gap:8px}.crop-actions{flex-wrap:wrap}.recrop-button{margin:12px 0}.preset-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.preset-grid button{position:relative;padding:10px 4px;display:flex;flex-direction:column;align-items:center;gap:6px;min-height:114px;font-size:11px;line-height:1.3;color:#51493f}.preset-grid button[aria-pressed=true]{border-color:#74283c;background:#f2e6df;box-shadow:inset 0 0 0 1px #74283c}.preset-grid b{position:absolute;top:5px;right:6px;color:#74283c}.avatar-editor h3{font:21px Georgia,serif;color:#74283c;margin:12px 0 20px}.color-row{display:grid;grid-template-columns:1fr 44px 108px;gap:8px;align-items:center;margin:14px 0}.color-row label,.number-row{font-size:13px}.avatar-editor input:not([type=range]):not([type=file]){min-width:0;min-height:44px;border:1px solid #d8c8b3;border-radius:4px;background:#fffefa;color:#51493f;padding:8px;font-size:16px}.avatar-editor input[type=color]{width:44px;padding:3px!important}.avatar-editor input[aria-invalid=true]{border-color:#842e25!important}.number-row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:14px 0}.number-row input{width:108px}.editor-error,.editor-note{padding:12px;border-radius:4px;font-size:13px;line-height:1.5}.editor-error{color:#842e25;background:#f9e7e3}.editor-note{color:#476044;background:#e8eee2}.editor-footer{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px}.editor-footer>span{font-size:11px;color:#827568}.editor-footer>div{display:flex;gap:8px;margin-left:auto}.editor-footer .save-avatar{background:#74283c;color:#fffaf2;border-color:#74283c}@media(max-width:400px){.color-row{grid-template-columns:1fr 44px 98px;gap:6px}.editor-footer>span{width:100%}.preview-strip{gap:28px}.preset-grid{gap:6px}.preset-grid button{font-size:10px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
</style>

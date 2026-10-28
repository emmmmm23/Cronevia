<script setup lang="ts">
import {ref,watch,nextTick,onBeforeUnmount} from 'vue'
const props=withDefaults(defineProps<{modelValue:boolean;title:string;docked?:boolean;fullscreen?:boolean}>(),{docked:false,fullscreen:false})
const emit=defineEmits<{'update:modelValue':[boolean]}>()
const dialog=ref<HTMLDialogElement|null>(null)
let previous:HTMLElement|null=null
let backdropPressed=false
watch(()=>[props.modelValue,props.docked,dialog.value],async()=>{
 await nextTick();const el=dialog.value;if(!el)return
 if(props.docked){if(el.open)el.close();el.show();return}
 if(props.modelValue){if(!el.matches(':modal')){if(el.open)el.close();previous=document.activeElement as HTMLElement;el.showModal()}}
 else if(el.open){el.close();if(previous?.isConnected)previous.focus({preventScroll:true})}
},{immediate:true})
function close(){emit('update:modelValue',false)}
function isBackdrop(event:MouseEvent){if(props.docked||event.target!==dialog.value)return false;const r=dialog.value!.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom}
function backdrop(event:MouseEvent){if(backdropPressed&&isBackdrop(event))close();backdropPressed=false}
onBeforeUnmount(()=>{if(dialog.value?.open)dialog.value.close();if(previous?.isConnected)previous.focus({preventScroll:true})})
</script>
<template>
 <dialog ref="dialog" class="app-sheet" :class="{docked,fullscreen,'with-footer':!!$slots.footer}" :aria-label="title" @keydown.esc.stop @cancel.prevent="close" @pointerdown="backdropPressed=isBackdrop($event)" @click="backdrop">
  <header v-if="!docked" class="sheet-header"><h2>{{title}}</h2><button aria-label="Close sheet" @click="close">×</button></header>
  <div class="sheet-content"><slot /></div>
  <footer v-if="$slots.footer" class="sheet-footer"><slot name="footer" /></footer>
 </dialog>
</template>
<style scoped>
.app-sheet{position:fixed;inset:auto 0 var(--keyboard-inset,0px);margin:0 auto;width:min(100%,540px);max-width:100%;max-height:min(80dvh,calc(var(--visual-height,100dvh) * .85));padding:0;color:#51493f;border:1px solid #d8d0c0;border-radius:20px 20px 0 0;background:#faf6ed;box-shadow:0 -12px 60px #392c3320;overscroll-behavior:contain}
.app-sheet::backdrop{background:#2e28294d;backdrop-filter:blur(2px)}
.sheet-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 20px;border-bottom:1px solid #e2dbcd;position:sticky;top:0;background:#faf6ed;z-index:5}.sheet-header h2{font:25px 'Crimson Text',Georgia,serif;margin:0}.sheet-header button{border:0;background:#eee8dd;border-radius:50%;min-width:44px;min-height:44px;font-size:26px;color:#74283c}
.sheet-content{padding:20px 20px max(24px,env(safe-area-inset-bottom))}.app-sheet.docked{display:block;position:sticky;inset:auto;top:20px;width:auto;max-height:none;margin:0;border-radius:12px;box-shadow:0 8px 28px #54483a08;overflow:visible}.docked .sheet-content{padding:0}
.app-sheet.fullscreen{inset:0;width:100%;height:var(--visual-height,100dvh);max-height:100dvh;border-radius:0;background:#292927;color:#faf6ed}.fullscreen .sheet-header{background:#292927;border-color:#4d4b45}.fullscreen .sheet-content{height:calc(100% - 72px);display:flex;flex-direction:column}
button:focus-visible{outline:2px solid #74283c;outline-offset:3px}
.app-sheet.with-footer[open]{display:flex;flex-direction:column}.with-footer .sheet-content{overflow-y:auto;min-height:0;overscroll-behavior:contain}.with-footer .sheet-header{flex-shrink:0}.sheet-footer{flex-shrink:0;padding:12px 20px max(12px,env(safe-area-inset-bottom));background:#faf6ed;border-top:1px solid #e2dbcd}
@media(min-width:960px){.app-sheet:not(.docked):not(.fullscreen){inset:10dvh 0 auto;border-radius:16px}}
</style>

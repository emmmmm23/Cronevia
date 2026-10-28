<script lang="ts">
let nextAvatarId=0
</script>
<script setup lang="ts">
import {computed,ref,watch,nextTick,onBeforeUnmount} from 'vue'
import {avatarUrl} from '@/services/avatars'
import {initials,normalizeAppearance,type AvatarAppearance,type AvatarProfile} from '@/types/avatar'
const props=withDefaults(defineProps<{profile?:AvatarProfile|null;name?:string;size?:number;appearance?:AvatarAppearance;imageUrl?:string|null}>(),{size:80})
const id=`avatar-art-${++nextAvatarId}`,src=ref(''),state=ref('initials')
const appearance=computed(()=>normalizeAppearance(props.appearance??props.profile?.avatar_appearance)),f=computed(()=>appearance.value.frame)
const displayName=computed(()=>props.name||props.profile?.full_name||'Cronevia')
const small=computed(()=>props.size<48)
const inset=computed(()=>f.value.preset==='none'?4:Math.min(34,Math.max(12,(f.value.preset==='floral'||f.value.preset==='stars'?17:10)+f.value.gap+f.value.thickness/2)))
let generation=0,retried=false,timer:ReturnType<typeof setTimeout>|undefined
async function load(force=false){
 const current=++generation;clearTimeout(timer)
 const path=props.profile?.avatar_storage_path
 if(!force){retried=false;src.value='';state.value='initials'}
 try{
  let url=props.imageUrl
  if(url===undefined){
   if(path)url=await avatarUrl(path,force)
   else{const legacy=props.profile?.avatar_url;url=legacy&&/^https:\/\//i.test(legacy)?legacy:null}
  }
  if(current!==generation)return
  src.value=url||'';if(!force&&url)state.value='loading'
  if(path&&props.imageUrl===undefined)timer=setTimeout(()=>load(true),40*60*1000)
 }catch{if(current===generation){src.value='';state.value='error'}}
}
async function failed(){if(props.profile?.avatar_storage_path&&props.imageUrl===undefined&&!retried){retried=true;src.value='';await nextTick();void load(true)}else{src.value='';state.value='error'}}
watch(()=>[props.profile?.avatar_storage_path,props.profile?.avatar_url,props.imageUrl],()=>void load(),{immediate:true})
onBeforeUnmount(()=>{generation++;clearTimeout(timer)})
const orbit=(n:number,r=42)=>Array.from({length:n},(_,i)=>({x:50+Math.cos(i*2*Math.PI/n-Math.PI/2)*r,y:50+Math.sin(i*2*Math.PI/n-Math.PI/2)*r,angle:i*360/n}))
const stamp=computed(()=>Array.from({length:96},(_,i)=>{const angle=i*Math.PI*2/96,r=i%4<2?46:43;return `${50+Math.cos(angle)*r},${50+Math.sin(angle)*r}`}).join(' '))
</script>
<template>
 <span class="user-avatar" role="img" :aria-label="`${displayName}’s avatar`" :data-frame="f.preset" :data-avatar-state="state" :style="{width:`${size}px`,height:`${size}px`}">
  <span class="avatar-face" :style="{inset:`${inset}%`}"><span class="avatar-initials">{{initials(displayName)}}</span><img v-if="src" :src="src" alt="" decoding="async" referrerpolicy="no-referrer" :style="{opacity:state==='photo'?1:0}" @load="state='photo'" @error="failed" /></span>
  <svg v-if="f.preset!=='none'" class="avatar-frame" viewBox="0 0 100 100" aria-hidden="true" fill="none" :stroke="f.primary" :stroke-width="f.thickness">
   <circle v-if="f.preset==='solid'" cx="50" cy="50" r="44" />
   <g v-else-if="f.preset==='double'"><circle cx="50" cy="50" r="45"/><circle cx="50" cy="50" r="39" :stroke="f.secondary" :stroke-width="Math.max(1,f.thickness*.55)"/></g>
   <circle v-else-if="f.preset==='dotted'" cx="50" cy="50" r="44" stroke-linecap="round" stroke-dasharray=".1 7" />
   <circle v-else-if="f.preset==='dashed'" cx="50" cy="50" r="44" stroke-dasharray="9 5" />
   <template v-else-if="f.preset==='pastel'"><defs><linearGradient :id="id" x1="0" y1="0" x2="1" y2="1"><stop :stop-color="f.primary"/><stop offset="1" :stop-color="f.secondary"/></linearGradient></defs><circle cx="50" cy="50" r="44" :stroke="`url(#${id})`"/></template>
   <g v-else-if="f.preset==='burgundy-gold'"><circle cx="50" cy="50" r="44"/><circle cx="50" cy="50" r="44" :stroke="f.secondary" :stroke-width="Math.max(1,f.thickness*.35)"/><circle v-for="p in orbit(small?4:8,44)" :key="p.angle" :cx="p.x" :cy="p.y" r="1.4" :fill="f.accent" stroke="none"/></g>
   <g v-else-if="f.preset==='hand-drawn'" stroke-linecap="round"><path d="M50 6C75 4 96 26 94 50S77 94 50 94 6 77 7 50 25 5 50 6Z"/><path v-if="!small" d="M52 9C78 10 92 29 91 52S72 92 48 91 9 71 10 48 29 8 52 9Z" :stroke-width="Math.max(.5,f.thickness*.3)" opacity=".65"/></g>
   <g v-else-if="f.preset==='stitched'"><circle cx="50" cy="50" r="44" :stroke-width="f.thickness+3"/><circle cx="50" cy="50" r="44" :stroke="f.secondary" :stroke-width="Math.max(.8,f.thickness*.35)" stroke-dasharray="3 3"/></g>
   <g v-else-if="f.preset==='postage'"><defs><mask :id="id"><rect width="100" height="100" fill="white"/><circle cx="50" cy="50" :r="50-inset" fill="black"/></mask></defs><polygon :points="stamp" :fill="f.secondary" :mask="`url(#${id})`"/><circle cx="50" cy="50" r="38" :stroke-width="Math.max(.8,f.thickness*.35)" stroke-dasharray="1 3"/></g>
   <g v-else-if="f.preset==='floral'" stroke-width="1"><circle cx="50" cy="50" r="41" :stroke="f.accent"/><g v-for="p in orbit(small?4:8,42)" :key="p.angle" :transform="`translate(${p.x} ${p.y}) rotate(${p.angle})`"><ellipse cx="4" cy="4" rx="3.8" ry="1.8" :fill="f.accent" :stroke="f.accent" transform="rotate(30)"/><path v-if="!small" d="M0 0C-7-9-11 0-4 2C-10 9 0 11 1 4C8 11 11 1 4 0C10-7 0-11 0-4Z" :fill="f.primary"/><circle v-else r="4" :fill="f.primary"/><circle r="1.6" :fill="f.secondary" stroke="none"/></g></g>
   <g v-else-if="f.preset==='stars'" :stroke="f.primary" stroke-width="1"><circle cx="50" cy="50" r="42" stroke-dasharray="1 5"/><path v-for="p in orbit(small?4:7,43)" :key="p.angle" :transform="`translate(${p.x} ${p.y})`" d="M0-5 1.5-1.5 5 0 1.5 1.5 0 5-1.5 1.5-5 0-1.5-1.5Z" :fill="f.accent"/></g>
   <g v-else-if="f.preset==='scrapbook'"><defs><mask :id="id"><rect width="100" height="100" fill="white"/><circle cx="50" cy="50" :r="50-inset" fill="black"/></mask></defs><g :mask="`url(#${id})`"><path d="M12 9 88 11 91 88 10 90Z" :fill="f.secondary" :stroke-width="f.thickness"/><path d="M20 10 40 8 39 17 19 19ZM69 82 89 80 90 89 70 91Z" :fill="f.accent" stroke="none"/><path v-if="!small" d="M14 24 15 73M83 24 84 73" :stroke="f.primary" stroke-dasharray="2 3" stroke-width="1"/></g></g>
  </svg>
 </span>
</template>
<style scoped>
.user-avatar{position:relative;display:inline-block;flex-shrink:0;vertical-align:middle;isolation:isolate;color-scheme:light;--theme-light-surface:initial;font-family:Georgia,serif;container-type:inline-size}.avatar-face{position:absolute;display:grid;place-items:center;overflow:hidden;border-radius:50%;background:#eee2cd;color:#79283e}.avatar-initials{font-size:34cqw;line-height:1;font-weight:500}.avatar-face img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.avatar-frame{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}.user-avatar :deep(*){box-sizing:border-box}
</style>

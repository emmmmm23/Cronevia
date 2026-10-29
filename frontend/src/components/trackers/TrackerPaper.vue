<script setup lang="ts">
import { ref, watch,computed,onMounted,onBeforeUnmount } from 'vue'
import { trackerAssetUrl } from '@/services/trackers.service'
import TrackerDecorations from './TrackerDecorations.vue'
import type { TrackerDecoration, TrackerDesign } from '@/types/trackers'
const props=withDefaults(defineProps<{design:TrackerDesign;title:string;editable?:boolean;selectedId?:string}>(),{editable:false,selectedId:''})
const emit=defineEmits<{'update:decorations':[TrackerDecoration[]];'update:selectedId':[string];commit:[]}>()
const urls=ref<Record<string,string>>({})
const paper=ref<HTMLElement>(),heading=ref<HTMLElement>()
const bounds=ref({width:600,height:120,left:24,top:0,headingWidth:552,headingHeight:120})
const pageDecorations=computed(()=>props.design.decorations.map(d=>d.space==='page'?d:{...d,space:'page' as const,x:(bounds.value.left+d.x*bounds.value.headingWidth)/bounds.value.width,y:(bounds.value.top+d.y*bounds.value.headingHeight)/bounds.value.height,width:Math.max(.05,d.width*bounds.value.headingWidth/bounds.value.width)}))
let observer:ResizeObserver|undefined
function measure(){if(!paper.value||!heading.value)return;const p=paper.value,h=heading.value,r=p.getBoundingClientRect(),s=h.getBoundingClientRect();const next={width:p.clientWidth||600,height:p.clientHeight||120,left:s.left-r.left-p.clientLeft,top:s.top-r.top-p.clientTop,headingWidth:s.width,headingHeight:s.height};if(JSON.stringify(next)!==JSON.stringify(bounds.value))bounds.value=next}
onMounted(()=>{measure();observer=new ResizeObserver(measure);if(paper.value)observer.observe(paper.value);if(heading.value)observer.observe(heading.value)})
onBeforeUnmount(()=>observer?.disconnect())
let generation=0
watch(()=>[props.design.background,...props.design.decorations.map(d=>d.asset)].filter(Boolean).join('\n'),async ()=>{
 const design=props.design
 const current=++generation
 const paths=[design.background,...design.decorations.map(d=>d.asset)].filter(Boolean) as string[]
 const results=await Promise.allSettled(paths.map(async path=>[path,await trackerAssetUrl(path)]))
 if(current!==generation)return
 const next:Record<string,string>={}
 for(const result of results)if(result.status==='fulfilled')next[result.value[0]]=result.value[1]
 urls.value=next
},{immediate:true,deep:true})
</script>
<template><div ref="paper" class="tracker-paper" :class="['paper-'+design.paper,'font-'+design.font,{ 'editing-stickers': editable }]" :style="{'--paper-color':design.color,'--tracker-accent':design.accent}"><div v-if="design.background&&urls[design.background]" class="paper-background" :style="{backgroundImage:'url('+urls[design.background]+')'}"></div><header ref="heading" class="paper-heading"><span class="paper-corner" aria-hidden="true">✧</span><h3>{{design.heading||title}}</h3></header><div class="paper-content"><slot /></div><TrackerDecorations :decorations="pageDecorations" :urls="urls" :editable="editable" :selected-id="selectedId" @update:decorations="emit('update:decorations',$event)" @update:selected-id="emit('update:selectedId',$event)" @commit="emit('commit')" /></div></template>
<style scoped>
.tracker-paper{position:relative;isolation:isolate;overflow:clip;background-color:var(--paper-color);border:1px solid #c7c6ae;box-shadow:0 5px 0 -2px #eee5d3,0 6px 0 -2px #cfc2aa,0 12px 25px #55452d0b;border-radius:3px;min-width:0}.paper-grid{background-image:linear-gradient(#a9b5a433 1px,transparent 1px),linear-gradient(90deg,#a9b5a433 1px,transparent 1px);background-size:21px 21px}.paper-dot{background-image:radial-gradient(#9b9f7b77 1px,transparent 1px);background-size:17px 17px}.paper-lined{background-image:linear-gradient(#a9b5a444 1px,transparent 1px);background-size:100% 27px}.paper-background{position:absolute;inset:0;z-index:-1;opacity:.16;background-size:cover;background-position:center;pointer-events:none}.paper-heading{position:relative;min-height:110px;aspect-ratio:5/1;margin:0 24px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid #a9af9366}.paper-heading h3{position:relative;margin:10px 40px;color:var(--tracker-accent);font:600 clamp(27px,3vw,37px) 'Caveat',cursive;text-align:center;letter-spacing:.05em;text-transform:uppercase;overflow-wrap:anywhere}.font-serif .paper-heading h3{font:26px 'Playfair Display',Georgia,serif;text-transform:none;letter-spacing:-.02em}.font-sans .paper-heading h3{font:600 24px 'Inter',sans-serif;text-transform:none;letter-spacing:-.02em}.paper-corner{position:absolute;left:5px;top:20px;color:var(--tracker-accent);font-size:30px;transform:rotate(-15deg)}.paper-content{position:relative;padding:20px 24px 24px;z-index:1}@media(max-width:650px){.paper-content{padding:15px}.paper-heading{margin-inline:15px;min-height:95px}.paper-heading h3{font-size:31px}}
</style>
<style scoped>
.editing-stickers{overflow:visible}.editing-stickers .paper-heading{z-index:2}.paper-heading{aspect-ratio:auto;min-height:120px}.paper-heading h3{min-width:0;max-width:100%;flex:1;margin:12px 20px;overflow-wrap:anywhere}
</style>

<style scoped>.tracker-paper :deep(>.paper-decorations){z-index:10}.editing-stickers .paper-content{pointer-events:none}</style>

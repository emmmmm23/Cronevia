<script setup lang="ts">
import { ref, watch } from 'vue'
import { trackerAssetUrl } from '@/services/trackers.service'
import type { TrackerDesign } from '@/types/trackers'
const props=defineProps<{design:TrackerDesign;title:string}>()
const urls=ref<Record<string,string>>({})
let generation=0
watch(()=>props.design,async design=>{
 const current=++generation
 const paths=[design.background,...design.decorations.map(d=>d.asset)].filter(Boolean) as string[]
 const results=await Promise.allSettled(paths.map(async path=>[path,await trackerAssetUrl(path)]))
 if(current!==generation)return
 const next:Record<string,string>={}
 for(const result of results)if(result.status==='fulfilled')next[result.value[0]]=result.value[1]
 urls.value=next
},{immediate:true,deep:true})
</script>
<template><div class="tracker-paper" :class="['paper-'+design.paper,'font-'+design.font]" :style="{'--paper-color':design.color,'--tracker-accent':design.accent}"><div v-if="design.background&&urls[design.background]" class="paper-background" :style="{backgroundImage:'url('+urls[design.background]+')'}"></div><header class="paper-heading"><span class="paper-corner" aria-hidden="true">✧</span><h3>{{design.heading||title}}</h3><div class="paper-decorations" aria-hidden="true"><span v-for="d in design.decorations" :key="d.id" :style="{left:d.x*100+'%',top:d.y*100+'%',width:d.width*100+'%',transform:'translate(-50%,-50%) rotate('+d.rotation+'deg)',zIndex:d.z}"><img v-if="d.asset&&urls[d.asset]" :src="urls[d.asset]" alt="" /><span v-else>{{d.text}}</span></span></div></header><div class="paper-content"><slot /></div></div></template>
<style scoped>
.tracker-paper{position:relative;isolation:isolate;overflow:hidden;background-color:var(--paper-color);border:1px solid #c7c6ae;box-shadow:0 5px 0 -2px #eee5d3,0 6px 0 -2px #cfc2aa,0 12px 25px #55452d0b;border-radius:3px;min-width:0}.paper-grid{background-image:linear-gradient(#a9b5a433 1px,transparent 1px),linear-gradient(90deg,#a9b5a433 1px,transparent 1px);background-size:21px 21px}.paper-dot{background-image:radial-gradient(#9b9f7b77 1px,transparent 1px);background-size:17px 17px}.paper-lined{background-image:linear-gradient(#a9b5a444 1px,transparent 1px);background-size:100% 27px}.paper-background{position:absolute;inset:0;z-index:-1;opacity:.16;background-size:cover;background-position:center;pointer-events:none}.paper-heading{position:relative;min-height:110px;aspect-ratio:5/1;margin:0 24px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid #a9af9366}.paper-heading h3{position:relative;margin:10px 40px;color:var(--tracker-accent);font:600 clamp(27px,3vw,37px) 'Caveat',cursive;text-align:center;letter-spacing:.05em;text-transform:uppercase;overflow-wrap:anywhere}.font-serif .paper-heading h3{font:26px 'Playfair Display',Georgia,serif;text-transform:none;letter-spacing:-.02em}.font-sans .paper-heading h3{font:600 24px 'Inter',sans-serif;text-transform:none;letter-spacing:-.02em}.paper-corner{position:absolute;left:5px;top:20px;color:var(--tracker-accent);font-size:30px;transform:rotate(-15deg)}.paper-decorations{position:absolute;inset:0;pointer-events:none}.paper-decorations>span{position:absolute;display:block;text-align:center;line-height:1;font:26px 'Caveat',cursive;color:var(--tracker-accent)}.paper-decorations img{max-width:100%;max-height:100px;object-fit:contain;display:block;width:100%}.paper-content{position:relative;padding:20px 24px 24px;z-index:1}@media(max-width:650px){.paper-content{padding:15px}.paper-heading{margin-inline:15px;min-height:95px}.paper-heading h3{font-size:31px}.paper-decorations img{max-height:80px}}
</style>
<style scoped>
.paper-heading{aspect-ratio:auto;min-height:120px}.paper-heading h3{min-width:0;max-width:100%;flex:1;margin:12px 20px;overflow-wrap:anywhere}
</style>

<script setup lang="ts">
import { mapStyle, addMapBranding } from '@/services/map-style'
import { onBeforeUnmount,onMounted,ref,watch } from 'vue'
import type * as MapLibre from 'maplibre-gl'
import { validCoordinates } from '@/types/destination'
import 'maplibre-gl/dist/maplibre-gl.css'
type Place={id:string;title:string;date:string;type:string;latitude:number|null;longitude:number|null;location:string}
const props=defineProps<{places:Place[];selectedId:string|null}>()
const emit=defineEmits<{select:[id:string]}>()
const canvas=ref<HTMLDivElement>()
let map:MapLibre.Map|undefined, markers:MapLibre.Marker[]=[], disposed=false
let maplibre: typeof MapLibre.default | undefined
function draw(){if(!map)return;markers.forEach(marker=>marker.remove());markers=[]
 const points=props.places.filter(p=>validCoordinates(p.latitude,p.longitude))
 for(const [index,point] of points.entries()){
  const button=document.createElement('button');button.type='button';button.className=`saved-map-pin${point.id===props.selectedId?' is-selected':''}`;button.textContent=String(index+1);button.setAttribute('aria-label',`Show ${point.title}`);button.addEventListener('click',()=>emit('select',point.id))
  if(maplibre) markers.push(new maplibre.Marker({element:button}).setLngLat([point.longitude!,point.latitude!]).addTo(map!))
 }
 if(points.length>1&&maplibre){const bounds=new maplibre.LngLatBounds();points.forEach(point=>bounds.extend([point.longitude!,point.latitude!]));map.fitBounds(bounds,{padding:60,maxZoom:11,duration:0})}
 else if(points[0])map.jumpTo({center:[points[0].longitude!,points[0].latitude!],zoom:8})
 else map.jumpTo({center:[122,12],zoom:4})
}
function focus(){const point=props.places.find(item=>item.id===props.selectedId);if(point&&validCoordinates(point.latitude,point.longitude))map?.flyTo({center:[point.longitude!,point.latitude!],zoom:10,duration:450})}
watch(()=>props.places,draw,{deep:true});watch(()=>props.selectedId,focus)
onMounted(async()=>{try{maplibre=(await import('maplibre-gl')).default;if(disposed||!canvas.value)return;map=new maplibre.Map({container:canvas.value,center:[122,12],zoom:4,style:mapStyle()});addMapBranding(map);map.addControl(new maplibre.NavigationControl({showCompass:false}));map.on('load',draw)}catch{/* The accompanying place index remains usable when tiles are unavailable. */}})
onBeforeUnmount(()=>{disposed=true;markers.forEach(marker=>marker.remove());map?.remove()})
</script>
<template><div class="saved-map-frame"><div class="saved-map-heading"><div><span class="map-compass">N</span><span>YOUR PERSONAL ATLAS</span></div><small>{{places.length}} remembered {{places.length===1?'place':'places'}}</small></div><div ref="canvas" class="saved-map-canvas" role="img" aria-label="Map of the places you have saved"/><div class="map-imprint"><span>CRONEVIA · FIELD ATLAS</span><span>YOUR PLACES, KEPT CLOSE</span></div></div></template>
<style scoped>.saved-map-frame{border:1px solid #d7cbb7;border-radius:5px;padding:12px;background:#fbf8f0;box-shadow:0 8px 28px #59462c0b}.saved-map-heading,.map-imprint{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:3px 4px 11px;color:#81735e;font-size:9px;letter-spacing:.15em}.saved-map-heading>div{display:flex;align-items:center;gap:9px}.saved-map-heading small{font-size:10px;letter-spacing:.04em}.map-compass{display:grid;place-items:center;width:25px;height:25px;border:1px solid #bdae94;border-radius:50%;font:12px Georgia,serif;color:#74283c}.saved-map-canvas{height:clamp(300px,55dvh,540px);overflow:hidden;border-radius:3px;background:#e5e9df;touch-action:none}.map-imprint{padding:10px 4px 1px;font-size:8px}.saved-map-canvas :deep(.maplibregl-ctrl-group button){width:44px;height:44px}.saved-map-canvas :deep(.saved-map-pin){display:grid;place-items:center;width:35px;height:35px;padding:0;border:2px solid #fffaf0;border-radius:50%;background:#74283c;color:#fffaf0;box-shadow:0 2px 8px #392b3340;font:12px Georgia,serif;cursor:pointer}.saved-map-canvas :deep(.saved-map-pin.is-selected){background:#73806a;transform:scale(1.2)}@media(max-width:560px){.saved-map-frame{padding:8px}.saved-map-canvas{height:48dvh;min-height:280px}}</style>

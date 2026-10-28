export const framePresets = [
 {id:'none',name:'None',controls:[]},
 {id:'solid',name:'Classic solid ring',controls:['primary','thickness','gap']},
 {id:'double',name:'Double ring',controls:['primary','secondary','thickness','gap']},
 {id:'dotted',name:'Dotted ring',controls:['primary','thickness','gap']},
 {id:'dashed',name:'Dashed ring',controls:['primary','thickness','gap']},
 {id:'pastel',name:'Soft pastel gradient',controls:['primary','secondary','thickness','gap']},
 {id:'burgundy-gold',name:'Burgundy and gold',controls:['primary','secondary','accent','thickness','gap']},
 {id:'hand-drawn',name:'Hand-drawn outline',controls:['primary','thickness','gap']},
 {id:'stitched',name:'Stitched border',controls:['primary','secondary','thickness','gap']},
 {id:'postage',name:'Postage-stamp edge',controls:['primary','secondary','thickness','gap']},
 {id:'floral',name:'Floral wreath',controls:['primary','secondary','accent','gap']},
 {id:'stars',name:'Small stars',controls:['primary','accent','gap']},
 {id:'scrapbook',name:'Scrapbook paper frame',controls:['primary','secondary','accent','thickness','gap']},
] as const
export type FramePreset = typeof framePresets[number]['id']
export interface AvatarFrame {preset:FramePreset;primary:string;secondary:string;accent:string;thickness:number;gap:number}
export interface AvatarCrop {zoom:number;x:number;y:number;rotation:0|90|180|270}
export interface AvatarAppearance {version:1;frame:AvatarFrame;crop:AvatarCrop}
export const defaultCrop=():AvatarCrop=>({zoom:1,x:0,y:0,rotation:0})
export function defaultFrame(preset:FramePreset='none'):AvatarFrame{
 return {preset,primary:preset==='pastel'?'#d9a9c1':preset==='floral'?'#c3829b':'#79283e',secondary:preset==='pastel'?'#a8c9ce':preset==='scrapbook'?'#f4e7cc':'#c6a15b',accent:'#77916b',thickness:3,gap:2}
}
export const defaultAppearance=():AvatarAppearance=>({version:1,frame:defaultFrame(),crop:defaultCrop()})
export const bounded=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:min))
export const avatarColor=(value:unknown,fallback:string)=>typeof value==='string'&&/^#[\da-f]{6}$/i.test(value)?value.toLowerCase():fallback
export function normalizeAppearance(value:unknown):AvatarAppearance{
 const a=value as Partial<AvatarAppearance>|null
 if(a?.version!==1)return defaultAppearance()
 const f=a.frame,preset=framePresets.some(p=>p.id===f?.preset)?f!.preset:'none',defaults=defaultFrame(preset),c=a.crop
 return {version:1,frame:{preset,primary:avatarColor(f?.primary,defaults.primary),secondary:avatarColor(f?.secondary,defaults.secondary),accent:avatarColor(f?.accent,defaults.accent),thickness:bounded(Number(f?.thickness??3),1,8),gap:bounded(Number(f?.gap??2),0,10)},crop:{zoom:bounded(Number(c?.zoom??1),1,4),x:bounded(Number(c?.x??0),-1,1),y:bounded(Number(c?.y??0),-1,1),rotation:[0,90,180,270].includes(Number(c?.rotation))?Number(c?.rotation) as AvatarCrop['rotation']:0}}
}
export function cropGeometry(width:number,height:number,crop:AvatarCrop,size:number){
 const quarter=crop.rotation===90||crop.rotation===270,rw=quarter?height:width,rh=quarter?width:height
 const scale=Math.max(size/rw,size/rh)*crop.zoom
 const excessX=Math.max(0,rw*scale-size),excessY=Math.max(0,rh*scale-size)
 return {scale,excessX,excessY,offsetX:crop.x*excessX/2,offsetY:crop.y*excessY/2}
}
export function initials(name:string){return name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(v=>Array.from(v)[0]).join('').toUpperCase()||'C'}
export interface AvatarProfile {
 full_name?:string|null;avatar_url?:string|null;avatar_storage_path?:string|null;avatar_source_path?:string|null;avatar_appearance?:unknown;avatar_revision?:number
}
export const avatarPath=(value:unknown):value is string=>typeof value==='string'&&/^[\da-f-]{36}\/avatars\/[\da-f-]{36}\/(?:avatar|source)\.(?:png|webp)$/.test(value)

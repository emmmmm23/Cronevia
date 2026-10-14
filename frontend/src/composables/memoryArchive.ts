import {reactive} from 'vue'
import type {Memory} from '@/types'
export type MemoryFilter='all'|'photos'|'words'|'places'
export interface ArchiveState {search:string;filter:MemoryFilter;sort:'newest'|'oldest'|'title';archived:boolean;scroll:number}
const states=new Map<string,ArchiveState>()
export function archiveState(owner:string){if(!states.has(owner))states.set(owner,reactive({search:'',filter:'all',sort:'newest',archived:false,scroll:0}));return states.get(owner)!}
export function filterMemories(memories:Memory[],state:ArchiveState){
 const query=state.search.trim().toLocaleLowerCase()
 return memories.filter(m=>{
  const photos=m.media?.some(p=>p.type==='image'||p.mime_type?.startsWith('image/'))
  return (!query || [m.title,m.description,m.location_name].filter(Boolean).join(' ').toLocaleLowerCase().includes(query))
   && (state.filter==='all'||state.filter==='photos'&&photos||state.filter==='words'&&!photos||state.filter==='places'&&!!m.location_name?.trim())
 }).sort((a,b)=>state.sort==='title'?a.title.localeCompare(b.title):state.sort==='oldest'?a.memory_date.localeCompare(b.memory_date):b.memory_date.localeCompare(a.memory_date))
}

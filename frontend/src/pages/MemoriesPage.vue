<script setup lang="ts">
import {ref,computed,onMounted,nextTick} from 'vue'
import {RouterLink,onBeforeRouteLeave} from 'vue-router'
import {useAuthStore} from '@/stores/auth'
import api from '@/services/api.service'
import type {Memory,PaginatedResponse} from '@/types'
import AppSheet from '@/components/shared/AppSheet.vue'
import {archiveState,filterMemories,type MemoryFilter} from '@/composables/memoryArchive'
const state=archiveState(useAuthStore().user?.id || '')
const memories=ref<Memory[]>([]),loading=ref(false),error=ref(''),filtersOpen=ref(false),processing=ref(false)
const chosen=ref<Memory|null>(null),action=ref<'menu'|'delete'|'archive'>('menu')
const filters:{id:MemoryFilter;label:string}[]=[{id:'all',label:'All moments'},{id:'photos',label:'With photos'},{id:'words',label:'Words only'},{id:'places',label:'With a place'}]
const filtered=computed(()=>filterMemories(memories.value,state))
const activeCount=computed(()=>Number(state.filter!=='all')+Number(state.archived))
const groups=computed(()=>{
 const rows:{key:string;title:string;memories:Memory[]}[]=[]
 for(const memory of filtered.value){
  const key=state.sort==='title'?'all':memory.memory_date.slice(0,7)
  let group=rows.find(g=>g.key===key)
  if(!group){group={key,title:key==='all'?'Your collection':new Date(key+'-01T00:00:00').toLocaleDateString('en',{month:'long',year:'numeric'}),memories:[]};rows.push(group)}
  group.memories.push(memory)
 }
 return rows
})
async function load(){
 loading.value=true;error.value=''
 try{
  const collected:Memory[]=[]
  for(let page=1; ;page++){
   const response=(await api.get<PaginatedResponse<Memory>>('/memories',{params:{archived:String(state.archived),per_page:100,page}})).data
   collected.push(...response.data);if(page>=response.meta.last_page)break
  }
  memories.value=collected
 }catch(e){console.warn('[memory collection]',e);error.value='Your collection couldn’t be opened. Please try again.'}finally{loading.value=false}
}
onMounted(async()=>{await load();await nextTick();window.scrollTo({top:state.scroll,behavior:'instant'})})
onBeforeRouteLeave(()=>{state.scroll=window.scrollY})
function reset(){state.search='';state.filter='all';state.sort='newest';if(state.archived){state.archived=false;void load()}}
function setArchived(value:boolean){state.archived=value;void load()}
function photo(memory:Memory){return memory.media?.find(m=>m.type==='image'||m.mime_type?.startsWith('image/'))}
function dateLabel(date:string){return new Date(date+'T00:00:00').toLocaleDateString('en',{month:'short',day:'numeric'})}
async function mutate(kind:'archive'|'restore'|'delete'){
 if(!chosen.value||processing.value)return
 processing.value=true;error.value=''
 try{
  if(kind==='delete')await api.delete('/memories/'+chosen.value.id)
  else await api.patch('/memories/'+chosen.value.id+'/'+kind)
  chosen.value=null;await load()
 }catch(e){console.warn('[memory action]',e);error.value='That change couldn’t be saved. Your memory is still here; please retry.'}finally{processing.value=false}
}
</script>
<template>
 <main class="memory-archive">
  <header class="collection-heading"><div><p class="eyebrow">A personal collection</p><h1>Memories<span>.</span></h1><p class="subtitle">The days pass. These moments stay.</p></div><RouterLink class="create-memory" to="/memories/new">＋ Create memory</RouterLink></header>
  <section class="collection-controls" aria-label="Find memories">
   <label class="search-box"><span aria-hidden="true">⌕</span><input v-model="state.search" type="search" aria-label="Search memories" placeholder="Find a moment, a place, a feeling…" /></label>
   <button class="filter-trigger" :aria-expanded="filtersOpen" @click="filtersOpen=true">Filters <span v-if="activeCount" class="filter-count">{{activeCount}}</span> ≡</button>
   <label class="sort-field"><span>Sort</span><select v-model="state.sort" aria-label="Sort memories"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select></label>
  </section>
  <div class="collection-summary"><p role="status">{{loading?'Gathering your moments…':filtered.length+' '+(filtered.length===1?'memory':'memories')}}<span v-if="state.archived"> · Archive</span></p><button v-if="state.search || activeCount" @click="reset">Clear filters</button><span v-if="state.filter!=='all'" class="active-chip">{{filters.find(f=>f.id===state.filter)?.label}}</span></div>
  <p v-if="error" class="collection-error" role="alert">{{error}} <button @click="load">Retry</button></p>
  <div v-if="loading" class="memory-grid" aria-label="Loading memories"><div v-for="i in 3" :key="i" class="skeleton"><div></div><p></p></div></div>
  <template v-else-if="groups.length">
   <section v-for="group in groups" :key="group.key" class="memory-group" :aria-label="group.title"><div class="group-heading"><h2>{{group.title}}</h2><span>{{String(group.memories.length).padStart(2,'0')}} moments</span></div>
    <div class="memory-grid">
     <article v-for="(memory,index) in group.memories" :key="memory.id" class="memory-card" :class="{featured:index===0 && group.memories.length>2}">
      <RouterLink :to="{name:'memories.show',params:{id:memory.id}}" class="memory-link">
       <div class="card-visual" :class="{'words-card':!photo(memory)}"><img v-if="photo(memory)" :src="photo(memory)!.file_path" :alt="memory.title" loading="lazy" @error="($event.target as HTMLImageElement).style.opacity='0'" /><template v-else><span class="small-label">A written moment</span><p>{{memory.description || memory.title}}</p><span aria-hidden="true" class="written-mark">〰</span></template><span class="card-index" aria-hidden="true">{{String(index+1).padStart(2,'0')}}</span></div>
       <div class="card-copy"><time :datetime="memory.memory_date">{{dateLabel(memory.memory_date)}}</time><h3>{{memory.title}}</h3><p v-if="memory.location_name" class="card-place">{{memory.location_name}}</p><p v-else-if="photo(memory) && memory.description" class="card-excerpt">{{memory.description}}</p></div>
      </RouterLink>
      <button class="card-more" :aria-label="'Options for '+memory.title" @click="chosen=memory;action='menu'">•••</button>
     </article>
    </div>
   </section>
  </template>
  <section v-else-if="!error" class="collection-empty"><div class="empty-print" aria-hidden="true">✳</div><p class="eyebrow">{{state.search || activeCount?'A little more looking':'Room for your story'}}</p><h2>{{state.search || activeCount?'No moments found.':'Your collection starts with a moment.'}}</h2><p>{{state.search || activeCount?'Try another word or clear your filters.':'A photograph or a few words is all you need.'}}</p><button v-if="state.search || activeCount" @click="reset">Clear filters</button><RouterLink v-else to="/memories/new">Keep your first memory ↗</RouterLink></section>
  <AppSheet v-model="filtersOpen" title="Find your memories"><div class="filter-options"><fieldset><legend>Collection</legend><button :aria-pressed="!state.archived" @click="setArchived(false)">Memories</button><button :aria-pressed="state.archived" @click="setArchived(true)">Archived</button></fieldset><fieldset><legend>Show me</legend><button v-for="filter in filters" :key="filter.id" :aria-pressed="state.filter===filter.id" @click="state.filter=filter.id">{{filter.label}}</button></fieldset><button class="show-results" @click="filtersOpen=false">Show {{filtered.length}} memories</button><button @click="reset">Reset filters</button></div></AppSheet>
  <AppSheet :model-value="!!chosen" :title="action==='menu'?'Memory options':action==='delete'?'Delete this memory?':'Archive this memory?'" @update:model-value="chosen=null"><div class="memory-actions"><p>{{chosen?.title}}</p><template v-if="action==='menu'"><RouterLink v-if="chosen" :to="{name:'memories.edit',params:{id:chosen.id}}">Edit memory</RouterLink><button v-if="state.archived" :disabled="processing" @click="mutate('restore')">Restore to collection</button><button v-else @click="action='archive'">Move to archive</button><button @click="action='delete'">Delete memory</button></template><template v-else><p>{{action==='delete'?'This memory will be removed from your collection.':'You can find it again in Archived.'}}</p><button :disabled="processing" @click="mutate(action==='delete'?'delete':'archive')">{{processing?'Saving…':action==='delete'?'Confirm delete':'Confirm archive'}}</button><button :disabled="processing" @click="action='menu'">Go back</button></template></div></AppSheet>
 </main>
</template>
<style scoped>
.memory-archive{max-width:1260px;margin:auto;padding:52px 36px 80px;color:#51463b}.collection-heading{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:36px}.eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#7d826d}.collection-heading h1{font:64px/1.1 'Crimson Text',Georgia,serif;margin:8px 0;color:#553a36;letter-spacing:-.035em}.collection-heading h1 span{color:#8d9579}.subtitle{font:24px 'Caveat',cursive;color:#838569}.create-memory{display:flex;align-items:center;justify-content:center;background:#74283c;color:#fff8ed;border-radius:8px;padding:14px 20px;min-height:48px;font-size:14px;white-space:nowrap}.collection-controls{display:flex;gap:12px;align-items:center;padding:18px 0;border-top:1px solid #d8cdba;border-bottom:1px solid #d8cdba}.search-box{display:flex;gap:10px;align-items:center;flex:1;min-width:0}.search-box>span{font-size:30px;color:#888b74}.search-box input{width:100%;min-width:0;font-size:16px;min-height:48px;background:none;border:0;outline-offset:3px;color:#51463b}.filter-trigger{white-space:nowrap}.filter-trigger,.sort-field select{min-height:48px;border:1px solid #d5cbb9;background:#faf6ed;border-radius:8px;padding:9px 14px;font-size:14px}.filter-count{background:#74283c;color:white;padding:2px 6px;border-radius:50%}.sort-field{display:flex;align-items:center;gap:10px;font-size:12px}.collection-summary{display:flex;align-items:center;gap:12px;margin:16px 0 30px;font-size:12px;color:#7f765f;min-height:28px}.collection-summary button{background:none;border:0;text-decoration:underline;color:#74283c;min-height:44px}.active-chip{background:#e1e6d8;color:#5d6c51;padding:6px 10px;border-radius:20px}.group-heading{display:flex;align-items:center;gap:16px;margin:32px 0 20px}.group-heading h2{font:26px 'Crimson Text',Georgia,serif;margin:0;color:#66523f}.group-heading>span{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#9b8e76}.memory-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px;align-items:start}.memory-card{position:relative;background:#fffbf2;border:1px solid #e2d7c4;padding:12px 12px 18px;box-shadow:0 5px 15px #6b513311;min-width:0}.memory-card.featured{grid-column:span 2}.memory-card.featured .card-visual{aspect-ratio:16/9}.memory-link{display:block}.card-visual{position:relative;aspect-ratio:4/3;background:#e8e7dc;display:flex;align-items:center;justify-content:center;overflow:hidden}.card-visual img{width:100%;height:100%;object-fit:contain;padding:8px;transition:transform .3s}.card-index{position:absolute;bottom:10px;left:10px;font:italic 12px Georgia;color:#766c56;background:#fffaf0d9;padding:3px 6px}.card-copy{padding:18px 10px 0}.card-copy time{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#8b7e66}.card-copy h3{font:26px/1.15 'Crimson Text',Georgia,serif;color:#533c34;margin:8px 30px 9px 0;overflow-wrap:anywhere}.card-place,.card-excerpt{font-size:13px;line-height:1.6;color:#85765e;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.card-more{position:absolute;right:12px;bottom:16px;min-width:44px;min-height:44px;border:0;background:#f5eee2;color:#74283c;border-radius:50%;font-size:16px}.words-card{padding:32px;background:repeating-linear-gradient(#f0e9d9 0 31px,#dacfbc88 31px 32px);display:flex;flex-direction:column;justify-content:flex-start;gap:20px}.words-card .small-label{font-size:9px;text-transform:uppercase;letter-spacing:.15em;color:#8b8f77}.words-card p{font:25px/1.4 'Caveat',cursive;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;color:#6f745d}.written-mark{font-size:24px;color:#879277}.collection-empty{text-align:center;padding:55px 15px;max-width:620px;margin:auto}.empty-print{display:grid;place-items:center;width:110px;height:130px;border:8px solid #fffbef;border-bottom-width:25px;background:#dfe3d4;transform:rotate(-7deg);margin:0 auto 35px;box-shadow:3px 5px 15px #5e49351a;font-size:40px;color:#8b9578}.collection-empty h2{font:34px/1.2 'Crimson Text',Georgia,serif;margin:12px 0}.collection-empty>p:not(.eyebrow){font-size:15px;color:#897b65}.collection-empty a,.collection-empty button{display:inline-block;margin-top:22px;padding:12px;color:#74283c;border:0;background:none;text-decoration:underline;min-height:44px}.skeleton{padding:12px;background:#faf6ed}.skeleton div{aspect-ratio:4/3;background:#e2dccd}.skeleton p{height:35px;margin:15px;background:#eee6d8}.collection-error{padding:20px;background:#f2e3cd;border-radius:8px;font-size:15px}.collection-error button{min-height:44px;background:none;border:0;text-decoration:underline}.filter-options,.memory-actions{display:grid;gap:14px}.filter-options fieldset{display:flex;flex-wrap:wrap;gap:10px;border:0;padding:0;margin:0 0 14px}.filter-options legend{font-size:13px;margin-bottom:12px;color:#857963}.filter-options button,.memory-actions button,.memory-actions a{min-height:48px;border:1px solid #d6cbb7;border-radius:8px;padding:12px;font-size:16px;background:#fffaf0;color:#665640}.filter-options button[aria-pressed=true],.filter-options .show-results{background:#74283c;border-color:#74283c;color:#fff6e8}.memory-actions p{font:24px 'Crimson Text',Georgia,serif}button,a,input,select{touch-action:manipulation}button{cursor:pointer}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #94546a;outline-offset:4px}
@media(max-width:1050px){.memory-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.memory-card.featured{grid-column:auto}.memory-card.featured .card-visual{aspect-ratio:4/3}.memory-archive{padding:32px 24px 60px}}
@media(max-width:599px){.memory-archive{padding:24px 18px max(40px,env(safe-area-inset-bottom))}.collection-heading{align-items:flex-start;gap:14px;flex-wrap:wrap;margin-bottom:22px}.collection-heading h1{font-size:45px}.eyebrow{font-size:10px}.subtitle{font-size:22px}.create-memory{padding:12px 16px;min-height:48px}.collection-controls{flex-wrap:wrap;gap:8px;padding:10px 0}.search-box{flex-basis:100%}.sort-field{margin-left:auto}.sort-field>span{display:none}.sort-field select{font-size:16px;max-width:178px}.filter-trigger{font-size:16px}.collection-summary{margin:10px 0 14px;flex-wrap:wrap;gap:8px}.group-heading{margin:24px 0 15px}.group-heading h2{font-size:24px}.memory-grid{grid-template-columns:1fr;gap:24px}.card-copy h3{font-size:27px}.card-copy time{font-size:12px}.card-place,.card-excerpt{font-size:15px}.memory-card{padding:10px 10px 18px}.collection-empty{padding:45px 0}.collection-empty h2{font-size:30px}}
@media(prefers-reduced-motion:reduce){.card-visual img{transition:none}}
</style>

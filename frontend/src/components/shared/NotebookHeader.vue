<script setup lang="ts">
import {ref,nextTick} from 'vue'
import {RouterLink} from 'vue-router'
import AppSheet from './AppSheet.vue'
defineProps<{backTo:string;backLabel:string;status:string;saveLabel:string;editLabel:string;viewMode:boolean;disabled?:boolean;busy?:boolean;ready?:boolean}>()
const emit=defineEmits<{save:[];edit:[];cancel:[];details:[]}>()
const menu=ref(false)
async function action(type:'details'|'cancel'){menu.value=false;await nextTick();type==='details'?emit('details'):emit('cancel')}
</script>
<template>
 <header class="notebook-header">
  <RouterLink :to="backTo" class="back" :aria-label="backLabel"><span aria-hidden="true">←</span><span class="back-text">{{backLabel}}</span></RouterLink>
  <span class="save-status" role="status">{{status}}</span>
  <button class="secondary" :disabled="!ready" @click="emit('details')">Details</button>
  <button v-if="!viewMode" class="secondary" :disabled="busy" @click="emit('cancel')">Cancel</button>
  <button class="more" aria-label="Entry options" :aria-expanded="menu" :disabled="!ready" @click="menu=true">•••</button>
  <button v-if="viewMode && ready" class="primary" :aria-label="editLabel" @click="emit('edit')"><span class="long-label">{{editLabel}}</span><span class="short-label">Edit</span></button>
  <button v-else-if="!viewMode" class="primary" :aria-label="saveLabel" :disabled="disabled" @click="emit('save')"><span class="long-label">{{busy?'Saving…':saveLabel}}</span><span class="short-label">{{busy?'Saving…':'Save'}}</span></button>
 </header>
 <AppSheet v-model="menu" title="Entry options"><div class="menu-actions"><button @click="action('details')">Date &amp; details</button><button v-if="!viewMode" :disabled="busy" @click="action('cancel')">Cancel editing</button></div></AppSheet>
</template>
<style scoped>
.notebook-header{max-width:1320px;margin:0 auto 20px;display:flex;align-items:center;gap:12px;min-height:56px;color:#655e51}.back{display:flex;align-items:center;gap:10px;min-width:44px;min-height:44px;font-size:14px}.back>span:first-child{font-size:23px}.save-status{margin-left:auto;font-size:12px;color:#69715d}.notebook-header button{min-height:44px;padding:10px 16px;border:0;border-radius:7px;font:14px Inter,sans-serif;cursor:pointer}.primary{background:#74283c;color:#fff8ef}.secondary{background:transparent;color:#6e6558}.more,.short-label{display:none}.menu-actions{display:grid;gap:12px}.menu-actions button{min-height:48px;background:#f0eadd;border:1px solid #d6cbbb;border-radius:8px;color:#74283c;font-size:16px}button:disabled{opacity:.45;cursor:default}button:focus-visible,a:focus-visible{outline:2px solid #89546a;outline-offset:3px}
@media(max-width:959px){.notebook-header{position:sticky;top:0;z-index:20;background:#f4efe5;margin:-12px -12px 12px;padding:calc(6px + env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) 6px max(12px,env(safe-area-inset-left));gap:4px;border-bottom:1px solid #ddd5c6}.secondary,.back-text,.long-label{display:none}.short-label{display:inline}.more{display:block;min-width:44px;background:transparent;color:#74283c}.save-status{margin-right:auto;margin-left:4px;font-size:12px}.notebook-header .primary{min-width:65px}.notebook-header button{padding:10px 12px}}
</style>

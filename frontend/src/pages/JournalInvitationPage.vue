<script setup lang="ts">
import {onMounted,ref} from 'vue'
import {RouterLink,useRouter,useRoute} from 'vue-router'
import {useAuthStore} from '@/stores/auth'
import {finishInvitationExchange} from '@/services/invitation-boot'
import {invitationRequest,type InviteContext} from '@/services/shared-journals'
import {invitationAuthDestination,journalDestination} from '@/services/journal-routes'
const auth=useAuthStore(),router=useRouter(),route=useRoute(),context=ref<InviteContext|null>(null),busy=ref(false),error=ref('')
const messages:Record<string,string>={invalid:'This invitation is missing or invalid. Ask the owner for a new link.',expired:'This invitation has expired. Ask the owner for a new link.',revoked:'The owner has revoked this invitation.',used:'This invitation has already been used. It cannot restore access after someone leaves or is removed.',unavailable:'This journal is no longer available.'}
async function check(){busy.value=true;error.value='';try{await finishInvitationExchange();context.value=await invitationRequest('context');if(route.query.invitation&&['pending','member'].includes(context.value.status)&&route.query.invitation!==context.value.invitation_id){context.value={status:'invalid'};error.value='Another invitation was opened in this browser. Reopen this journal’s original invitation link.';return}if(context.value.status==='member'&&context.value.journal_id)await router.replace(journalDestination(context.value.journal_id))}catch(e){error.value=(e as Error).message}finally{busy.value=false}}
async function accept(){if(!auth.isAuthenticated||!context.value?.invitation_id||busy.value)return;busy.value=true;error.value='';try{const result=await invitationRequest('accept',context.value.invitation_id);if(['accepted','member'].includes(result.status)&&result.journal_id)await router.replace(journalDestination(result.journal_id));else context.value=result}catch(e){error.value=(e as Error).message}finally{busy.value=false}}
onMounted(check)
</script>
<template>
 <main class="invitation-desk"><article class="invitation-paper">
  <RouterLink :to="{name:'landing'}" class="brand">Cronevia</RouterLink>
  <p class="eyebrow">A journal, shared with you</p><h1>An invitation to turn the pages.</h1>
  <p v-if="busy" role="status">{{context?'Keeping your place…':'Checking your invitation…'}}</p>
  <p v-if="error" role="alert">{{error}}</p><button v-if="error" :disabled="busy" @click="check">Try again</button>
  <template v-if="context?.status==='pending'">
   <h2 v-if="context.journal_title">{{context.journal_title}}</h2>
   <p>You’re invited as an <strong>{{context.role==='editor'?'Editor':'Viewer'}}</strong>. {{context.role==='editor'?'You can read, add and edit shared entries. You cannot manage sharing or delete entries.':'You can read shared entries and their journal attachments.'}}</p>
   <p class="scope">Private entries, unfinished drafts, archived entries, personal trackers, trips and account details stay with their owner. The link works for one person and expires after seven days.</p>
   <template v-if="!auth.isAuthenticated"><p>Sign in to review and accept. Opening this link does not join the journal.</p><div class="actions"><RouterLink :to="invitationAuthDestination(false,context.invitation_id)">Sign in</RouterLink><RouterLink :to="invitationAuthDestination(true,context.invitation_id)">Create an account</RouterLink></div></template>
   <template v-else><p>Accept using your current signed-in account. You can leave this journal later.</p><button class="accept" :disabled="busy" @click="accept">Accept invitation</button></template>
  </template>
  <p v-else-if="context&&context.status!=='member'" role="status">{{messages[context.status]||'This invitation cannot be accepted.'}}</p>
  <RouterLink class="back" :to="auth.isAuthenticated?journalDestination():{name:'landing'}">← {{auth.isAuthenticated?'Back to my journals':'Back to Cronevia'}}</RouterLink>
 </article></main>
</template>
<style scoped>
.invitation-desk{min-height:100dvh;padding:28px 16px;background:var(--vintage-page,#e8d7be);color:var(--vintage-text,#49321f);display:grid;place-items:center}.invitation-paper{width:min(100%,640px);padding:clamp(24px,5vw,58px);border:1px solid var(--vintage-line,#c9ad88);background:var(--vintage-card,#fbf2df);box-shadow:0 14px 45px #49321f14}.brand{font:bold 28px Georgia,serif}.eyebrow{margin-top:40px;font-size:11px;letter-spacing:.15em;text-transform:uppercase}h1{font:clamp(30px,7vw,43px)/1.15 Georgia,serif;margin:16px 0 24px}h2{font:24px Georgia,serif}p{line-height:1.7;margin-bottom:18px}.scope{font-size:14px;padding:18px 0;border-block:1px solid var(--vintage-line,#c9ad88)}button,.actions a{min-height:48px;padding:12px 18px;border:1px solid currentColor;border-radius:5px;display:inline-flex;align-items:center;justify-content:center}.actions{display:flex;gap:12px;flex-wrap:wrap}.accept{background:#704624;color:#fff8e8;border:0}.back{display:flex;align-items:center;min-height:48px;margin-top:28px;font-size:14px}a:focus-visible,button:focus-visible{outline:2px solid #a6773f;outline-offset:4px}
</style>

<style scoped>.invitation-paper{overflow-wrap:anywhere;min-width:0}</style>

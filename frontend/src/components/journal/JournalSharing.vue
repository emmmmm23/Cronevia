<script setup lang="ts">
import {ref,watch} from 'vue'
import AppSheet from '@/components/shared/AppSheet.vue'
import {createInvitation,sharingDetails,manageSharing,type SharedJournal,type SharingDetails} from '@/services/shared-journals'
import {invitationLink} from '@/services/journal-routes'
const props=defineProps<{modelValue:boolean;journal:SharedJournal}>(),emit=defineEmits<{'update:modelValue':[boolean];changed:[]}>()
const details=ref<SharingDetails|null>(null),role=ref<'viewer'|'editor'>('viewer'),future=ref(false),link=ref(''),expires=ref(''),busy=ref(false),error=ref(''),copied=ref(false)
const journalTitle=ref(''),createdRole=ref('')
const confirmation=ref<{action:'revoke'|'remove';id:string;label:string}|null>(null)
async function load(){try{details.value=await sharingDetails(props.journal.id)}catch(e){details.value=null;link.value='';error.value=(e as Error).message}}
watch(()=>props.modelValue,open=>{link.value='';confirmation.value=null;error.value='';copied.value=false;if(open){future.value=props.journal.share_future;journalTitle.value=props.journal.title;void load()}},{immediate:true})
async function create(){busy.value=true;error.value='';link.value='';try{const result=await createInvitation(props.journal.id,role.value,future.value,journalTitle.value);link.value=invitationLink(result.token,result.id);createdRole.value=result.role;expires.value=new Date(result.expires_at).toLocaleDateString();copied.value=false;await load();emit('changed')}catch(e){error.value=(e as Error).message}finally{busy.value=false}}
async function copy(){try{await navigator.clipboard.writeText(link.value);copied.value=true}catch{error.value='Select the link below and copy it manually.'}}
async function manage(action:'revoke'|'remove'|'role',id:string,newRole?:string){busy.value=true;error.value='';try{await manageSharing(props.journal.id,action,id,newRole);confirmation.value=null;await load();emit('changed')}catch(e){error.value=(e as Error).message}finally{busy.value=false}}
</script>
<template>
 <AppSheet :model-value="modelValue" title="Share your journal" @update:model-value="emit('update:modelValue',$event)">
  <div class="sharing-fields"><p>Invite one person with a private link. Only entries marked <strong>Shared with journal</strong> and their journal attachments are included.</p>
   <p class="scope">{{details?.private_count??'Your'}} private entries stay private. Drafts, archived entries, trips, personal trackers and account details are excluded. Existing private entries must be shared individually from Entry details.</p>
   <label class="journal-name">Journal name<input v-model="journalTitle" maxlength="120" :disabled="busy" placeholder="A name your guests will recognize" /></label>
   <fieldset :disabled="busy"><legend>What can this person do?</legend><label><input v-model="role" type="radio" value="viewer" /> <span><strong>Viewer</strong><small>Read shared pages and photos.</small></span></label><label><input v-model="role" type="radio" value="editor" /> <span><strong>Editor</strong><small>Add and edit shared pages. No sharing management or entry deletion.</small></span></label></fieldset>
   <label class="check"><input v-model="future" type="checkbox" :disabled="busy" />Share future entries by default. You can still mark any entry Private.</label>
   <small>The name and future-entry preference are saved when you create a link.</small>
   <button :disabled="busy || !journalTitle.trim()" class="primary" @click="create">{{busy?'Please wait…':'Create single-use link'}}</button>
   <div v-if="link" class="created"><p>Expires {{expires}} · single use · {{createdRole}}</p><label>Invitation link<input :value="link" readonly aria-label="Invitation link" @focus="($event.target as HTMLInputElement).select()" /></label><button :disabled="busy" @click="copy">{{copied?'Copied':'Copy invitation link'}}</button><small>This link is shown once. Copy it before closing this window.</small></div>
   <p v-if="error" role="alert">{{error}}</p>
   <section><h3>People with access</h3><p>You · Owner</p><div v-for="member in details?.members" :key="member.user_id" class="member"><span>{{member.name}}</span><label><span class="sr-only">Role for {{member.name}}</span><select :value="member.role" :disabled="busy" @change="manage('role',member.user_id,($event.target as HTMLSelectElement).value)"><option value="viewer">Viewer</option><option value="editor">Editor</option></select></label><button :disabled="busy" @click="confirmation={action:'remove',id:member.user_id,label:member.name}">Remove</button></div><p v-if="!details?.members.length">No one else has access yet.</p></section>
   <section><h3>Invitations</h3><div v-for="invite in details?.invitations" :key="invite.id" class="member"><span>{{invite.role}} · {{invite.status}}<small>Expires {{new Date(invite.expires_at).toLocaleDateString()}}</small></span><button v-if="invite.status==='pending'" :disabled="busy" @click="confirmation={action:'revoke',id:invite.id,label:'this invitation'}">Revoke</button></div><p v-if="!details?.invitations.length">No invitations created.</p></section>
  </div>
 </AppSheet>
 <AppSheet :model-value="!!confirmation" :title="confirmation?.action==='remove'?'Remove access?':'Revoke invitation?'" @update:model-value="!$event && (confirmation=null)"><p>{{confirmation?.action==='remove'?'This person will lose access to future journal requests. Already viewed or downloaded content cannot be recalled.':'This unused link will stop working immediately.'}}</p><p v-if="error" role="alert">{{error}}</p><template #footer><button :disabled="busy" @click="confirmation=null">Cancel</button><button :disabled="busy" class="primary" @click="confirmation&&manage(confirmation.action,confirmation.id)">{{confirmation?.action==='remove'?'Remove member':'Revoke link'}}</button></template></AppSheet>
</template>
<style scoped>
.sharing-fields{display:grid;gap:20px;line-height:1.6}.scope,.created{padding:16px;background:var(--vintage-page,#eee0c8);border:1px solid var(--vintage-line,#cab18b);border-radius:6px;font-size:14px}fieldset{padding:14px;border:1px solid var(--vintage-line,#cab18b);border-radius:6px}fieldset label,.check{display:flex;gap:12px;align-items:flex-start;padding:10px 0;cursor:pointer}input[type=radio],input[type=checkbox]{width:20px;height:20px;flex-shrink:0;margin-top:4px}small{display:block;font-size:12px;line-height:1.5}button,select{min-height:48px;padding:10px 16px;border:1px solid var(--vintage-line,#c6aa81);border-radius:5px}button:disabled{opacity:.5}.primary{background:#704624;color:#fff8e8;border:0}.created{display:grid;gap:12px}.created input{width:100%;padding:12px;font-size:16px;border:1px solid #b79c77;border-radius:4px;background:transparent}.member{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 0;border-bottom:1px solid var(--vintage-line,#cab18b)}.member>span{flex:1;min-width:120px}h3{font:22px Georgia,serif;margin-bottom:10px}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #a6773f;outline-offset:3px}
</style>

<style scoped>.journal-name{display:grid;gap:8px}.journal-name input{width:100%;min-height:48px;padding:12px;border:1px solid var(--vintage-line,#d7c7b3);border-radius:5px;font-size:16px;background:var(--vintage-card,#fdfaf5)}</style>

<style scoped>.member>span{overflow-wrap:anywhere}</style>

<style scoped>fieldset input,.check input{accent-color:#704624}</style>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { accountError, verifiedFactors, verifyFactor } from '@/services/account-security'
const auth=useAuthStore()
const emit=defineEmits<{changed:[]}>()
const factors=ref<Awaited<ReturnType<typeof verifiedFactors>>>([])
const unfinished=ref<{id:string;name:string}[]>([])
const pending=ref<{id:string;qr:string;secret:string}|null>(null),code=ref(''),name=ref('My authenticator')
const removing=ref(''),busy=ref(false),error=ref(''),message=ref(''),ready=ref(false)
let alive=true
async function load(){
  error.value='';ready.value=false
  try{
    const result=await supabase.auth.mfa.listFactors();if(result.error)throw result.error
    factors.value=result.data.totp.filter(f=>f.status==='verified')
    unfinished.value=result.data.all.filter(f=>f.factor_type==='totp'&&f.status==='unverified'&&f.id!==pending.value?.id).map(f=>({id:f.id,name:f.friendly_name||'Authenticator app'}))
    ready.value=true;emit('changed')
  }catch(e){error.value=accountError(e,'Your security settings could not load. Please retry.')}
}
async function discard(id:string){
 if(busy.value||!unfinished.value.some(f=>f.id===id))return
 busy.value=true;error.value=''
 try{const r=await supabase.auth.mfa.unenroll({factorId:id});if(r.error)throw r.error;await load();message.value='Unfinished setup removed. Your verified authenticators are unchanged.'}
 catch(e){error.value=accountError(e,'The unfinished setup could not be removed. Please retry.')}
 finally{busy.value=false}
}
onMounted(load)
async function enroll(){
  if(busy.value||!ready.value)return
  busy.value=true;error.value='';message.value='';code.value='';removing.value=''
  try{
    const {data,error:failure}=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:name.value.trim()||'My authenticator',issuer:'Cronevia'})
    if(failure)throw failure
    if(!alive){await supabase.auth.mfa.unenroll({factorId:data.id});return}
    pending.value={id:data.id,qr:data.totp.qr_code,secret:data.totp.secret}
  }catch(e){error.value=accountError(e,'Authenticator setup could not start. Please retry, or check that app authenticators are enabled for Cronevia.')}
  finally{busy.value=false}
}
async function confirm(){
  if(!pending.value||busy.value)return
  if(!/^\d{6}$/.test(code.value)){error.value='Enter the six-digit code from your authenticator app.';return}
  busy.value=true;error.value=''
  try{
    await verifyFactor(pending.value.id,code.value)
    pending.value=null;code.value='';await auth.refreshSecurity();await load()
    message.value='Two-factor authentication is enabled. You will need an authenticator code when signing in.'
  }catch(e){code.value='';error.value=accountError(e,'That code could not be verified. Check your authenticator and try its latest code.')}
  finally{busy.value=false}
}
async function cancel(){
  if(!pending.value||busy.value)return
  busy.value=true;error.value=''
  try{const {error:failure}=await supabase.auth.mfa.unenroll({factorId:pending.value.id});if(failure)throw failure;pending.value=null;code.value=''}
  catch(e){error.value=accountError(e,'Setup could not be cancelled. Please retry.')}
  finally{busy.value=false}
}
async function remove(){
  if(!removing.value||busy.value)return
  if(!/^\d{6}$/.test(code.value)){error.value='Enter the current code from the authenticator you are removing.';return}
  busy.value=true;error.value='';message.value=''
  try{
    await verifyFactor(removing.value,code.value)
    const {error:failure}=await supabase.auth.mfa.unenroll({factorId:removing.value});if(failure)throw failure
    removing.value='';code.value='';await supabase.auth.refreshSession();await auth.refreshSecurity();await load()
    message.value=factors.value.length?'Authenticator removed. Your remaining authenticator still protects this account.':'Two-factor authentication is now turned off.'
  }catch(e){code.value='';error.value=accountError(e,'The authenticator could not be removed. Enter its latest code and retry.')}
  finally{busy.value=false}
}
onUnmounted(()=>{
  alive=false
  const id=pending.value?.id;pending.value=null;code.value=''
  if(id)void supabase.auth.mfa.unenroll({factorId:id}).catch(()=>{})
})
</script>
<template>
 <section class="two-factor" aria-labelledby="two-factor-title">
  <div class="security-heading"><span aria-hidden="true">✧</span><div><h3 id="two-factor-title">Two-factor authentication</h3><p>A password, plus a code only your authenticator can provide.</p></div><strong v-if="ready" class="factor-status">{{factors.length?'On':'Off'}}</strong></div>
  <p v-if="error" role="alert" class="security-error">{{error}}</p><p v-if="message" role="status" class="security-success">{{message}}</p>
  <button v-if="!ready" type="button" :disabled="busy" @click="load">Retry security settings</button>
  <ul v-if="factors.length" class="factor-list"><li v-for="factor in factors" :key="factor.id"><span>{{factor.friendly_name||'Authenticator app'}}</span><button type="button" :disabled="busy||!!pending" @click="removing=factor.id;code='';error=''">Remove authenticator</button></li></ul>
  <ul v-if="unfinished.length" class="factor-list"><li v-for="item in unfinished" :key="item.id"><span>{{item.name}} · unfinished setup</span><button type="button" :disabled="busy||!!pending" @click="discard(item.id)">Discard unfinished setup</button></li></ul>
  <template v-if="pending">
   <p>Scan this QR code with your authenticator app. Keep the setup key private.</p>
   <img class="authenticator-qr" :src="pending.qr" alt="QR code to set up your Cronevia authenticator" />
   <details><summary>Enter a setup key instead</summary><p>In your app, choose a time-based key for Cronevia.</p><code class="setup-key">{{pending.secret}}</code></details>
   <form @submit.prevent="confirm"><label>Authenticator code<input v-model="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required :disabled="busy" placeholder="6-digit code" /></label><div class="factor-actions"><button :disabled="busy" class="factor-primary">{{busy?'Verifying…':'Verify and enable 2FA'}}</button><button type="button" :disabled="busy" @click="cancel">Cancel setup</button></div></form>
  </template>
  <form v-else-if="removing" @submit.prevent="remove"><p>{{factors.length===1?'Removing your last authenticator turns off two-factor authentication.':'You are removing this authenticator.'}} Verify with its current code to continue.</p><label>Code from the authenticator being removed<input v-model="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required :disabled="busy" /></label><div class="factor-actions"><button :disabled="busy">Verify and remove</button><button type="button" :disabled="busy" @click="removing='';code=''">Keep authenticator</button></div></form>
  <template v-else-if="ready"><label>Authenticator name<input v-model="name" maxlength="64" :disabled="busy" /></label><button type="button" class="factor-primary" :disabled="busy||factors.length>=5" @click="enroll">{{busy?'Starting setup…':factors.length?'Add a backup authenticator':'Set up two-factor authentication'}}</button></template>
  <p class="factor-help">Use an app such as Google Authenticator, Microsoft Authenticator, or 1Password. Add a backup authenticator before replacing your phone. Each authenticator must be verified before it protects the account. Never share a setup key or code.</p>
 </section>
</template>
<style scoped>
.two-factor{display:grid;gap:16px;padding-top:24px;margin-top:8px;border-top:1px solid #e6dccd;color:#392d28;font-size:13px;line-height:1.65}.security-heading{display:flex;align-items:center;gap:12px}.security-heading>span{font-size:28px;color:#74283c}.security-heading h3{font:22px Georgia,serif;color:#74283c;margin:0}.security-heading p{margin:3px 0;color:#827568;font-size:12px}.factor-status{margin-left:auto;color:#476044;font-size:12px}.two-factor label{display:grid;gap:7px;font-weight:600}.two-factor input{min-height:46px;width:100%;padding:10px 12px;border:1px solid #dcd0bf;background:#fffefa;border-radius:3px;color:#392d28;font:16px 'Inter',sans-serif}.two-factor button{min-height:44px;padding:9px 14px;border:1px solid #cdbd9f;border-radius:3px;background:#f8f4ec;color:#74283c;cursor:pointer;justify-self:start;font-size:12px}.two-factor button:disabled{opacity:.5;cursor:wait}.two-factor .factor-primary{background:#74283c;color:#fffaf2;border-color:#74283c}.factor-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:15px}.authenticator-qr{width:200px;height:200px;padding:10px;background:white;border:1px solid #dcd0bf;image-rendering:pixelated}.setup-key{display:block;overflow-wrap:anywhere;padding:12px;background:#f8f4ec;color:#392d28;user-select:all}.factor-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}.factor-list li{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;align-items:center;padding:12px;border:1px solid #e6dccd}.factor-help{color:#827568;font-size:11px;margin:0}.security-error,.security-success{padding:12px;background:#f9e7e3;color:#842e25;border-radius:3px}.security-success{background:#e8eee2;color:#476044}summary{cursor:pointer;min-height:30px}button:focus-visible,input:focus-visible{outline:2px solid #74283c;outline-offset:3px}
</style>

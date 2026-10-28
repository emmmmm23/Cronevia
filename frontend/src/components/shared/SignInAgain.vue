<script setup lang="ts">
import {ref,onMounted,onUnmounted} from 'vue'
import {useAuthStore} from '@/stores/auth'
import {accountError,verifiedFactors,verifyFactor} from '@/services/account-security'
const emit=defineEmits<{restored:[]}>()
const auth=useAuthStore(),email=ref(''),password=ref(''),busy=ref(false),error=ref('')
const factors=ref<Awaited<ReturnType<typeof verifiedFactors>>>([]),factor=ref(''),code=ref('')
onMounted(()=>{auth.inlineReauth=true})
onUnmounted(()=>{auth.inlineReauth=false;password.value='';code.value=''})
async function verify(){
 if(busy.value)return
 busy.value=true;error.value=''
 try{await verifyFactor(factor.value,code.value);code.value='';await auth.refreshSecurity();if(!auth.securityChecked||auth.mfaRequired)throw new Error('Incomplete verification');emit('restored')}
 catch(e){code.value='';error.value=accountError(e,'Use the latest code from your authenticator and try again.')}
 finally{busy.value=false}
}
async function signIn(){
 if(busy.value||!email.value.trim()||!password.value)return
 busy.value=true;error.value=''
 try{const result=await auth.login(email.value.trim(),password.value);if(!result.success){error.value='We couldn’t sign you in. Check your details and try again.';return}password.value='';if(auth.mfaRequired){factors.value=await verifiedFactors();factor.value=factors.value[0]?.id||'';return}emit('restored')}
 catch{error.value='Sign-in is unavailable right now. Please retry.'}
 finally{busy.value=false}
}
</script>
<template><div class="sign-in-again form-grid" role="group" aria-label="Sign in again" @keydown.enter.prevent="factors.length?verify():signIn()">
 <p role="status">Your session has expired. Sign in again to continue. Your details are still here.</p>
 <template v-if="!factors.length"><label>Email address<input v-model="email" type="email" autocomplete="username" :disabled="busy" /></label>
 <label>Password<input v-model="password" type="password" autocomplete="current-password" :disabled="busy" /></label>
 </template><template v-else><label v-if="factors.length>1">Authenticator<select v-model="factor"><option v-for="f in factors" :key="f.id" :value="f.id">{{f.friendly_name||'Authenticator app'}}</option></select></label><label>Authenticator code<input v-model="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" :disabled="busy" /></label></template>
 <p v-if="error" role="alert">{{error}}</p>
 <button v-if="factors.length" type="button" class="primary" :disabled="busy||code.length!==6" @click="verify">Verify and restore session</button><button v-else type="button" class="primary" :disabled="busy||!email.trim()||!password" @click="signIn">{{busy?'Signing in…':'Sign in'}}</button>
</div></template>
<style scoped>.sign-in-again{padding:18px;background:#eee9dc;border-radius:10px;max-width:480px;margin:16px 0}.sign-in-again p{font-size:14px;line-height:1.6}.sign-in-again input{font-size:16px}</style>

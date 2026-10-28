<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { accountError, safeReturnPath, verifiedFactors, verifyFactor } from '@/services/account-security'
const auth=useAuthStore(),route=useRoute(),router=useRouter()
const factors=ref<Awaited<ReturnType<typeof verifiedFactors>>>([]),factor=ref(''),code=ref(''),busy=ref(false),error=ref('')
async function load(){
 busy.value=true;error.value=''
 try{
  await auth.refreshSecurity()
  if(auth.securityChecked&&!auth.mfaRequired){await router.replace(safeReturnPath(route.query.redirect,'/home'));return}
  factors.value=await verifiedFactors();factor.value=factors.value[0]?.id||''
  if(!factors.value.length)error.value='Security verification could not finish. Retry, or sign out and sign in again.'
 }catch(e){error.value=accountError(e,'Your authenticator settings could not load. Please retry.')}
 finally{busy.value=false}
}
async function verify(){
 if(busy.value)return
 busy.value=true;error.value=''
 try{
  await verifyFactor(factor.value,code.value);code.value='';await auth.refreshSecurity()
  if(!auth.securityChecked||auth.mfaRequired)throw new Error('Security check incomplete')
  await router.replace(safeReturnPath(route.query.redirect,'/home'))
 }catch(e){code.value='';error.value=accountError(e,'That code could not be verified. Use the latest code from your authenticator app.')}
 finally{busy.value=false}
}
async function signOut(){await auth.logout();await router.replace('/login')}
onMounted(load)
</script>
<template><main class="verification-page"><section class="verification-card"><p class="brand">Cronevia</p><span aria-hidden="true" class="security-star">✧</span><h1>One more step to your space.</h1><p>Enter the six-digit code from your authenticator app to finish signing in.</p><p v-if="error" role="alert" class="verification-error">{{error}}</p><form v-if="factors.length" @submit.prevent="verify"><label v-if="factors.length>1">Authenticator<select v-model="factor" :disabled="busy"><option v-for="item in factors" :key="item.id" :value="item.id">{{item.friendly_name||'Authenticator app'}}</option></select></label><label>Authenticator code<input v-model="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required autofocus :disabled="busy" placeholder="6-digit code" /></label><button :disabled="busy">{{busy?'Verifying…':'Verify and continue'}}</button></form><button v-if="!factors.length" :disabled="busy" @click="load">Retry verification</button><p class="help">If you have lost your phone, use a backup authenticator from the list. Account recovery requires the site owner; your second factor cannot be skipped here.</p><button class="text-button" :disabled="busy" @click="signOut">Sign out</button></section></main></template>
<style scoped>
.verification-page{min-height:100dvh;display:grid;place-items:center;padding:25px;background:#f5ebdd;color:#392d28}.verification-card{width:100%;max-width:460px;padding:35px;background:#fcfaf5;border:1px solid #e5dac8;border-radius:6px;box-shadow:0 15px 45px #45321c0b}.brand{font:700 28px 'Playfair Display',serif;color:#7b0323;margin:0 0 25px}.security-star{font-size:30px;color:#9e7c50}h1{font:30px/1.2 Georgia,serif;color:#74283c;margin:10px 0 15px}p{font-size:13px;line-height:1.7;color:#827568}form,label{display:grid;gap:12px}label{font-size:13px;color:#5c4d41}input,select{width:100%;padding:12px;border:1px solid #dcd0bf;background:#fffefa;border-radius:3px;font-size:18px;color:#392d28}button{min-height:46px;padding:10px 17px;background:#74283c;color:#fffaf2;border-radius:3px;cursor:pointer;font-size:13px}.text-button{background:transparent;color:#74283c;padding-inline:0}.help{font-size:11px;margin-top:22px}.verification-error{padding:12px;background:#f9e7e3;color:#842e25}button:disabled{opacity:.6}input:focus-visible,button:focus-visible,select:focus-visible{outline:2px solid #74283c;outline-offset:3px}
</style>

<script setup lang="ts">
import {computed,ref} from 'vue'
import {useRouter} from 'vue-router'
import {useAuthStore} from '@/stores/auth'
import {recoveryState,openPasswordRecovery} from '@/services/password-recovery'
const auth=useAuthStore(),router=useRouter()
const password=ref(''),confirmation=ref(''),code=ref(''),factorId=ref(recoveryState.factors[0]?.id||''),busy=ref(false),error=ref(''),complete=ref(false)
const ready=computed(()=>auth.recoverySession&&recoveryState.status==='ready')
async function submit(){
 error.value=''
 if(password.value.length<12||password.value.length>128){error.value='Use a password between 12 and 128 characters.';return}
 if(password.value!==confirmation.value){error.value='Passwords do not match.';return}
 busy.value=true
 try{const result=await auth.changePassword(password.value,factorId.value||recoveryState.factors[0]?.id||'',code.value);if(result.success){complete.value=true;password.value='';confirmation.value='';code.value=''}else error.value=result.error||'Your password could not be updated.'}finally{busy.value=false}
}
async function leave(path:string){await auth.cancelRecovery();await router.replace(path)}
</script>
<template>
 <main class="recovery-desk"><section class="recovery-paper" aria-labelledby="reset-heading">
  <p class="brand">Cronevia</p><p class="eyebrow">A fresh start</p>
  <h1 id="reset-heading">{{complete?'Password updated':'Reset Password'}}</h1>
  <template v-if="complete"><p role="status">Your password has been reset successfully! Sign in with your new password to open your account.</p><button class="primary" @click="leave('/login')">Sign In</button></template>
  <p v-else-if="recoveryState.status==='checking'" role="status">Checking your reset link…</p>
  <template v-else-if="ready">
   <p>Choose a new password for the account linked to this email. You’ll sign in after saving it.</p>
   <p class="recovery-note">Password recovery only · Your journal stays closed.</p>
   <form @submit.prevent="submit">
    <p v-if="error" class="feedback" role="alert">{{error}}</p>
    <label for="new-password">New Password</label><input id="new-password" v-model="password" type="password" autocomplete="new-password" required minlength="12" maxlength="128" :disabled="busy" aria-describedby="password-help"/>
    <p id="password-help" class="help">Use 12–128 characters.</p>
    <label for="confirm-password">Confirm New Password</label><input id="confirm-password" v-model="confirmation" type="password" autocomplete="new-password" required minlength="12" maxlength="128" :disabled="busy"/>
    <template v-if="recoveryState.requiresMfa"><label v-if="recoveryState.factors.length>1" for="recovery-factor">Authenticator</label><select v-if="recoveryState.factors.length>1" id="recovery-factor" v-model="factorId"><option v-for="factor in recoveryState.factors" :key="factor.id" :value="factor.id">{{factor.name}}</option></select><label for="recovery-code">Authenticator code</label><input id="recovery-code" v-model="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required :disabled="busy"/><p class="help">Your existing two-factor protection still applies.</p></template>
    <button class="primary" type="submit" :disabled="busy">{{busy?'Saving password…':'Reset Password'}}</button>
   </form>
   <button class="text-link" :disabled="busy" @click="leave('/login')">Cancel and return to sign in</button>
  </template>
  <template v-else><p role="alert">{{recoveryState.error||'Open a fresh password reset link from your email to continue. This page cannot reset a password using a normal account login.'}}</p><button v-if="recoveryState.canRetry" class="primary" @click="openPasswordRecovery()">Try again</button><button :class="recoveryState.canRetry?'text-link':'primary'" @click="leave('/forgot-password')">Request a new reset link</button><button class="text-link" @click="leave('/login')">Back to sign in</button></template>
 </section></main>
</template>
<style scoped>
.recovery-desk{min-height:100dvh;display:grid;place-items:center;padding:24px 16px;background:var(--vintage-page,#efe2ce);color:var(--vintage-text,#49321f)}.recovery-paper{width:min(100%,480px);min-width:0;padding:clamp(24px,6vw,42px);background:var(--vintage-card,#fff8eb);border:1px solid var(--vintage-line,#c9ad88);box-shadow:0 12px 35px #49321f12;overflow-wrap:anywhere}.brand{font:bold 30px Georgia,serif;margin:0 0 28px}.eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--vintage-muted,#85694b)}h1{font:32px/1.2 Georgia,serif;margin:10px 0 18px}p{line-height:1.65;margin:0 0 20px}.recovery-note{font-size:13px;border-block:1px solid var(--vintage-line,#c9ad88);padding:12px 0}label{display:block;font-weight:600;margin:20px 0 8px}input,select{display:block;width:100%;min-height:48px;padding:11px 12px;background:var(--vintage-input,#fffdf7);color:inherit;border:1px solid var(--vintage-line,#c9ad88);border-radius:4px;font:inherit}.help{font-size:12px;margin:7px 0 0;color:var(--vintage-muted,#85694b)}button{min-height:48px;font:inherit;cursor:pointer}.primary{width:100%;margin-top:24px;padding:12px 16px;border:0;border-radius:4px;background:#704624;color:#fff8eb;font-weight:600}.text-link{display:block;width:100%;background:transparent;border:0;color:inherit;text-decoration:underline;margin-top:14px;padding:10px 0}.feedback{padding:12px;border:1px solid #a84f39;border-radius:4px}button:disabled{opacity:.6;cursor:wait}input:focus-visible,select:focus-visible,button:focus-visible{outline:2px solid #a6773f;outline-offset:3px}
</style>

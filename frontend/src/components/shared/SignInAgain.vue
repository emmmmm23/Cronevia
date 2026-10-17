<script setup lang="ts">
import {ref} from 'vue'
import {useAuthStore} from '@/stores/auth'
const emit=defineEmits<{restored:[]}>()
const auth=useAuthStore(),email=ref(''),password=ref(''),busy=ref(false),error=ref('')
async function signIn(){
 if(busy.value||!email.value.trim()||!password.value)return
 busy.value=true;error.value=''
 try{const result=await auth.login(email.value.trim(),password.value);if(!result.success){error.value='We couldn’t sign you in. Check your details and try again.';return}password.value='';emit('restored')}
 catch{error.value='Sign-in is unavailable right now. Please retry.'}
 finally{busy.value=false}
}
</script>
<template><div class="sign-in-again form-grid" role="group" aria-label="Sign in again" @keydown.enter.prevent="signIn">
 <p role="status">Your session has expired. Sign in again to continue. Your details are still here.</p>
 <label>Email address<input v-model="email" type="email" autocomplete="username" :disabled="busy" /></label>
 <label>Password<input v-model="password" type="password" autocomplete="current-password" :disabled="busy" /></label>
 <p v-if="error" role="alert">{{error}}</p>
 <button type="button" class="primary" :disabled="busy||!email.trim()||!password" @click="signIn">{{busy?'Signing in…':'Sign in'}}</button>
</div></template>
<style scoped>.sign-in-again{padding:18px;background:#eee9dc;border-radius:10px;max-width:480px;margin:16px 0}.sign-in-again p{font-size:14px;line-height:1.6}.sign-in-again input{font-size:16px}</style>

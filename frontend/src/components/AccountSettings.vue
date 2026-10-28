<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import TwoFactorSettings from '@/components/TwoFactorSettings.vue'
import { accountError, changeAccountPassword, verifiedFactors } from '@/services/account-security'
import { appearance, applyTheme, type Theme } from '@/services/theme'
const props=defineProps<{ profile?: boolean }>()
const auth=useAuthStore()
const name=ref(auth.profile?.full_name||''),bio=ref(auth.profile?.bio||''),timezone=ref(auth.profile?.timezone||'UTC')
const theme=ref<Theme>(appearance.value),notifications=ref(true),password=ref(''),confirm=ref(''),current=ref(''),code=ref(''),nonce=ref(''),nonceSent=ref(false)
const preferencesReady=ref(!!props.profile)
const message=ref(''),error=ref(''),saving=ref(false),factor=ref(''),factors=ref<Awaited<ReturnType<typeof verifiedFactors>>>([])
async function loadPasswordFactors(){try{factors.value=await verifiedFactors();factor.value=factors.value[0]?.id||''}catch{error.value='Security settings could not load. Please refresh before changing your password.'}}
onMounted(async()=>{
 if(props.profile||!auth.user)return
 await loadPasswordFactors()
 const result=await supabase.from('user_settings').select('*').eq('user_id',auth.user.id).maybeSingle()
 if(result.error){error.value='Your preferences could not load. Please refresh and try again.';return}
 if(result.data){theme.value=result.data.theme||'vintage';applyTheme(theme.value);notifications.value=result.data.email_notifications??true;timezone.value=result.data.timezone||'UTC'}
 preferencesReady.value=true
})
async function save(){
 error.value='';message.value=''
 try{new Intl.DateTimeFormat('en',{timeZone:timezone.value}).format()}catch{error.value='Choose a valid time zone, such as Asia/Manila.';return}
 saving.value=true
 try{
  if(props.profile){const r=await auth.updateProfile({full_name:name.value.trim(),bio:bio.value,timezone:timezone.value});if(!r.success)throw new Error('Profile unavailable')}
  else{
   if(!auth.user)throw new Error('Sign in required')
   const r=await supabase.from('user_settings').upsert({user_id:auth.user.id,theme:theme.value,email_notifications:notifications.value,timezone:timezone.value},{onConflict:'user_id'}).select().single()
   if(r.error)throw r.error
   applyTheme(theme.value)
  }
  message.value='Saved.'
 }catch{error.value='Your changes could not be saved. Please try again.'}finally{saving.value=false}
}
async function requestNonce(){
 if(saving.value)return
 saving.value=true;error.value=''
 try{const r=await supabase.auth.reauthenticate();if(r.error)throw r.error;nonceSent.value=true;message.value='Check your email for a verification code.'}
 catch(e){error.value=accountError(e,'A verification email could not be sent. Please try again.')}
 finally{saving.value=false}
}
async function changePassword(){
 error.value='';message.value=''
 if(password.value!==confirm.value){error.value='Passwords do not match.';return}
 if(password.value.length<12||password.value.length>128){error.value='Use a password between 12 and 128 characters.';return}
 saving.value=true
 try{
  const result=await changeAccountPassword(password.value,current.value,factor.value,code.value,nonce.value)
  password.value='';confirm.value='';current.value='';code.value='';nonce.value='';nonceSent.value=false
  message.value=result.otherSessionsRevoked?'Password updated. Other devices will need to sign in again when their access expires.':'Password updated. Other sessions could not be ended; use Sign out everywhere below and sign in again.'
 }catch(e){code.value='';error.value=accountError(e,'Password could not be updated. Check your current password and authenticator code. If an email code is required, request one below.')}
 finally{saving.value=false}
}
async function signOutEverywhere(){const revoked=await auth.logout();window.location.assign(revoked?'/login':'/login?notice=local_sign_out_only')}
</script>
<template><main class="account-page">
  <header class="account-hero"><p class="eyebrow">{{profile?'A LITTLE ABOUT YOU':'MAKE YOUR SPACE YOUR OWN'}}</p><h1>{{profile?'Your profile':'Settings'}}</h1><p>{{profile?'A familiar face and a few words to accompany your stories.':'Settle in. Choose how Cronevia feels and how it keeps in touch.'}}</p></header>
  <div v-if="profile" class="profile-card"><div class="profile-monogram">{{(name||auth.user?.email||'C').trim().charAt(0).toUpperCase()}}</div><div><span class="profile-label">YOUR CRONEVIA PROFILE</span><h2>{{name||'Your name, here'}}</h2><p>{{auth.user?.email}}</p><p v-if="bio" class="profile-bio">{{bio}}</p></div><span class="profile-stamp">KEPT WITH CARE</span></div>
  <p v-if="error" role="alert" class="account-alert">{{error}}</p><p v-if="message" role="status" class="account-success">{{message}}</p>
  <form @submit.prevent="save" class="account-card"><div class="card-heading"><span class="card-number">01</span><div><h2>{{profile?'Your details':'Preferences'}}</h2><p>{{profile?'The details that appear alongside your memories.':'A few thoughtful defaults for your account.'}}</p></div></div>
    <label v-if="profile" class="field">Display name<input v-model="name" required maxlength="100" autocomplete="name" placeholder="What should we call you?" /></label>
    <label v-if="profile" class="field">A little about you<textarea v-model="bio" maxlength="500" rows="4" placeholder="The places, people, and small things you love…" /></label>
    <div v-if="!profile" class="settings-email"><span class="setting-icon">✉</span><div><small>ACCOUNT EMAIL</small><strong>{{auth.user?.email||'Not signed in'}}</strong></div><span class="verified-mark">✓</span></div>
    <label class="field">Time zone<input v-model="timezone" required placeholder="Asia/Manila" /><small>Used to show dates and moments in your local time.</small></label>
    <template v-if="!profile"><label class="field">Page appearance<select v-model="theme" :disabled="!preferencesReady||saving" @change="applyTheme(theme)"><option value="vintage">Vintage · parchment & ink</option><option value="light">Light · soft and bright</option><option value="dark">Dark · easy on the eyes</option></select></label><label class="toggle-row"><span><strong>Notes from Cronevia</strong><small>Receive account and memory reminders by email.</small></span><input v-model="notifications" :disabled="!preferencesReady||saving" type="checkbox" /></label></template>
    <button :disabled="saving||!preferencesReady" class="account-primary">{{saving?'Saving your changes…':profile?'Save profile':'Save preferences'}} <span>↗</span></button>
  </form>
  <form v-if="!profile" @submit.prevent="changePassword" class="account-card security-card"><div class="card-heading"><span class="card-number">02</span><div><h2>Account security</h2><p>Choose a password only you know.</p></div><span class="security-mark">✳</span></div><label class="field">Current password<input v-model="current" type="password" autocomplete="current-password" required maxlength="128" /></label><label class="field">New password<input v-model="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required placeholder="At least 12 characters" /></label><label class="field">Confirm new password<input v-model="confirm" type="password" autocomplete="new-password" required placeholder="Enter it once more" /></label><label v-if="factors.length>1" class="field">Authenticator<select v-model="factor"><option v-for="f in factors" :key="f.id" :value="f.id">{{f.friendly_name||'Authenticator app'}}</option></select></label><label v-if="factors.length" class="field">Current authenticator code<input v-model="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required /></label><label v-if="nonceSent" class="field">Email verification code<input v-model="nonce" autocomplete="one-time-code" maxlength="10" required /></label><button :disabled="saving" class="account-secondary">{{saving?'Updating…':'Update password'}}</button><button type="button" class="account-secondary" :disabled="saving" @click="requestNonce">Request email verification code</button></form><section v-if="!profile" class="account-card"><TwoFactorSettings @changed="loadPasswordFactors" /><button type="button" class="account-secondary" :disabled="saving" @click="signOutEverywhere">Sign out everywhere</button></section>
</main></template>
<style scoped>
.account-page{--ink:#392d28;--wine:#74283c;--muted:#827568;--line:#e6dccd;max-width:860px;margin:0 auto;padding:32px 20px 80px;color:var(--ink)}.account-hero{padding:24px 4px 28px;border-bottom:1px solid var(--line)}.eyebrow,.profile-label{font-size:10px;letter-spacing:.18em;color:#947852}.account-hero h1{margin:10px 0 8px;color:var(--wine);font:clamp(34px,5vw,48px) Georgia,serif}.account-hero>p:last-child{max-width:560px;color:var(--muted);line-height:1.65}.profile-card,.account-card{position:relative;margin-top:22px;padding:24px 28px;background:#fcfaf5;border:1px solid #e5dac8;border-radius:5px;box-shadow:0 12px 35px #45321c08}.profile-card{display:flex;gap:18px;align-items:center;min-height:140px;background:linear-gradient(110deg,#f5ecdc,#fcfaf5 58%)}.profile-monogram{display:grid;place-items:center;flex:none;width:76px;height:76px;border:1px solid #cdbd9f;border-radius:50%;background:#eee2cd;color:var(--wine);font:32px Georgia,serif}.profile-card h2,.card-heading h2{margin:5px 0;color:var(--wine);font:25px Georgia,serif}.profile-card p{margin:3px 0;color:var(--muted);font-size:13px}.profile-card .profile-bio{max-width:460px;margin-top:10px;color:var(--ink);line-height:1.6}.profile-stamp{position:absolute;right:20px;top:20px;color:#a29279;font-size:8px;letter-spacing:.15em}.account-card{display:grid;gap:18px}.card-heading{display:flex;align-items:center;gap:14px;padding-bottom:15px;border-bottom:1px solid var(--line)}.card-number{display:grid;place-items:center;width:34px;height:34px;border:1px solid #d2c2a8;border-radius:50%;color:var(--wine);font:14px Georgia,serif}.card-heading h2{font-size:22px}.card-heading p{margin:3px 0 0;color:var(--muted);font-size:12px}.field{display:grid;gap:7px;color:#5c4d41;font-size:13px;font-weight:600}.field input,.field textarea,.field select{width:100%;padding:12px 13px;border:1px solid #dcd0bf;border-radius:3px;background:#fffefa;color:var(--ink);font:inherit;font-size:14px;outline:none}.field input:focus,.field textarea:focus,.field select:focus{border-color:#9e6b76;box-shadow:0 0 0 3px #74283c12}.field textarea{resize:vertical}.field small,.toggle-row small{font-weight:400;color:var(--muted);font-size:11px}.settings-email{display:flex;align-items:center;gap:13px;padding:13px;border:1px solid var(--line);background:#f8f4ec}.setting-icon{display:grid;place-items:center;width:34px;height:34px;background:#eee2d1;color:var(--wine);border-radius:50%}.settings-email div{display:grid;gap:4px;flex:1}.settings-email small{font-size:9px;letter-spacing:.13em;color:var(--muted)}.settings-email strong{font-weight:500;font-size:13px}.verified-mark{color:#73806a}.toggle-row{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:13px;border:1px solid var(--line);background:#f8f4ec}.toggle-row span{display:grid;gap:4px}.toggle-row strong{font-size:13px;font-weight:600}.toggle-row input{width:19px;height:19px;accent-color:var(--wine)}.account-primary,.account-secondary{min-height:46px;padding:0 17px;border-radius:3px;cursor:pointer;font-size:13px}.account-primary{justify-self:start;background:var(--wine);color:#fffaf2}.account-primary span{margin-left:18px}.account-primary:disabled,.account-secondary:disabled{opacity:.6;cursor:wait}.security-card{margin-top:15px}.security-mark{margin-left:auto;color:#a29279;font-size:24px}.account-secondary{justify-self:start;border:1px solid #cdbd9f;background:#f8f4ec;color:var(--wine)}.account-alert,.account-success{margin:14px 0;padding:12px 14px;border-radius:3px;font-size:13px}.account-alert{background:#f9e7e3;color:#842e25}.account-success{background:#e8eee2;color:#476044}@media(max-width:560px){.account-page{padding:18px 14px 55px}.profile-card,.account-card{padding:19px}.profile-stamp{display:none}.profile-monogram{width:58px;height:58px;font-size:26px}.profile-card h2{font-size:21px}}
</style>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
const props=defineProps<{ profile?: boolean }>()
const auth=useAuthStore()
const name=ref(auth.profile?.full_name || ''), bio=ref(auth.profile?.bio || ''), timezone=ref(auth.profile?.timezone || 'UTC')
const theme=ref<'vintage'|'light'|'dark'>('vintage'), notifications=ref(true), password=ref(''), confirm=ref(''), message=ref(''), error=ref(''), saving=ref(false)
onMounted(async()=>{
  if(props.profile || !auth.user) return
  const result=await supabase.from('user_settings').select('*').eq('user_id',auth.user.id).single()
  if(result.error) {error.value=result.error.message;return}
  theme.value=result.data.theme || 'vintage'; notifications.value=result.data.email_notifications ?? true; timezone.value=result.data.timezone || 'UTC'
})
async function save(){
  error.value='';message.value='';saving.value=true
  try{
    if(props.profile){ const result=await auth.updateProfile({full_name:name.value.trim(),bio:bio.value,timezone:timezone.value});if(!result.success)throw new Error(result.error) }
    else {
      if(!auth.user)throw new Error('Please sign in.')
      const {error:failure}=await supabase.from('user_settings').update({theme:theme.value,email_notifications:notifications.value,timezone:timezone.value}).eq('user_id',auth.user.id).select().single()
      if(failure)throw failure
    }
    message.value='Saved.'
  }catch(e){error.value=(e as Error).message}finally{saving.value=false}
}
async function changePassword(){
  error.value='';message.value=''
  if(password.value!==confirm.value){error.value='Passwords do not match.';return}
  saving.value=true
  try{const result=await auth.changePassword(password.value);if(!result.success)throw new Error(result.error);password.value='';confirm.value='';message.value='Password updated.'}
  catch(e){error.value=(e as Error).message}finally{saving.value=false}
}
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
    <template v-if="!profile"><label class="field">Page appearance<select v-model="theme"><option value="vintage">Vintage · parchment & ink</option><option value="light">Light · soft and bright</option><option value="dark">Dark · easy on the eyes</option></select></label><label class="toggle-row"><span><strong>Notes from Cronevia</strong><small>Receive account and memory reminders by email.</small></span><input v-model="notifications" type="checkbox" /></label></template>
    <button :disabled="saving" class="account-primary">{{saving?'Saving your changes…':profile?'Save profile':'Save preferences'}} <span>↗</span></button>
  </form>
  <form v-if="!profile" @submit.prevent="changePassword" class="account-card security-card"><div class="card-heading"><span class="card-number">02</span><div><h2>Account security</h2><p>Choose a password only you know.</p></div><span class="security-mark">✳</span></div><label class="field">New password<input v-model="password" type="password" autocomplete="new-password" minlength="8" required placeholder="At least 8 characters" /></label><label class="field">Confirm new password<input v-model="confirm" type="password" autocomplete="new-password" required placeholder="Enter it once more" /></label><button :disabled="saving" class="account-secondary">{{saving?'Updating…':'Update password'}}</button></form>
</main></template>
<style scoped>
.account-page{--ink:#392d28;--wine:#74283c;--muted:#827568;--line:#e6dccd;max-width:860px;margin:0 auto;padding:32px 20px 80px;color:var(--ink)}.account-hero{padding:24px 4px 28px;border-bottom:1px solid var(--line)}.eyebrow,.profile-label{font-size:10px;letter-spacing:.18em;color:#947852}.account-hero h1{margin:10px 0 8px;color:var(--wine);font:clamp(34px,5vw,48px) Georgia,serif}.account-hero>p:last-child{max-width:560px;color:var(--muted);line-height:1.65}.profile-card,.account-card{position:relative;margin-top:22px;padding:24px 28px;background:#fcfaf5;border:1px solid #e5dac8;border-radius:5px;box-shadow:0 12px 35px #45321c08}.profile-card{display:flex;gap:18px;align-items:center;min-height:140px;background:linear-gradient(110deg,#f5ecdc,#fcfaf5 58%)}.profile-monogram{display:grid;place-items:center;flex:none;width:76px;height:76px;border:1px solid #cdbd9f;border-radius:50%;background:#eee2cd;color:var(--wine);font:32px Georgia,serif}.profile-card h2,.card-heading h2{margin:5px 0;color:var(--wine);font:25px Georgia,serif}.profile-card p{margin:3px 0;color:var(--muted);font-size:13px}.profile-card .profile-bio{max-width:460px;margin-top:10px;color:var(--ink);line-height:1.6}.profile-stamp{position:absolute;right:20px;top:20px;color:#a29279;font-size:8px;letter-spacing:.15em}.account-card{display:grid;gap:18px}.card-heading{display:flex;align-items:center;gap:14px;padding-bottom:15px;border-bottom:1px solid var(--line)}.card-number{display:grid;place-items:center;width:34px;height:34px;border:1px solid #d2c2a8;border-radius:50%;color:var(--wine);font:14px Georgia,serif}.card-heading h2{font-size:22px}.card-heading p{margin:3px 0 0;color:var(--muted);font-size:12px}.field{display:grid;gap:7px;color:#5c4d41;font-size:13px;font-weight:600}.field input,.field textarea,.field select{width:100%;padding:12px 13px;border:1px solid #dcd0bf;border-radius:3px;background:#fffefa;color:var(--ink);font:inherit;font-size:14px;outline:none}.field input:focus,.field textarea:focus,.field select:focus{border-color:#9e6b76;box-shadow:0 0 0 3px #74283c12}.field textarea{resize:vertical}.field small,.toggle-row small{font-weight:400;color:var(--muted);font-size:11px}.settings-email{display:flex;align-items:center;gap:13px;padding:13px;border:1px solid var(--line);background:#f8f4ec}.setting-icon{display:grid;place-items:center;width:34px;height:34px;background:#eee2d1;color:var(--wine);border-radius:50%}.settings-email div{display:grid;gap:4px;flex:1}.settings-email small{font-size:9px;letter-spacing:.13em;color:var(--muted)}.settings-email strong{font-weight:500;font-size:13px}.verified-mark{color:#73806a}.toggle-row{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:13px;border:1px solid var(--line);background:#f8f4ec}.toggle-row span{display:grid;gap:4px}.toggle-row strong{font-size:13px;font-weight:600}.toggle-row input{width:19px;height:19px;accent-color:var(--wine)}.account-primary,.account-secondary{min-height:46px;padding:0 17px;border-radius:3px;cursor:pointer;font-size:13px}.account-primary{justify-self:start;background:var(--wine);color:#fffaf2}.account-primary span{margin-left:18px}.account-primary:disabled,.account-secondary:disabled{opacity:.6;cursor:wait}.security-card{margin-top:15px}.security-mark{margin-left:auto;color:#a29279;font-size:24px}.account-secondary{justify-self:start;border:1px solid #cdbd9f;background:#f8f4ec;color:var(--wine)}.account-alert,.account-success{margin:14px 0;padding:12px 14px;border-radius:3px;font-size:13px}.account-alert{background:#f9e7e3;color:#842e25}.account-success{background:#e8eee2;color:#476044}@media(max-width:560px){.account-page{padding:18px 14px 55px}.profile-card,.account-card{padding:19px}.profile-stamp{display:none}.profile-monogram{width:58px;height:58px;font-size:26px}.profile-card h2{font-size:21px}}
</style>

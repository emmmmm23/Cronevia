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
<template><section class="max-w-xl space-y-5">
  <h1 class="text-3xl">{{ profile?'Your profile':'Account settings' }}</h1>
  <p>{{ auth.user?.email }}</p><p v-if="error" role="alert" class="text-red-700">{{ error }}</p><p v-if="message" role="status">{{ message }}</p>
  <form @submit.prevent="save" class="space-y-4">
    <template v-if="profile"><label class="block">Name<input v-model="name" required maxlength="100" class="block border rounded p-3 w-full" /></label><label class="block">About you<textarea v-model="bio" class="block border rounded p-3 w-full" /></label></template>
    <label class="block">Time zone<input v-model="timezone" required placeholder="Asia/Manila" class="block border rounded p-3 w-full" /></label>
    <template v-if="!profile"><label class="block">Saved theme preference<select v-model="theme" class="block border rounded p-3"><option>vintage</option><option>light</option><option>dark</option></select></label><label class="block"><input v-model="notifications" type="checkbox" /> Email notifications</label></template>
    <button :disabled="saving" class="bg-[#7b0323] text-white rounded px-4 py-2">{{ saving?'Saving…':'Save' }}</button>
  </form>
  <form v-if="!profile" @submit.prevent="changePassword" class="space-y-4 border-t pt-5"><h2 class="text-xl">Change password</h2><label class="block">New password<input v-model="password" type="password" autocomplete="new-password" minlength="8" required class="block border rounded p-3 w-full" /></label><label class="block">Confirm password<input v-model="confirm" type="password" autocomplete="new-password" required class="block border rounded p-3 w-full" /></label><button :disabled="saving" class="border rounded px-4 py-2">Update password</button></form>
</section></template>

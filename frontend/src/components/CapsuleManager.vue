<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'
type Capsule={id:string;title:string;unlock_date:string;can_open:boolean}
const capsules=ref<Capsule[]>([]), title=ref(''), message=ref(''), date=ref(''), error=ref(''), saving=ref(false), opened=ref('')
async function load(){const result=await supabase.rpc('list_capsules');if(result.error)throw result.error;capsules.value=result.data as unknown as Capsule[]}
onMounted(()=>{void load().catch(e=>error.value=e.message)})
async function create(){error.value='';saving.value=true;try{const result=await supabase.rpc('create_capsule',{capsule_title:title.value,capsule_message:message.value,opens_on:date.value});if(result.error)throw result.error;title.value='';message.value='';date.value='';await load()}catch(e){error.value=(e as Error).message}finally{saving.value=false}}
async function open(id:string){error.value='';try{const result=await supabase.rpc('open_capsule',{capsule_id:id});if(result.error)throw result.error;opened.value=(result.data as {message:string}).message;await load()}catch(e){error.value=(e as Error).message}}
</script>
<template><section class="max-w-2xl space-y-5"><h1 class="text-3xl">Time capsules</h1><p>Leave a message for a future date. Once sealed, it stays locked until that date.</p><p v-if="error" role="alert" class="text-red-700">{{ error }}</p>
<form @submit.prevent="create" class="space-y-3 border rounded p-5"><label class="block">Title<input v-model="title" required maxlength="255" class="block border rounded p-2 w-full" /></label><label class="block">Your message<textarea v-model="message" required rows="5" class="block border rounded p-2 w-full" /></label><label class="block">Unlock date (UTC)<input v-model="date" required type="date" class="block border rounded p-2" /></label><button :disabled="saving" class="bg-[#7b0323] text-white rounded px-4 py-2">{{ saving?'Sealing…':'Seal capsule' }}</button></form>
<ul class="space-y-3"><li v-for="capsule in capsules" :key="capsule.id" class="border rounded p-4"><h2 class="text-xl">{{ capsule.title }}</h2><p>Opens {{ capsule.unlock_date }}</p><button :disabled="!capsule.can_open" @click="open(capsule.id)" class="underline disabled:opacity-50">{{ capsule.can_open?'Open capsule':'Locked' }}</button></li></ul><p v-if="opened" class="whitespace-pre-wrap border rounded p-5">{{ opened }}</p></section></template>

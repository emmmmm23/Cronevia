<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import { watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { safeReturnPath } from '@/services/account-security'
const auth=useAuthStore(),router=useRouter()
watch(()=>auth.mfaRequired,required=>{
  const route=router.currentRoute.value
  if(required&&route.meta.requiresAuth&&!auth.inlineReauth)void router.replace({name:'verify-2fa',query:{redirect:safeReturnPath(route.fullPath)}})
})
watch(()=>auth.isAuthenticated,signedIn=>{
  if(!signedIn&&router.currentRoute.value.meta.requiresAuth&&!auth.inlineReauth)void router.replace('/login')
})
</script>

<template>
  <RouterView />
</template>

<script setup lang="ts">
import {RouterLink} from 'vue-router'
import {useAuthStore} from '@/stores/auth'
import UserAvatar from '@/components/shared/UserAvatar.vue'
const auth=useAuthStore()
</script>
<template>
 <header class="public-header"><nav aria-label="Main navigation"><RouterLink :to="{name:'landing'}" class="public-brand" aria-label="Cronevia home">Cronevia</RouterLink><div class="public-actions"><template v-if="auth.isAuthenticated"><RouterLink :to="{name:'home'}" class="public-cta">Your journal <span aria-hidden="true">↗</span></RouterLink><RouterLink v-if="auth.profile" :to="{name:'profile'}" class="public-profile" aria-label="Your profile"><UserAvatar :profile="auth.profile" :size="36"/></RouterLink></template><template v-else><RouterLink :to="{name:'login'}" class="public-login">Sign in</RouterLink><RouterLink :to="{name:'register'}" class="public-cta">Start writing</RouterLink></template></div></nav></header>
</template>
<style scoped>
.public-header{background:#fdfaf5;border-bottom:1px solid #e5d4bb}.public-header nav{max-width:1200px;margin:auto;min-height:76px;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px}.public-brand{font:700 29px 'Playfair Display',Georgia,serif;color:#7b0323;letter-spacing:-.03em;min-height:44px;display:inline-flex;align-items:center}.public-actions{display:flex;align-items:center;gap:12px}.public-actions a{min-height:44px;display:inline-flex;align-items:center;justify-content:center;font-size:14px}.public-login{padding:8px;color:#6b4423}.public-cta{padding:10px 17px;gap:14px;background:#7b0323;color:#fdfaf5;border:1px solid #5a0019;border-radius:3px}.public-profile{min-width:44px}a:focus-visible{outline:2px solid #9e6b76;outline-offset:4px}@media(max-width:420px){.public-header nav{padding:10px 14px;gap:8px;min-height:68px}.public-brand{font-size:25px}.public-actions{gap:5px}.public-actions a{font-size:12px}.public-cta{padding:10px 11px}}
</style>

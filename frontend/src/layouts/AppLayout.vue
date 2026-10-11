<template>
  <div>
    <header class="border-b">
      <nav class="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center gap-4" aria-label="Main navigation">
        <RouterLink to="/" class="text-xl font-bold">Cronevia</RouterLink>
        <RouterLink v-for="link in links" :key="link[0]" :to="link[0]" class="text-sm hover:underline">{{ link[1] }}</RouterLink>
        <RouterLink v-if="auth.isSuperAdmin" to="/admin">Admin</RouterLink>
        <button type="button" class="text-sm underline" @click="signOut">Sign out</button>
      </nav>
    </header>
    <main class="max-w-7xl mx-auto px-4 py-8">
      <RouterView :key="$route.fullPath" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
const router = useRouter()
const links = [['/journal', 'Journal'], ['/trips', 'Trips'], ['/memories', 'Memories'], ['/map', 'Map'], ['/take-me-back', 'Timeline'], ['/capsules', 'Capsules'], ['/letters', 'Letters'], ['/search', 'Search'], ['/on-this-day', 'On this day'], ['/profile', 'Profile'], ['/settings', 'Settings']]
async function signOut() { await auth.logout(); await router.push('/login') }
</script>

<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

// Initialize auth session on app mount
onMounted(async () => {
  if (!auth.initialized) {
    await auth.initialize()
  }
})
</script>

<template>
  <RouterView />
</template>

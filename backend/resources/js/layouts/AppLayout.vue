<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'

const auth = useAuthStore()

const isInitializing = computed(() => auth.loading && !auth.initialized)
const isReady = computed(() => auth.initialized)
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#f5ebdd]">
    <!-- Show loading spinner during initialization -->
    <div v-if="isInitializing" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin w-12 h-12 border-4 border-gray-200 border-t-[#7B0323] rounded-full mx-auto mb-4"></div>
        <p class="text-gray-600">Loading your archive...</p>
      </div>
    </div>

    <!-- Render page after initialized -->
    <template v-else-if="isReady">
      <AppNavbar />

      <main class="flex-1 w-full">
        <RouterView v-slot="{ Component, route }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="route.path" />
          </Transition>
        </RouterView>
      </main>

      <AppFooter />
    </template>
  </div>
</template>

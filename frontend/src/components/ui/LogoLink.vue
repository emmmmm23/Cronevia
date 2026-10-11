<template>
  <RouterLink
    :to="logoRoute"
    class="flex items-center shrink-0 group opacity-95 group-hover:opacity-100 transition-opacity"
  >
    <CrnLogo size="md" variant="light" />
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import CrnLogo from '@/components/ui/CrnLogo.vue'

const auth = useAuthStore()

/**
 * Dynamic logo routing based on authentication state and role.
 *
 * Preconditions:
 *   - Auth store is initialized
 *
 * Postconditions:
 *   - Unauthenticated: links to landing page (/)
 *   - Authenticated normal user: links to home (/home)
 *   - Authenticated super admin: links to admin dashboard (/super-admin/dashboard)
 *   - Uses Vue Router RouterLink (no full page reload)
 */
const logoRoute = computed(() => ({ name: !auth.isAuthenticated ? 'login' : auth.isSuperAdmin ? 'admin.dashboard' : 'home' }))
</script>

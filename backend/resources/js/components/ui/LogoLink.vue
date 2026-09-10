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
const logoRoute = computed(() => {
  // Debug: log the current state
  console.log('LogoLink - isAuthenticated:', auth.isAuthenticated, 'user:', auth.user, 'role:', auth.user?.role)
  
  if (!auth.isAuthenticated) {
    // Unauthenticated: logo links to landing page
    console.log('LogoLink routing to: landing (/)')
    return { name: 'landing' }
  }

  if (auth.user?.role === 'super_admin') {
    // Super admin: logo links to admin dashboard
    console.log('LogoLink routing to: admin-dashboard (/super-admin/dashboard)')
    return { name: 'admin-dashboard' }
  }

  // Normal user: logo links to home
  console.log('LogoLink routing to: home (/home)')
  return { name: 'home' }
})
</script>

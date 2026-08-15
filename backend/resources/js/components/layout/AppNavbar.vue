<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import CrnLogo from '@/components/ui/CrnLogo.vue'

const auth = useAuthStore()
const router = useRouter()
const mobileMenuOpen = ref(false)

const isAuthenticated = computed(() => auth.isAuthenticated)
const user = computed(() => auth.user)

async function handleLogout() {
  mobileMenuOpen.value = false
  await auth.logout()
  router.push({ name: 'login' })
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

const guestLinks = [
  { label: 'Login', to: { name: 'login' } },
  { label: 'Create Account', to: { name: 'register' } },
]

const authLinks = [
  { label: 'Journal', to: { name: 'journal' }, icon: 'journal' },
  { label: 'Trips', to: { name: 'trips' }, icon: 'trips' },
  { label: 'Memories', to: { name: 'memories' }, icon: 'memories' },
  { label: 'Timeline', to: { name: 'onthisday' }, icon: 'timeline' },
]
</script>

<template>
  <!-- Red editorial navbar -->
  <header class="bg-[#7B0323] text-[#fdfaf5] shadow-md relative z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6">
      <div class="flex items-center justify-between h-16">

        <!-- Logo -->
        <RouterLink to="/" class="flex items-center shrink-0 group opacity-95 group-hover:opacity-100 transition-opacity" @click="closeMobileMenu">
          <CrnLogo size="md" variant="light" />
        </RouterLink>

        <!-- Desktop navigation -->
        <nav class="hidden md:flex items-center gap-1" aria-label="Main navigation">
          <!-- Authenticated links -->
          <template v-if="isAuthenticated">
            <RouterLink
              v-for="link in authLinks"
              :key="link.label"
              :to="link.to"
              class="px-3.5 py-2 text-sm font-medium text-[#fdfaf5]/85 rounded transition-all duration-150 hover:text-[#fdfaf5] hover:bg-white/10"
              active-class="text-[#fdfaf5] bg-white/15 font-semibold"
            >
              {{ link.label }}
            </RouterLink>
          </template>
        </nav>

        <!-- Desktop right actions -->
        <div class="hidden md:flex items-center gap-2">
          <template v-if="isAuthenticated">
            <!-- Profile dropdown trigger -->
            <RouterLink
              :to="{ name: 'profile' }"
              class="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium text-[#fdfaf5]/85 hover:text-[#fdfaf5] hover:bg-white/10 transition-all duration-150"
              active-class="text-[#fdfaf5] bg-white/15"
            >
              <span
                class="w-7 h-7 rounded-full bg-[#7B0323] border border-white/30 flex items-center justify-center text-xs font-bold text-white shrink-0"
                aria-hidden="true"
              >
                {{ user?.name?.charAt(0)?.toUpperCase() ?? 'U' }}
              </span>
              <span class="hidden lg:inline">{{ user?.name?.split(' ')[0] }}</span>
            </RouterLink>
            <button
              type="button"
              class="px-3 py-1.5 text-sm font-medium text-[#fdfaf5]/70 hover:text-[#fdfaf5] hover:bg-white/10 rounded transition-all duration-150"
              @click="handleLogout"
            >
              Sign Out
            </button>
          </template>

          <template v-else>
            <RouterLink
              :to="{ name: 'login' }"
              class="px-4 py-2 text-sm font-semibold text-[#fdfaf5]/85 hover:text-[#fdfaf5] hover:bg-white/10 rounded transition-all duration-150"
            >
              Sign In
            </RouterLink>
            <RouterLink
              :to="{ name: 'register' }"
              class="px-4 py-2 text-sm font-semibold bg-[#fdfaf5] text-[#7B0323] rounded hover:bg-white transition-all duration-150 border border-white/30"
            >
              Create Account
            </RouterLink>
          </template>
        </div>

        <!-- Mobile menu button -->
        <button
          type="button"
          class="md:hidden p-2 rounded text-[#fdfaf5] hover:bg-white/10 transition-colors"
          :aria-expanded="mobileMenuOpen"
          aria-controls="mobile-menu"
          :aria-label="mobileMenuOpen ? 'Close menu' : 'Open menu'"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <!-- Hamburger / X icon -->
          <svg v-if="!mobileMenuOpen" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile menu -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="mobileMenuOpen"
        id="mobile-menu"
        class="md:hidden border-t border-white/15 bg-[#5a0019]"
      >
        <nav class="px-4 py-3 flex flex-col gap-0.5" aria-label="Mobile navigation">
          <template v-if="isAuthenticated">
            <RouterLink
              v-for="link in authLinks"
              :key="link.label"
              :to="link.to"
              class="px-3 py-2.5 text-sm font-medium text-[#fdfaf5]/85 rounded hover:text-[#fdfaf5] hover:bg-white/10 transition-all"
              active-class="text-[#fdfaf5] bg-white/15 font-semibold"
              @click="closeMobileMenu"
            >
              {{ link.label }}
            </RouterLink>
            <div class="my-2 border-t border-white/15" />
            <RouterLink
              :to="{ name: 'profile' }"
              class="px-3 py-2.5 text-sm font-medium text-[#fdfaf5]/85 rounded hover:text-[#fdfaf5] hover:bg-white/10 transition-all"
              @click="closeMobileMenu"
            >
              Profile
            </RouterLink>
            <RouterLink
              :to="{ name: 'settings' }"
              class="px-3 py-2.5 text-sm font-medium text-[#fdfaf5]/85 rounded hover:text-[#fdfaf5] hover:bg-white/10 transition-all"
              @click="closeMobileMenu"
            >
              Settings
            </RouterLink>
            <button
              type="button"
              class="w-full text-left px-3 py-2.5 text-sm font-medium text-[#fdfaf5]/70 rounded hover:text-[#fdfaf5] hover:bg-white/10 transition-all"
              @click="handleLogout"
            >
              Sign Out
            </button>
          </template>

          <template v-else>
            <RouterLink
              :to="{ name: 'login' }"
              class="px-3 py-2.5 text-sm font-medium text-[#fdfaf5]/85 rounded hover:text-[#fdfaf5] hover:bg-white/10 transition-all"
              @click="closeMobileMenu"
            >
              Sign In
            </RouterLink>
            <RouterLink
              :to="{ name: 'register' }"
              class="px-3 py-2.5 text-sm font-semibold text-[#fdfaf5] rounded hover:bg-white/10 transition-all"
              @click="closeMobileMenu"
            >
              Create Account
            </RouterLink>
          </template>
        </nav>
      </div>
    </Transition>
  </header>
</template>

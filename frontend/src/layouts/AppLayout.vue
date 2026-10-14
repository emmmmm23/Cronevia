<template>
  <div class="min-h-screen bg-[#f5ebdd]">
    <div v-if="journalEditor" class="journal-brand"><RouterLink to="/journal" aria-label="Cronevia journal">Cronevia<span aria-hidden="true">.</span></RouterLink><span>Your days, kept close.</span></div>
    <!-- Header navigation -->
    <header v-if="!journalEditor" role="banner" class="sticky top-0 z-40 bg-[#fdfaf5] border-b border-[#e5d4bb] shadow-sm">
      <nav class="max-w-7xl mx-auto px-4 sm:px-6" aria-label="Main navigation">
        <div class="flex items-center justify-between h-16">
          
          <!-- Logo -->
          <div class="flex-shrink-0">
            <RouterLink 
              to="/" 
              class="text-2xl font-bold text-[#7B0323] hover:opacity-80 transition-opacity"
              style="font-family: 'Playfair Display', Georgia, serif;"
            >
              Cronevia
            </RouterLink>
          </div>

          <!-- Desktop navigation -->
          <div class="hidden md:flex md:items-center md:space-x-1 lg:space-x-2">
            <RouterLink
              v-for="link in mainNavLinks"
              :key="link.path"
              :to="link.path"
              :class="[
                'px-3 py-2 text-sm font-medium rounded transition-colors',
                isActiveRoute(link.path)
                  ? 'text-[#7B0323] border-b-2 border-[#7B0323]'
                  : 'text-[#6b4423] hover:text-[#7B0323] hover:bg-[#f5ebdd]'
              ]"
            >
              {{ link.label }}
            </RouterLink>
            
            <!-- Admin link (if super admin) -->
            <RouterLink
              v-if="auth.isSuperAdmin"
              to="/admin"
              :class="[
                'px-3 py-2 text-sm font-medium rounded transition-colors',
                isActiveRoute('/admin')
                  ? 'text-[#7B0323] border-b-2 border-[#7B0323]'
                  : 'text-[#6b4423] hover:text-[#7B0323] hover:bg-[#f5ebdd]'
              ]"
            >
              Admin
            </RouterLink>
          </div>

          <!-- Right side: Search icon + Profile -->
          <div class="hidden md:flex md:items-center md:space-x-3">
            <!-- Search icon -->
            <RouterLink
              to="/search"
              class="p-2 text-[#6b4423] hover:text-[#7B0323] hover:bg-[#f5ebdd] rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B0323]"
              aria-label="Search"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </RouterLink>

            <!-- Profile dropdown -->
            <div class="relative" ref="profileDropdownRef">
              <button
                type="button"
                @click="toggleProfileDropdown"
                class="w-8 h-8 rounded-full bg-[#7B0323] text-[#fdfaf5] text-xs font-bold flex items-center justify-center hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B0323] focus-visible:ring-offset-2"
                :aria-expanded="profileDropdownOpen"
                aria-haspopup="true"
                :aria-label="`${userInitial} profile menu`"
              >
                {{ userInitial }}
              </button>

              <!-- Dropdown menu -->
              <Transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="transform opacity-0 scale-95"
                enter-to-class="transform opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="transform opacity-100 scale-100"
                leave-to-class="transform opacity-0 scale-95"
              >
                <div
                  v-if="profileDropdownOpen"
                  class="absolute right-0 mt-2 w-48 bg-[#fdfaf5] border border-[#d7c7b3] rounded shadow-md py-1 z-50"
                >
                  <RouterLink
                    to="/profile"
                    class="block px-4 py-2 text-sm text-[#2b1a10] hover:bg-[#f5ebdd] transition-colors"
                    @click="profileDropdownOpen = false"
                  >
                    Profile
                  </RouterLink>
                  <RouterLink
                    to="/settings"
                    class="block px-4 py-2 text-sm text-[#2b1a10] hover:bg-[#f5ebdd] transition-colors"
                    @click="profileDropdownOpen = false"
                  >
                    Settings
                  </RouterLink>
                  <div class="border-t border-[#e5d4bb] my-1"></div>
                  <button
                    type="button"
                    @click="handleSignOut"
                    class="block w-full text-left px-4 py-2 text-sm text-[#2b1a10] hover:bg-[#f5ebdd] transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </Transition>
            </div>
          </div>

          <!-- Mobile hamburger button -->
          <button
            type="button"
            @click="toggleMobileMenu"
            class="md:hidden p-2 text-[#6b4423] hover:text-[#7B0323] hover:bg-[#f5ebdd] rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B0323]"
            :aria-expanded="mobileMenuOpen"
            :aria-label="mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'"
            aria-controls="mobile-menu"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path v-if="!mobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Mobile menu -->
        <Transition
          enter-active-class="transition ease-out duration-200"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition ease-in duration-150"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div
            v-if="mobileMenuOpen"
            id="mobile-menu"
            class="md:hidden border-t border-[#e5d4bb]"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div class="py-2 space-y-1">
              <RouterLink
                v-for="link in allNavLinks"
                :key="link.path"
                :to="link.path"
                :class="[
                  'block px-4 py-3 text-sm font-medium border-b border-[#f0e6d3] transition-colors',
                  isActiveRoute(link.path)
                    ? 'text-[#7B0323] bg-[#f5ebdd]'
                    : 'text-[#6b4423] hover:text-[#7B0323] hover:bg-[#f5ebdd]'
                ]"
              >
                {{ link.label }}
              </RouterLink>
              
              <!-- Admin link in mobile (if super admin) -->
              <RouterLink
                v-if="auth.isSuperAdmin"
                to="/admin"
                :class="[
                  'block px-4 py-3 text-sm font-medium border-b border-[#f0e6d3] transition-colors',
                  isActiveRoute('/admin')
                    ? 'text-[#7B0323] bg-[#f5ebdd]'
                    : 'text-[#6b4423] hover:text-[#7B0323] hover:bg-[#f5ebdd]'
                ]"
              >
                Admin
              </RouterLink>
              
              <button
                type="button"
                @click="handleSignOut"
                class="block w-full text-left px-4 py-3 text-sm font-medium text-[#6b4423] hover:text-[#7B0323] hover:bg-[#f5ebdd] border-b border-[#f0e6d3] transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </Transition>
      </nav>
    </header>

    <!-- Main content area -->
    <main class="min-h-screen">
      <RouterView :key="$route.fullPath" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router'
import { onClickOutside } from '@vueuse/core'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const journalEditor = computed(() => ['journal.create','journal.edit','memories.create','memories.show','memories.edit'].includes(String(route.name)))

// Mobile menu state
const mobileMenuOpen = ref<boolean>(false)

// Profile dropdown state
const profileDropdownOpen = ref<boolean>(false)
const profileDropdownRef = ref<HTMLElement | null>(null)

// Navigation links
const mainNavLinks = [
  { path: '/journal', label: 'Journal' },
  { path: '/trips', label: 'Trips' },
  { path: '/memories', label: 'Memories' },
  { path: '/map', label: 'Map' },
  { path: '/take-me-back', label: 'Timeline' },
  { path: '/capsules', label: 'Capsules' },
  { path: '/letters', label: 'Letters' },
  { path: '/on-this-day', label: 'On this day' },
]

const allNavLinks = [
  ...mainNavLinks,
  { path: '/profile', label: 'Profile' },
  { path: '/settings', label: 'Settings' },
]

// User initial for avatar
const userInitial = computed(() => {
  const name = auth.user?.name || auth.user?.email || 'U'
  return name.charAt(0).toUpperCase()
})

// Check if route is active
function isActiveRoute(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/')
}

// Toggle mobile menu
function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
  if (mobileMenuOpen.value) {
    profileDropdownOpen.value = false
  }
}

// Toggle profile dropdown
function toggleProfileDropdown() {
  profileDropdownOpen.value = !profileDropdownOpen.value
  if (profileDropdownOpen.value) {
    mobileMenuOpen.value = false
  }
}

// Sign out handler
async function handleSignOut() {
  profileDropdownOpen.value = false
  mobileMenuOpen.value = false
  await auth.logout()
  await router.push('/login')
}

// Close mobile menu on route change
watch(route, () => {
  mobileMenuOpen.value = false
})

// Close profile dropdown on outside click
onClickOutside(profileDropdownRef, () => {
  profileDropdownOpen.value = false
})
</script>

<style scoped>
.journal-brand{height:58px;padding:0 38px;display:flex;align-items:center;justify-content:space-between;background:#f7f4ec;border-bottom:1px solid #ded8cb}.journal-brand a{font:600 25px Georgia,serif;color:#74283c;letter-spacing:-1px}.journal-brand a span{color:#829073}.journal-brand>span{font:16px 'Caveat',cursive;color:#878773}@media(max-width:767px){.journal-brand{height:52px;padding:0 18px}.journal-brand a{font-size:22px}}
@media(max-width:959px){.journal-brand{display:none}}
</style>

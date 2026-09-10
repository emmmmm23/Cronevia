<template>
  <Popover class="relative">
    <PopoverButton
      class="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium text-[#fdfaf5]/85 hover:text-[#fdfaf5] hover:bg-white/10 transition-all"
    >
      <div
        class="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold"
        aria-hidden="true"
      >
        {{ user?.name?.charAt(0)?.toUpperCase() ?? 'U' }}
      </div>
      <span class="hidden lg:inline">{{ user?.name?.split(' ')[0] }}</span>
    </PopoverButton>

    <PopoverPanel class="absolute right-0 mt-2 w-48 bg-white rounded shadow-lg z-50">
      <div class="p-2">
        <!-- User name header -->
        <div class="px-3 py-2 text-sm font-semibold text-gray-700 border-b">
          {{ user?.name }}
        </div>

        <!-- Profile link -->
        <RouterLink
          :to="{ name: 'profile' }"
          class="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
          @click="$emit('close')"
        >
          Profile
        </RouterLink>

        <!-- Settings link -->
        <RouterLink
          :to="{ name: 'settings' }"
          class="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
          @click="$emit('close')"
        >
          Settings
        </RouterLink>

        <!-- Admin Dashboard (super_admin only) -->
        <template v-if="isSuperAdmin">
          <div class="border-t my-1" />
          <RouterLink
            :to="{ name: 'admin-dashboard' }"
            class="block px-3 py-2 text-sm text-purple-700 hover:bg-purple-50 rounded font-medium"
            @click="$emit('close')"
          >
            Admin Dashboard
          </RouterLink>
        </template>

        <!-- Divider + Sign Out -->
        <div class="border-t my-1" />
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
          @click="$emit('logout')"
        >
          Sign Out
        </button>
      </div>
    </PopoverPanel>
  </Popover>
</template>

<script setup lang="ts">
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import { RouterLink } from 'vue-router'
import type { User } from '@/types'

/**
 * UserMenu Component
 *
 * Displays authenticated user menu with profile, settings, and logout options.
 * Super admins see an "Admin Dashboard" link.
 */
defineProps<{
  user: User | null
  isSuperAdmin: boolean
}>()

defineEmits<{
  logout: []
  close: []
}>()
</script>

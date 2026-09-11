<template>
  <div class="min-h-screen bg-[#FFF8F0] p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-[#8B4513] mb-2">Super Admin Dashboard</h1>
        <p class="text-gray-600">System management and monitoring</p>
      </div>

      <!-- Admin Info Card -->
      <div class="bg-white rounded-lg shadow-lg border-2 border-[#D4A574] p-6 mb-8">
        <div class="flex items-center">
          <div class="w-12 h-12 bg-[#C41E3A] rounded-full flex items-center justify-center text-white font-bold text-xl mr-4">
            {{ auth.user?.profile?.full_name?.charAt(0) || 'A' }}
          </div>
          <div>
            <h2 class="text-xl font-bold text-[#8B4513]">
              {{ auth.user?.profile?.full_name || 'Super Admin' }}
            </h2>
            <p class="text-sm text-gray-600">{{ auth.user?.email }}</p>
            <span class="inline-block mt-1 px-2 py-1 bg-[#C41E3A] text-white text-xs font-semibold rounded">
              SUPER ADMIN
            </span>
          </div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white rounded-lg shadow border-2 border-[#D4A574] p-6">
          <h3 class="text-sm font-medium text-gray-600 mb-2">Total Users</h3>
          <p class="text-3xl font-bold text-[#8B4513]">—</p>
          <p class="text-xs text-gray-500 mt-2">Coming soon</p>
        </div>

        <div class="bg-white rounded-lg shadow border-2 border-[#D4A574] p-6">
          <h3 class="text-sm font-medium text-gray-600 mb-2">Active Users</h3>
          <p class="text-3xl font-bold text-[#8B4513]">—</p>
          <p class="text-xs text-gray-500 mt-2">Coming soon</p>
        </div>

        <div class="bg-white rounded-lg shadow border-2 border-[#D4A574] p-6">
          <h3 class="text-sm font-medium text-gray-600 mb-2">System Health</h3>
          <p class="text-3xl font-bold text-green-600">✓</p>
          <p class="text-xs text-gray-500 mt-2">All systems operational</p>
        </div>
      </div>

      <!-- Admin Features -->
      <div class="bg-white rounded-lg shadow-lg border-2 border-[#D4A574] p-6">
        <h2 class="text-xl font-bold text-[#8B4513] mb-4">Admin Features</h2>
        <div class="space-y-4">
          <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 class="font-semibold text-[#8B4513] mb-2">User Management</h3>
            <p class="text-sm text-gray-600 mb-3">
              View, suspend, reactivate, and manage user accounts.
            </p>
            <button
              disabled
              class="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>

          <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 class="font-semibold text-[#8B4513] mb-2">Audit Logs</h3>
            <p class="text-sm text-gray-600 mb-3">
              Review system activity and security events.
            </p>
            <button
              disabled
              class="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>

          <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 class="font-semibold text-[#8B4513] mb-2">Database Status</h3>
            <p class="text-sm text-gray-600 mb-3">
              Monitor database health and performance.
            </p>
            <button
              disabled
              class="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>
        </div>
      </div>

      <!-- Security Notice -->
      <div class="mt-8 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg
              class="h-5 w-5 text-yellow-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-yellow-800">
              Admin Functionality in Development
            </h3>
            <p class="mt-1 text-sm text-yellow-700">
              Full admin features will be implemented after authentication migration is complete.
              This page confirms your Super Admin access is working correctly.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<style scoped>
/* Vintage-inspired styling is handled through Tailwind classes */
</style>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const user = computed(() => auth.user)

const users = ref([])
const loading = ref(false)
const error = ref('')
</script>

<template>
  <div class="min-h-screen bg-[#f5ebdd]">
    <!-- Header -->
    <section class="bg-[#fdfaf5] border-b border-[#e5d4bb]">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <h1 class="text-3xl sm:text-4xl font-bold text-[#2b1a10] leading-tight" style="font-family:'Playfair Display',Georgia,serif;">
          User Management
        </h1>
        <p class="mt-2 text-base text-[#6b4423]">
          View and manage system users
        </p>
      </div>
    </section>

    <!-- Content -->
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <!-- Toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <input 
          type="text" 
          placeholder="Search users..." 
          class="px-4 py-2 border border-[#d7c7b3] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#7B0323]"
        />
        <button class="bg-[#7B0323] text-[#fdfaf5] px-4 py-2 rounded text-sm font-semibold hover:bg-[#5a0019] transition-colors">
          Add User
        </button>
      </div>

      <!-- Table -->
      <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead class="border-b border-[#e5d4bb] bg-[#f5ebdd]">
            <tr>
              <th class="px-6 py-3 text-left font-semibold text-[#2b1a10]">Name</th>
              <th class="px-6 py-3 text-left font-semibold text-[#2b1a10]">Email</th>
              <th class="px-6 py-3 text-left font-semibold text-[#2b1a10]">Role</th>
              <th class="px-6 py-3 text-left font-semibold text-[#2b1a10]">Status</th>
              <th class="px-6 py-3 text-left font-semibold text-[#2b1a10]">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="users.length === 0" class="border-t border-[#e5d4bb]">
              <td colspan="5" class="px-6 py-8 text-center text-[#8a5c2e]">
                <div v-if="loading">Loading users...</div>
                <div v-else-if="error" class="text-[#7B0323]">{{ error }}</div>
                <div v-else>No users found</div>
              </td>
            </tr>
            <tr v-for="u in users" :key="u.id" class="border-t border-[#e5d4bb] hover:bg-[#fdf9f5] transition-colors">
              <td class="px-6 py-3 font-medium text-[#2b1a10]">{{ u.name }}</td>
              <td class="px-6 py-3 text-[#6b4423]">{{ u.email }}</td>
              <td class="px-6 py-3">
                <span class="px-2 py-1 rounded text-xs font-semibold" :class="u.role === 'super_admin' ? 'bg-[#7B0323] text-[#fdfaf5]' : 'bg-[#e5d4bb] text-[#2b1a10]'">
                  {{ u.role }}
                </span>
              </td>
              <td class="px-6 py-3">
                <span class="px-2 py-1 rounded text-xs font-semibold" :class="u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                  {{ u.status }}
                </span>
              </td>
              <td class="px-6 py-3">
                <button class="text-[#7B0323] hover:underline text-xs font-semibold">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const user = computed(() => auth.user)

const logs = ref([])
const loading = ref(false)
const error = ref('')
</script>

<template>
  <div class="min-h-screen bg-[#f5ebdd]">
    <!-- Header -->
    <section class="bg-[#fdfaf5] border-b border-[#e5d4bb]">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <h1 class="text-3xl sm:text-4xl font-bold text-[#2b1a10] leading-tight" style="font-family:'Playfair Display',Georgia,serif;">
          Audit Logs
        </h1>
        <p class="mt-2 text-base text-[#6b4423]">
          System activity and user actions
        </p>
      </div>
    </section>

    <!-- Content -->
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <!-- Filters -->
      <div class="flex flex-col sm:flex-row gap-4 mb-6">
        <input 
          type="text" 
          placeholder="Filter by user..." 
          class="px-4 py-2 border border-[#d7c7b3] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#7B0323]"
        />
        <input 
          type="text" 
          placeholder="Filter by action..." 
          class="px-4 py-2 border border-[#d7c7b3] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#7B0323]"
        />
        <input 
          type="date" 
          class="px-4 py-2 border border-[#d7c7b3] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#7B0323]"
        />
      </div>

      <!-- Table -->
      <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead class="border-b border-[#e5d4bb] bg-[#f5ebdd]">
            <tr>
              <th class="px-6 py-3 text-left font-semibold text-[#2b1a10]">Timestamp</th>
              <th class="px-6 py-3 text-left font-semibold text-[#2b1a10]">User</th>
              <th class="px-6 py-3 text-left font-semibold text-[#2b1a10]">Action</th>
              <th class="px-6 py-3 text-left font-semibold text-[#2b1a10]">Resource</th>
              <th class="px-6 py-3 text-left font-semibold text-[#2b1a10]">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="logs.length === 0" class="border-t border-[#e5d4bb]">
              <td colspan="5" class="px-6 py-8 text-center text-[#8a5c2e]">
                <div v-if="loading">Loading logs...</div>
                <div v-else-if="error" class="text-[#7B0323]">{{ error }}</div>
                <div v-else>No audit logs found</div>
              </td>
            </tr>
            <tr v-for="log in logs" :key="log.id" class="border-t border-[#e5d4bb] hover:bg-[#fdf9f5] transition-colors">
              <td class="px-6 py-3 font-medium text-[#2b1a10]">{{ log.created_at }}</td>
              <td class="px-6 py-3 text-[#6b4423]">{{ log.user_name }}</td>
              <td class="px-6 py-3">
                <span class="px-2 py-1 rounded text-xs font-semibold bg-[#e5d4bb] text-[#2b1a10]">
                  {{ log.action }}
                </span>
              </td>
              <td class="px-6 py-3 text-[#6b4423]">{{ log.resource_type }}</td>
              <td class="px-6 py-3">
                <span class="px-2 py-1 rounded text-xs font-semibold" :class="log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                  {{ log.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

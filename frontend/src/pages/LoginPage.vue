<template>
  <div class="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-md">
      <!-- Logo/Branding -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-[#8B4513] mb-2">Cronevia</h1>
        <p class="text-gray-600 italic">Write today. Travel back anytime.</p>
      </div>

      <!-- Login Card -->
      <div class="bg-white rounded-lg shadow-lg border-2 border-[#D4A574] p-8">
        <h2 class="text-2xl font-bold text-[#8B4513] mb-6">Welcome Back</h2>

        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
        >
          {{ errorMessage }}
        </div>

        <!-- Account Suspended Message from Query -->
        <div
          v-if="route.query.error === 'account_suspended'"
          class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm"
        >
          {{ route.query.message || 'Your account has been suspended.' }}
        </div>

        <!-- Login Form -->
        <form @submit.prevent="handleLogin">
          <!-- Email -->
          <div class="mb-4">
            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B4513] focus:outline-none transition-colors"
              placeholder="your.email@example.com"
              :disabled="loading"
            />
          </div>

          <!-- Password -->
          <div class="mb-6">
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B4513] focus:outline-none transition-colors"
              placeholder="••••••••"
              :disabled="loading"
            />
          </div>

          <!-- Forgot Password Link -->
          <div class="mb-6 text-right">
            <router-link
              to="/forgot-password"
              class="text-sm text-[#8B4513] hover:underline"
            >
              Forgot your password?
            </router-link>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-[#C41E3A] hover:bg-[#A01828] text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="!loading">Sign In</span>
            <span v-else>Signing in...</span>
          </button>
        </form>

        <!-- Divider -->
        <div class="my-6 flex items-center">
          <div class="flex-1 border-t border-gray-300"></div>
          <span class="px-4 text-sm text-gray-500">or</span>
          <div class="flex-1 border-t border-gray-300"></div>
        </div>

        <!-- Register Link -->
        <div class="text-center">
          <p class="text-gray-600">
            Don't have an account?
            <router-link
              to="/register"
              class="text-[#8B4513] font-semibold hover:underline ml-1"
            >
              Create one
            </router-link>
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-8 text-center text-sm text-gray-500">
        <p>Plan it. Live it. Remember it.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

// Form state
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

async function handleLogin() {
  if (!email.value || !password.value) {
    errorMessage.value = 'Please enter your email and password.'
    return
  }

  try {
    loading.value = true
    errorMessage.value = ''

    const result = await auth.login(email.value, password.value)

    if (result.success) {
      // Redirect to intended page or home
      const redirect = route.query.redirect as string
      router.push(redirect || '/')
    } else {
      errorMessage.value = result.error || 'Login failed. Please try again.'
    }
  } catch (error: any) {
    console.error('Login error:', error)
    errorMessage.value = error.message || 'An unexpected error occurred. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Vintage-inspired styling is handled through Tailwind classes */
</style>

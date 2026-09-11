<template>
  <div class="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-md">
      <!-- Logo/Branding -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-[#8B4513] mb-2">Cronevia</h1>
        <p class="text-gray-600 italic">Write today. Travel back anytime.</p>
      </div>

      <!-- Reset Password Card -->
      <div class="bg-white rounded-lg shadow-lg border-2 border-[#D4A574] p-8">
        <h2 class="text-2xl font-bold text-[#8B4513] mb-2">Reset Password</h2>
        <p class="text-gray-600 mb-6 text-sm">
          Enter your new password below.
        </p>

        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
        >
          {{ errorMessage }}
        </div>

        <!-- Success Message -->
        <div
          v-if="successMessage"
          class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm"
        >
          {{ successMessage }}
        </div>

        <!-- Form -->
        <form v-if="!passwordReset" @submit.prevent="handleSubmit">
          <!-- New Password -->
          <div class="mb-4">
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              autocomplete="new-password"
              class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B4513] focus:outline-none transition-colors"
              placeholder="••••••••"
              :disabled="loading"
            />
            <p class="mt-1 text-xs text-gray-500">
              At least 8 characters
            </p>
          </div>

          <!-- Confirm Password -->
          <div class="mb-6">
            <label for="passwordConfirm" class="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              id="passwordConfirm"
              v-model="passwordConfirm"
              type="password"
              required
              autocomplete="new-password"
              class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B4513] focus:outline-none transition-colors"
              placeholder="••••••••"
              :disabled="loading"
            />
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-[#C41E3A] hover:bg-[#A01828] text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            <span v-if="!loading">Reset Password</span>
            <span v-else>Resetting...</span>
          </button>

          <!-- Back to Login -->
          <router-link
            to="/login"
            class="block text-center text-sm text-[#8B4513] hover:underline"
          >
            Back to login
          </router-link>
        </form>

        <!-- After Password Reset -->
        <div v-else class="text-center">
          <div class="mb-6">
            <svg
              class="w-16 h-16 mx-auto text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          </div>
          <p class="text-gray-600 mb-6">
            Your password has been reset successfully!
          </p>
          <router-link
            to="/login"
            class="inline-block bg-[#8B4513] hover:bg-[#6D3410] text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Sign In
          </router-link>
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

// Form state
const password = ref('')
const passwordConfirm = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const passwordReset = ref(false)

onMounted(() => {
  // Supabase automatically handles the token from the URL
  // The user should be authenticated at this point if the link is valid
})

async function handleSubmit() {
  // Clear messages
  errorMessage.value = ''
  successMessage.value = ''

  // Validation
  if (!password.value || !passwordConfirm.value) {
    errorMessage.value = 'Please fill in all fields.'
    return
  }

  if (password.value.length < 8) {
    errorMessage.value = 'Password must be at least 8 characters long.'
    return
  }

  if (password.value !== passwordConfirm.value) {
    errorMessage.value = 'Passwords do not match.'
    return
  }

  try {
    loading.value = true

    const result = await auth.changePassword(password.value)

    if (result.success) {
      passwordReset.value = true
      successMessage.value = 'Your password has been reset successfully!'
    } else {
      errorMessage.value = result.error || 'Failed to reset password. Please try again.'
    }
  } catch (error: any) {
    console.error('Password reset error:', error)
    errorMessage.value = error.message || 'An unexpected error occurred. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Vintage-inspired styling is handled through Tailwind classes */
</style>

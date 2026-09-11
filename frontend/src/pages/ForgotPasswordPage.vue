<template>
  <div class="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-md">
      <!-- Logo/Branding -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-[#8B4513] mb-2">Cronevia</h1>
        <p class="text-gray-600 italic">Write today. Travel back anytime.</p>
      </div>

      <!-- Forgot Password Card -->
      <div class="bg-white rounded-lg shadow-lg border-2 border-[#D4A574] p-8">
        <h2 class="text-2xl font-bold text-[#8B4513] mb-2">Forgot Password</h2>
        <p class="text-gray-600 mb-6 text-sm">
          Enter your email address and we'll send you a link to reset your password.
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
        <form v-if="!emailSent" @submit.prevent="handleSubmit">
          <!-- Email -->
          <div class="mb-6">
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

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-[#C41E3A] hover:bg-[#A01828] text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            <span v-if="!loading">Send Reset Link</span>
            <span v-else>Sending...</span>
          </button>

          <!-- Back to Login -->
          <router-link
            to="/login"
            class="block text-center text-sm text-[#8B4513] hover:underline"
          >
            Back to login
          </router-link>
        </form>

        <!-- After Email Sent -->
        <div v-else class="text-center">
          <p class="text-gray-600 mb-6">
            If an account exists with that email, you'll receive a password reset link shortly.
          </p>
          <router-link
            to="/login"
            class="inline-block bg-[#8B4513] hover:bg-[#6D3410] text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Return to Login
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
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

// Form state
const email = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const emailSent = ref(false)

async function handleSubmit() {
  if (!email.value) {
    errorMessage.value = 'Please enter your email address.'
    return
  }

  try {
    loading.value = true
    errorMessage.value = ''
    successMessage.value = ''

    const result = await auth.requestPasswordReset(email.value)

    if (result.success) {
      emailSent.value = true
      successMessage.value = 'Password reset instructions have been sent to your email.'
    } else {
      errorMessage.value = result.error || 'Failed to send reset email. Please try again.'
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

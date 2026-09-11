<template>
  <div class="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-md">
      <!-- Logo/Branding -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-[#8B4513] mb-2">Cronevia</h1>
        <p class="text-gray-600 italic">Write today. Travel back anytime.</p>
      </div>

      <!-- Register Card -->
      <div class="bg-white rounded-lg shadow-lg border-2 border-[#D4A574] p-8">
        <h2 class="text-2xl font-bold text-[#8B4513] mb-6">Create Account</h2>

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

        <!-- Register Form -->
        <form @submit.prevent="handleRegister">
          <!-- Full Name -->
          <div class="mb-4">
            <label for="fullName" class="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              id="fullName"
              v-model="fullName"
              type="text"
              required
              autocomplete="name"
              class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B4513] focus:outline-none transition-colors"
              placeholder="John Doe"
              :disabled="loading"
            />
          </div>

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
          <div class="mb-4">
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
              Password
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
              @input="validatePassword"
            />
            <p class="mt-1 text-xs text-gray-500">
              At least 8 characters
            </p>
          </div>

          <!-- Password Confirmation -->
          <div class="mb-6">
            <label for="passwordConfirm" class="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
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

          <!-- Terms Notice -->
          <div class="mb-6">
            <p class="text-xs text-gray-500">
              By creating an account, you agree to keep your memories safe and private.
              Your data belongs to you.
            </p>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-[#C41E3A] hover:bg-[#A01828] text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="!loading">Create Account</span>
            <span v-else>Creating account...</span>
          </button>
        </form>

        <!-- Divider -->
        <div class="my-6 flex items-center">
          <div class="flex-1 border-t border-gray-300"></div>
          <span class="px-4 text-sm text-gray-500">or</span>
          <div class="flex-1 border-t border-gray-300"></div>
        </div>

        <!-- Login Link -->
        <div class="text-center">
          <p class="text-gray-600">
            Already have an account?
            <router-link
              to="/login"
              class="text-[#8B4513] font-semibold hover:underline ml-1"
            >
              Sign in
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
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

// Form state
const fullName = ref('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

function validatePassword() {
  if (password.value && password.value.length < 8) {
    errorMessage.value = 'Password must be at least 8 characters long.'
  } else {
    errorMessage.value = ''
  }
}

async function handleRegister() {
  // Clear messages
  errorMessage.value = ''
  successMessage.value = ''

  // Validation
  if (!fullName.value || !email.value || !password.value || !passwordConfirm.value) {
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

    const result = await auth.register(fullName.value, email.value, password.value)

    if (result.success) {
      // Check if email confirmation is required
      if (!auth.isAuthenticated) {
        successMessage.value = 'Account created! Please check your email to confirm your account.'
        // Clear form
        fullName.value = ''
        email.value = ''
        password.value = ''
        passwordConfirm.value = ''
      } else {
        // Auto-logged in, redirect to home
        router.push('/')
      }
    } else {
      errorMessage.value = result.error || 'Registration failed. Please try again.'
    }
  } catch (error: any) {
    console.error('Registration error:', error)
    errorMessage.value = error.message || 'An unexpected error occurred. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Vintage-inspired styling is handled through Tailwind classes */
</style>

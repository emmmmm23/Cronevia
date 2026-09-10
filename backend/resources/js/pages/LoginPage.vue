<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import CrnInput from '@/components/ui/CrnInput.vue'
import CrnButton from '@/components/ui/CrnButton.vue'
import CrnAlert from '@/components/ui/CrnAlert.vue'
import CrnLogo from '@/components/ui/CrnLogo.vue'

const router = useRouter()
const auth = useAuthStore()

const email    = ref('')
const password = ref('')
const loading  = ref(false)
const errorMsg = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

const route = useRouter().currentRoute

async function handleSubmit() {
  if (loading.value) return

  errorMsg.value    = null
  fieldErrors.value = {}
  loading.value     = true

  try {
    await auth.login(email.value, password.value)

    // Redirect to intended page, or role-based default home
    const redirect = route.value.query.redirect as string | undefined
    let destination: string | { name: string } = { name: 'home' }

    if (redirect && redirect.startsWith('/')) {
      // User was redirected from a protected route — go back there
      destination = redirect
    } else if (auth.user?.role === 'super_admin') {
      // Super admin users go to admin dashboard by default
      destination = { name: 'admin-dashboard' }
    }
    // Normal users go to home (default)

    await router.push(destination)

  } catch (err: unknown) {
    const e = err as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } }
    const status = e?.response?.status
    const data   = e?.response?.data

    if (status === 401) {
      errorMsg.value = 'The email or password you entered is incorrect.'
    } else if (status === 422 && data?.errors) {
      // Field-level validation errors
      for (const [field, messages] of Object.entries(data.errors)) {
        fieldErrors.value[field] = messages[0]
      }
    } else if (status === 429) {
      errorMsg.value = 'Too many login attempts. Please wait a moment before trying again.'
    } else if (status === 419) {
      errorMsg.value = 'Your session has expired. Please refresh the page and try again.'
    } else if (!e?.response) {
      errorMsg.value = 'Cannot connect to the server. Please check your internet connection.'
    } else {
      errorMsg.value = data?.message ?? 'An unexpected error occurred. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

const canSubmit = computed(() => email.value.trim() && password.value.length >= 1 && !loading.value)
</script>

<template>
  <!-- Full-page cream background -->
  <div class="min-h-screen bg-[#f5ebdd] flex flex-col items-center justify-center px-4 py-12">

    <!-- Card -->
    <div class="w-full max-w-md">

      <!-- Logo -->
      <div class="flex flex-col items-center mb-8">
        <RouterLink to="/" class="mb-5 block">
          <CrnLogo size="xl" variant="dark" />
        </RouterLink>

        <h1 class="text-2xl font-bold text-[#2b1a10]" style="font-family: 'Playfair Display', Georgia, serif;">
          Welcome back
        </h1>
        <p class="mt-1 text-sm text-[#8a5c2e]">
          Continue your journey where you left off.
        </p>
      </div>

      <!-- Login form card -->
      <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm shadow-sm px-7 py-8">

        <!-- Error alert -->
        <CrnAlert
          v-if="errorMsg"
          :message="errorMsg"
          type="error"
          class="mb-5"
        />

        <form novalidate @submit.prevent="handleSubmit" class="flex flex-col gap-5">

          <!-- Email -->
          <CrnInput
            v-model="email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            required
            :error="fieldErrors.email ?? null"
          />

          <!-- Password -->
          <CrnInput
            v-model="password"
            label="Password"
            type="password"
            placeholder="Your password"
            autocomplete="current-password"
            required
            :error="fieldErrors.password ?? null"
          />

          <!-- Forgot password -->
          <div class="flex justify-end -mt-2">
            <a
              href="#"
              class="text-xs font-medium text-[#8f1d2c] hover:text-[#721520] hover:underline transition-colors"
              @click.prevent
            >
              Forgot your password?
            </a>
          </div>

          <!-- Submit -->
          <CrnButton
            type="submit"
            variant="primary"
            fullWidth
            :loading="loading"
            :disabled="!canSubmit"
            class="mt-1"
          >
            {{ loading ? 'Signing in…' : 'Sign In' }}
          </CrnButton>
        </form>

        <!-- Divider -->
        <div class="my-6 flex items-center gap-3 text-[#c4ad94] text-xs uppercase tracking-widest">
          <span class="flex-1 h-px bg-[#e5d4bb]" />
          or
          <span class="flex-1 h-px bg-[#e5d4bb]" />
        </div>

        <!-- Register link -->
        <p class="text-center text-sm text-[#8a5c2e]">
          Don't have an account?&nbsp;
          <RouterLink
            :to="{ name: 'register' }"
            class="font-semibold text-[#8f1d2c] hover:text-[#721520] hover:underline transition-colors"
          >
            Create your account
          </RouterLink>
        </p>
      </div>

      <!-- Tagline -->
      <p class="text-center text-xs text-[#a68e73] mt-6 tracking-wide uppercase font-medium">
        Plan it. Live it. Remember it.
      </p>
    </div>
  </div>
</template>

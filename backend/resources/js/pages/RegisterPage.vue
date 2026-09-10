<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import CrnInput from '@/components/ui/CrnInput.vue'
import CrnButton from '@/components/ui/CrnButton.vue'
import CrnAlert from '@/components/ui/CrnAlert.vue'
import CrnLogo from '@/components/ui/CrnLogo.vue'

const router = useRouter()
const auth   = useAuthStore()

const name                  = ref('')
const email                 = ref('')
const password              = ref('')
const passwordConfirmation  = ref('')
const loading               = ref(false)
const errorMsg              = ref<string | null>(null)
const fieldErrors           = ref<Record<string, string>>({})

async function handleSubmit() {
  if (loading.value) return

  errorMsg.value    = null
  fieldErrors.value = {}
  loading.value     = true

  try {
    await auth.register(name.value, email.value, password.value, passwordConfirmation.value)
    // Redirect based on role — newly registered users should be normal users, but check just in case
    const destination = auth.user?.role === 'super_admin' ? { name: 'admin-dashboard' } : { name: 'home' }
    await router.push(destination)

  } catch (err: unknown) {
    const e = err as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } }
    const status = e?.response?.status
    const data   = e?.response?.data

    if (status === 422 && data?.errors) {
      for (const [field, messages] of Object.entries(data.errors)) {
        fieldErrors.value[field] = messages[0]
      }
    } else if (status === 429) {
      errorMsg.value = 'Too many attempts. Please wait before trying again.'
    } else if (!e?.response) {
      errorMsg.value = 'Cannot connect to the server. Please check your internet connection.'
    } else {
      errorMsg.value = data?.message ?? 'An unexpected error occurred. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

const canSubmit = computed(() =>
  name.value.trim() &&
  email.value.trim() &&
  password.value.length >= 8 &&
  passwordConfirmation.value.length >= 1 &&
  !loading.value
)
</script>

<template>
  <div class="min-h-screen bg-[#f5ebdd] flex flex-col items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">

      <!-- Logo -->
      <div class="flex flex-col items-center mb-8">
        <RouterLink to="/" class="mb-5 block">
          <CrnLogo size="xl" variant="dark" />
        </RouterLink>

        <h1 class="text-2xl font-bold text-[#2b1a10]" style="font-family: 'Playfair Display', Georgia, serif;">
          Begin your journey
        </h1>
        <p class="mt-1 text-sm text-[#8a5c2e]">
          Create your personal memory archive.
        </p>
      </div>

      <!-- Register card -->
      <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm shadow-sm px-7 py-8">

        <CrnAlert
          v-if="errorMsg"
          :message="errorMsg"
          type="error"
          class="mb-5"
        />

        <form novalidate @submit.prevent="handleSubmit" class="flex flex-col gap-5">

          <CrnInput
            v-model="name"
            label="Full name"
            type="text"
            placeholder="Your name"
            autocomplete="name"
            required
            :error="fieldErrors.name ?? null"
          />

          <CrnInput
            v-model="email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            required
            :error="fieldErrors.email ?? null"
          />

          <CrnInput
            v-model="password"
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            autocomplete="new-password"
            required
            :error="fieldErrors.password ?? null"
          />

          <CrnInput
            v-model="passwordConfirmation"
            label="Confirm password"
            type="password"
            placeholder="Repeat your password"
            autocomplete="new-password"
            required
            :error="fieldErrors.password_confirmation ?? null"
          />

          <CrnButton
            type="submit"
            variant="primary"
            fullWidth
            :loading="loading"
            :disabled="!canSubmit"
            class="mt-1"
          >
            {{ loading ? 'Creating account…' : 'Create Account' }}
          </CrnButton>
        </form>

        <div class="my-6 flex items-center gap-3 text-[#c4ad94] text-xs uppercase tracking-widest">
          <span class="flex-1 h-px bg-[#e5d4bb]" />
          or
          <span class="flex-1 h-px bg-[#e5d4bb]" />
        </div>

        <p class="text-center text-sm text-[#8a5c2e]">
          Already have an account?&nbsp;
          <RouterLink
            :to="{ name: 'login' }"
            class="font-semibold text-[#8f1d2c] hover:text-[#721520] hover:underline transition-colors"
          >
            Sign in
          </RouterLink>
        </p>
      </div>

      <p class="text-center text-xs text-[#a68e73] mt-6 tracking-wide uppercase font-medium">
        Plan it. Live it. Remember it.
      </p>
    </div>
  </div>
</template>

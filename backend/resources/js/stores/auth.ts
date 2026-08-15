import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api, { silentApi, getCsrfCookie } from '../services/api.service'
import type { User } from '../types'

/**
 * Cronevia Authentication Store
 *
 * Authentication method: Laravel Sanctum SPA (session cookies, same-origin)
 *
 * State machine:
 *   loading  → true during initialize() / login() / logout()
 *   initialized → true once the first session probe has completed
 *   user     → User when authenticated, null when guest
 *
 * The 401 from GET /api/v1/auth/me is EXPECTED when no session exists.
 * It is handled silently here — it means "guest", not "error".
 *
 * A 401 from any OTHER endpoint after login is a real session problem
 * and is surfaced via the main api interceptor.
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const initialized = ref(false)
  const initError = ref<string | null>(null)

  const isAuthenticated = computed(() => user.value !== null)
  const isGuest = computed(() => initialized.value && user.value === null)

  /**
   * Called exactly once on app boot to restore an existing session.
   *
   * Uses silentApi (no interceptors) so a 401 is caught here and
   * treated as "guest" — never forwarded to the redirect interceptor.
   *
   * Distinguishes:
   *   401 → guest (normal, expected)
   *   network error / 5xx → initialization failed (surfaced)
   */
  async function initialize(): Promise<void> {
    if (initialized.value) return   // already done — never probe twice

    loading.value = true
    initError.value = null

    try {
      const { data } = await silentApi.get<{ data: User }>('/auth/me')
      user.value = data.data
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status

      if (status === 401) {
        // Expected: no active session → guest state
        user.value = null
      } else if (status !== undefined) {
        // Unexpected server error during init — surface it, don't crash
        initError.value = `Auth check failed (${status}). Please refresh.`
        console.error('[Auth] Unexpected error during initialize:', status)
        user.value = null
      } else {
        // Network error (server down / offline)
        initError.value = 'Cannot reach the server. Please check your connection.'
        console.warn('[Auth] Network error during initialize — server may be offline.')
        user.value = null
      }
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  /**
   * Login with email + password.
   * Fetches CSRF cookie first (required by Sanctum SPA auth).
   * Throws on invalid credentials so the login form can show errors.
   */
  async function login(email: string, password: string): Promise<void> {
    loading.value = true
    try {
      await getCsrfCookie()
      await api.post('/auth/login', { email, password })
      // After login, fetch the authenticated user
      const { data } = await api.get<{ data: User }>('/auth/me')
      user.value = data.data
    } finally {
      loading.value = false
    }
  }

  /**
   * Register a new account.
   * Throws on validation errors so the register form can show errors.
   */
  async function register(
    name: string,
    email: string,
    password: string,
    password_confirmation: string
  ): Promise<void> {
    loading.value = true
    try {
      await getCsrfCookie()
      await api.post('/auth/register', { name, email, password, password_confirmation })
      const { data } = await api.get<{ data: User }>('/auth/me')
      user.value = data.data
    } finally {
      loading.value = false
    }
  }

  /**
   * Logout — invalidates the Laravel session server-side.
   */
  async function logout(): Promise<void> {
    loading.value = true
    try {
      await api.post('/auth/logout')
    } finally {
      user.value = null
      loading.value = false
    }
  }

  /**
   * Refresh the current user data (e.g. after profile update).
   */
  async function fetchCurrentUser(): Promise<void> {
    const { data } = await api.get<{ data: User }>('/auth/me')
    user.value = data.data
  }

  return {
    user,
    loading,
    initialized,
    initError,
    isAuthenticated,
    isGuest,
    initialize,
    login,
    register,
    logout,
    fetchCurrentUser,
  }
})

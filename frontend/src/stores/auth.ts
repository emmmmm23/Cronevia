import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api, { getCsrfCookie } from '@/services/api.service'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)

  const isAuthenticated = computed(() => user.value !== null)

  async function initialize(): Promise<void> {
    try {
      const { data } = await api.get<{ data: User }>('/auth/me')
      user.value = data.data
    } catch {
      user.value = null
    } finally {
      initialized.value = true
    }
  }

  async function login(email: string, password: string): Promise<void> {
    await getCsrfCookie()
    await api.post('/auth/login', { email, password })
    const { data } = await api.get<{ data: User }>('/auth/me')
    user.value = data.data
  }

  async function register(name: string, email: string, password: string, password_confirmation: string): Promise<void> {
    await getCsrfCookie()
    await api.post('/auth/register', { name, email, password, password_confirmation })
    const { data } = await api.get<{ data: User }>('/auth/me')
    user.value = data.data
  }

  async function logout(): Promise<void> {
    await api.post('/auth/logout')
    user.value = null
  }

  async function fetchCurrentUser(): Promise<void> {
    const { data } = await api.get<{ data: User }>('/auth/me')
    user.value = data.data
  }

  return {
    user,
    initialized,
    isAuthenticated,
    initialize,
    login,
    register,
    logout,
    fetchCurrentUser,
  }
})

import axios from 'axios'
import type { AxiosInstance, AxiosError } from 'axios'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const sharedConfig = {
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
}

/**
 * The main API instance used by all feature code.
 * Its response interceptor redirects to /login on 401 — but ONLY
 * after the initial session probe has already run (see auth store).
 * Handles 403 with role-based redirection.
 */
const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  ...sharedConfig,
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status

    if (status === 401) {
      // Session expired or user no longer authenticated
      const authStore = useAuthStore()
      authStore.user = null
      // isAuthenticated is a computed property derived from user, so no need to set it directly

      // Only redirect when the user was previously authenticated and the
      // session expired mid-use. The initial session probe (initialize()) uses
      // the silent instance below so it never triggers this branch.
      if (
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register')
      ) {
        const router = useRouter()
        router.push({
          name: 'login',
          query: { redirect: window.location.pathname },
        })
      }
    } else if (status === 403) {
      // Permission denied — redirect based on role
      const authStore = useAuthStore()
      const router = useRouter()

      if (authStore.user?.role === 'super_admin') {
        // Super admin trying to access user route — redirect to admin dashboard
        router.push({ name: 'admin-dashboard' })
      } else {
        // Normal user trying to access admin route — redirect to home
        router.push({ name: 'home' })
      }
    } else if (status !== undefined && status >= 500) {
      console.error(`[API] ${status} Server Error:`, error.config?.url, error.message)
    }

    return Promise.reject(error)
  }
)

/**
 * A second axios instance used only for the initial session probe
 * (GET /auth/me on app boot). It has no response interceptors, so a 401
 * is silently caught by the auth store without triggering any redirect.
 */
export const silentApi: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  ...sharedConfig,
})

/**
 * Fetch the Sanctum CSRF cookie before any state-mutating requests.
 * Must be called before login/register.
 */
export async function getCsrfCookie(): Promise<void> {
  await axios.get('/sanctum/csrf-cookie', { withCredentials: true })
}

export default api

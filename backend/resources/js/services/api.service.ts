import axios from 'axios'
import type { AxiosInstance, AxiosError } from 'axios'

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
      // Only hard-redirect when the user was previously authenticated and the
      // session expired mid-use. The initial session probe (initialize()) uses
      // the silent instance below so it never triggers this branch.
      if (
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register')
      ) {
        window.location.href = '/login'
      }
    } else if (status === 403) {
      console.error('[API] 403 Forbidden:', error.config?.url)
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

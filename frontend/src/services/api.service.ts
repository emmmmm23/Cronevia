import axios from 'axios'
import type { AxiosInstance, AxiosError } from 'axios'

const api: AxiosInstance = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api/v1`,
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// Request interceptor — no-op (CSRF handled by Sanctum cookie)
api.interceptors.request.use((config) => config)

// Response interceptor — global error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status

    if (status === 401) {
      // Redirect to login if not already there
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login'
      }
    } else if (status === 403) {
      // Forbidden — log the error; components handle messaging
      console.error('[API] 403 Forbidden:', error.config?.url)
    } else if (status === 422) {
      // Unprocessable Entity — pass through so components handle validation errors inline
      // (no global action needed; just reject below)
    } else if (status !== undefined && status >= 500) {
      // Server error — log and reject
      console.error(`[API] ${status} Server Error:`, error.config?.url, error.message)
    }

    return Promise.reject(error)
  }
)

export async function getCsrfCookie(): Promise<void> {
  await axios.get(`${import.meta.env.VITE_API_URL ?? ''}/sanctum/csrf-cookie`, {
    withCredentials: true,
  })
}

export default api

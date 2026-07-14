import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'
const TOKEN_KEY = 'detail_token'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30000,
  paramsSerializer: {
    serialize: (params: Record<string, unknown>) => {
      const searchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
          searchParams.set(snakeKey, String(value))
        }
      }
      return searchParams.toString()
    },
  },
})

// Request interceptor: attach Bearer token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor: handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export { TOKEN_KEY }
export default apiClient

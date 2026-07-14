import { create } from 'zustand'
import { User } from '@/types'
import { authApi } from '@/api/auth'
import { TOKEN_KEY } from '@/api/client'

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { name: string; email: string; phone?: string; password: string; confirmPassword: string }) => Promise<void>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
  isLoading: !!localStorage.getItem(TOKEN_KEY),

  login: async (email: string, password: string) => {
    const res = await authApi.login({ email, password })
    localStorage.setItem(TOKEN_KEY, res.token ?? res.access_token)
    set({ token: res.token ?? res.access_token, user: res.user ?? null, isAuthenticated: true })
    if (!res.user) {
      await get().loadUser()
    }
  },

  register: async (data) => {
    const res = await authApi.register(data)
    localStorage.setItem(TOKEN_KEY, res.token ?? res.access_token)
    set({ token: res.token ?? res.access_token, user: res.user ?? null, isAuthenticated: true })
    if (!res.user) {
      await get().loadUser()
    }
  },

  logout: async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore logout API errors
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      set({ token: null, user: null, isAuthenticated: false, isLoading: false })
    }
  },

  loadUser: async () => {
    const token = get().token
    if (!token) {
      set({ isAuthenticated: false, user: null, isLoading: false })
      return
    }
    set({ isLoading: true })
    try {
      const user = await authApi.me()
      set({ user, isAuthenticated: true, isLoading: false })
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      set({ token: null, user: null, isAuthenticated: false, isLoading: false })
    }
  },

  setUser: (user: User) => set({ user }),
}))

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'
import { User } from '@/types'

interface AuthContextData {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: {
    name: string
    email: string
    phone?: string
    password: string
    confirmPassword: string
  }) => Promise<void>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: ReactNode }) {
  const store = useAuthStore()

  useEffect(() => {
    if (store.token && !store.user) {
      store.loadUser()
    }
  }, [])



  return <AuthContext.Provider value={store}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

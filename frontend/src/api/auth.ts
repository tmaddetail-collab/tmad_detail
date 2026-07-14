import apiClient from './client'
import { LoginResponse, LoginForm, RegisterForm, User } from '../types'

export const authApi = {
  login: async (data: LoginForm): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/auth/login', data)
    return res.data
  },

  register: async (data: { name: string; email: string; cpf?: string; phone?: string; password: string }): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/auth/register', data)
    return res.data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },

  me: async (): Promise<User> => {
    const res = await apiClient.get<User>('/auth/me')
    return res.data
  },

  refreshToken: async (refreshToken: string): Promise<{ token: string }> => {
    const res = await apiClient.post<{ token: string }>('/auth/refresh', { refreshToken })
    return res.data
  },

  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', { email })
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    await apiClient.post('/auth/reset-password', { token, password })
  },

  loginWithGoogle: () => {
    window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'}/auth/google`
  },
}

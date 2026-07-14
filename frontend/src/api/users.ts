import apiClient from './client'
import { User, PaginatedResponse, ClientForm } from '../types'

function mapUser(item: any): User {
  return {
    id: item.id,
    name: item.name,
    email: item.email,
    phone: item.phone,
    cpf: item.cpf,
    role: item.role,
    avatarUrl: item.avatar_url,
    isActive: item.is_active,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }
}

export const usersApi = {
  getAll: async (params?: {
    page?: number
    page_size?: number
    search?: string
    role?: string
  }): Promise<PaginatedResponse<User>> => {
    const res = await apiClient.get<any>('/users', { params })
    return {
      items: (res.data.items ?? []).map(mapUser),
      total: res.data.total,
      page: res.data.page,
      page_size: res.data.page_size,
      pages: res.data.pages,
    }
  },

  getById: async (id: string): Promise<User> => {
    const res = await apiClient.get<any>(`/users/${id}`)
    return mapUser(res.data)
  },

  create: async (data: ClientForm): Promise<User> => {
    const res = await apiClient.post<any>('/users', data)
    return mapUser(res.data)
  },

  update: async (id: string, data: Partial<ClientForm>): Promise<User> => {
    const res = await apiClient.put<any>(`/users/${id}`, data)
    return mapUser(res.data)
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`)
  },

  toggleActive: async (id: string): Promise<User> => {
    const res = await apiClient.patch<any>(`/users/${id}/toggle-active`)
    return mapUser(res.data)
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const res = await apiClient.put<any>('/users/me', data)
    return mapUser(res.data)
  },
}

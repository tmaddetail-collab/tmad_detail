import apiClient from './client'
import { Service, ServiceForm, PaginatedResponse } from '../types'

function mapService(item: any): Service {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    price: Number(item.price),
    estimatedMinutes: item.estimated_time,
    isActive: item.is_active,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }
}

function toCreatePayload(data: ServiceForm): any {
  return {
    name: data.name,
    category: data.category,
    description: data.description || undefined,
    estimated_time: data.estimatedMinutes,
    price: data.price,
  }
}

function toUpdatePayload(data: Partial<ServiceForm> & { isActive?: boolean }): any {
  const payload: any = {}
  if (data.name !== undefined) payload.name = data.name
  if (data.category !== undefined) payload.category = data.category
  if (data.description !== undefined) payload.description = data.description || undefined
  if (data.estimatedMinutes !== undefined) payload.estimated_time = data.estimatedMinutes
  if (data.price !== undefined) payload.price = data.price
  if (data.isActive !== undefined) payload.is_active = data.isActive
  return payload
}

export const servicesApi = {
  getAll: async (params?: {
    page?: number
    page_size?: number
    search?: string
    category?: string
    isActive?: boolean
  }): Promise<PaginatedResponse<Service>> => {
    const res = await apiClient.get<any>('/services', { params })
    return {
      items: (res.data.items ?? []).map(mapService),
      total: res.data.total,
      page: res.data.page,
      page_size: res.data.page_size,
      pages: res.data.pages,
    }
  },

  getById: async (id: string): Promise<Service> => {
    const res = await apiClient.get<any>(`/services/${id}`)
    return mapService(res.data)
  },

  create: async (data: ServiceForm): Promise<Service> => {
    const res = await apiClient.post<any>('/services', toCreatePayload(data))
    return mapService(res.data)
  },

  update: async (id: string, data: Partial<ServiceForm> & { isActive?: boolean }): Promise<Service> => {
    const res = await apiClient.put<any>(`/services/${id}`, toUpdatePayload(data))
    return mapService(res.data)
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/services/${id}`)
  },
}

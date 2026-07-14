import apiClient from './client'
import { Vehicle, VehicleForm, VehicleType, PaginatedResponse, ServiceOrder } from '../types'

function mapVehicle(item: any): Vehicle {
  return {
    id: item.id,
    plate: item.plate,
    brand: item.brand,
    model: item.model,
    year: item.year,
    color: item.color,
    type: item.type ?? VehicleType.CAR,
    mileage: item.mileage,
    notes: item.notes,
    ownerId: item.owner_id,
    owner: item.owner,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }
}

export const vehiclesApi = {
  getAll: async (params?: {
    page?: number
    page_size?: number
    search?: string
    ownerId?: string
  }): Promise<PaginatedResponse<Vehicle>> => {
    const res = await apiClient.get<any>('/vehicles', { params })
    return {
      items: (res.data.items ?? []).map(mapVehicle),
      total: res.data.total,
      page: res.data.page,
      page_size: res.data.page_size,
      pages: res.data.pages,
    }
  },

  getById: async (id: string): Promise<Vehicle> => {
    const res = await apiClient.get<any>(`/vehicles/${id}`)
    return mapVehicle(res.data)
  },

  create: async (data: VehicleForm): Promise<Vehicle> => {
    const res = await apiClient.post<any>('/vehicles', data)
    return mapVehicle(res.data)
  },

  update: async (id: string, data: Partial<VehicleForm>): Promise<Vehicle> => {
    const res = await apiClient.put<any>(`/vehicles/${id}`, data)
    return mapVehicle(res.data)
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/vehicles/${id}`)
  },

  getHistory: async (id: string): Promise<ServiceOrder[]> => {
    const res = await apiClient.get<ServiceOrder[]>(`/vehicles/${id}/history`)
    return res.data
  },
}

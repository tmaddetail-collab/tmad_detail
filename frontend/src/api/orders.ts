import apiClient from './client'
import { ServiceOrder, OrderStatus, OrderFilters, ChecklistItem } from '../types'

export const ordersApi = {
  getAll: async (params?: OrderFilters): Promise<ServiceOrder[]> => {
    const res = await apiClient.get<{ items: any[]; total: number }>('/orders', { params })
    return (res.data.items ?? []).map(mapOrderSummary)
  },

  getById: async (id: string): Promise<ServiceOrder> => {
    const res = await apiClient.get<any>(`/orders/${id}`)
    return mapOrderDetail(res.data)
  },

  create: async (data: any): Promise<ServiceOrder> => {
    const res = await apiClient.post<any>('/orders', data)
    return mapOrderDetail(res.data)
  },

  update: async (id: string, data: any): Promise<ServiceOrder> => {
    const res = await apiClient.put<any>(`/orders/${id}`, data)
    return mapOrderDetail(res.data)
  },

  updateStatus: async (id: string, status: OrderStatus): Promise<ServiceOrder> => {
    const res = await apiClient.patch<any>(`/orders/${id}/status`, { status })
    return mapOrderDetail(res.data)
  },

  approve: async (id: string, data: { signature: string; observations?: string }): Promise<void> => {
    await apiClient.post(`/orders/${id}/approve`, data)
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/orders/${id}`)
  },
}

function mapOrderSummary(item: any): ServiceOrder {
  return {
    id: item.id,
    orderNumber: item.order_number,
    clientId: item.client_id,
    vehicleId: item.vehicle_id,
    totalValue: item.total_value ? Number(item.total_value) : 0,
    status: item.status,
    notes: item.notes,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    appointmentId: item.appointment_id,
    appointmentScheduledAt: item.appointment_scheduled_at,
    client: item.client_name ? { id: item.client_id, name: item.client_name } as any : undefined,
    vehicle: item.vehicle_info ? parseVehicleInfo(item.vehicle_info) : undefined,
    vehicles: [],
    services: [],
    photos: [],
  } as ServiceOrder
}

function mapOrderDetail(item: any): ServiceOrder {
  return {
    id: item.id,
    orderNumber: item.order_number,
    clientId: item.client_id,
    client: item.client_name ? {
      id: item.client_id,
      name: item.client_name,
    } as any : undefined,
    vehicleId: item.vehicle_id,
    vehicle: item.vehicle_info ? parseVehicleInfo(item.vehicle_info) : undefined,
    responsibleId: item.responsible_id,
    totalValue: item.total_value ? Number(item.total_value) : 0,
    status: item.status,
    notes: item.notes,
    appointmentId: item.appointment_id,
    appointmentScheduledAt: item.appointment_scheduled_at,
    clientSignature: item.client_signature,
    signedAt: item.client_approved_at,
    clientObservations: item.client_observations,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    vehicles: (item.vehicles ?? []).map((v: any) => ({
      id: v.id,
      vehicleId: v.vehicle_id,
      notes: v.notes,
      vehicle: v.vehicle_info ? parseVehicleInfo(v.vehicle_info) : undefined,
    })),
    services: (item.services ?? []).map((s: any) => ({
      id: s.service_id,
      serviceId: s.service_id,
      service: s.service_name ? { id: s.service_id, name: s.service_name } as any : undefined,
      price: Number(s.price_at_time),
      quantity: s.quantity,
      orderVehicleId: s.order_vehicle_id || undefined,
      vehicleInfo: s.vehicle_info || undefined,
    })),
    photos: (item.photos ?? []).map((p: any) => ({
      id: p.id,
      orderId: item.id,
      url: p.url.startsWith('http') ? p.url : `http://localhost:8000${p.url}`,
      type: p.type,
      filename: p.filename,
      createdAt: p.uploaded_at,
    })),
  } as ServiceOrder
}

function parseVehicleInfo(info: string): any {
  const parts = info.split(' - ')
  if (parts.length >= 2) {
    const modelParts = parts[0].split(' ')
    return { brand: modelParts[0] || '', model: modelParts.slice(1).join(' ') || '', plate: parts[1] }
  }
  return { brand: info, model: '', plate: '' }
}

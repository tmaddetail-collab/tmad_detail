import apiClient from './client'
import { Appointment, AppointmentForm, AppointmentFilters, AppointmentStatus } from '../types'

export interface AvailableSlot {
  time: string
  available: boolean
}

export const appointmentsApi = {
  getAll: async (params?: AppointmentFilters): Promise<Appointment[]> => {
    const res = await apiClient.get<{ items: any[]; total: number }>('/appointments', { params })
    return (res.data.items ?? []).map(mapAppointmentSummary)
  },

  getById: async (id: string): Promise<Appointment> => {
    const res = await apiClient.get<any>(`/appointments/${id}`)
    return mapAppointmentDetail(res.data)
  },

  create: async (data: AppointmentForm): Promise<Appointment> => {
    const payload: any = {
      client_id: data.clientId,
      vehicle_id: data.vehicleId,
      scheduled_at: data.scheduledAt,
      notes: data.notes,
      services: data.serviceIds.map((sid) => ({ service_id: sid, price_at_time: 0 })),
    }
    const res = await apiClient.post<any>('/appointments', payload)
    return mapAppointmentDetail(res.data)
  },

  update: async (id: string, data: Partial<AppointmentForm>): Promise<Appointment> => {
    const payload: any = {}
    if (data.clientId) payload.client_id = data.clientId
    if (data.vehicleId) payload.vehicle_id = data.vehicleId
    if (data.scheduledAt) payload.scheduled_at = data.scheduledAt
    if (data.notes !== undefined) payload.notes = data.notes
    if (data.serviceIds) {
      payload.services = data.serviceIds.map((sid) => ({ service_id: sid, price_at_time: 0 }))
    }
    const res = await apiClient.put<any>(`/appointments/${id}`, payload)
    return mapAppointmentDetail(res.data)
  },

  toggleServiceCompletion: async (appointmentId: string, serviceId: string, completed: boolean): Promise<void> => {
    await apiClient.patch(`/appointments/${appointmentId}/services/${serviceId}`, { completed })
  },

  updateStatus: async (id: string, status: AppointmentStatus): Promise<Appointment> => {
    const res = await apiClient.patch<any>(`/appointments/${id}/status`, { status })
    return mapAppointmentDetail(res.data)
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/appointments/${id}`)
  },

  getAvailableSlots: async (date: string, duration?: number): Promise<AvailableSlot[]> => {
    const res = await apiClient.get<AvailableSlot[]>('/appointments/slots', {
      params: { date, duration },
    })
    return res.data
  },
}

function mapAppointmentSummary(item: any): Appointment {
  return {
    id: item.id,
    clientId: item.client_id,
    client: item.client_name ? { id: item.client_id, name: item.client_name } as any : undefined,
    vehicleId: item.vehicle_id,
    vehicle: item.vehicle_info ? parseVehicleInfo(item.vehicle_info) : undefined,
    services: [],
    scheduledAt: item.scheduled_at,
    status: item.status,
    totalValue: 0,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  } as unknown as Appointment
}

function mapAppointmentDetail(item: any): Appointment {
  return {
    id: item.id,
    clientId: item.client_id,
    client: item.client_name ? { id: item.client_id, name: item.client_name } as any : undefined,
    vehicleId: item.vehicle_id,
    vehicle: item.vehicle_info ? parseVehicleInfo(item.vehicle_info) : undefined,
    services: item.services?.map((s: any) => ({
      id: s.service_id,
      serviceId: s.service_id,
      name: s.service_name,
      price: Number(s.price_at_time),
      completed: s.completed ?? false,
    })) ?? [],
    scheduledAt: item.scheduled_at,
    durationMinutes: item.duration_minutes,
    status: item.status,
    notes: item.notes,
    totalValue: 0,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  } as unknown as Appointment
}

function parseVehicleInfo(info: string): any {
  const parts = info.split(' - ')
  if (parts.length >= 2) {
    const modelParts = parts[0].split(' ')
    return { brand: modelParts[0] || '', model: modelParts.slice(1).join(' ') || '', plate: parts[1] }
  }
  return { brand: info, model: '', plate: '' }
}

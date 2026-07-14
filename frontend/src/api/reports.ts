import apiClient from './client'
import { FinancialFilters, TopService } from '../types'

export interface TopClient {
  clientId: string
  clientName: string
  totalOrders: number
  totalSpent: number
}

export interface RevenueReport {
  period: string
  revenue: number
  expenses: number
  profit: number
}

export interface PendingPayment {
  id: string
  clientName: string
  orderNumber: string
  amount: number
  dueDate: string
  daysOverdue: number
}

export interface AppointmentsReport {
  total: number
  scheduled: number
  confirmed: number
  inProgress: number
  finished: number
  cancelled: number
}

export const reportsApi = {
  getTopClients: async (params?: { limit?: number; startDate?: string; endDate?: string }): Promise<TopClient[]> => {
    const res = await apiClient.get<TopClient[]>('/reports/top-clients', { params })
    return res.data
  },

  getTopServices: async (params?: { limit?: number; startDate?: string; endDate?: string }): Promise<TopService[]> => {
    const res = await apiClient.get<TopService[]>('/reports/top-services', { params })
    return res.data
  },

  getRevenue: async (params?: FinancialFilters): Promise<RevenueReport[]> => {
    const res = await apiClient.get<RevenueReport[]>('/reports/revenue', { params })
    return res.data
  },

  getPendingPayments: async (params?: { client_id?: string }): Promise<PendingPayment[]> => {
    const res = await apiClient.get<PendingPayment[]>('/reports/pending-payments', { params })
    return res.data
  },

  getAppointmentsReport: async (params?: { startDate?: string; endDate?: string }): Promise<AppointmentsReport> => {
    const res = await apiClient.get<AppointmentsReport>('/reports/appointments', { params })
    return res.data
  },
}

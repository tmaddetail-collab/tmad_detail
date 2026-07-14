import apiClient from './client'

export interface AdminDashboard {
  total_clients: number
  total_vehicles: number
  active_orders: number
  today_appointments: number
  monthly_revenue: number
  monthly_expenses: number
  pending_approvals: number
}

export interface ClientDashboard {
  total_vehicles: number
  upcoming_appointments: number
  active_orders: number
  total_spent: number
}

export const dashboardApi = {
  getAdminDashboard: async (): Promise<AdminDashboard> => {
    const res = await apiClient.get<AdminDashboard>('/dashboard/admin')
    return res.data
  },

  getClientDashboard: async (): Promise<ClientDashboard> => {
    const res = await apiClient.get<ClientDashboard>('/dashboard/client')
    return res.data
  },
}

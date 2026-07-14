import apiClient from './client'
import { Notification } from '../types'

export interface SendNotificationData {
  userId: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  link?: string
}

export const notificationsApi = {
  getAll: async (params?: {
    page?: number
    page_size?: number
    isRead?: boolean
  }): Promise<Notification[]> => {
    const res = await apiClient.get<Notification[]>('/notifications', { params })
    return res.data
  },

  markAsRead: async (id: string): Promise<void> => {
    await apiClient.patch(`/notifications/${id}/read`)
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/read-all')
  },

  send: async (data: SendNotificationData): Promise<Notification> => {
    const res = await apiClient.post<Notification>('/notifications', data)
    return res.data
  },
}

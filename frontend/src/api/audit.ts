import apiClient from './client'
import { AuditLog, PaginatedResponse } from '../types'

export const auditApi = {
  getAll: async (params?: {
    page?: number
    page_size?: number
    userId?: string
    entity?: string
    action?: string
    startDate?: string
    endDate?: string
  }): Promise<PaginatedResponse<AuditLog>> => {
    const res = await apiClient.get<PaginatedResponse<AuditLog>>('/audit', { params })
    return res.data
  },
}

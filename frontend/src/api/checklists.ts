import apiClient from './client'
import { ChecklistItem, ChecklistItemUpdate } from '../types'

export interface AddChecklistItemData {
  section: string
  item: string
  status?: string
  notes?: string
}

export const checklistsApi = {
  getByOrderId: async (orderId: string): Promise<ChecklistItem[]> => {
    const res = await apiClient.get<any>(`/checklists/${orderId}`)
    const sections = res.data.sections ?? []
    const items: ChecklistItem[] = []
    for (const section of sections) {
      for (const item of section.items ?? []) {
        items.push({
          id: item.id,
          orderId: item.order_id,
          section: item.section,
          item: item.item,
          status: item.status,
          notes: item.notes,
          photoUrl: item.photo_url,
          checkedAt: item.created_at,
        })
      }
    }
    return items
  },

  updateItem: async (orderId: string, itemId: string, data: ChecklistItemUpdate): Promise<ChecklistItem> => {
    const res = await apiClient.put<any>(`/checklists/${orderId}/items/${itemId}`, data)
    const item = res.data
    return {
      id: item.id,
      orderId: item.order_id,
      section: item.section,
      item: item.item,
      status: item.status,
      notes: item.notes,
      photoUrl: item.photo_url,
      checkedAt: item.created_at,
    }
  },

  addItem: async (orderId: string, data: AddChecklistItemData): Promise<ChecklistItem> => {
    const res = await apiClient.post<any>(`/checklists/${orderId}/items`, data)
    const item = res.data
    return {
      id: item.id,
      orderId: item.order_id,
      section: item.section,
      item: item.item,
      status: item.status,
      notes: item.notes,
      photoUrl: item.photo_url,
      checkedAt: item.created_at,
    }
  },
}

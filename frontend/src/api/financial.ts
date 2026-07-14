import apiClient from './client'
import { Payment, Expense, ExpenseForm, FinancialFilters } from '../types'

export interface CashFlowItem {
  month: string
  revenue: number
  expenses: number
  profit: number
}

export interface FinancialDashboard {
  totalRevenue: number
  totalExpenses: number
  profit: number
  pendingPayments: number
  paidPayments: number
  overduePayments: number
  lastMonths: CashFlowItem[]
}

export const financialApi = {
  getPayments: async (params?: {
    clientId?: string
    status?: string
    startDate?: string
    endDate?: string
    page?: number
    pageSize?: number
  }): Promise<Payment[]> => {
    const res = await apiClient.get<{ items: any[]; total: number }>('/financial/payments', { params })
    return (res.data.items ?? []).map(mapPayment)
  },

  getPayment: async (id: string): Promise<Payment> => {
    const res = await apiClient.get<any>(`/financial/payments/${id}`)
    return mapPayment(res.data)
  },

  createPayment: async (data: Partial<Payment>): Promise<Payment> => {
    const res = await apiClient.post<any>('/financial/payments', data)
    return mapPayment(res.data)
  },

  updatePayment: async (id: string, data: Partial<Payment>): Promise<Payment> => {
    const res = await apiClient.put<any>(`/financial/payments/${id}`, data)
    return mapPayment(res.data)
  },

  getExpenses: async (params?: {
    category?: string
    startDate?: string
    endDate?: string
    page?: number
    pageSize?: number
  }): Promise<Expense[]> => {
    const res = await apiClient.get<{ items: any[]; total: number }>('/financial/expenses', { params })
    return (res.data.items ?? []).map(mapExpense)
  },

  getExpense: async (id: string): Promise<Expense> => {
    const res = await apiClient.get<any>(`/financial/expenses/${id}`)
    return mapExpense(res.data)
  },

  createExpense: async (data: ExpenseForm): Promise<Expense> => {
    const res = await apiClient.post<any>('/financial/expenses', data)
    return mapExpense(res.data)
  },

  updateExpense: async (id: string, data: Partial<ExpenseForm>): Promise<Expense> => {
    const res = await apiClient.put<any>(`/financial/expenses/${id}`, data)
    return mapExpense(res.data)
  },

  deleteExpense: async (id: string): Promise<void> => {
    await apiClient.delete(`/financial/expenses/${id}`)
  },

  getCashFlow: async (params?: FinancialFilters): Promise<CashFlowItem[]> => {
    const res = await apiClient.get<{ items: any[]; total_revenue: number }>('/financial/cash-flow', { params })
    return (res.data.items ?? []).map((item: any) => ({
      month: item.date,
      revenue: Number(item.revenue),
      expenses: Number(item.expenses),
      profit: Number(item.balance),
    }))
  },

  getFinancialDashboard: async (): Promise<FinancialDashboard> => {
    const res = await apiClient.get<any>('/financial/dashboard')
    const d = res.data
    return {
      totalRevenue: Number(d.total_received) + Number(d.total_receivable),
      totalExpenses: Number(d.total_expenses),
      profit: Number(d.revenue_vs_expenses),
      pendingPayments: Number(d.pending_payments) || d.pending_payments,
      paidPayments: 0,
      overduePayments: 0,
      lastMonths: [],
    }
  },
}

function mapPayment(item: any): Payment {
  return {
    id: item.id,
    orderId: item.order_id,
    orderNumber: item.order_number,
    amount: Number(item.amount),
    method: item.method,
    status: item.status,
    dueDate: item.due_date,
    paidAt: item.paid_at,
    notes: item.notes,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  } as Payment
}

function mapExpense(item: any): Expense {
  return {
    id: item.id,
    category: item.category,
    description: item.description,
    amount: Number(item.amount),
    date: item.date,
    notes: item.notes,
    createdBy: item.created_by,
    createdByName: item.created_by_name,
    createdAt: item.created_at,
  } as Expense
}

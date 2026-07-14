import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PaymentMethod, AppointmentStatus, OrderStatus, PaymentStatus, ServiceCategory, ChecklistStatus, VehicleType, ExpenseCategory } from '../types'

// ===== DATE FORMATTERS =====

export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    return format(d, 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return '—'
  }
}

export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch {
    return '—'
  }
}

export const formatTime = (date: string | Date | null | undefined): string => {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    return format(d, 'HH:mm', { locale: ptBR })
  } catch {
    return '—'
  }
}

export const formatRelative = (date: string | Date | null | undefined): string => {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    return formatDistanceToNow(d, { addSuffix: true, locale: ptBR })
  } catch {
    return '—'
  }
}

export const formatMonthYear = (date: string | Date | null | undefined): string => {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    return format(d, 'MMM/yyyy', { locale: ptBR })
  } catch {
    return '—'
  }
}

// ===== CURRENCY FORMATTERS =====

export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export const formatCurrencyShort = (value: number): string => {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`
  return formatCurrency(value)
}

// ===== MASK FORMATTERS =====

export const formatCPF = (cpf: string): string => {
  const clean = cpf.replace(/\D/g, '')
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export const formatPhone = (phone: string): string => {
  const clean = phone.replace(/\D/g, '')
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

export const formatPlate = (plate: string): string => {
  return plate.toUpperCase().replace(/([A-Z]{3})(\d{1}[A-Z0-9]\d{2}|\d{4})/, '$1-$2')
}

export const maskDate = (value: string): string => {
  const clean = value.replace(/\D/g, '').slice(0, 8)
  if (clean.length <= 2) return clean
  if (clean.length <= 4) return `${clean.slice(0, 2)}/${clean.slice(2)}`
  return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`
}

export const parseDateToISO = (value: string): string => {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return value
  return `${match[3]}-${match[2]}-${match[1]}`
}

// ===== LABEL TRANSLATORS =====

export const getPaymentMethodLabel = (method: PaymentMethod): string => {
  const labels: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: 'Dinheiro',
    [PaymentMethod.CREDIT_CARD]: 'Cartão de Crédito',
    [PaymentMethod.DEBIT_CARD]: 'Cartão de Débito',
    [PaymentMethod.PIX]: 'PIX',
    [PaymentMethod.TRANSFER]: 'Transferência',
  }
  return labels[method] ?? method
}

export const getAppointmentStatusLabel = (status: AppointmentStatus): string => {
  const labels: Record<AppointmentStatus, string> = {
    [AppointmentStatus.SCHEDULED]: 'Agendado',
    [AppointmentStatus.CONFIRMED]: 'Confirmado',
    [AppointmentStatus.IN_PROGRESS]: 'Em Andamento',
    [AppointmentStatus.FINISHED]: 'Finalizado',
    [AppointmentStatus.CANCELLED]: 'Cancelado',
  }
  return labels[status] ?? status
}

export const getOrderStatusLabel = (status: OrderStatus): string => {
  const labels: Record<OrderStatus, string> = {
    [OrderStatus.OPEN]: 'Aberta',
    [OrderStatus.IN_PROGRESS]: 'Em Andamento',
    [OrderStatus.FINISHED]: 'Finalizado',
    [OrderStatus.CANCELLED]: 'Cancelado',
  }
  return labels[status] ?? status
}

export const getPaymentStatusLabel = (status: PaymentStatus): string => {
  const labels: Record<PaymentStatus, string> = {
    [PaymentStatus.PENDING]: 'Pendente',
    [PaymentStatus.PAID]: 'Pago',
    [PaymentStatus.OVERDUE]: 'Vencido',
    [PaymentStatus.CANCELLED]: 'Cancelado',
  }
  return labels[status] ?? status
}

export const getServiceCategoryLabel = (category: ServiceCategory): string => {
  const labels: Record<ServiceCategory, string> = {
    [ServiceCategory.WASHING]: 'Lavagem',
    [ServiceCategory.POLISHING]: 'Polimento',
    [ServiceCategory.DETAILING]: 'Detalhamento',
    [ServiceCategory.COATING]: 'Revestimento',
    [ServiceCategory.INTERIOR]: 'Interior',
    [ServiceCategory.ENGINE]: 'Motor',
    [ServiceCategory.OTHER]: 'Outro',
  }
  return labels[category] ?? category
}

export const getChecklistStatusLabel = (status: ChecklistStatus): string => {
  const labels: Record<ChecklistStatus, string> = {
    [ChecklistStatus.OK]: 'OK',
    [ChecklistStatus.ATTENTION]: 'Atenção',
    [ChecklistStatus.DAMAGED]: 'Danificado',
    [ChecklistStatus.NOT_CHECKED]: 'Não Verificado',
  }
  return labels[status] ?? status
}

export const getVehicleTypeLabel = (type: VehicleType): string => {
  const labels: Record<VehicleType, string> = {
    [VehicleType.CAR]: 'Carro',
    [VehicleType.MOTORCYCLE]: 'Moto',
    [VehicleType.TRUCK]: 'Caminhão',
    [VehicleType.SUV]: 'SUV',
    [VehicleType.VAN]: 'Van',
  }
  return labels[type] ?? type
}

export const getExpenseCategoryLabel = (category: ExpenseCategory): string => {
  const labels: Record<ExpenseCategory, string> = {
    [ExpenseCategory.SUPPLIES]: 'Insumos',
    [ExpenseCategory.EQUIPMENT]: 'Equipamentos',
    [ExpenseCategory.RENT]: 'Aluguel',
    [ExpenseCategory.SALARY]: 'Salário',
    [ExpenseCategory.UTILITIES]: 'Serviços Públicos',
    [ExpenseCategory.MARKETING]: 'Marketing',
    [ExpenseCategory.MAINTENANCE]: 'Manutenção',
    [ExpenseCategory.OTHER]: 'Outro',
  }
  return labels[category] ?? category
}

// ===== NUMBER FORMATTERS =====

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export const formatMileage = (km: number | undefined): string => {
  if (!km) return '—'
  return `${km.toLocaleString('pt-BR')} km`
}

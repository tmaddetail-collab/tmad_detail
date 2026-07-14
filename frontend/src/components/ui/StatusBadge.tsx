import { cn } from '@/lib/utils'
import { AppointmentStatus, PaymentStatus, type UserRole } from '@/types'
import { getAppointmentStatusLabel, getPaymentStatusLabel } from '@/utils/formatters'

interface StatusBadgeProps {
  status: 'active' | 'inactive' | UserRole | string
  size?: 'sm' | 'md'
}

const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  client: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const style = statusStyles[status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full capitalize',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        style,
      )}
    >
      {status}
    </span>
  )
}

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus
  size?: 'sm' | 'md'
}

const appointmentStyles: Record<AppointmentStatus, string> = {
  [AppointmentStatus.SCHEDULED]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  [AppointmentStatus.CONFIRMED]: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  [AppointmentStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  [AppointmentStatus.FINISHED]: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  [AppointmentStatus.CANCELLED]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export function AppointmentStatusBadge({ status, size = 'sm' }: AppointmentStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        appointmentStyles[status],
      )}
    >
      {getAppointmentStatusLabel(status)}
    </span>
  )
}

interface PaymentStatusBadgeProps {
  status: PaymentStatus
  size?: 'sm' | 'md'
}

const paymentStyles: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  [PaymentStatus.PAID]: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  [PaymentStatus.OVERDUE]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  [PaymentStatus.CANCELLED]: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export function PaymentStatusBadge({ status, size = 'sm' }: PaymentStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        paymentStyles[status],
      )}
    >
      {getPaymentStatusLabel(status)}
    </span>
  )
}

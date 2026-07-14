import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { dashboardApi } from '@/api/dashboard'
import { appointmentsApi } from '@/api/appointments'
import { ordersApi } from '@/api/orders'
import { financialApi } from '@/api/financial'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { AppointmentStatusBadge } from '@/components/ui/StatusBadge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Appointment, ServiceOrder } from '@/types'
import { formatDateTime, formatCurrency, getOrderStatusLabel } from '@/utils/formatters'
import {
  Calendar,
  ClipboardList,
  Car,
  DollarSign,
  CheckCircle,
  ArrowRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

interface DashboardStats {
  appointmentsToday: number
  pendingOrders: number
  totalVehicles: number
  pendingValue: number
  paidValue: number
}

export function ClientDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [nextAppointments, setNextAppointments] = useState<Appointment[]>([])
  const [recentOrders, setRecentOrders] = useState<ServiceOrder[]>([])

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [dashboardData, appointments, orders, payments] = await Promise.all([
        dashboardApi.getClientDashboard(),
        appointmentsApi.getAll({ clientId: user.id, pageSize: 5 }),
        ordersApi.getAll({ clientId: user.id, pageSize: 5 }),
        financialApi.getPayments({ clientId: user.id }),
      ])

      setStats({
        appointmentsToday: dashboardData.upcoming_appointments,
        pendingOrders: dashboardData.active_orders,
        totalVehicles: dashboardData.total_vehicles,
        pendingValue: payments
          .filter((p) => p.status === 'pending' || p.status === 'overdue')
          .reduce((sum, p) => sum + p.amount, 0),
        paidValue: payments
          .filter((p) => p.status === 'paid')
          .reduce((sum, p) => sum + p.amount, 0),
      })
      setNextAppointments(appointments)
      setRecentOrders(orders)
    } catch {
      setError('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <PageLoader />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-error" />
        </div>
        <p className="text-text-secondary">{error}</p>
        <Button variant="outline" onClick={loadDashboard}>
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Próximos Agendamentos',
      value: stats?.appointmentsToday ?? 0,
      icon: Calendar,
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Histórico de Serviços',
      value: stats?.pendingOrders ?? 0,
      icon: ClipboardList,
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Veículos Cadastrados',
      value: stats?.totalVehicles ?? 0,
      icon: Car,
      bg: 'bg-green-100 dark:bg-green-900/30',
      color: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Valores Pendentes',
      value: formatCurrency(stats?.pendingValue ?? 0),
      icon: DollarSign,
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      color: 'text-yellow-600 dark:text-yellow-400',
    },
    {
      label: 'Valores Pagos',
      value: formatCurrency(stats?.paidValue ?? 0),
      icon: CheckCircle,
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      color: 'text-emerald-600 dark:text-emerald-400',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">
          Olá, {user?.name?.split(' ')[0] ?? 'Cliente'}
        </h1>
        <p className="text-text-secondary">Bem-vindo ao TMAD Detail</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  card.bg,
                )}
              >
                <card.icon className={cn('h-5 w-5', card.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-secondary truncate">
                  {card.label}
                </p>
                <p className="text-lg font-bold text-text truncate">
                  {card.value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Próximos Agendamentos</CardTitle>
            <Link
              to="/app/appointments"
              className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1 shrink-0"
            >
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {nextAppointments.length === 0 ? (
              <EmptyState
                title="Nenhum agendamento"
                description="Você ainda não possui agendamentos futuros"
                icon={<Calendar className="h-8 w-8 text-text-secondary" />}
                action={
                  <Link to="/app/appointments">
                    <Button size="sm">Agendar agora</Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {nextAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-b-0 gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Calendar className="h-8 w-8 text-primary p-1.5 bg-primary/10 rounded-lg shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text truncate">
                          {apt.services?.map((s: any) => s.service_name ?? 'Serviço').join(', ') || 'Agendamento'}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {formatDateTime(apt.scheduledAt)} &bull;{' '}
                          {apt.vehicle ? `${apt.vehicle.brand} ${apt.vehicle.model}` : 'Veículo'}
                        </p>
                      </div>
                    </div>
                    <AppointmentStatusBadge status={apt.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ordens de Serviço Recentes</CardTitle>
            <Link
              to="/app/orders"
              className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1 shrink-0"
            >
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <EmptyState
                title="Nenhuma ordem"
                description="Você ainda não possui ordens de serviço"
                icon={<ClipboardList className="h-8 w-8 text-text-secondary" />}
              />
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-b-0 gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ClipboardList className="h-8 w-8 text-purple-600 p-1.5 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text">
                          OS #{order.orderNumber}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {formatDateTime(order.createdAt)} &bull;{' '}
                          {formatCurrency(order.totalValue)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        order.status === 'finished'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : order.status === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : order.status === 'cancelled'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                      )}
                    >
                      {getOrderStatusLabel(order.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

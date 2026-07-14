import { useEffect, useState } from 'react'
import {
  Calendar,
  Clock,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Users,
  Car,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { dashboardApi, AdminDashboard as AdminDashboardData } from '@/api/dashboard'
import { reportsApi } from '@/api/reports'
import { formatCurrency, formatCurrencyShort } from '@/utils/formatters'
import { Button } from '@/components/ui/Button'

const PIE_COLORS = ['#3B82F6', '#6366F1', '#EAB308', '#22C55E', '#EF4444']

export function AdminDashboard() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number; expenses: number; profit: number }[]>([])
  const [topServicesData, setTopServicesData] = useState<{ service_name: string; total_quantity: number }[]>([])
  const [appointmentsData, setAppointmentsData] = useState<{ status: string; count: number }[]>([])

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const [dashboardResult, revenue, topServices] = await Promise.all([
        dashboardApi.getAdminDashboard(),
        reportsApi.getRevenue({ period: 'month' }),
        reportsApi.getTopServices({ limit: 5 }),
      ])
      setData(dashboardResult)
      const mappedRevenue = (Array.isArray(revenue) ? revenue : []).map((r: any) => ({
        month: r.period,
        revenue: Number(r.revenue),
        expenses: Number(r.expenses),
        profit: Number(r.profit),
      }))
      setRevenueData(mappedRevenue)
      setTopServicesData(Array.isArray(topServices) ? topServices : [])
      setAppointmentsData([
        { status: 'scheduled', count: 0 },
        { status: 'confirmed', count: 0 },
        { status: 'in_progress', count: 0 },
        { status: 'finished', count: 0 },
        { status: 'cancelled', count: 0 },
      ])
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

  if (!data) return null

  const kpiCards = [
    { label: 'Agendamentos Hoje', value: data.today_appointments, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Em Andamento', value: data.active_orders, icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { label: 'Clientes', value: data.total_clients, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { label: 'Veículos', value: data.total_vehicles, icon: Car, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { label: 'Receita do Mês', value: formatCurrencyShort(Number(data.monthly_revenue)), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Despesas do Mês', value: formatCurrencyShort(Number(data.monthly_expenses)), icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Aprovações Pendentes', value: data.pending_approvals, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Dashboard</h1>
        <p className="text-text-secondary mt-1">Visão geral do negócio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-text-secondary truncate">{kpi.label}</p>
                <p className="text-2xl font-bold text-text mt-0.5">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Receita vs Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length === 0 ? (
              <EmptyState title="Sem dados" description="Nenhum dado de receita disponível." />
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB' }} formatter={(value: number) => [formatCurrency(value)]} />
                    <Line type="monotone" dataKey="revenue" stroke="#DC2626" strokeWidth={2} name="Receita" dot={false} />
                    <Line type="monotone" dataKey="expenses" stroke="#EAB308" strokeWidth={2} name="Despesas" dot={false} />
                    <Line type="monotone" dataKey="profit" stroke="#22C55E" strokeWidth={2} name="Lucro" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Serviços Mais Realizados</CardTitle>
          </CardHeader>
          <CardContent>
            {topServicesData.length === 0 ? (
              <EmptyState title="Sem dados" description="Nenhum serviço realizado." />
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topServicesData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                    <YAxis type="category" dataKey="service_name" tick={{ fontSize: 11 }} stroke="#9CA3AF" width={120} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB' }} formatter={(value: number) => [value, 'Quantidade']} />
                    <Bar dataKey="total_quantity" fill="#DC2626" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

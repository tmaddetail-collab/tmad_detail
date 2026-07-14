import { useEffect, useState, useCallback } from 'react'
import {
  BarChart3,
  TrendingUp,
  Star,
  DollarSign,
  AlertTriangle,
  Download,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import {
  reportsApi,
  TopClient,
  RevenueReport,
  PendingPayment,
} from '@/api/reports'
import { TopService as TopServiceReport } from '@/types'
import { formatCurrency, formatDate } from '@/utils/formatters'

export function Reports() {
  const { toast } = useToast()
  const [loadingClients, setLoadingClients] = useState(true)
  const [loadingServices, setLoadingServices] = useState(true)
  const [loadingRevenue, setLoadingRevenue] = useState(true)
  const [loadingPayments, setLoadingPayments] = useState(true)

  const [topClients, setTopClients] = useState<TopClient[]>([])
  const [topServices, setTopServices] = useState<TopServiceReport[]>([])
  const [revenueData, setRevenueData] = useState<RevenueReport[]>([])
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])

  const [clientStartDate, setClientStartDate] = useState('')
  const [clientEndDate, setClientEndDate] = useState('')
  const [serviceStartDate, setServiceStartDate] = useState('')
  const [serviceEndDate, setServiceEndDate] = useState('')
  const [revenuePeriod, setRevenuePeriod] = useState('month')

  const loadTopClients = useCallback(async () => {
    try {
      setLoadingClients(true)
      const data = await reportsApi.getTopClients({
        startDate: clientStartDate || undefined,
        endDate: clientEndDate || undefined,
      })
      setTopClients(data)
    } catch {
      toast('error', 'Erro ao carregar top clientes')
    } finally {
      setLoadingClients(false)
    }
  }, [clientStartDate, clientEndDate, toast])

  const loadTopServices = useCallback(async () => {
    try {
      setLoadingServices(true)
      const data = await reportsApi.getTopServices({
        startDate: serviceStartDate || undefined,
        endDate: serviceEndDate || undefined,
      })
      setTopServices(data)
    } catch {
      toast('error', 'Erro ao carregar top serviços')
    } finally {
      setLoadingServices(false)
    }
  }, [serviceStartDate, serviceEndDate, toast])

  const loadRevenue = useCallback(async () => {
    try {
      setLoadingRevenue(true)
      const data = await reportsApi.getRevenue({ period: revenuePeriod as any })
      setRevenueData(data)
    } catch {
      toast('error', 'Erro ao carregar receita')
    } finally {
      setLoadingRevenue(false)
    }
  }, [revenuePeriod, toast])

  const loadPendingPayments = useCallback(async () => {
    try {
      setLoadingPayments(true)
      const data = await reportsApi.getPendingPayments()
      setPendingPayments(data)
    } catch {
      toast('error', 'Erro ao carregar pagamentos pendentes')
    } finally {
      setLoadingPayments(false)
    }
  }, [toast])

  useEffect(() => { loadTopClients() }, [loadTopClients])
  useEffect(() => { loadTopServices() }, [loadTopServices])
  useEffect(() => { loadRevenue() }, [loadRevenue])
  useEffect(() => { loadPendingPayments() }, [loadPendingPayments])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Relatórios</h1>
          <p className="text-text-secondary mt-1">Análise de dados e relatórios</p>
        </div>
        <Button variant="secondary" disabled>
          <Download className="h-4 w-4" />
          Exportar (Em breve)
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Top Clientes
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <Input type="date" value={clientStartDate} onChange={(e) => setClientStartDate(e.target.value)} className="max-w-[160px]" />
              <Input type="date" value={clientEndDate} onChange={(e) => setClientEndDate(e.target.value)} className="max-w-[160px]" />
              <Button variant="secondary" size="sm" onClick={loadTopClients}>Filtrar</Button>
            </div>
            {loadingClients ? (
              <PageLoader />
            ) : topClients.length === 0 ? (
              <EmptyState title="Sem dados" description="Nenhum dado de clientes no período." />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topClients} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                    <YAxis type="category" dataKey="clientName" tick={{ fontSize: 11 }} stroke="#9CA3AF" width={120} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB' }} formatter={(value: number) => [value, 'Pedidos']} />
                    <Bar dataKey="totalOrders" fill="#DC2626" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Top Serviços
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <Input type="date" value={serviceStartDate} onChange={(e) => setServiceStartDate(e.target.value)} className="max-w-[160px]" />
              <Input type="date" value={serviceEndDate} onChange={(e) => setServiceEndDate(e.target.value)} className="max-w-[160px]" />
              <Button variant="secondary" size="sm" onClick={loadTopServices}>Filtrar</Button>
            </div>
            {loadingServices ? (
              <PageLoader />
            ) : topServices.length === 0 ? (
              <EmptyState title="Sem dados" description="Nenhum dado de serviços no período." />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topServices} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                    <YAxis type="category" dataKey="service" tick={{ fontSize: 11 }} stroke="#9CA3AF" width={120} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB' }} formatter={(value: number) => [value, 'Quantidade']} />
                    <Bar dataKey="count" fill="#3B82F6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Receita por Período
              </div>
            </CardTitle>
            <select
              value={revenuePeriod}
              onChange={(e) => setRevenuePeriod(e.target.value)}
              className="input-base max-w-[150px] text-sm"
            >
              <option value="day">Dia</option>
              <option value="week">Semana</option>
              <option value="month">Mês</option>
              <option value="year">Ano</option>
            </select>
          </CardHeader>
          <CardContent>
            {loadingRevenue ? (
              <PageLoader />
            ) : revenueData.length === 0 ? (
              <EmptyState title="Sem dados" description="Nenhum dado de receita disponível." />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB' }} formatter={(value: number) => [formatCurrency(value)]} />
                    <Line type="monotone" dataKey="revenue" stroke="#22C55E" strokeWidth={2} name="Receita" dot={false} />
                    <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Despesas" dot={false} />
                    <Line type="monotone" dataKey="profit" stroke="#3B82F6" strokeWidth={2} name="Lucro" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Pagamentos Pendentes
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPayments ? (
              <PageLoader />
            ) : pendingPayments.length === 0 ? (
              <EmptyState title="Nenhum pagamento pendente" description="Todos os pagamentos estão em dia." />
            ) : (
              <div className="space-y-3">
                {pendingPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text truncate">{payment.clientName}</p>
                      <p className="text-xs text-text-secondary">{payment.orderNumber} — {formatDate(payment.dueDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-error">{formatCurrency(payment.amount)}</p>
                      {payment.daysOverdue > 0 && (
                        <p className="text-xs text-error">{payment.daysOverdue} dia(s) em atraso</p>
                      )}
                    </div>
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

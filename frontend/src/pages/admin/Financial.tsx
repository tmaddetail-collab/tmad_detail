import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  AlertTriangle,
  Plus,
  Edit3,
  Trash2,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { financialApi, FinancialDashboard, CashFlowItem } from '@/api/financial'
import {
  Payment,
  Expense,
  ExpenseForm,
  ExpenseCategory,
  PaymentStatus,
} from '@/types'
import {
  formatCurrency,
  formatDate,
  getExpenseCategoryLabel,
} from '@/utils/formatters'

const expenseCategoryOptions = Object.values(ExpenseCategory).map((cat) => ({
  value: cat,
  label: getExpenseCategoryLabel(cat),
}))

const defaultExpenseForm: ExpenseForm = {
  description: '',
  amount: 0,
  category: ExpenseCategory.OTHER,
  date: new Date().toISOString().split('T')[0],
  notes: '',
}

const periodOptions = [
  { value: 'day', label: 'Dia' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'year', label: 'Ano' },
]

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'receitas', label: 'Receitas', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'despesas', label: 'Despesas', icon: <TrendingDown className="h-4 w-4" /> },
  { id: 'fluxo', label: 'Fluxo de Caixa', icon: <PiggyBank className="h-4 w-4" /> },
]

export function Financial() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<FinancialDashboard | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [cashFlow, setCashFlow] = useState<CashFlowItem[]>([])
  const [cashFlowPeriod, setCashFlowPeriod] = useState('month')

  const [expenseStartDate, setExpenseStartDate] = useState('')
  const [expenseEndDate, setExpenseEndDate] = useState('')
  const [paymentStartDate, setPaymentStartDate] = useState('')
  const [paymentEndDate, setPaymentEndDate] = useState('')

  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(defaultExpenseForm)
  const [submitting, setSubmitting] = useState(false)

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true)
      const data = await financialApi.getFinancialDashboard()
      setDashboardData(data)
    } catch {
      toast('error', 'Erro ao carregar dashboard financeiro')
    } finally {
      setLoading(false)
    }
  }, [toast])

  const loadPayments = useCallback(async () => {
    try {
      const data = await financialApi.getPayments({
        startDate: paymentStartDate || undefined,
        endDate: paymentEndDate || undefined,
      })
      setPayments(data)
    } catch {
      toast('error', 'Erro ao carregar receitas')
    }
  }, [paymentStartDate, paymentEndDate, toast])

  const loadExpenses = useCallback(async () => {
    try {
      const data = await financialApi.getExpenses({
        startDate: expenseStartDate || undefined,
        endDate: expenseEndDate || undefined,
      })
      setExpenses(data)
    } catch {
      toast('error', 'Erro ao carregar despesas')
    }
  }, [expenseStartDate, expenseEndDate, toast])

  const loadCashFlow = useCallback(async () => {
    try {
      const data = await financialApi.getCashFlow({ period: cashFlowPeriod as any })
      setCashFlow(data)
    } catch {
      toast('error', 'Erro ao carregar fluxo de caixa')
    }
  }, [cashFlowPeriod, toast])

  useEffect(() => {
    if (activeTab === 'dashboard') loadDashboard()
    else if (activeTab === 'receitas') loadPayments()
    else if (activeTab === 'despesas') loadExpenses()
    else if (activeTab === 'fluxo') loadCashFlow()
  }, [activeTab, loadDashboard, loadPayments, loadExpenses, loadCashFlow])

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expenseForm.description || expenseForm.amount <= 0) {
      toast('error', 'Preencha todos os campos obrigatórios')
      return
    }
    try {
      setSubmitting(true)
      if (editingExpense) {
        await financialApi.updateExpense(editingExpense.id, expenseForm)
        toast('success', 'Despesa atualizada com sucesso')
      } else {
        await financialApi.createExpense(expenseForm)
        toast('success', 'Despesa criada com sucesso')
      }
      setShowExpenseModal(false)
      loadExpenses()
    } catch {
      toast('error', `Erro ao ${editingExpense ? 'atualizar' : 'criar'} despesa`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteExpense = async (expense: Expense) => {
    if (!confirm(`Remover despesa "${expense.description}"?`)) return
    try {
      await financialApi.deleteExpense(expense.id)
      toast('success', 'Despesa removida com sucesso')
      loadExpenses()
    } catch {
      toast('error', 'Erro ao remover despesa')
    }
  }

  const paymentColumns: Column<Payment>[] = useMemo(
    () => [
      {
        key: 'client',
        header: 'Cliente',
        render: (item) => item.client?.name || '—',
      },
      {
        key: 'order',
        header: 'Ordem',
        render: (item) => item.orderNumber || '—',
      },
      {
        key: 'amount',
        header: 'Valor',
        sortable: true,
        render: (item) => (
          <span className="font-medium">{formatCurrency(item.amount)}</span>
        ),
      },
      {
        key: 'method',
        header: 'Método',
        render: (item) => item.method || '—',
      },
      {
        key: 'status',
        header: 'Status',
        render: (item) => (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              item.status === PaymentStatus.PAID
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : item.status === PaymentStatus.PENDING
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : item.status === PaymentStatus.OVERDUE
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {item.status === PaymentStatus.PAID ? 'Pago' : item.status === PaymentStatus.PENDING ? 'Pendente' : item.status === PaymentStatus.OVERDUE ? 'Vencido' : 'Cancelado'}
          </span>
        ),
      },
      {
        key: 'createdAt',
        header: 'Data',
        sortable: true,
        render: (item) => formatDate(item.createdAt),
      },
    ],
    [],
  )

  const expenseColumns: Column<Expense>[] = useMemo(
    () => [
      { key: 'description', header: 'Descrição', sortable: true },
      {
        key: 'category',
        header: 'Categoria',
        render: (item) => (
          <span className="text-sm">{getExpenseCategoryLabel(item.category)}</span>
        ),
      },
      {
        key: 'amount',
        header: 'Valor',
        sortable: true,
        render: (item) => (
          <span className="font-medium text-error">{formatCurrency(item.amount)}</span>
        ),
      },
      {
        key: 'date',
        header: 'Data',
        sortable: true,
        render: (item) => formatDate(item.date),
      },
      {
        key: 'notes',
        header: 'Observações',
        render: (item) => (
          <span className="text-sm text-text-secondary truncate max-w-[150px] block">
            {item.notes || '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Ações',
        render: (item) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setEditingExpense(item)
                setExpenseForm({
                  description: item.description,
                  amount: item.amount,
                  category: item.category,
                  date: item.date,
                  notes: item.notes || '',
                })
                setShowExpenseModal(true)
              }}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteExpense(item)
              }}
            >
              <Trash2 className="h-4 w-4 text-error" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Financeiro</h1>
        <p className="text-text-secondary mt-1">Controle financeiro completo</p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'dashboard' && (
        <>
          {loading ? (
            <PageLoader />
          ) : !dashboardData ? (
            <EmptyState icon={<DollarSign className="h-8 w-8" />} title="Sem dados financeiros" />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary uppercase tracking-wider">Receita Total</p>
                        <p className="text-xl font-bold text-text">{formatCurrency(dashboardData.totalRevenue)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                        <TrendingDown className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary uppercase tracking-wider">Despesas</p>
                        <p className="text-xl font-bold text-text">{formatCurrency(dashboardData.totalExpenses)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <PiggyBank className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary uppercase tracking-wider">Lucro</p>
                        <p className="text-xl font-bold text-text">{formatCurrency(dashboardData.profit)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary uppercase tracking-wider">Pendentes</p>
                        <p className="text-xl font-bold text-text">{formatCurrency(dashboardData.pendingPayments)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary uppercase tracking-wider">Recebidos</p>
                        <p className="text-xl font-bold text-text">{formatCurrency(dashboardData.paidPayments)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary uppercase tracking-wider">Vencidos</p>
                        <p className="text-xl font-bold text-text">{formatCurrency(dashboardData.overduePayments)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Receita vs Despesas (Últimos Meses)</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData.lastMonths.length === 0 ? (
                    <EmptyState title="Sem dados" />
                  ) : (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboardData.lastMonths}>
                          <defs>
                            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="expFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                          <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB' }} formatter={(value: number) => [formatCurrency(value)]} />
                          <Area type="monotone" dataKey="revenue" stroke="#22C55E" strokeWidth={2} fill="url(#revFill)" name="Receita" />
                          <Area type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} fill="url(#expFill)" name="Despesas" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {activeTab === 'receitas' && (
        <Card>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4 mb-4">
              <Input label="Data Início" type="date" value={paymentStartDate} onChange={(e) => setPaymentStartDate(e.target.value)} />
              <Input label="Data Fim" type="date" value={paymentEndDate} onChange={(e) => setPaymentEndDate(e.target.value)} />
              <Button variant="secondary" onClick={() => { setPaymentStartDate(''); setPaymentEndDate('') }}>Limpar</Button>
            </div>
            <DataTable
              columns={paymentColumns}
              data={payments}
              keyExtractor={(item) => String(item.id)}
              isLoading={loading}
              emptyMessage="Nenhum pagamento encontrado"
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'despesas' && (
        <Card>
          <CardContent>
            <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
              <div className="flex flex-wrap items-end gap-4">
                <Input label="Data Início" type="date" value={expenseStartDate} onChange={(e) => setExpenseStartDate(e.target.value)} />
                <Input label="Data Fim" type="date" value={expenseEndDate} onChange={(e) => setExpenseEndDate(e.target.value)} />
                <Button variant="secondary" onClick={() => { setExpenseStartDate(''); setExpenseEndDate('') }}>Limpar</Button>
              </div>
              <Button onClick={() => { setEditingExpense(null); setExpenseForm(defaultExpenseForm); setShowExpenseModal(true) }}>
                <Plus className="h-4 w-4" /> Nova Despesa
              </Button>
            </div>
            <DataTable
              columns={expenseColumns}
              data={expenses}
              keyExtractor={(item) => String(item.id)}
              isLoading={loading}
              emptyMessage="Nenhuma despesa encontrada"
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'fluxo' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Select options={periodOptions} value={cashFlowPeriod} onChange={(e) => setCashFlowPeriod(e.target.value)} className="min-w-[150px]" />
            </div>
          </CardHeader>
          <CardContent>
            {cashFlow.length === 0 ? (
              <EmptyState title="Sem dados" description="Nenhum dado de fluxo de caixa disponível." />
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlow}>
                    <defs>
                      <linearGradient id="flRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="flExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="flProf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB' }} formatter={(value: number) => [formatCurrency(value)]} />
                    <Area type="monotone" dataKey="revenue" stroke="#22C55E" strokeWidth={2} fill="url(#flRev)" name="Receita" />
                    <Area type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} fill="url(#flExp)" name="Despesas" />
                    <Area type="monotone" dataKey="profit" stroke="#3B82F6" strokeWidth={2} fill="url(#flProf)" name="Lucro" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Modal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title={editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
        size="lg"
      >
        <form onSubmit={handleExpenseSubmit} className="space-y-4">
          <Input label="Descrição *" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="Descrição da despesa" />
          <Select label="Categoria" options={expenseCategoryOptions} value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Valor (R$) *" type="number" step="0.01" min={0} value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })} />
            <Input label="Data" type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
          </div>
          <Input label="Observações" value={expenseForm.notes || ''} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} placeholder="Observações opcionais" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowExpenseModal(false)}>Cancelar</Button>
            <Button type="submit" isLoading={submitting}>{editingExpense ? 'Salvar' : 'Criar Despesa'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

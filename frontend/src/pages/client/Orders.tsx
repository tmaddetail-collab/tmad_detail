import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ordersApi } from '@/api/orders'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import { ServiceOrder, OrderStatus } from '@/types'
import {
  formatDateTime,
  formatCurrency,
  getOrderStatusLabel,
  getChecklistStatusLabel,
  getPaymentStatusLabel,
} from '@/utils/formatters'
import { printOrder } from '@/utils/printOrder'
import {
  ClipboardList,
  Eye,
  Search,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Camera,
  CreditCard,
  ThumbsUp,
  Printer,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const statusStyles: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  finished:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const checklistStatusStyles: Record<string, string> = {
  ok: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  attention:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  damaged:
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  not_checked:
    'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

export function ClientOrders() {
  const { user } = useAuth()
  const { toast } = useToast()
  const signatureRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [activeTab, setActiveTab] = useState('checklist')

  const [approvalSignature, setApprovalSignature] = useState('')
  const [approvalObservations, setApprovalObservations] = useState('')
  const [approving, setApproving] = useState(false)

  const loadOrders = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const data = await ordersApi.getAll({ clientId: user.id })
      setOrders(data)
    } catch {
      setError('Erro ao carregar ordens de serviço')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const filteredOrders = orders.filter((order) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      order.orderNumber.toLowerCase().includes(q) ||
      order.vehicle?.plate?.toLowerCase().includes(q) ||
      order.vehicle?.model?.toLowerCase().includes(q) ||
      order.services?.some((s) => s.service?.name.toLowerCase().includes(q))
    )
  })

  const handleViewDetail = async (order: ServiceOrder) => {
    setShowDetailModal(true)
    setActiveTab('checklist')
    setApprovalSignature('')
    setApprovalObservations('')
    try {
      const detail = await ordersApi.getById(order.id)
      setSelectedOrder(detail)
    } catch {
      setSelectedOrder(order)
    }
  }

  const startDrawing = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = signatureRef.current
    if (!canvas) return
    setIsDrawing(true)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawing) return
    const canvas = signatureRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#E11D48'
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = signatureRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setApprovalSignature('')
  }

  const saveSignature = () => {
    const canvas = signatureRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    setApprovalSignature(dataUrl)
  }

  const handleApprove = async () => {
    if (!selectedOrder) return
    if (!approvalSignature) {
      toast('error', 'Assinatura é obrigatória')
      return
    }
    setApproving(true)
    try {
      await ordersApi.approve(selectedOrder.id, {
        signature: approvalSignature,
        observations: approvalObservations || undefined,
      })
      toast('success', 'Ordem de serviço aprovada com sucesso!')
      setShowDetailModal(false)
      setSelectedOrder(null)
      loadOrders()
    } catch {
      toast('error', 'Erro ao aprovar ordem de serviço')
    } finally {
      setApproving(false)
    }
  }

  const orderTabs = [
    { id: 'checklist', label: 'Checklist' },
    { id: 'photos', label: 'Fotos' },
    { id: 'payment', label: 'Pagamento' },
    { id: 'approval', label: 'Aprovação' },
  ]

  if (loading && orders.length === 0) return <PageLoader />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-error" />
        </div>
        <p className="text-text-secondary">{error}</p>
        <Button variant="outline" onClick={loadOrders}>
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">Minhas Ordens de Serviço</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por número, veículo..."
              className="input-base pl-10 w-full"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <EmptyState
              title="Nenhuma ordem encontrada"
              description={
                search
                  ? 'Tente alterar os termos da busca'
                  : 'Você ainda não possui ordens de serviço'
              }
              icon={<ClipboardList className="h-8 w-8 text-text-secondary" />}
            />
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => handleViewDetail(order)}
                  className="p-4 rounded-xl border border-border hover:bg-surface-2/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <ClipboardList className="h-10 w-10 text-primary p-2 bg-primary/10 rounded-xl shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-text">
                            OS #{order.orderNumber}
                          </p>
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                              statusStyles[order.status] ??
                                'bg-gray-100 text-gray-600',
                            )}
                          >
                            {getOrderStatusLabel(order.status)}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {order.vehicle
                            ? `${order.vehicle.brand} ${order.vehicle.model} - ${order.vehicle.plate}`
                            : 'Veículo não informado'}{' '}
                          &bull; {formatDateTime(order.createdAt)}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {order.services
                            ?.map((s) => s.service?.name)
                            .filter(Boolean)
                            .join(', ') || 'Nenhum serviço'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-text">
                        {formatCurrency(order.totalValue)}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewDetail(order)
                        }}
                        className="text-xs text-primary hover:text-primary-dark font-medium mt-1 flex items-center gap-1 ml-auto"
                      >
                        <Eye className="h-3 w-3" />
                        Detalhes
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedOrder(null)
        }}
        title={
          selectedOrder ? `OS #${selectedOrder.orderNumber}` : 'Detalhes'
        }
        size="xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-text-secondary">Status</p>
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium',
                    statusStyles[selectedOrder.status] ??
                      'bg-gray-100 text-gray-600',
                  )}
                >
                  {getOrderStatusLabel(selectedOrder.status)}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-text-secondary">Data</p>
                <p className="text-sm text-text">
                  {formatDateTime(selectedOrder.createdAt)}
                </p>
              </div>
              <div className="col-span-2 space-y-2">
                <p className="text-xs text-text-secondary">Veículo(s)</p>
                {selectedOrder.vehicles && selectedOrder.vehicles.length > 0 ? (
                  selectedOrder.vehicles.map((v, i) => (
                    <div key={v.id} className="text-sm text-text">
                      <p>{v.vehicle ? `${v.vehicle.brand} ${v.vehicle.model} - ${v.vehicle.plate}` : '—'}</p>
                      {v.notes && <p className="text-xs text-text-secondary italic">Obs: {v.notes}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text">
                    {selectedOrder.vehicle
                      ? `${selectedOrder.vehicle.brand} ${selectedOrder.vehicle.model}`
                      : '—'}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-text-secondary">Valor Total</p>
                <p className="text-sm font-bold text-text">
                  {formatCurrency(selectedOrder.totalValue)}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="no-print"
                onClick={() => printOrder(selectedOrder)}
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
            </div>

            <Tabs
              tabs={orderTabs}
              activeTab={activeTab}
              onChange={setActiveTab}
            />

            {activeTab === 'checklist' && (
              <div className="space-y-3">
                {selectedOrder.checklist &&
                selectedOrder.checklist.length > 0 ? (
                  selectedOrder.checklist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between p-3 rounded-xl bg-surface-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-text-secondary">
                          {item.section}
                        </p>
                        <p className="text-sm font-medium text-text">
                          {item.item}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-text-secondary mt-1">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ml-2',
                          checklistStatusStyles[item.status] ??
                            'bg-gray-100 text-gray-600',
                        )}
                      >
                        {getChecklistStatusLabel(item.status)}
                      </span>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="Nenhum item no checklist"
                    icon={
                      <ClipboardList className="h-8 w-8 text-text-secondary" />
                    }
                  />
                )}
              </div>
            )}

            {activeTab === 'photos' && (
              <div>
                {selectedOrder.photos &&
                selectedOrder.photos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedOrder.photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="rounded-xl overflow-hidden border border-border"
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption ?? photo.type}
                          className="w-full h-32 object-cover"
                        />
                        <div className="p-2">
                          <span
                            className={cn(
                              'text-xs font-medium px-2 py-0.5 rounded-full',
                              photo.type === 'before'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : photo.type === 'after'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                            )}
                          >
                            {photo.type === 'before'
                              ? 'Antes'
                              : photo.type === 'after'
                                ? 'Depois'
                                : 'Durante'}
                          </span>
                          {photo.caption && (
                            <p className="text-xs text-text-secondary mt-1">
                              {photo.caption}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Nenhuma foto"
                    icon={
                      <Camera className="h-8 w-8 text-text-secondary" />
                    }
                  />
                )}
              </div>
            )}

            {activeTab === 'payment' && (
              <div>
                {selectedOrder.payment ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-text-secondary">Status</p>
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium',
                            selectedOrder.payment.status === 'paid'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : selectedOrder.payment.status === 'overdue'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : selectedOrder.payment.status === 'cancelled'
                                  ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                          )}
                        >
                          {getPaymentStatusLabel(selectedOrder.payment.status)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-text-secondary">Valor</p>
                        <p className="text-sm font-semibold text-text">
                          {formatCurrency(selectedOrder.payment.amount)}
                        </p>
                      </div>
                    </div>
                    {selectedOrder.payment.method && (
                      <div className="space-y-1">
                        <p className="text-xs text-text-secondary">
                          Método de Pagamento
                        </p>
                        <p className="text-sm text-text">
                          {selectedOrder.payment.method === 'cash'
                            ? 'Dinheiro'
                            : selectedOrder.payment.method === 'credit_card'
                              ? 'Cartão de Crédito'
                              : selectedOrder.payment.method === 'debit_card'
                                ? 'Cartão de Débito'
                                : selectedOrder.payment.method === 'pix'
                                  ? 'PIX'
                                  : selectedOrder.payment.method === 'transfer'
                                    ? 'Transferência'
                                    : selectedOrder.payment.method}
                        </p>
                      </div>
                    )}
                    {selectedOrder.payment.dueDate && (
                      <div className="space-y-1">
                        <p className="text-xs text-text-secondary">
                          Data de Vencimento
                        </p>
                        <p className="text-sm text-text">
                          {formatDateTime(selectedOrder.payment.dueDate)}
                        </p>
                      </div>
                    )}
                    {selectedOrder.payment.paidAt && (
                      <div className="space-y-1">
                        <p className="text-xs text-text-secondary">
                          Data de Pagamento
                        </p>
                        <p className="text-sm text-text">
                          {formatDateTime(selectedOrder.payment.paidAt)}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState
                    title="Informação de pagamento não disponível"
                    icon={
                      <CreditCard className="h-8 w-8 text-text-secondary" />
                    }
                  />
                )}
              </div>
            )}

            {activeTab === 'approval' && (
              <div>
                {selectedOrder.status === OrderStatus.FINISHED ? (
                  <div className="space-y-4">
                    {selectedOrder.clientSignature ? (
                      <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <p className="text-sm font-medium text-green-700 dark:text-green-400">
                            Ordem já aprovada
                          </p>
                        </div>
                        {selectedOrder.signedAt && (
                          <p className="text-xs text-green-600 dark:text-green-500">
                            Aprovada em {formatDateTime(selectedOrder.signedAt)}
                          </p>
                        )}
                        {selectedOrder.clientObservations && (
                          <div className="mt-2 p-2 rounded-lg bg-white dark:bg-green-900/20">
                            <p className="text-xs text-green-600 dark:text-green-500 font-medium">
                              Observações:
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-400">
                              {selectedOrder.clientObservations}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {selectedOrder.checklist &&
                          selectedOrder.checklist.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-text">
                                Checklist para Revisão
                              </p>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {selectedOrder.checklist.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-start justify-between p-2 rounded-lg bg-surface-2"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-xs text-text-secondary">
                                        {item.section}
                                      </p>
                                      <p className="text-sm text-text">
                                        {item.item}
                                      </p>
                                    </div>
                                    <span
                                      className={cn(
                                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ml-2',
                                        checklistStatusStyles[
                                          item.status
                                        ] ?? 'bg-gray-100 text-gray-600',
                                      )}
                                    >
                                      {getChecklistStatusLabel(item.status)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        <div className="space-y-2">
                          <p className="text-sm font-medium text-text">
                            Assinatura Digital
                          </p>
                          <div className="border-2 border-dashed border-border rounded-xl p-2">
                            <canvas
                              ref={signatureRef}
                              width={500}
                              height={150}
                              className="w-full h-[150px] rounded-lg bg-white cursor-crosshair touch-none"
                              onMouseDown={startDrawing}
                              onMouseMove={draw}
                              onMouseUp={() => {
                                stopDrawing()
                                saveSignature()
                              }}
                              onMouseLeave={() => {
                                stopDrawing()
                                saveSignature()
                              }}
                              onTouchStart={startDrawing}
                              onTouchMove={draw}
                              onTouchEnd={() => {
                                stopDrawing()
                                saveSignature()
                              }}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearSignature}
                            >
                              Limpar
                            </Button>
                            {approvalSignature && (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Assinatura capturada
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-text">
                            Observações
                          </label>
                          <textarea
                            value={approvalObservations}
                            onChange={(e) =>
                              setApprovalObservations(e.target.value)
                            }
                            placeholder="Alguma observação sobre o serviço?"
                            className="input-base min-h-[80px] resize-none w-full"
                          />
                        </div>

                        <Button
                          className="w-full"
                          size="lg"
                          isLoading={approving}
                          onClick={handleApprove}
                        >
                          <ThumbsUp className="h-5 w-5" />
                          Aprovar Serviço
                        </Button>
                      </>
                    )}
                  </div>
                ) : selectedOrder.clientSignature ||
                  selectedOrder.status === OrderStatus.CANCELLED ? (
                  <div className="p-4 rounded-xl bg-surface-2 text-center">
                    <p className="text-sm text-text-secondary">
                      {selectedOrder.clientSignature
                        ? 'Esta ordem já foi aprovada.'
                        : 'Esta ordem foi cancelada.'}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-surface-2 text-center">
                    <p className="text-sm text-text-secondary">
                      A aprovação estará disponível quando o serviço for
                      finalizado.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

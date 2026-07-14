import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Plus,
  Eye,
  Edit3,
  Camera,
  ClipboardCheck,
  ChevronRight,
  User,
  Car,
  DollarSign,
  Wrench,
  Printer,
  Calendar,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { ordersApi } from '@/api/orders'
import { appointmentsApi } from '@/api/appointments'
import { usersApi } from '@/api/users'
import { servicesApi } from '@/api/services'
import { checklistsApi } from '@/api/checklists'
import {
  ServiceOrder,
  OrderStatus,
  OrderFilters,
  ChecklistItem,
  ChecklistStatus,
  ChecklistItemUpdate,
  Appointment,
  AppointmentStatus,
  Service,
} from '@/types'
import type { User as UserType } from '@/types'
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  getOrderStatusLabel,
} from '@/utils/formatters'
import { printOrder } from '@/utils/printOrder'

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: OrderStatus.OPEN, label: 'Aberta' },
  { value: OrderStatus.IN_PROGRESS, label: 'Em Andamento' },
  { value: OrderStatus.FINISHED, label: 'Finalizado' },
  { value: OrderStatus.CANCELLED, label: 'Cancelado' },
]

const checklistStatusOptions = [
  { value: ChecklistStatus.OK, label: 'OK' },
  { value: ChecklistStatus.ATTENTION, label: 'Atenção' },
  { value: ChecklistStatus.DAMAGED, label: 'Danificado' },
  { value: ChecklistStatus.NOT_CHECKED, label: 'Não Verificado' },
]

const orderDetailTabs = [
  { id: 'info', label: 'Informações', icon: <ClipboardCheck className="h-4 w-4" /> },
  { id: 'services', label: 'Serviços', icon: <ChevronRight className="h-4 w-4" /> },
  { id: 'checklist', label: 'Checklist', icon: <ClipboardCheck className="h-4 w-4" /> },
  { id: 'photos', label: 'Fotos', icon: <Camera className="h-4 w-4" /> },
  { id: 'payment', label: 'Pagamento', icon: <DollarSign className="h-4 w-4" /> },
]

const orderStatusStyles: Record<string, string> = {
  [OrderStatus.OPEN]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  [OrderStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  [OrderStatus.FINISHED]: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  [OrderStatus.CANCELLED]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export function Orders() {
  const { toast } = useToast()
  const { user: currentUser } = useAuth()
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null)
  const [detailTab, setDetailTab] = useState('info')
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editOrder, setEditOrder] = useState<ServiceOrder | null>(null)
  const [editVehicleServices, setEditVehicleServices] = useState<Record<number, string[]>>({})
  const [editVehiclePrices, setEditVehiclePrices] = useState<Record<number, Record<string, number>>>({})
  const [editVehicles, setEditVehicles] = useState<Array<{ vehicleId: string; notes: string; orderVehicleId?: string }>>([])
  const [editAppointments, setEditAppointments] = useState<Appointment[]>([])
  const [clients, setClients] = useState<UserType[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [createForm, setCreateForm] = useState({
    clientId: '',
    vehicles: [] as Array<{ vehicleId: string; notes: string }>,
    serviceIds: [] as string[],
    appointmentId: '',
  })
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      const filters: OrderFilters = {}
      if (filterStatus) filters.status = filterStatus as OrderStatus
      if (startDate) filters.startDate = startDate
      if (endDate) filters.endDate = endDate
      const data = await ordersApi.getAll(filters)
      setOrders(data)
    } catch {
      toast('error', 'Erro ao carregar ordens de serviço')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, startDate, endDate, toast])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [appointmentServiceIds, setAppointmentServiceIds] = useState<string[]>([])
  const [aptServices, setAptServices] = useState<Service[]>([])
  const [usedServiceIds, setUsedServiceIds] = useState<Set<string>>(new Set())
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!showCreateModal && !showEditModal) return
    const loadFormData = async () => {
      try {
        const [clientsData, servicesData] = await Promise.all([
          showCreateModal ? usersApi.getAll({ role: 'client' }) : Promise.resolve(null),
          servicesApi.getAll({ page_size: 100, isActive: true }),
        ])
        if (clientsData) setClients(clientsData.items)
        setServices(servicesData.items)
      } catch {
        toast('error', 'Erro ao carregar dados do formulário')
      }
    }
    loadFormData()
  }, [showCreateModal, showEditModal, toast])

  useEffect(() => {
    if (!createForm.clientId || !showCreateModal) {
      setAppointments([])
      return
    }
    const loadData = async () => {
      try {
        const [appts, clientOrders] = await Promise.all([
          appointmentsApi.getAll({
            clientId: createForm.clientId,
            status: AppointmentStatus.FINISHED,
          }),
          ordersApi.getAll({ clientId: createForm.clientId }),
        ])
        const used = new Set(clientOrders.filter((o) => o.appointmentId).map((o) => o.appointmentId!))
        setAppointments(appts.filter((a) => !used.has(a.id)))
      } catch {
        toast('error', 'Erro ao carregar agendamentos do cliente')
      }
    }
    loadData()
  }, [createForm.clientId, showCreateModal, toast])

  useEffect(() => {
    setCreateForm((prev) => {
      if (prev.appointmentId) return prev
      const first = prev.vehicles[0]
      if (!first?.vehicleId) return prev
      const match = appointments.find((a) => a.vehicleId === first.vehicleId)
      if (!match) return prev
      return { ...prev, appointmentId: match.id, serviceIds: [] }
    })
  }, [appointments])

  const availableAppts = useMemo(
    () => appointments.filter((a) => a.id !== createForm.appointmentId),
    [appointments, createForm.appointmentId],
  )

  useEffect(() => {
    if (!createForm.appointmentId) {
      setAppointmentServiceIds([])
      setAptServices([])
      setUsedServiceIds(new Set())
      setServicePrices({})
      return
    }
    const loadAppointmentServices = async () => {
      try {
        const [apt, existingOrders] = await Promise.all([
          appointmentsApi.getById(createForm.appointmentId),
          ordersApi.getAll({ appointmentId: createForm.appointmentId }),
        ])
        const used = new Set<string>()
        for (const order of existingOrders) {
          for (const os of order.services) {
            used.add(os.serviceId || os.id)
          }
        }
        setUsedServiceIds(used)
        setAppointmentServiceIds(apt.services.map((s) => s.id))
        setAptServices(apt.services)
        const prices: Record<string, number> = {}
        apt.services.forEach((s) => { prices[s.id] = s.price })
        setServicePrices(prices)
        setCreateForm((prev) => ({
          ...prev,
          serviceIds: apt.services.filter((s) => !used.has(s.id)).map((s) => s.id),
        }))
      } catch {
        toast('error', 'Erro ao carregar serviços do agendamento')
      }
    }
    loadAppointmentServices()
  }, [createForm.appointmentId, toast])

  const selectedServicesTotal = useMemo(
    () => createForm.serviceIds.reduce((acc, id) => acc + (servicePrices[id] ?? 0), 0),
    [createForm.serviceIds, servicePrices],
  )

  const toggleCreateService = (serviceId: string) => {
    if (usedServiceIds.has(serviceId)) return
    setCreateForm((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }))
  }

  const updateServicePrice = (serviceId: string, price: number) => {
    setServicePrices((prev) => ({ ...prev, [serviceId]: price }))
  }

  const addVehicle = () => {
    setCreateForm((prev) => ({
      ...prev,
      vehicles: [...prev.vehicles, { vehicleId: '', notes: '' }],
    }))
  }

  const removeVehicle = (index: number) => {
    setCreateForm((prev) => {
      const updated = prev.vehicles.filter((_, i) => i !== index)
      if (index === 0) {
        return { ...prev, vehicles: updated, appointmentId: '', serviceIds: [] }
      }
      return { ...prev, vehicles: updated }
    })
  }

  const updateVehicle = (index: number, field: 'vehicleId' | 'notes', value: string) => {
    setCreateForm((prev) => {
      const updated = [...prev.vehicles]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, vehicles: updated }
    })
    if (field === 'vehicleId' && value) {
      if (index === 0) {
        const match = appointments.find((a) => a.vehicleId === value)
        if (match) {
          setCreateForm((prev) => ({
            ...prev,
            appointmentId: match.id,
            serviceIds: [],
          }))
        }
      }
    } else if (field === 'vehicleId' && !value && index === 0) {
      setCreateForm((prev) => ({
        ...prev,
        appointmentId: '',
        serviceIds: [],
      }))
    }
  }

  const resetCreateForm = () => {
    setCreateForm({ clientId: '', vehicles: [], serviceIds: [], appointmentId: '' })
    setAppointments([])
    setAppointmentServiceIds([])
    setAptServices([])
    setUsedServiceIds(new Set())
    setServicePrices({})
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return
    if (!createForm.clientId || createForm.vehicles.length === 0 || createForm.vehicles.some((v) => !v.vehicleId)) {
      toast('error', 'Selecione o cliente e pelo menos um veículo')
      return
    }
    if (createForm.serviceIds.length === 0) {
      toast('error', 'Selecione pelo menos um serviço')
      return
    }
    try {
      setSubmitting(true)
      const payload: any = {
        client_id: createForm.clientId,
        vehicles: createForm.vehicles.map((v) => ({
          vehicle_id: v.vehicleId,
          notes: v.notes || undefined,
        })),
        responsible_id: currentUser.id,
        services: createForm.serviceIds.map((sid) => ({
          service_id: sid,
          price_at_time: servicePrices[sid] ?? services.find(s => s.id === sid)?.price ?? 0,
          quantity: 1,
        })),
      }
      if (createForm.appointmentId) {
        payload.appointment_id = createForm.appointmentId
      }
      await ordersApi.create(payload)
      toast('success', 'Ordem de serviço criada com sucesso')
      setShowCreateModal(false)
      resetCreateForm()
      fetchOrders()
    } catch {
      toast('error', 'Erro ao criar ordem de serviço')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = async (order: ServiceOrder) => {
    setEditOrder(order)
    const vehicles = order.vehicles.map((v) => ({
      vehicleId: v.vehicleId,
      notes: v.notes || '',
      orderVehicleId: v.id,
    }))
    setEditVehicles(vehicles)
    const initialServices: Record<number, string[]> = {}
    const initialPrices: Record<number, Record<string, number>> = {}
    const allServiceIds = order.services.map((s) => s.serviceId)
    const allPrices: Record<string, number> = {}
    order.services.forEach((s) => { allPrices[s.serviceId] = s.price })
    order.vehicles.forEach((_, i) => {
      initialServices[i] = [...allServiceIds]
      initialPrices[i] = { ...allPrices }
    })
    setEditVehicleServices(initialServices)
    setEditVehiclePrices(initialPrices)
    try {
      const [appts, clientOrders] = await Promise.all([
        appointmentsApi.getAll({
          clientId: order.clientId,
          status: AppointmentStatus.FINISHED,
        }),
        ordersApi.getAll({ clientId: order.clientId }),
      ])
      const used = new Set(clientOrders.filter((o) => o.appointmentId && o.id !== order.id).map((o) => o.appointmentId!))
      setEditAppointments(appts.filter((a) => !used.has(a.id)))
    } catch {
      toast('error', 'Erro ao carregar agendamentos')
    }
    setShowEditModal(true)
  }

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editOrder) return
    if (editVehicles.length === 0 || editVehicles.some((v) => !v.vehicleId)) {
      toast('error', 'Adicione pelo menos um veículo')
      return
    }
    const hasAnyService = Object.values(editVehicleServices).some((ids) => ids.length > 0)
    if (!hasAnyService) {
      toast('error', 'Selecione pelo menos um serviço em algum veículo')
      return
    }
    try {
      setSubmitting(true)
      const seen = new Set<string>()
      const srvPayload: any[] = []
      Object.entries(editVehicleServices).forEach(([idxStr, sids]) => {
        const idx = Number(idxStr)
        sids.forEach((sid) => {
          const key = `${sid}|${idx}`
          if (!seen.has(key)) {
            seen.add(key)
            srvPayload.push({
              service_id: sid,
              price_at_time: editVehiclePrices[idx]?.[sid] ?? services.find(s => s.id === sid)?.price ?? 0,
              quantity: 1,
              vehicle_idx: idx,
            })
          }
        })
      })
      const payload: any = {
      vehicles: editVehicles.map((v) => ({
        vehicle_id: v.vehicleId,
        notes: v.notes || undefined,
      })),
      services: srvPayload,
      }
      const firstVeh = editVehicles[0]
      if (firstVeh?.vehicleId) {
        const appt = editAppointments.find((a) => a.vehicleId === firstVeh.vehicleId)
        if (appt) payload.appointment_id = appt.id
      }
      const updated = await ordersApi.update(editOrder.id, payload)
      setSelectedOrder(updated)
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
      toast('success', 'Ordem atualizada com sucesso')
      setShowEditModal(false)
      setEditOrder(null)
      setEditVehicles([])
      setEditAppointments([])
      setEditVehicleServices({})
      setEditVehiclePrices({})
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Erro ao atualizar ordem'
      toast('error', msg)
    } finally {
      setSubmitting(false)
    }
  }

  const editAvailableAppts = useMemo(() => {
    if (editVehicles.length === 0) return editAppointments
    const firstVehicle = editVehicles[0]
    if (!firstVehicle?.vehicleId) return editAppointments
    const linkedAppt = editAppointments.find((a) => a.vehicleId === firstVehicle.vehicleId)
    return linkedAppt
      ? editAppointments.filter((a) => a.id !== linkedAppt.id)
      : editAppointments
  }, [editAppointments, editVehicles])

  const addEditVehicle = () => {
    const newIndex = editVehicles.length
    setEditVehicles((prev) => [...prev, { vehicleId: '', notes: '' }])
    setEditVehicleServices((prev) => ({ ...prev, [newIndex]: [] }))
    setEditVehiclePrices((prev) => ({ ...prev, [newIndex]: {} }))
  }

  const removeEditVehicle = (index: number) => {
    setEditVehicles((prev) => prev.filter((_, i) => i !== index))
    setEditVehicleServices((prev) => {
      const next: Record<number, string[]> = {}
      const entries = Object.entries(prev).filter(([k]) => Number(k) !== index)
      entries.forEach(([k, v], i) => { next[i] = v })
      return next
    })
    setEditVehiclePrices((prev) => {
      const next: Record<number, Record<string, number>> = {}
      const entries = Object.entries(prev).filter(([k]) => Number(k) !== index)
      entries.forEach(([k, v], i) => { next[i] = v })
      return next
    })
  }

  const updateEditVehicle = (index: number, field: 'vehicleId' | 'notes', value: string) => {
    setEditVehicles((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
    if (field === 'vehicleId' && value) {
      const match = editAppointments.find((a) => a.vehicleId === value)
      if (!match) return
      appointmentsApi.getById(match.id).then((apt) => {
        const newServiceIds = apt.services.map((s) => s.id)
        const newPrices: Record<string, number> = {}
        apt.services.forEach((s) => { newPrices[s.id] = s.price })
        setEditVehicleServices((prev) => ({
          ...prev,
          [index]: index === 0 ? newServiceIds : [...new Set([...(prev[index] || []), ...newServiceIds])],
        }))
        setEditVehiclePrices((prev) => ({
          ...prev,
          [index]: index === 0 ? newPrices : { ...(prev[index] || {}), ...newPrices },
        }))
      }).catch(() => {})
    }
  }

  const loadChecklist = useCallback(async (orderId: string) => {
    try {
      const data = await checklistsApi.getByOrderId(orderId)
      setChecklist(data)
    } catch {
      toast('error', 'Erro ao carregar checklist')
    }
  }, [toast])

  const handleViewOrder = async (order: ServiceOrder) => {
    try {
      const full = await ordersApi.getById(order.id)
      setSelectedOrder(full)
    } catch {
      setSelectedOrder(order)
    }
    setDetailTab('info')
    setShowDetailModal(true)
    await loadChecklist(order.id)
  }

  const handleStatusChange = async (status: OrderStatus) => {
    if (!selectedOrder) return
    try {
      setSubmitting(true)
      const updated = await ordersApi.updateStatus(selectedOrder.id, status)
      setSelectedOrder(updated)
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
      toast('success', `Status atualizado para ${getOrderStatusLabel(status)}`)
    } catch {
      toast('error', 'Erro ao atualizar status')
    } finally {
      setSubmitting(false)
    }
  }

  const handleChecklistUpdate = async (item: ChecklistItem, newStatus: ChecklistStatus) => {
    if (!selectedOrder) return
    try {
      const update: ChecklistItemUpdate = { status: newStatus }
      if (newStatus === ChecklistStatus.ATTENTION || newStatus === ChecklistStatus.DAMAGED) {
        const notes = prompt(`Observações para "${item.item}":`)
        if (notes) update.notes = notes
      }
      const updatedItem = await checklistsApi.updateItem(selectedOrder.id, item.id, update)
      setChecklist((prev) => prev.map((ci) => (ci.id === updatedItem.id ? updatedItem : ci)))
      toast('success', 'Checklist atualizado')
    } catch {
      toast('error', 'Erro ao atualizar checklist')
    }
  }

  const getStatusActions = (status: OrderStatus) => {
    const actions: { status: OrderStatus; label: string; color: string }[] = []
    switch (status) {
      case OrderStatus.OPEN:
        actions.push({ status: OrderStatus.IN_PROGRESS, label: 'Iniciar', color: 'bg-yellow-500 hover:bg-yellow-600' })
        actions.push({ status: OrderStatus.CANCELLED, label: 'Cancelar', color: 'bg-red-500 hover:bg-red-600' })
        break
      case OrderStatus.IN_PROGRESS:
        actions.push({ status: OrderStatus.FINISHED, label: 'Finalizar', color: 'bg-green-500 hover:bg-green-600' })
        actions.push({ status: OrderStatus.CANCELLED, label: 'Cancelar', color: 'bg-red-500 hover:bg-red-600' })
        break
    }
    return actions
  }

  const columns: Column<ServiceOrder>[] = useMemo(
    () => [
      {
        key: 'orderNumber',
        header: 'Nº Ordem',
        sortable: true,
        render: (item) => (
          <span className="font-medium text-text">{item.orderNumber}</span>
        ),
      },
      {
        key: 'client',
        header: 'Cliente',
        render: (item) => (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-text-secondary" />
            <span>{item.client?.name || '—'}</span>
          </div>
        ),
      },
      {
        key: 'vehicle',
        header: 'Veículo',
        render: (item) => (
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-text-secondary" />
            <span>
              {item.vehicle
                ? `${item.vehicle.brand} ${item.vehicle.model}`
                : '—'}
            </span>
          </div>
        ),
      },
      {
        key: 'totalValue',
        header: 'Total',
        sortable: true,
        render: (item) => (
          <span className="font-medium">{formatCurrency(item.totalValue)}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (item) => (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${orderStatusStyles[item.status]}`}>
            {getOrderStatusLabel(item.status)}
          </span>
        ),
      },
      {
        key: 'createdAt',
        header: 'Data',
        sortable: true,
        render: (item) => <span className="text-sm">{formatDate(item.createdAt)}</span>,
      },
      {
        key: 'actions',
        header: 'Ações',
        render: (item) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleViewOrder(item)
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Ordens de Serviço</h1>
          <p className="text-text-secondary mt-1">Gerencie as ordens de serviço</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Nova Ordem
        </Button>
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <Select
              label="Status"
              options={statusOptions}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="min-w-[180px]"
            />
            <Input
              label="Data Início"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Data Fim"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <Button variant="secondary" onClick={() => { setFilterStatus(''); setStartDate(''); setEndDate('') }}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={orders}
            keyExtractor={(item) => String(item.id)}
            isLoading={loading}
            emptyMessage="Nenhuma ordem de serviço encontrada"
            onRowClick={(item) => handleViewOrder(item as unknown as ServiceOrder)}
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedOrder(null); setChecklist([]) }}
        title={`Ordem #${selectedOrder?.orderNumber || ''}`}
        size="xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${orderStatusStyles[selectedOrder.status]}`}>
                {getOrderStatusLabel(selectedOrder.status)}
              </span>
              <span className="text-sm text-text-secondary">
                Criada em {formatDateTime(selectedOrder.createdAt)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto no-print"
                onClick={async () => {
                  let order = selectedOrder
                  if (order && (!order.vehicles || order.vehicles.length === 0)) {
                    try { order = await ordersApi.getById(order.id) } catch {}
                  }
                  printOrder(order)
                }}
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
              {(selectedOrder.status === OrderStatus.OPEN || selectedOrder.status === OrderStatus.IN_PROGRESS) && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="no-print"
                  onClick={async () => {
                    if (!selectedOrder) return
                    setShowDetailModal(false)
                    setSelectedOrder(null)
                    try {
                      const full = await ordersApi.getById(selectedOrder.id)
                      openEditModal(full)
                    } catch {
                      toast('error', 'Erro ao carregar detalhes da ordem')
                    }
                  }}
                >
                  <Edit3 className="h-4 w-4" />
                  Editar
                </Button>
              )}
            </div>

            <Tabs tabs={orderDetailTabs} activeTab={detailTab} onChange={setDetailTab} />

            {detailTab === 'info' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-secondary uppercase tracking-wider">Cliente</label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-text-secondary" />
                    <p className="text-text font-medium">{selectedOrder.client?.name || '—'}</p>
                  </div>
                  <p className="text-sm text-text-secondary mt-0.5">{selectedOrder.client?.email}</p>
                  <p className="text-sm text-text-secondary">{selectedOrder.client?.phone}</p>
                </div>
                <div>
                  <label className="text-xs text-text-secondary uppercase tracking-wider">Veículo(s)</label>
                  {selectedOrder.vehicles && selectedOrder.vehicles.length > 0 ? (
                    selectedOrder.vehicles.map((v, i) => (
                      <div key={v.id} className="mt-1">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-text-secondary shrink-0" />
                          <p className="text-text font-medium">
                            {v.vehicle ? `${v.vehicle.brand} ${v.vehicle.model}` : '—'}
                          </p>
                        </div>
                        <p className="text-sm text-text-secondary ml-6">{v.vehicle?.plate} — {v.vehicle?.year}</p>
                        {v.notes && (
                          <p className="text-sm text-text-secondary ml-6 italic">Obs: {v.notes}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mt-1">
                        <Car className="h-4 w-4 text-text-secondary shrink-0" />
                        <p className="text-text font-medium">
                          {selectedOrder.vehicle
                            ? `${selectedOrder.vehicle.brand} ${selectedOrder.vehicle.model}`
                            : '—'}
                        </p>
                      </div>
                      <p className="text-sm text-text-secondary mt-0.5">
                        {selectedOrder.vehicle?.plate} — {selectedOrder.vehicle?.year}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-text-secondary uppercase tracking-wider">Total</label>
                  <p className="text-lg font-bold text-text mt-1">{formatCurrency(selectedOrder.totalValue)}</p>
                </div>
                <div className="col-span-full">
                  <label className="text-xs text-text-secondary uppercase tracking-wider">Timeline</label>
                  <div className="mt-2 space-y-2">
                    {selectedOrder.createdAt && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-text-secondary">Criada — {formatDateTime(selectedOrder.createdAt)}</span>
                      </div>
                    )}
                    {selectedOrder.status === OrderStatus.IN_PROGRESS && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        <span className="text-text-secondary">Em andamento</span>
                      </div>
                    )}
                    {selectedOrder.status === OrderStatus.FINISHED && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-text-secondary">Finalizada</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'services' && (
              <div className="space-y-3">
                {selectedOrder.services.length === 0 ? (
                  <EmptyState title="Nenhum serviço" />
                ) : (
                  selectedOrder.services.map((os) => (
                    <div key={os.serviceId || os.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-2">
                      <div>
                        <p className="text-sm font-medium text-text">{os.service?.name || 'Serviço'}</p>
                      </div>
                      <span className="text-sm font-medium text-text">{formatCurrency(os.price)}</span>
                    </div>
                  ))
                )}
                <div className="flex justify-between p-3 border-t border-border">
                  <span className="font-semibold text-text">Total</span>
                  <span className="font-bold text-text">{formatCurrency(selectedOrder.totalValue)}</span>
                </div>
              </div>
            )}

            {detailTab === 'checklist' && (
              <div className="space-y-4">
                {checklist.length === 0 ? (
                  <EmptyState title="Checklist vazio" description="Nenhum item no checklist." />
                ) : (
                  checklist.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl bg-surface-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-text-secondary uppercase">{item.section}</p>
                          <p className="text-sm font-medium text-text mt-0.5">{item.item}</p>
                          {item.notes && <p className="text-xs text-text-secondary mt-1">{item.notes}</p>}
                        </div>
                        <Select
                          options={checklistStatusOptions}
                          value={item.status}
                          onChange={(e) => handleChecklistUpdate(item, e.target.value as ChecklistStatus)}
                          className="min-w-[140px]"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {detailTab === 'photos' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-text">Antes</label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {selectedOrder.photos?.filter((p) => p.type === 'before').length ? (
                      selectedOrder.photos.filter((p) => p.type === 'before').map((photo) => (
                        <div key={photo.id} className="aspect-video rounded-xl bg-surface-2 overflow-hidden">
                          <img src={photo.url} alt="Antes" className="w-full h-full object-cover" />
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3">
                        <EmptyState title="Sem fotos" description="Nenhuma foto do antes." />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-text">Depois</label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {selectedOrder.photos?.filter((p) => p.type === 'after').length ? (
                      selectedOrder.photos.filter((p) => p.type === 'after').map((photo) => (
                        <div key={photo.id} className="aspect-video rounded-xl bg-surface-2 overflow-hidden">
                          <img src={photo.url} alt="Depois" className="w-full h-full object-cover" />
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3">
                        <EmptyState title="Sem fotos" description="Nenhuma foto do depois." />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'payment' && (
              <div className="space-y-4">
                {selectedOrder.payment ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-text-secondary uppercase tracking-wider">Valor</label>
                        <p className="text-lg font-bold text-text mt-1">{formatCurrency(selectedOrder.payment.amount)}</p>
                      </div>
                      <div>
                        <label className="text-xs text-text-secondary uppercase tracking-wider">Método</label>
                        <p className="text-text font-medium mt-1">{selectedOrder.payment.method || '—'}</p>
                      </div>
                      <div>
                        <label className="text-xs text-text-secondary uppercase tracking-wider">Status</label>
                        <p className="text-text font-medium mt-1">{selectedOrder.payment.status}</p>
                      </div>
                      <div>
                        <label className="text-xs text-text-secondary uppercase tracking-wider">Vencimento</label>
                        <p className="text-text font-medium mt-1">
                          {selectedOrder.payment.dueDate ? formatDate(selectedOrder.payment.dueDate) : '—'}
                        </p>
                      </div>
                    </div>
                    {selectedOrder.payment.paidAt && (
                      <p className="text-sm text-green-500">Pago em {formatDateTime(selectedOrder.payment.paidAt)}</p>
                    )}
                  </>
                ) : (
                  <EmptyState title="Sem pagamento" description="Nenhum pagamento registrado para esta ordem." />
                )}
              </div>
            )}

            {getStatusActions(selectedOrder.status).length > 0 && (
              <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                {getStatusActions(selectedOrder.status).map((action) => (
                  <Button key={action.status} className={action.color} onClick={() => handleStatusChange(action.status)} isLoading={submitting}>
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetCreateForm() }}
        title="Nova Ordem de Serviço"
        size="lg"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <Select
            label="Cliente"
            placeholder="Selecione um cliente"
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            value={createForm.clientId}
            onChange={(e) => setCreateForm({
              ...createForm,
              clientId: e.target.value,
              appointmentId: '',
              vehicles: [],
              serviceIds: [],
            })}
          />

          {!createForm.clientId ? (
            <div className="p-3 rounded-xl bg-surface-2 text-sm text-text-secondary flex items-center gap-2">
              <User className="h-4 w-4 shrink-0" />
              Selecione um cliente primeiro
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text">Veículos</label>
              {createForm.clientId && appointments.length > 0 && (
                <Button type="button" variant="secondary" size="sm" onClick={addVehicle}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                </Button>
              )}
            </div>
            {createForm.vehicles.length === 0 ? (
              <div className="p-3 rounded-xl bg-surface-2 text-sm text-text-secondary flex items-center gap-2">
                <Car className="h-4 w-4 shrink-0" />
                {createForm.clientId
                  ? (appointments.length === 0
                    ? 'Nenhum agendamento disponível para este cliente'
                    : 'Clique em "Adicionar" para incluir um veículo')
                  : 'Selecione um cliente primeiro'}
              </div>
            ) : (
              <div className="space-y-3">
                {createForm.vehicles.map((v, index) => (
                  <div key={index} className="flex flex-col gap-2 p-3 border border-border rounded-xl bg-surface">
                    <div className="flex items-center gap-2">
                      <Select
                        label={`Veículo ${index + 1}`}
                        placeholder={appointments.length > 0 ? 'Selecione um agendamento' : 'Nenhum agendamento disponível'}
                        options={(index === 0 ? appointments : availableAppts).map((a) => ({
                          value: a.vehicleId,
                          label: `${a.vehicle?.brand || ''} ${a.vehicle?.model || ''} - ${a.vehicle?.plate || ''} (${new Date(a.scheduledAt).toLocaleDateString('pt-BR')})`,
                        }))}
                        value={v.vehicleId}
                        onChange={(e) => updateVehicle(index, 'vehicleId', e.target.value)}
                        className="flex-1"
                      />
                      <Button type="button" variant="secondary" size="sm" onClick={() => removeVehicle(index)} className="mt-5 shrink-0">
                        Remover
                      </Button>
                    </div>
                    <textarea
                      placeholder="Observações deste veículo (opcional)"
                      value={v.notes}
                      onChange={(e) => updateVehicle(index, 'notes', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text">
              Serviços
              {createForm.appointmentId && (
                <span className="text-xs text-text-secondary ml-2">
                  (serviços do agendamento — clique no valor para editar)
                </span>
              )}
            </label>
            {createForm.appointmentId && appointmentServiceIds.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
                <span className="ml-2 text-sm text-text-secondary">Carregando serviços...</span>
              </div>
            ) : createForm.appointmentId ? (
              <div className="space-y-2 max-h-60 overflow-y-auto border border-border rounded-xl p-2">
                {aptServices.map((s) => {
                  const isUsed = usedServiceIds.has(s.id)
                  if (isUsed) return null
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2"
                    >
                      <input
                        type="checkbox"
                        checked={createForm.serviceIds.includes(s.id)}
                        onChange={() => toggleCreateService(s.id)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <Wrench className="h-4 w-4 shrink-0 text-text-secondary" />
                      <span className="flex-1 text-sm text-text">{s.name}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={servicePrices[s.id] ?? s.price}
                        onChange={(e) => updateServicePrice(s.id, parseFloat(e.target.value) || 0)}
                        className="w-28 px-2 py-1 text-sm text-right border border-border rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-sm text-text-secondary w-12 text-right">{s.estimatedMinutes}min</span>
                    </div>
                  )
                })}
                {aptServices.filter((s) => !usedServiceIds.has(s.id)).length === 0 && (
                  <p className="text-sm text-text-secondary text-center py-4">
                    Todos os serviços deste agendamento já estão em outras ordens de serviço
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-surface-2 text-sm text-text-secondary text-center">
                {createForm.vehicles.some((v) => v.vehicleId && !appointments.find((a) => a.vehicleId === v.vehicleId))
                  ? 'Nenhum agendamento encontrado para o veículo selecionado'
                  : 'Selecione um veículo com agendamento para ver os serviços'}
              </div>
            )}
            {createForm.serviceIds.length > 0 && (
              <p className="text-sm text-text-secondary text-right font-medium">
                Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedServicesTotal)}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowCreateModal(false); resetCreateForm() }}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={submitting}>
              Criar Ordem
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditOrder(null); setEditVehicles([]); setEditAppointments([]); setEditVehicleServices({}); setEditVehiclePrices({}) }}
        title={`Editar OS #${editOrder?.orderNumber || ''}`}
        size="lg"
      >
        <form onSubmit={handleUpdateOrder} className="space-y-4">
          {editOrder && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-secondary uppercase tracking-wider">Cliente</label>
                  <p className="text-text font-medium mt-1">{editOrder.client?.name || '—'}</p>
                  <p className="text-sm text-text-secondary">{editOrder.client?.email}</p>
                </div>
                <div>
                  <label className="text-xs text-text-secondary uppercase tracking-wider">Vinculado ao Agendamento</label>
                  <p className="text-text font-medium mt-1">
                    {editOrder.appointmentId ? `OS vinculada ao agendamento` : 'Sem agendamento'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-text">Veículos</label>
                  {editAppointments.length > 0 && (
                    <Button type="button" variant="secondary" size="sm" onClick={addEditVehicle}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Veículo
                    </Button>
                  )}
                </div>
                {editVehicles.length === 0 ? (
                  <p className="text-sm text-text-secondary">Nenhum veículo</p>
                ) : (
                  <div className="space-y-4">
                    {editVehicles.map((v, i) => (
                      <div key={i} className="p-4 border border-border rounded-xl bg-surface space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-text">Veículo {i + 1}</span>
                          {i > 0 && (
                            <Button type="button" variant="secondary" size="sm" onClick={() => removeEditVehicle(i)}>
                              Remover
                            </Button>
                          )}
                        </div>
                        <Select
                          label="Carro"
                          placeholder={editAppointments.length > 0 ? 'Selecione um agendamento' : 'Nenhum agendamento disponível'}
                          options={(i === 0 ? editAppointments : editAvailableAppts).map((a) => ({
                            value: a.vehicleId,
                            label: `${a.vehicle?.brand || ''} ${a.vehicle?.model || ''} - ${a.vehicle?.plate || ''} (${new Date(a.scheduledAt).toLocaleDateString('pt-BR')})`,
                          }))}
                          value={v.vehicleId}
                          onChange={(e) => updateEditVehicle(i, 'vehicleId', e.target.value)}
                        />
                        {i === 0 && editOrder.appointmentId && (
                          <span className="text-xs text-primary">Agendamento vinculado</span>
                        )}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-text">Serviços</label>
                          <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
                            {services.map((s) => {
                              const checked = (editVehicleServices[i] || []).includes(s.id)
                              return (
                                <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      setEditVehicleServices((prev) => {
                                        const current = prev[i] || []
                                        return {
                                          ...prev,
                                          [i]: checked ? current.filter((id) => id !== s.id) : [...current, s.id],
                                        }
                                      })
                                    }}
                                    className="rounded border-border text-primary focus:ring-primary"
                                  />
                                  <Wrench className="h-4 w-4 shrink-0 text-text-secondary" />
                                  <span className="flex-1 text-sm text-text">{s.name}</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={(editVehiclePrices[i] || {})[s.id] ?? s.price}
                                    onChange={(e) =>
                                      setEditVehiclePrices((prev) => ({
                                        ...prev,
                                        [i]: { ...(prev[i] || {}), [s.id]: parseFloat(e.target.value) || 0 },
                                      }))
                                    }
                                    className="w-28 px-2 py-1 text-sm text-right border border-border rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                  <span className="text-sm text-text-secondary w-12 text-right">{s.estimatedMinutes}min</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-text mb-1">Observações</label>
                          <textarea
                            placeholder="Observações deste veículo (opcional)"
                            value={v.notes}
                            onChange={(e) => updateEditVehicle(i, 'notes', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                            rows={2}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-3 space-y-1">
                {editVehicles.map((_, i) => {
                  const ids = editVehicleServices[i] || []
                  const prices = editVehiclePrices[i] || {}
                  const subtotal = ids.reduce((acc, id) => acc + (prices[id] ?? 0), 0)
                  if (subtotal === 0) return null
                  return (
                    <div key={i} className="flex justify-between text-sm text-text-secondary">
                      <span>Veículo {i + 1}</span>
                      <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}</span>
                    </div>
                  )
                })}
                {(() => {
                  let grandTotal = 0
                  editVehicles.forEach((_, i) => {
                    const ids = editVehicleServices[i] || []
                    const prices = editVehiclePrices[i] || {}
                    grandTotal += ids.reduce((acc, id) => acc + (prices[id] ?? 0), 0)
                  })
                  if (grandTotal === 0) return null
                  return (
                    <div className="flex justify-between text-sm font-bold text-text pt-1 border-t border-border">
                      <span>Total Geral</span>
                      <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grandTotal)}</span>
                    </div>
                  )
                })()}
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowEditModal(false); setEditOrder(null); setEditVehicles([]); setEditAppointments([]); setEditVehicleServices({}); setEditVehiclePrices({}) }}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={submitting}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

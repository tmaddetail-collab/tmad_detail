import { useEffect, useState, useCallback, useMemo } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer, Views, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import {
  Plus,
  Search,
  Calendar as CalendarIcon,
  Car,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { AppointmentStatusBadge } from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'
import { appointmentsApi } from '@/api/appointments'
import { ordersApi } from '@/api/orders'
import { usersApi } from '@/api/users'
import { vehiclesApi } from '@/api/vehicles'
import { servicesApi } from '@/api/services'
import {
  Appointment,
  AppointmentStatus,
  AppointmentForm,
  CalendarEvent,
  User,
  Vehicle,
  Service,
  ServiceOrder,
} from '@/types'
import { formatDateTime, formatCurrency } from '@/utils/formatters'

const locales = { 'pt-BR': ptBR }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
})

const statusColors: Record<AppointmentStatus, string> = {
  [AppointmentStatus.SCHEDULED]: '#3B82F6',
  [AppointmentStatus.CONFIRMED]: '#6366F1',
  [AppointmentStatus.IN_PROGRESS]: '#EAB308',
  [AppointmentStatus.FINISHED]: '#22C55E',
  [AppointmentStatus.CANCELLED]: '#EF4444',
}

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: AppointmentStatus.SCHEDULED, label: 'Agendado' },
  { value: AppointmentStatus.CONFIRMED, label: 'Confirmado' },
  { value: AppointmentStatus.IN_PROGRESS, label: 'Em Andamento' },
  { value: AppointmentStatus.FINISHED, label: 'Finalizado' },
  { value: AppointmentStatus.CANCELLED, label: 'Cancelado' },
]

export function Agenda() {
  const { toast } = useToast()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>(Views.MONTH)
  const [date, setDate] = useState(new Date())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [togglingService, setTogglingService] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [linkedOrder, setLinkedOrder] = useState<ServiceOrder | null>(null)
  const [loadingOrder, setLoadingOrder] = useState(false)

  const [clients, setClients] = useState<User[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [services, setServices] = useState<Service[]>([])

  const [formData, setFormData] = useState<AppointmentForm>({
    clientId: '',
    vehicleId: '',
    serviceIds: [],
    scheduledAt: '',
    notes: '',
  })

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true)
      const data = await appointmentsApi.getAll({
        ...(filterStatus ? { status: filterStatus as AppointmentStatus } : {}),
      })
      setAppointments(data)
    } catch {
      toast('error', 'Erro ao carregar agendamentos')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, toast])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  useEffect(() => {
    const loadFormData = async () => {
      try {
        const [clientsData, vehiclesData, servicesData] = await Promise.all([
          usersApi.getAll({ role: 'client' }),
          vehiclesApi.getAll({ page_size: 100 }),
          servicesApi.getAll({ page_size: 100, isActive: true }),
        ])
        setClients(clientsData.items)
        setVehicles(vehiclesData.items)
        setServices(servicesData.items)
      } catch {
        toast('error', 'Erro ao carregar dados do formulário')
      }
    }
    loadFormData()
  }, [toast])

  const clientVehicles = useMemo(
    () => vehicles.filter((v) => v.ownerId === formData.clientId),
    [vehicles, formData.clientId],
  )

  const events: CalendarEvent[] = useMemo(
    () =>
      appointments.map((apt) => ({
        id: apt.id,
        title: `${apt.client?.name || 'Cliente'} - ${apt.vehicle ? `${apt.vehicle.brand} ${apt.vehicle.model}` : 'Veículo'}`,
        start: new Date(apt.scheduledAt),
        end: apt.estimatedEndAt ? new Date(apt.estimatedEndAt) : new Date(new Date(apt.scheduledAt).getTime() + 3600000),
        status: apt.status,
        client: apt.client?.name || '—',
        vehicle: apt.vehicle ? `${apt.vehicle.brand} ${apt.vehicle.model} (${apt.vehicle.plate})` : '—',
        resource: apt,
      })),
    [appointments],
  )

  const handleSelectEvent = async (event: CalendarEvent) => {
    if (!event.resource) return
    try {
      const [full, orders] = await Promise.all([
        appointmentsApi.getById(event.resource.id),
        ordersApi.getAll({ appointmentId: event.resource.id }),
      ])
      setSelectedAppointment(full)
      setLinkedOrder(orders.length > 0 ? orders[0] : null)
      const localDate = full.scheduledAt?.includes('T')
        ? full.scheduledAt.slice(0, 16)
        : full.scheduledAt
      setFormData({
        clientId: full.clientId,
        vehicleId: full.vehicleId,
        serviceIds: full.services.map((s) => s.id),
        scheduledAt: localDate,
        notes: full.notes || '',
      })
      setShowEditModal(true)
    } catch {
      toast('error', 'Erro ao carregar detalhes do agendamento')
    }
  }

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.clientId || !formData.vehicleId || !formData.scheduledAt || formData.serviceIds.length === 0) {
      toast('error', 'Preencha todos os campos obrigatórios')
      return
    }
    try {
      setSubmitting(true)
      await appointmentsApi.create(formData)
      toast('success', 'Agendamento criado com sucesso')
      setShowCreateModal(false)
      resetForm()
      fetchAppointments()
    } catch {
      toast('error', 'Erro ao criar agendamento')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAppointment) return
    try {
      setSubmitting(true)
      await appointmentsApi.update(selectedAppointment.id, formData)
      toast('success', 'Agendamento atualizado com sucesso')
      setShowEditModal(false)
      setSelectedAppointment(null)
      resetForm()
      fetchAppointments()
    } catch {
      toast('error', 'Erro ao atualizar agendamento')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (status: AppointmentStatus) => {
    if (!selectedAppointment) return
    try {
      setSubmitting(true)
      await appointmentsApi.updateStatus(selectedAppointment.id, status)
      toast('success', 'Status atualizado com sucesso')
      setShowEditModal(false)
      setSelectedAppointment(null)
      fetchAppointments()
    } catch {
      toast('error', 'Erro ao atualizar status')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleServiceCompletion = async (serviceId: string, completed: boolean) => {
    if (!selectedAppointment) return
    try {
      setTogglingService(serviceId)
      await appointmentsApi.toggleServiceCompletion(selectedAppointment.id, serviceId, !completed)
      setSelectedAppointment((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          services: prev.services.map((s) =>
            s.id === serviceId ? { ...s, completed: !completed } : s,
          ),
        }
      })
    } catch {
      toast('error', 'Erro ao alterar status do serviço')
    } finally {
      setTogglingService(null)
    }
  }

  const resetForm = () => {
    setFormData({ clientId: '', vehicleId: '', serviceIds: [], scheduledAt: '', notes: '' })
    setLinkedOrder(null)
  }

  const toggleService = (serviceId: string) => {
    setFormData((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }))
  }

  const selectedServicesTotal = useMemo(
    () =>
      services
        .filter((s) => formData.serviceIds.includes(s.id))
        .reduce((acc, s) => acc + s.price, 0),
    [services, formData.serviceIds],
  )

  const statusActions = selectedAppointment
    ? [
        { status: AppointmentStatus.CONFIRMED, label: 'Confirmar', color: 'bg-indigo-500 hover:bg-indigo-600', show: selectedAppointment.status === AppointmentStatus.SCHEDULED },
        { status: AppointmentStatus.IN_PROGRESS, label: 'Iniciar', color: 'bg-yellow-500 hover:bg-yellow-600', show: selectedAppointment.status === AppointmentStatus.CONFIRMED },
        { status: AppointmentStatus.FINISHED, label: 'Finalizar', color: 'bg-green-500 hover:bg-green-600', show: selectedAppointment.status === AppointmentStatus.IN_PROGRESS },
        { status: AppointmentStatus.CANCELLED, label: 'Cancelar', color: 'bg-red-500 hover:bg-red-600', show: selectedAppointment.status !== AppointmentStatus.CANCELLED && selectedAppointment.status !== AppointmentStatus.FINISHED },
      ].filter((a) => a.show)
    : []

  const createForm = (
    <form onSubmit={handleCreateAppointment} className="space-y-4">
      <Select
        label="Cliente"
        placeholder="Selecione um cliente"
        options={clients.map((c) => ({ value: c.id, label: c.name }))}
        value={formData.clientId}
        onChange={(e) => {
          setFormData({ ...formData, clientId: e.target.value, vehicleId: '' })
        }}
      />
      {formData.clientId && clientVehicles.length === 0 ? (
        <div className="p-3 rounded-xl bg-surface-2 text-sm text-text-secondary flex items-center gap-2">
          <Car className="h-4 w-4 shrink-0" />
          Cliente não possui veículos cadastrados
        </div>
      ) : (
        <Select
          label="Veículo"
          placeholder="Selecione um veículo"
          options={clientVehicles.map((v) => ({
            value: v.id,
            label: `${v.brand} ${v.model} - ${v.plate}`,
          }))}
          value={formData.vehicleId}
          onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
          disabled={!formData.clientId}
        />
      )}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text">Serviços</label>
        <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-xl p-2">
          {services.map((s) => (
            <label
              key={s.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={formData.serviceIds.includes(s.id)}
                onChange={() => toggleService(s.id)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="flex-1 text-sm text-text">{s.name}</span>
              <span className="text-sm text-text-secondary">{formatCurrency(s.price)}</span>
            </label>
          ))}
        </div>
        {formData.serviceIds.length > 0 && (
          <p className="text-sm text-text-secondary text-right">
            Total: {formatCurrency(selectedServicesTotal)}
          </p>
        )}
      </div>
      <Input
        label="Data e Hora"
        type="datetime-local"
        value={formData.scheduledAt}
        onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
      />
      <Input
        label="Observações"
        value={formData.notes || ''}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={() => { setShowCreateModal(false); resetForm() }}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={submitting}>
          Criar Agendamento
        </Button>
      </div>
    </form>
  )

  const editForm = selectedAppointment ? (
    <form onSubmit={handleUpdateAppointment} className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <AppointmentStatusBadge status={selectedAppointment.status} size="md" />
        <span className="text-sm text-text-secondary">{formatDateTime(selectedAppointment.scheduledAt)}</span>
      </div>

      <Select
        label="Cliente"
        options={clients.map((c) => ({ value: c.id, label: c.name }))}
        value={formData.clientId}
        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
      />
      {(() => {
        const selectedVehicle = clientVehicles.find((v) => v.id === formData.vehicleId)
          || (selectedAppointment?.vehicle ? { ...selectedAppointment.vehicle, year: undefined as any, color: '' } as Vehicle : null)
        return (
          <div className="space-y-2">
            {selectedVehicle ? (
              <div className="p-4 rounded-xl bg-surface-2 space-y-2">
                <label className="text-xs text-text-secondary uppercase tracking-wider">Veículo do Agendamento</label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Car className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-text">{selectedVehicle.brand} {selectedVehicle.model}</p>
                    <p className="text-xs text-text-secondary">{selectedVehicle.year ?? ''} &bull; {selectedVehicle.plate}</p>
                  </div>
                  <span className="w-3 h-3 rounded-full ml-auto shrink-0" style={{ backgroundColor: selectedVehicle.color || '#ccc' }} title={selectedVehicle.color || ''} />
                </div>
                {linkedOrder && (
                  <a href="/admin/orders" className="text-xs text-primary hover:underline inline-block">
                    OS vinculada: #{linkedOrder.orderNumber}
                  </a>
                )}
              </div>
            ) : null}
            {linkedOrder && linkedOrder.vehicles && linkedOrder.vehicles.length > 1 && (
              <div className="p-4 rounded-xl bg-surface-2 space-y-2">
                <label className="text-xs text-text-secondary uppercase tracking-wider">
                  Veículos Adicionais
                </label>
                {linkedOrder.vehicles.filter((v) => v.vehicleId !== selectedAppointment?.vehicleId).map((v) => (
                  <div key={v.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Car className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-text">{v.vehicle ? `${v.vehicle.brand} ${v.vehicle.model}` : '—'}</p>
                      <p className="text-xs text-text-secondary">{v.vehicle?.plate || '—'}</p>
                    </div>
                    {v.notes && <p className="text-xs text-text-secondary ml-auto italic">{v.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}
      {clientVehicles.length === 0 ? (
        <div className="p-3 rounded-xl bg-surface-2 text-sm text-text-secondary flex items-center gap-2">
          <Car className="h-4 w-4 shrink-0" />
          Cliente não possui veículos cadastrados
        </div>
      ) : (
        <Select
          label="Trocar Veículo"
          options={clientVehicles.map((v) => ({
            value: v.id,
            label: `${v.brand} ${v.model} - ${v.plate}`,
          }))}
          value={formData.vehicleId}
          onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
        />
      )}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text">Serviços</label>
        <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-xl p-2">
          {services.map((s) => (
            <label
              key={s.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={formData.serviceIds.includes(s.id)}
                onChange={() => toggleService(s.id)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="flex-1 text-sm text-text">{s.name}</span>
              <span className="text-sm text-text-secondary">{formatCurrency(s.price)}</span>
            </label>
          ))}
        </div>
      </div>

      {selectedAppointment.services.length > 0 && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text">Serviços Realizados</label>
          <div className="space-y-2 border border-border rounded-xl p-2">
            {selectedAppointment.services.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2"
              >
                <button
                  type="button"
                  onClick={() => handleToggleServiceCompletion(s.id, s.completed ?? false)}
                  disabled={togglingService === s.id}
                  className={`shrink-0 transition-colors ${
                    s.completed
                      ? 'text-green-500 hover:text-green-600'
                      : 'text-text-secondary hover:text-text'
                  }`}
                  title={s.completed ? 'Marcar como não realizado' : 'Marcar como realizado'}
                >
                  {togglingService === s.id ? (
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
                  ) : s.completed ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                </button>
                <span className="flex-1 text-sm text-text">{s.name}</span>
                <span className="text-xs text-text-secondary">
                  {s.completed ? 'Realizado' : 'Pendente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Input
        label="Data e Hora"
        type="datetime-local"
        value={formData.scheduledAt}
        onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
      />
      <Input
        label="Observações"
        value={formData.notes || ''}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
      />

      {statusActions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          {statusActions.map((action) => (
            <Button
              key={action.status}
              type="button"
              className={action.color}
              onClick={() => handleStatusChange(action.status)}
              isLoading={submitting}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={() => { setShowEditModal(false); setSelectedAppointment(null); resetForm() }}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={submitting}>
          Salvar
        </Button>
      </div>
    </form>
  ) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Agenda</h1>
          <p className="text-text-secondary mt-1">Gerenciamento de agendamentos</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <PageLoader />
            </div>
          ) : events.length === 0 && !filterStatus ? (
            <EmptyState
              icon={<CalendarIcon className="h-8 w-8" />}
              title="Nenhum agendamento"
              description="Clique em 'Novo Agendamento' para criar o primeiro."
            />
          ) : (
            <div>
              <div className="flex items-center gap-3 p-4 border-b border-border flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    className="input-base pl-10"
                  />
                </div>
                <Select
                  options={statusOptions}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="min-w-[160px]"
                />
              </div>
              <div className="h-[700px] p-4">
                <BigCalendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  view={view}
                  onView={setView}
                  date={date}
                  onNavigate={setDate}
                  onSelectEvent={handleSelectEvent}
                  eventPropGetter={(event) => ({
                    style: {
                      backgroundColor: statusColors[event.status],
                      borderRadius: 8,
                      border: 'none',
                      color: '#fff',
                      fontSize: 12,
                      padding: '2px 6px',
                    },
                  })}
                  messages={{
                    today: 'Hoje',
                    previous: 'Anterior',
                    next: 'Próximo',
                    month: 'Mês',
                    week: 'Semana',
                    day: 'Dia',
                    agenda: 'Agenda',
                    date: 'Data',
                    time: 'Hora',
                    event: 'Evento',
                    noEventsInRange: 'Nenhum agendamento neste período',
                    showMore: (count) => `+${count} mais`,
                  }}
                  popup
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetForm() }}
        title="Novo Agendamento"
        size="lg"
      >
        {createForm}
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedAppointment(null); resetForm() }}
        title="Editar Agendamento"
        size="lg"
      >
        {selectedAppointment && editForm}
      </Modal>
    </div>
  )
}

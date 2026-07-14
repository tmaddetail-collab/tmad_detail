import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { appointmentsApi } from '@/api/appointments'
import { vehiclesApi } from '@/api/vehicles'
import { servicesApi } from '@/api/services'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { AppointmentStatusBadge } from '@/components/ui/StatusBadge'
import { DataTable, Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import {
  Appointment,
  AppointmentStatus,
  AppointmentFilters,
  Vehicle,
  Service,
} from '@/types'
import {
  formatDateTime,
  formatDate,
  formatTime,
  maskDate,
  parseDateToISO,
} from '@/utils/formatters'
import {
  Calendar,
  Plus,
  Eye,
  XCircle,
  RotateCcw,
  AlertCircle,
  RefreshCw,
  Car,
  Wrench,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AppointmentFormData {
  vehicleId: string
  serviceIds: string[]
  scheduledAt: string
  scheduledTime: string
  notes: string
}

const emptyForm: AppointmentFormData = {
  vehicleId: '',
  serviceIds: [],
  scheduledAt: '',
  scheduledTime: '',
  notes: '',
}

const statusOptions = [
  { value: '', label: 'Todos os status' },
  { value: AppointmentStatus.SCHEDULED, label: 'Agendado' },
  { value: AppointmentStatus.CONFIRMED, label: 'Confirmado' },
  { value: AppointmentStatus.IN_PROGRESS, label: 'Em Andamento' },
  { value: AppointmentStatus.FINISHED, label: 'Finalizado' },
  { value: AppointmentStatus.CANCELLED, label: 'Cancelado' },
]

export function ClientAppointments() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [formData, setFormData] = useState<AppointmentFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const loadAppointments = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const filters: AppointmentFilters = {
        clientId: user.id,
      }
      if (statusFilter) filters.status = statusFilter as AppointmentStatus
      if (startDate) filters.startDate = startDate
      if (endDate) filters.endDate = endDate
      const data = await appointmentsApi.getAll(filters)
      setAppointments(data)
    } catch {
      setError('Erro ao carregar agendamentos')
    } finally {
      setLoading(false)
    }
  }, [user, statusFilter, startDate, endDate])

  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  const loadFormData = async () => {
    if (!user) return
    try {
      const [vData, sData] = await Promise.all([
        vehiclesApi.getAll({ ownerId: user.id }),
        servicesApi.getAll({ isActive: true }),
      ])
      setVehicles(vData.items)
      setServices(sData.items)
    } catch {
      toast('error', 'Erro ao carregar dados do formulário')
    }
  }

  const handleOpenCreate = () => {
    setFormData(emptyForm)
    loadFormData()
    setShowCreateModal(true)
  }

  const handleCreateAppointment = async () => {
    if (!user) return
    if (!formData.vehicleId || !formData.scheduledAt || !formData.scheduledTime || formData.serviceIds.length === 0) {
      toast('error', 'Preencha todos os campos obrigatórios')
      return
    }
    setSubmitting(true)
    try {
      const dateISO = parseDateToISO(formData.scheduledAt)
      if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
        toast('error', 'Data inválida. Use o formato DD/MM/AAAA')
        setSubmitting(false)
        return
      }
      const scheduledAt = `${dateISO}T${formData.scheduledTime}:00-03:00`
      await appointmentsApi.create({
        clientId: user.id,
        vehicleId: formData.vehicleId,
        serviceIds: formData.serviceIds,
        scheduledAt,
        notes: formData.notes || undefined,
      })
      toast('success', 'Agendamento criado com sucesso!')
      setShowCreateModal(false)
      loadAppointments()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      const msg = detail || (err instanceof Error ? err.message : 'Erro ao criar agendamento')
      toast('error', msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return
    setSubmitting(true)
    try {
      await appointmentsApi.updateStatus(selectedAppointment.id, AppointmentStatus.CANCELLED)
      toast('success', 'Agendamento cancelado com sucesso!')
      setShowCancelModal(false)
      setSelectedAppointment(null)
      loadAppointments()
    } catch {
      toast('error', 'Erro ao cancelar agendamento')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRescheduleAppointment = async () => {
    if (!selectedAppointment || !formData.scheduledAt || !formData.scheduledTime) {
      toast('error', 'Selecione uma nova data e horário')
      return
    }
    setSubmitting(true)
    try {
      const dateISO = parseDateToISO(formData.scheduledAt)
      if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
        toast('error', 'Data inválida. Use o formato DD/MM/AAAA')
        setSubmitting(false)
        return
      }
      const scheduledAt = `${dateISO}T${formData.scheduledTime}:00-03:00`
      await appointmentsApi.update(selectedAppointment.id, {
        scheduledAt,
        notes: formData.notes || undefined,
      } as never)
      toast('success', 'Agendamento reagendado com sucesso!')
      setShowRescheduleModal(false)
      setSelectedAppointment(null)
      setFormData(emptyForm)
      loadAppointments()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      const msg = detail || (err instanceof Error ? err.message : 'Erro ao reagendar')
      toast('error', msg)
    } finally {
      setSubmitting(false)
    }
  }

  const openDetail = async (apt: Appointment) => {
    try {
      const full = await appointmentsApi.getById(apt.id)
      setSelectedAppointment(full)
    } catch {
      setSelectedAppointment(apt)
    }
    setShowDetailModal(true)
  }

  const openCancel = (apt: Appointment) => {
    setSelectedAppointment(apt)
    setShowCancelModal(true)
  }

  const openReschedule = (apt: Appointment) => {
    setSelectedAppointment(apt)
    setFormData({
      ...emptyForm,
      scheduledAt: formatDate(apt.scheduledAt) === '—' ? '' : formatDate(apt.scheduledAt),
      scheduledTime: apt.scheduledAt?.split('T')[1]?.slice(0, 5) ?? '',
    })
    setShowRescheduleModal(true)
  }

  const toggleService = (serviceId: string) => {
    setFormData((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }))
  }

  const columns: Column<Appointment>[] = [
    {
      key: 'scheduledAt',
      header: 'Data/Hora',
      sortable: true,
      render: (apt) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-text-secondary shrink-0" />
          <span>{formatDateTime(apt.scheduledAt)}</span>
        </div>
      ),
    },
    {
      key: 'vehicle',
      header: 'Veículo',
      sortable: true,
      render: (apt) => (
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-text-secondary shrink-0" />
          <span>
            {apt.vehicle
              ? `${apt.vehicle.brand} ${apt.vehicle.model} - ${apt.vehicle.plate}`
              : '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'services',
      header: 'Serviços',
      render: (apt) => (
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-text-secondary shrink-0" />
          <span className="truncate max-w-[200px]">
            {apt.services.map((s) => s.name).join(', ')}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (apt) => <AppointmentStatusBadge status={apt.status} />,
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (apt) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              openDetail(apt)
            }}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-surface-2 transition-colors"
            title="Ver detalhes"
          >
            <Eye className="h-4 w-4" />
          </button>
          {(apt.status === AppointmentStatus.SCHEDULED || apt.status === AppointmentStatus.CONFIRMED) && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openReschedule(apt)
                }}
                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                title="Reagendar"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openCancel(apt)
                }}
                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Cancelar"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  if (loading && appointments.length === 0) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">Meus Agendamentos</h1>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-48">
              <Select
                options={statusOptions}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                placeholder="Filtrar por status"
              />
            </div>
            <div className="w-full sm:w-48">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Data inicial"
              />
            </div>
            <div className="w-full sm:w-48">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="Data final"
              />
            </div>
            <Button variant="ghost" onClick={loadAppointments} size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardContent className="p-0">
          {error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-error" />
              </div>
              <p className="text-text-secondary">{error}</p>
              <Button variant="outline" onClick={loadAppointments}>
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={appointments}
              keyExtractor={(apt) => apt.id}
              onRowClick={openDetail}
              isLoading={false}
              emptyMessage="Nenhum agendamento encontrado"
              emptyIcon={<Calendar className="h-8 w-8 text-text-secondary" />}
              emptyAction={
                <Button size="sm" onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4" />
                  Novo Agendamento
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Novo Agendamento"
        description="Preencha os dados para criar um novo agendamento"
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Veículo"
            placeholder="Selecione o veículo"
            options={vehicles.map((v) => ({
              value: v.id,
              label: `${v.brand} ${v.model} - ${v.plate}`,
            }))}
            value={formData.vehicleId}
            onChange={(e) => setFormData((prev) => ({ ...prev, vehicleId: e.target.value }))}
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text">
              Serviços
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-border rounded-xl">
              {services.length === 0 ? (
                <p className="text-sm text-text-secondary col-span-2 text-center py-4">
                  Nenhum serviço disponível
                </p>
              ) : (
                services.map((service) => (
                  <label
                    key={service.id}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                      formData.serviceIds.includes(service.id)
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-surface-2 border border-transparent',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={formData.serviceIds.includes(service.id)}
                      onChange={() => toggleService(service.id)}
                      className="rounded border-border text-primary focus:ring-primary/30"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text truncate">
                        {service.name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {service.estimatedMinutes}min
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Data"
              placeholder="DD/MM/AAAA"
              value={formData.scheduledAt}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  scheduledAt: maskDate(e.target.value),
                }))
              }
            />
            <Input
              label="Horário"
              type="time"
              value={formData.scheduledTime}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, scheduledTime: e.target.value }))
              }
            />
          </div>

          <Input
            label="Observações"
            placeholder="Alguma observação especial?"
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => setShowCreateModal(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateAppointment}
              isLoading={submitting}
            >
              <Calendar className="h-4 w-4" />
              Agendar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedAppointment(null)
        }}
        title="Detalhes do Agendamento"
        size="md"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-text-secondary">Status</p>
                <AppointmentStatusBadge
                  status={selectedAppointment.status}
                  size="md"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-text-secondary">Valor Total</p>
                <p className="text-sm font-semibold text-text">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(selectedAppointment.totalValue)}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-text-secondary">Data</p>
              <p className="text-sm text-text">
                {formatDate(selectedAppointment.scheduledAt)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-text-secondary">Horário</p>
              <p className="text-sm text-text">
                {formatTime(selectedAppointment.scheduledAt)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-text-secondary">Veículo</p>
              <p className="text-sm text-text">
                {selectedAppointment.vehicle
                  ? `${selectedAppointment.vehicle.brand} ${selectedAppointment.vehicle.model} (${selectedAppointment.vehicle.year}) - ${selectedAppointment.vehicle.plate}`
                  : '—'}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-text-secondary">Serviços</p>
              <div className="flex flex-wrap gap-2">
                {selectedAppointment.services.map((s) => (
                  <span
                    key={s.id}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg ${
                      s.completed
                        ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                        : 'bg-surface-2 text-text'
                    }`}
                  >
                    {s.completed && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                    {s.name}
                    {s.completed ? ' (Realizado)' : ' (Pendente)'}
                  </span>
                ))}
              </div>
            </div>

            {selectedAppointment.notes && (
              <div className="space-y-1">
                <p className="text-xs text-text-secondary">Observações</p>
                <p className="text-sm text-text">
                  {selectedAppointment.notes}
                </p>
              </div>
            )}

            {(selectedAppointment.status === AppointmentStatus.SCHEDULED ||
              selectedAppointment.status === AppointmentStatus.CONFIRMED) && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailModal(false)
                    openReschedule(selectedAppointment)
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reagendar
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setShowDetailModal(false)
                    openCancel(selectedAppointment)
                  }}
                >
                  <XCircle className="h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false)
          setSelectedAppointment(null)
        }}
        title="Cancelar Agendamento"
        description="Tem certeza que deseja cancelar este agendamento?"
        size="sm"
      >
        <div className="space-y-4">
          {selectedAppointment && (
            <div className="p-3 rounded-xl bg-surface-2 space-y-1">
              <p className="text-sm font-medium text-text">
                {formatDateTime(selectedAppointment.scheduledAt)}
              </p>
              <p className="text-xs text-text-secondary">
                {selectedAppointment.services.map((s) => s.name).join(', ')}
              </p>
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCancelModal(false)
                setSelectedAppointment(null)
              }}
            >
              Voltar
            </Button>
            <Button
              variant="danger"
              isLoading={submitting}
              onClick={handleCancelAppointment}
            >
              <XCircle className="h-4 w-4" />
              Confirmar Cancelamento
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showRescheduleModal}
        onClose={() => {
          setShowRescheduleModal(false)
          setSelectedAppointment(null)
          setFormData(emptyForm)
        }}
        title="Reagendar"
        description="Escolha a nova data e horário"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nova Data"
            placeholder="DD/MM/AAAA"
            value={formData.scheduledAt}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                scheduledAt: maskDate(e.target.value),
              }))
            }
          />
          <Input
            label="Novo Horário"
            type="time"
            value={formData.scheduledTime}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                scheduledTime: e.target.value,
              }))
            }
          />
          <Input
            label="Observações"
            placeholder="Motivo do reagendamento"
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
          />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => {
                setShowRescheduleModal(false)
                setSelectedAppointment(null)
                setFormData(emptyForm)
              }}
            >
              Cancelar
            </Button>
            <Button
              isLoading={submitting}
              onClick={handleRescheduleAppointment}
            >
              <Calendar className="h-4 w-4" />
              Confirmar Reagendamento
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

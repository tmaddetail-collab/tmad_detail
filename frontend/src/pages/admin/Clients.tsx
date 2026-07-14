import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Plus,
  Search,
  Edit3,
  ToggleLeft,
  ToggleRight,
  Mail,
  Phone,
  Car,
  Calendar,
  DollarSign,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tabs } from '@/components/ui/Tabs'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'
import { usersApi } from '@/api/users'
import { vehiclesApi } from '@/api/vehicles'
import { User, Vehicle, PaginatedResponse } from '@/types'
import { formatDate, formatCurrency, formatPhone } from '@/utils/formatters'

export function Clients() {
  const { toast } = useToast()
  const [clientsData, setClientsData] = useState<PaginatedResponse<User> | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<User | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [detailTab, setDetailTab] = useState('info')

  const [clientVehicles, setClientVehicles] = useState<Vehicle[]>([])
  const [vehiclesLoading, setVehiclesLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  })

  const resetFormData = () => setFormData({ name: '', email: '', phone: '', password: '' })

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      const data = await usersApi.getAll({ page, page_size: 10, search, role: 'client' })
      setClientsData(data)
    } catch {
      toast('error', 'Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }, [page, search, toast])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.password) {
      toast('error', 'Preencha os campos obrigatórios')
      return
    }
    try {
      setSubmitting(true)
      await usersApi.create(formData)
      toast('success', 'Cliente criado com sucesso')
      setShowCreateModal(false)
      resetFormData()
      fetchClients()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      const msg = detail || 'Erro ao criar cliente'
      toast('error', typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (client: User) => {
    try {
      const updated = await usersApi.toggleActive(client.id)
      setClientsData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((c) => (c.id === updated.id ? updated : c)),
            }
          : prev,
      )
      toast('success', `Cliente ${updated.isActive ? 'ativado' : 'desativado'} com sucesso`)
    } catch {
      toast('error', 'Erro ao alterar status do cliente')
    }
  }

  const columns: Column<User>[] = useMemo(
    () => [
      { key: 'name', header: 'Nome', sortable: true },
      {
        key: 'email',
        header: 'E-mail',
        render: (item) => (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-text-secondary" />
            <span>{item.email}</span>
          </div>
        ),
      },
      {
        key: 'phone',
        header: 'Telefone',
        render: (item) => (item.phone ? formatPhone(item.phone) : '—'),
      },
      {
        key: 'isActive',
        header: 'Status',
        render: (item) => (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              item.isActive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {item.isActive ? 'Ativo' : 'Inativo'}
          </span>
        ),
      },
      {
        key: 'createdAt',
        header: 'Cadastro',
        render: (item) => formatDate(item.createdAt),
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
                setSelectedClient(item)
                setDetailTab('info')
                setShowDetailModal(true)
              }}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleToggleActive(item)
              }}
            >
              {item.isActive ? (
                <ToggleRight className="h-4 w-4 text-green-500" />
              ) : (
                <ToggleLeft className="h-4 w-4 text-red-500" />
              )}
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  useEffect(() => {
    if (!selectedClient || detailTab !== 'vehicles') return
    const loadVehicles = async () => {
      setVehiclesLoading(true)
      try {
        const data = await vehiclesApi.getAll({ ownerId: selectedClient.id, page_size: 100 })
        setClientVehicles(data.items)
      } catch {
        toast('error', 'Erro ao carregar veículos')
      } finally {
        setVehiclesLoading(false)
      }
    }
    loadVehicles()
  }, [selectedClient, detailTab, toast])

  const detailTabs = [
    { id: 'info', label: 'Informações', icon: <Search className="h-4 w-4" /> },
    { id: 'vehicles', label: 'Veículos', icon: <Car className="h-4 w-4" /> },
    { id: 'appointments', label: 'Agendamentos', icon: <Calendar className="h-4 w-4" /> },
    { id: 'financial', label: 'Financeiro', icon: <DollarSign className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Clientes</h1>
          <p className="text-text-secondary mt-1">Gerencie seus clientes</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={clientsData?.items ?? []}
            keyExtractor={(item) => String(item.id)}
            isLoading={loading}
            page={page}
            pageSize={10}
            total={clientsData?.total || 0}
            onPageChange={setPage}
            searchable
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setPage(1) }}
            searchPlaceholder="Buscar por nome, email..."
            emptyMessage="Nenhum cliente encontrado"
            onRowClick={(item) => {
              setSelectedClient(item as unknown as User)
              setDetailTab('info')
              setShowDetailModal(true)
            }}
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetFormData() }}
        title="Novo Cliente"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nome *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome completo"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="E-mail *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="cliente@email.com"
            />
            <Input
              label="Telefone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(11) 99999-9999"
            />
          </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
              label="Senha *"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={submitting}>
              Criar Cliente
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedClient(null) }}
        title={selectedClient?.name || 'Detalhes do Cliente'}
        size="xl"
      >
        {selectedClient && (
          <div className="space-y-6">
            <Tabs tabs={detailTabs} activeTab={detailTab} onChange={setDetailTab} />

            {detailTab === 'info' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-text-secondary uppercase tracking-wider">Nome</label>
                    <p className="text-text font-medium mt-1">{selectedClient.name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary uppercase tracking-wider">E-mail</label>
                    <p className="text-text font-medium mt-1">{selectedClient.email}</p>
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary uppercase tracking-wider">Telefone</label>
                    <p className="text-text font-medium mt-1">{selectedClient.phone ? formatPhone(selectedClient.phone) : '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary uppercase tracking-wider">CPF</label>
                    <p className="text-text font-medium mt-1">{selectedClient.cpf || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary uppercase tracking-wider">Cadastro</label>
                    <p className="text-text font-medium mt-1">{formatDate(selectedClient.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary uppercase tracking-wider">Status</label>
                    <p className="text-text font-medium mt-1">
                      {selectedClient.isActive ? 'Ativo' : 'Inativo'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button variant="secondary" onClick={() => handleToggleActive(selectedClient)}>
                    {selectedClient.isActive ? 'Desativar' : 'Ativar'} Cliente
                  </Button>
                </div>
              </div>
            )}

            {detailTab === 'vehicles' && (
              vehiclesLoading ? (
                <PageLoader />
              ) : clientVehicles.length === 0 ? (
                <EmptyState icon={<Car className="h-8 w-8" />} title="Nenhum veículo" description="Este cliente ainda não possui veículos cadastrados." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {clientVehicles.map((v) => (
                    <Card key={v.id} className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Car className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-text truncate">{v.brand} {v.model}</p>
                          <p className="text-xs text-text-secondary">{v.year} &bull; {v.plate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
                        <span className="text-text-secondary">{v.color}</span>
                        {v.mileage != null && (
                          <>
                            <span className="text-text-secondary">&middot;</span>
                            <span className="text-text-secondary">{v.mileage.toLocaleString('pt-BR')} km</span>
                          </>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )
            )}

            {detailTab === 'appointments' && (
              <EmptyState icon={<Calendar className="h-8 w-8" />} title="Nenhum agendamento" description="Este cliente não possui histórico de agendamentos." />
            )}

            {detailTab === 'financial' && (
              <EmptyState icon={<DollarSign className="h-8 w-8" />} title="Sem dados financeiros" description="Nenhum dado financeiro disponível para este cliente." />
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

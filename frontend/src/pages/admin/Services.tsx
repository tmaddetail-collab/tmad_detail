import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Plus,
  Edit3,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { servicesApi } from '@/api/services'
import { Service, ServiceCategory, ServiceForm, PaginatedResponse } from '@/types'
import { formatCurrency, formatDuration, getServiceCategoryLabel } from '@/utils/formatters'

const categoryOptions = Object.values(ServiceCategory).map((cat) => ({
  value: cat,
  label: getServiceCategoryLabel(cat),
}))

const defaultForm: ServiceForm = {
  name: '',
  description: '',
  category: ServiceCategory.WASHING,
  price: 0,
  estimatedMinutes: 60,
}

export function Services() {
  const { toast } = useToast()
  const [servicesData, setServicesData] = useState<PaginatedResponse<Service> | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [deletingService, setDeletingService] = useState<Service | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<ServiceForm>(defaultForm)

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true)
      const data = await servicesApi.getAll({ page, page_size: 10, search })
      setServicesData(data)
    } catch {
      toast('error', 'Erro ao carregar serviços')
    } finally {
      setLoading(false)
    }
  }, [page, search, toast])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const openCreate = () => {
    setEditingService(null)
    setFormData(defaultForm)
    setShowFormModal(true)
  }

  const openEdit = (service: Service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      description: service.description || '',
      category: service.category,
      price: service.price,
      estimatedMinutes: service.estimatedMinutes,
    })
    setShowFormModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || formData.price <= 0) {
      toast('error', 'Preencha todos os campos obrigatórios')
      return
    }
    try {
      setSubmitting(true)
      if (editingService) {
        await servicesApi.update(editingService.id, formData)
        toast('success', 'Serviço atualizado com sucesso')
      } else {
        await servicesApi.create(formData)
        toast('success', 'Serviço criado com sucesso')
      }
      setShowFormModal(false)
      fetchServices()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      const msg = detail || `Erro ao ${editingService ? 'atualizar' : 'criar'} serviço`
      toast('error', typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingService) return
    try {
      setSubmitting(true)
      await servicesApi.delete(deletingService.id)
      toast('success', 'Serviço removido com sucesso')
      setShowDeleteModal(false)
      setDeletingService(null)
      fetchServices()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      const msg = detail || 'Erro ao remover serviço'
      toast('error', typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (service: Service) => {
    try {
      await servicesApi.update(service.id, { isActive: !service.isActive })
      toast('success', `Serviço ${service.isActive ? 'desativado' : 'ativado'} com sucesso`)
      fetchServices()
    } catch {
      toast('error', 'Erro ao alterar status do serviço')
    }
  }

  const columns: Column<Service>[] = useMemo(
    () => [
      { key: 'name', header: 'Nome', sortable: true },
      {
        key: 'category',
        header: 'Categoria',
        sortable: true,
        render: (item) => (
          <span className="text-sm">{getServiceCategoryLabel(item.category)}</span>
        ),
      },
      {
        key: 'description',
        header: 'Descrição',
        render: (item) => (
          <span className="text-sm text-text-secondary truncate max-w-[200px] block">
            {item.description || '—'}
          </span>
        ),
      },
      {
        key: 'estimatedMinutes',
        header: 'Tempo Estimado',
        render: (item) => <span className="text-sm">{formatDuration(item.estimatedMinutes)}</span>,
      },
      {
        key: 'price',
        header: 'Preço',
        sortable: true,
        render: (item) => <span className="text-sm font-medium">{formatCurrency(item.price)}</span>,
      },
      {
        key: 'isActive',
        header: 'Ativo',
        render: (item) => (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              item.isActive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {item.isActive ? 'Sim' : 'Não'}
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
                openEdit(item)
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
                <ToggleLeft className="h-4 w-4 text-gray-500" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setDeletingService(item)
                setShowDeleteModal(true)
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Serviços</h1>
          <p className="text-text-secondary mt-1">Catálogo de serviços</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo Serviço
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={servicesData?.items ?? []}
            keyExtractor={(item) => String(item.id)}
            isLoading={loading}
            page={page}
            pageSize={10}
            total={servicesData?.total || 0}
            onPageChange={setPage}
            searchable
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setPage(1) }}
            searchPlaceholder="Buscar por nome..."
            emptyMessage="Nenhum serviço encontrado"
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingService ? 'Editar Serviço' : 'Novo Serviço'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome do serviço"
          />
          <Select
            label="Categoria *"
            options={categoryOptions}
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as ServiceCategory })}
          />
          <Input
            label="Descrição"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descrição do serviço"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Tempo Estimado (minutos) *"
              type="number"
              min={1}
              value={formData.estimatedMinutes}
              onChange={(e) => setFormData({ ...formData, estimatedMinutes: Number(e.target.value) })}
            />
            <Input
              label="Preço (R$) *"
              type="number"
              step="0.01"
              min={0}
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowFormModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={submitting}>
              {editingService ? 'Salvar' : 'Criar Serviço'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeletingService(null) }}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Tem certeza que deseja excluir o serviço <strong>{deletingService?.name}</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setShowDeleteModal(false); setDeletingService(null) }}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={submitting}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

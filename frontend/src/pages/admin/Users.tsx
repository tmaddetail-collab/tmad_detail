import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Plus,
  Search,
  Edit3,
  ToggleLeft,
  ToggleRight,
  Mail,
  User as UserIcon,
  Shield,
  Store,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { usersApi } from '@/api/users'
import { User, UserRole, PaginatedResponse } from '@/types'
import { formatDate } from '@/utils/formatters'

const roleLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.CLIENT]: 'Cliente',
  [UserRole.LOJISTA]: 'Lojista',
}

const roleBadgeClass: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  [UserRole.CLIENT]: 'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400',
  [UserRole.LOJISTA]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

export function Users() {
  const { toast } = useToast()
  const [usersData, setUsersData] = useState<PaginatedResponse<User> | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    phone: '',
    password: '',
    role: UserRole.CLIENT as UserRole,
  })

  const [editData, setEditData] = useState({
    name: '',
    email: '',
    username: '',
    phone: '',
    role: UserRole.CLIENT as UserRole,
    password: '',
  })

  const resetFormData = () =>
    setFormData({ name: '', email: '', username: '', phone: '', password: '', role: UserRole.CLIENT })

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const data = await usersApi.getAll({ page, page_size: 10, search })
      setUsersData(data)
    } catch {
      toast('error', 'Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [page, search, toast])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.username || !formData.password) {
      toast('error', 'Preencha os campos obrigatórios')
      return
    }
    try {
      setSubmitting(true)
      await usersApi.create(formData)
      toast('success', 'Usuário criado com sucesso')
      setShowCreateModal(false)
      resetFormData()
      fetchUsers()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      toast('error', detail || 'Erro ao criar usuário')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    try {
      setSubmitting(true)
      const updatePayload: any = {
        name: editData.name,
        username: editData.username,
        phone: editData.phone,
        role: editData.role,
      }
      if (editData.password) {
        updatePayload.password = editData.password
      }
      await usersApi.update(selectedUser.id, updatePayload)
      toast('success', 'Usuário atualizado com sucesso')
      setShowEditModal(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      toast('error', detail || 'Erro ao atualizar usuário')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (user: User) => {
    try {
      const updated = await usersApi.toggleActive(user.id)
      setUsersData((prev) =>
        prev
          ? { ...prev, items: prev.items.map((u) => (u.id === updated.id ? updated : u)) }
          : prev,
      )
      toast('success', `Usuário ${updated.isActive ? 'ativado' : 'desativado'} com sucesso`)
    } catch {
      toast('error', 'Erro ao alterar status do usuário')
    }
  }

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setEditData({
      name: user.name,
      email: user.email,
      username: user.username || '',
      phone: user.phone || '',
      role: user.role,
      password: '',
    })
    setShowEditModal(true)
  }

  const columns: Column<User>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Nome',
        sortable: true,
        render: (item) => (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {item.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium">{item.name}</span>
          </div>
        ),
      },
      {
        key: 'username',
        header: 'Usuário',
        render: (item) => item.username || '—',
      },
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
        key: 'role',
        header: 'Perfil',
        render: (item) => (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeClass[item.role]}`}>
            {item.role === UserRole.ADMIN && <Shield className="h-3 w-3 mr-1" />}
            {item.role === UserRole.LOJISTA && <Store className="h-3 w-3 mr-1" />}
            {item.role === UserRole.CLIENT && <UserIcon className="h-3 w-3 mr-1" />}
            {roleLabels[item.role]}
          </span>
        ),
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
        sortable: true,
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
                openEditModal(item)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Usuários</h1>
          <p className="text-text-secondary mt-1">Gerencie clientes, lojistas e administradores</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={usersData?.items ?? []}
            keyExtractor={(item) => String(item.id)}
            isLoading={loading}
            page={page}
            pageSize={10}
            total={usersData?.total || 0}
            onPageChange={setPage}
            searchable
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setPage(1) }}
            searchPlaceholder="Buscar por nome, email, usuário..."
            emptyMessage="Nenhum usuário encontrado"
            onRowClick={(item) => openEditModal(item as unknown as User)}
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetFormData() }}
        title="Novo Usuário"
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
              label="Usuário *"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="nome.usuario"
            />
            <Input
              label="E-mail *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="usuario@email.com"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Perfil *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value={UserRole.CLIENT}>Cliente</option>
                <option value={UserRole.LOJISTA}>Lojista</option>
                <option value={UserRole.ADMIN}>Administrador</option>
              </select>
            </div>
            <Input
              label="Telefone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(11) 99999-9999"
            />
          </div>
          <Input
            label="Senha *"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Mínimo 8 caracteres"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={submitting}>
              Criar Usuário
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedUser(null) }}
        title={selectedUser ? `Editar: ${selectedUser.name}` : 'Editar Usuário'}
        size="lg"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <Input
            label="Nome *"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            placeholder="Nome completo"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Usuário"
              value={editData.username}
              onChange={(e) => setEditData({ ...editData, username: e.target.value })}
              placeholder="nome.usuario"
            />
            <Input
              label="E-mail"
              value={editData.email}
              disabled
              className="opacity-60"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Perfil *</label>
              <select
                value={editData.role}
                onChange={(e) => setEditData({ ...editData, role: e.target.value as UserRole })}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value={UserRole.CLIENT}>Cliente</option>
                <option value={UserRole.LOJISTA}>Lojista</option>
                <option value={UserRole.ADMIN}>Administrador</option>
              </select>
            </div>
            <Input
              label="Telefone"
              value={editData.phone}
              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              placeholder="(11) 99999-9999"
            />
          </div>
          <Input
            label="Nova Senha (deixe vazio para manter)"
            type="password"
            value={editData.password}
            onChange={(e) => setEditData({ ...editData, password: e.target.value })}
            placeholder="Deixe vazio para não alterar"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>
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

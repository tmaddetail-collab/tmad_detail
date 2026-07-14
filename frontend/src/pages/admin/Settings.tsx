import { useState, useEffect } from 'react'
import {
  User,
  Lock,
  Moon,
  Sun,
  Bell,
  Info,
  Save,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { usersApi } from '@/api/users'

export function Settings() {
  const { toast } = useToast()
  const { user, setUser } = useAuthStore()
  const { isDark, toggle } = useThemeStore()

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
      })
    }
  }, [user])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileForm.name || !profileForm.email) {
      toast('error', 'Preencha os campos obrigatórios')
      return
    }
    try {
      setSavingProfile(true)
      const updated = await usersApi.updateProfile(profileForm)
      setUser(updated)
      toast('success', 'Perfil atualizado com sucesso')
    } catch {
      toast('error', 'Erro ao atualizar perfil')
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast('error', 'Preencha todos os campos')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      toast('error', 'A nova senha deve ter no mínimo 6 caracteres')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast('error', 'As senhas não conferem')
      return
    }
    try {
      setSavingPassword(true)
      const token = useAuthStore.getState().token
      if (!token) throw new Error('No token')
      const { authApi } = await import('@/api/auth')
      await authApi.resetPassword(token, passwordForm.newPassword)
      toast('success', 'Senha alterada com sucesso')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch {
      toast('error', 'Erro ao alterar senha')
    } finally {
      setSavingPassword(false)
    }
  }

  if (!user) return <PageLoader />

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text">Configurações</h1>
        <p className="text-text-secondary mt-1">Gerencie suas preferências</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Perfil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <Input
              label="Nome *"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              placeholder="Seu nome completo"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="E-mail *"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                placeholder="seu@email.com"
              />
              <Input
                label="Telefone"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" isLoading={savingProfile}>
                <Save className="h-4 w-4" />
                Salvar Alterações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Alterar Senha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              label="Senha Atual"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              placeholder="Digite sua senha atual"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nova Senha"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
              <Input
                label="Confirmar Nova Senha"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Repita a nova senha"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" isLoading={savingPassword}>
                <Save className="h-4 w-4" />
                Alterar Senha
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isDark ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
            Aparência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text">Modo Escuro</p>
              <p className="text-xs text-text-secondary mt-0.5">Alterne entre tema claro e escuro</p>
            </div>
            <button
              type="button"
              onClick={toggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDark ? 'bg-primary' : 'bg-border'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-text-secondary" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">As configurações de notificação estarão disponíveis em breve.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-text-secondary" />
            Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Versão</span>
              <span className="text-sm font-medium text-text">1.0.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Framework</span>
              <span className="text-sm font-medium text-text">React + TypeScript</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Usuário</span>
              <span className="text-sm font-medium text-text">{user.email}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

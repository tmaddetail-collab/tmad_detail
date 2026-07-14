import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Menu,
  Moon,
  Sun,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/store/themeStore'
import { useAuth } from '@/contexts/AuthContext'
import { Notification } from '@/types'

interface HeaderProps {
  onMenuToggle: () => void
}

const breadcrumbLabels: Record<string, string> = {
  '': 'Dashboard',
  appointments: 'Agendamentos',
  orders: 'Ordens de Serviço',
  vehicles: 'Veículos',
  clients: 'Clientes',
  services: 'Serviços',
  financial: 'Financeiro',
  reports: 'Relatórios',
  settings: 'Configurações',
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { isDark, toggle } = useThemeStore()
  const { user, logout } = useAuth()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const pathParts = location.pathname.split('/').filter(Boolean)
  const pageTitle =
    breadcrumbLabels[pathParts[pathParts.length - 1]] ?? 'Dashboard'

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setShowUserMenu(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const notifications: Notification[] = []

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-xl text-text-secondary hover:text-text hover:bg-surface-2 transition-colors lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-text">{pageTitle}</h1>
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span>Dashboard</span>
            {pathParts.length > 1 && (
              <>
                <span>/</span>
                <span className="capitalize">{pageTitle}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="p-2 rounded-xl text-text-secondary hover:text-text hover:bg-surface-2 transition-colors"
          title={isDark ? 'Modo Claro' : 'Modo Escuro'}
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-text-secondary hover:text-text hover:bg-surface-2 transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse-red" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-2xl shadow-card-lg animate-fade-in overflow-hidden">
              <div className="p-3 border-b border-border">
                <p className="text-sm font-semibold text-text">
                  Notificações
                </p>
              </div>
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="h-8 w-8 mx-auto text-text-secondary mb-2" />
                  <p className="text-sm text-text-secondary">
                    Nenhuma notificação
                  </p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      className="w-full text-left p-3 hover:bg-surface-2 transition-colors border-b border-border last:border-b-0"
                    >
                      <p className="text-sm font-medium text-text">
                        {n.title}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {n.message}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-2 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <ChevronDown className="h-4 w-4 text-text-secondary hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-background border border-border rounded-2xl shadow-card-lg animate-fade-in overflow-hidden">
              <div className="p-3 border-b border-border">
                <p className="text-sm font-medium text-text">
                  {user?.name ?? 'Usuário'}
                </p>
                <p className="text-xs text-text-secondary truncate">
                  {user?.email ?? ''}
                </p>
              </div>
              <div className="p-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false)
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-text rounded-lg hover:bg-surface-2 transition-colors"
                >
                  <User className="h-4 w-4" />
                  Meu Perfil
                </button>
                <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-text rounded-lg hover:bg-surface-2 transition-colors">
                  <Settings className="h-4 w-4" />
                  Configurações
                </button>
              </div>
              <div className="border-t border-border p-1">
                <button
                  onClick={logout}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-error rounded-lg hover:bg-error/5 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

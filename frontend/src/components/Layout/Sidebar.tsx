import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Car,
  Users,
  BarChart3,
  Wallet,
  Package,
  Settings,
  LogOut,
  X,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

const adminNavItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/app/appointments', icon: Calendar, label: 'Agendamentos' },
  { to: '/app/orders', icon: ClipboardList, label: 'Ordens de Serviço' },
  { to: '/app/vehicles', icon: Car, label: 'Veículos' },
  { to: '/app/clients', icon: Users, label: 'Clientes' },
  { to: '/app/services', icon: Package, label: 'Serviços' },
  { to: '/app/financial', icon: Wallet, label: 'Financeiro' },
  { to: '/app/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/app/settings', icon: Settings, label: 'Configurações' },
]

const clientNavItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/app/appointments', icon: Calendar, label: 'Meus Agendamentos' },
  { to: '/app/orders', icon: ClipboardList, label: 'Minhas Ordens' },
  { to: '/app/vehicles', icon: Car, label: 'Meus Veículos' },
]

export function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navItems = user?.role === UserRole.ADMIN ? adminNavItems : clientNavItems

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-sidebar text-white z-50 transition-all duration-300 flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'w-20' : 'w-64',
          'lg:translate-x-0',
        )}
      >
        <div className="flex items-center h-16 px-4 border-b border-white/10">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">TD</span>
            </div>
            {!collapsed && (
              <span className="font-semibold text-base">TMAD Detail</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors hidden lg:block"
          >
            <ChevronLeft
              className={cn(
                'h-5 w-5 transition-transform',
                collapsed && 'rotate-180',
              )}
            />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-white/60 hover:text-white hover:bg-sidebar-hover',
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          {!collapsed && user && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-white/50 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-white/60 hover:text-white hover:bg-sidebar-hover transition-all duration-200"
            title="Sair"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Sair</span>}
          </button>
        </div>
      </aside>
    </>
  )
}

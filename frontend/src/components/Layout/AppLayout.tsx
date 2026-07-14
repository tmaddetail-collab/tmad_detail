import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />

      <div
        className={cn(
          'transition-all duration-300 flex flex-col min-h-screen',
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64',
        )}
      >
        <Header onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 lg:p-6 page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  icon?: ReactNode
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        'flex border-b border-border overflow-x-auto scrollbar-none',
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 -mb-px',
            activeTab === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text hover:border-border',
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                'ml-1 px-1.5 py-0.5 text-xs rounded-full',
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'bg-surface-2 text-text-secondary',
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

import { useState, useMemo, type ReactNode } from 'react'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (item: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  onRowClick?: (item: T) => void
  isLoading?: boolean
  page?: number
  pageSize?: number
  total?: number
  onPageChange?: (page: number) => void
  searchable?: boolean
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  emptyMessage?: string
  emptyIcon?: ReactNode
  emptyAction?: ReactNode
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  isLoading,
  page = 1,
  pageSize = 10,
  total = 0,
  onPageChange,
  searchable,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Pesquisar...',
  emptyMessage = 'Nenhum registro encontrado',
  emptyIcon,
  emptyAction,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const sortedData = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp =
        typeof aVal === 'string'
          ? aVal.localeCompare(String(bVal))
          : Number(aVal) - Number(bVal)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const getSortIcon = (key: string) => {
    if (sortKey !== key) return <ChevronsUpDown className="h-4 w-4 text-text-secondary" />
    return sortDir === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-primary" />
    ) : (
      <ChevronDown className="h-4 w-4 text-primary" />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {searchable && (
          <div className="h-10 w-full max-w-xs rounded-xl bg-surface-2 skeleton" />
        )}
        <div className="border border-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-4 gap-4 p-4 bg-surface-2">
            {columns.map((col) => (
              <div key={col.key} className="h-4 skeleton" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-4 gap-4 p-4 border-t border-border"
            >
              {columns.map((col) => (
                <div key={col.key} className="h-4 skeleton" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {searchable && onSearchChange && (
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="input-base pl-10"
          />
        </div>
      )}

      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="min-w-full inline-block align-middle">
          <table className="min-w-full">
            <thead>
              <tr className="bg-surface-2">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider',
                      col.sortable && 'cursor-pointer select-none hover:text-text',
                      col.className,
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.header}
                      {col.sortable && getSortIcon(col.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-16 text-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      {emptyIcon}
                      <p className="text-sm text-text-secondary">
                        {emptyMessage}
                      </p>
                      {emptyAction}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedData.map((item) => (
                  <tr
                    key={keyExtractor(item)}
                    onClick={() => onRowClick?.(item)}
                    className={cn(
                      'transition-colors',
                      onRowClick
                        ? 'cursor-pointer hover:bg-surface-2/50'
                        : '',
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3 text-sm text-text whitespace-nowrap',
                          col.className,
                        )}
                      >
                        {col.render
                          ? col.render(item)
                          : (item[col.key] as ReactNode) ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-2 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4))
              const pageNum = start + i
              if (pageNum > totalPages) return null
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={cn(
                    'min-w-[2.25rem] h-9 rounded-lg text-sm font-medium transition-colors',
                    pageNum === page
                      ? 'bg-primary text-white'
                      : 'text-text-secondary hover:text-text hover:bg-surface-2',
                  )}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-2 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

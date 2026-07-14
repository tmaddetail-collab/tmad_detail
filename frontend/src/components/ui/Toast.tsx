import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextData {
  toast: (type: ToastType, title: string, message?: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData)

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colors = {
  success: 'border-l-success',
  error: 'border-l-error',
  warning: 'border-l-warning',
  info: 'border-l-info',
}

const iconColors = {
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-info',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, type, title, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast: ToastContextData['toast'] = useCallback(
    (type, title, message) => addToast(type, title, message),
    [addToast],
  )

  const success = useCallback(
    (title: string, message?: string) => addToast('success', title, message),
    [addToast],
  )

  const error = useCallback(
    (title: string, message?: string) => addToast('error', title, message),
    [addToast],
  )

  const warning = useCallback(
    (title: string, message?: string) => addToast('warning', title, message),
    [addToast],
  )

  const info = useCallback(
    (title: string, message?: string) => addToast('info', title, message),
    [addToast],
  )

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => {
          const Icon = icons[t.type]
          return (
            <div
              key={t.id}
              className={cn(
                'toast border-l-4',
                colors[t.type],
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0', iconColors[t.type])} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text">{t.title}</p>
                {t.message && (
                  <p className="text-xs text-text-secondary mt-0.5">
                    {t.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-0.5 text-text-secondary hover:text-text transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

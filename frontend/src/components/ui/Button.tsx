import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const variants = {
  primary:
    'bg-primary text-white hover:bg-primary-dark focus:ring-primary/40 shadow-sm',
  secondary:
    'bg-surface-2 text-text hover:bg-border border border-border focus:ring-border',
  outline:
    'border-2 border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary/40',
  ghost:
    'text-text-secondary hover:text-text hover:bg-surface-2',
  danger:
    'bg-error text-white hover:bg-red-600 focus:ring-error/40 shadow-sm',
} as const

const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
} as const

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'

import { cn } from '@/lib/utils'
import type { ReactNode, ButtonHTMLAttributes } from 'react'

// ─── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed select-none'
  const variants = {
    primary:   'bg-brand-700 text-white hover:bg-brand-600 shadow-sm',
    secondary: 'bg-surface-muted text-gray-700 border border-gray-200 hover:bg-gray-100',
    ghost:     'text-gray-600 hover:bg-surface-muted',
    danger:    'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────
interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ children, className, hover, padding = 'md' }: CardProps) {
  const paddings = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-5' }
  return (
    <div className={cn(
      'bg-white border border-gray-100 rounded-2xl shadow-card',
      hover && 'transition-shadow duration-200 hover:shadow-card-hover cursor-pointer',
      paddings[padding],
      className
    )}>
      {children}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant = 'ok' | 'warn' | 'bad' | 'info' | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    ok:      'bg-brand-50 text-brand-700',
    warn:    'bg-amber-50 text-amber-700',
    bad:     'bg-red-50 text-red-700',
    info:    'bg-blue-50 text-blue-700',
    neutral: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full',
      variants[variant], className
    )}>
      {children}
    </span>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-7 h-7' }
  return (
    <svg
      className={cn('animate-spin text-current', sizes[size], className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

// ─── TypingDots ───────────────────────────────────────────────────────────────
export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-current rounded-full opacity-20"
          style={{ animation: `dotBounce 1.2s infinite ${i * 0.2}s` }}
        />
      ))}
    </span>
  )
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
interface ProgressBarProps {
  value: number  // 0-100
  variant?: 'ok' | 'warn' | 'bad' | 'blue'
  height?: 'xs' | 'sm' | 'md'
  className?: string
  animated?: boolean
}

export function ProgressBar({ value, variant = 'ok', height = 'sm', className, animated }: ProgressBarProps) {
  const heights = { xs: 'h-1', sm: 'h-1.5', md: 'h-2.5' }
  const colors = {
    ok:   'bg-brand-500',
    warn: 'bg-amber-400',
    bad:  'bg-red-400',
    blue: 'bg-blue-400',
  }
  return (
    <div className={cn('w-full bg-gray-100 rounded-full overflow-hidden', heights[height], className)}>
      <div
        className={cn('h-full rounded-full', colors[variant], animated && 'transition-all duration-700 ease-out')}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

// ─── Section Title ────────────────────────────────────────────────────────────
export function SectionTitle({ icon, children, action }: {
  icon?: ReactNode
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon && <span className="text-brand-600">{icon}</span>}
      <span className="text-sm font-medium text-gray-900">{children}</span>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description }: {
  icon: ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="text-center py-10 px-4">
      <div className="text-3xl mb-3 opacity-40">{icon}</div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-gray-100 rounded-lg', className)} />
}

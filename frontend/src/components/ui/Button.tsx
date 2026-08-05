import { type ButtonHTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  variant?: Variant
  size?: Size
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variants: Record<Variant, string> = {
  primary:
    'gradient-primary text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:brightness-110',
  secondary:
    'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600',
  outline:
    'border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100',
  ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200',
  danger: 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20',
  success: 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-xl',
  md: 'h-11 px-5 text-sm rounded-xl',
  lg: 'h-12 px-6 text-base rounded-2xl',
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  leftIcon,
  rightIcon,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      whileHover={{ y: disabled || loading ? 0 : -1 }}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed max-w-full truncate',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        : leftIcon && <span className="shrink-0">{leftIcon}</span>
      }
      <span className="truncate">{children}</span>
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </motion.button>
  )
}

import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, rightIcon, id, type, ...props }, ref) => {
    const [show, setShow] = useState(false)
    const isPassword = type === 'password'
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={isPassword ? (show ? 'text' : 'password') : type}
            className={cn(
              'h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100',
              leftIcon && 'pl-10',
              (rightIcon || isPassword) && 'pr-10',
              error && 'border-red-400 focus:border-red-500 focus:ring-red-500/15',
              className,
            )}
            aria-invalid={!!error}
            {...props}
          />
          {isPassword ? (
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          ) : (
            rightIcon && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{rightIcon}</span>
            )
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'

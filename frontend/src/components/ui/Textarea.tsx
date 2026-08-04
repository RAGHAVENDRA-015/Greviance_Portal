import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  maxLength?: number
  showCount?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, maxLength, showCount, id, value, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const length = typeof value === 'string' ? value.length : 0

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <div className="flex items-center justify-between">
            <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {label}
            </label>
            {showCount && maxLength && (
              <span className="text-xs text-slate-400">
                {length}/{maxLength}
              </span>
            )}
          </div>
        )}
        <textarea
          ref={ref}
          id={inputId}
          value={value}
          maxLength={maxLength}
          className={cn(
            'min-h-28 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-500/15',
            className,
          )}
          aria-invalid={!!error}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'

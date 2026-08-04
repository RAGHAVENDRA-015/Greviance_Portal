import { cn, getInitials } from '@/utils'

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover ring-2 ring-white dark:ring-slate-800', sizes[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full gradient-primary font-semibold text-white ring-2 ring-white dark:ring-slate-800',
        sizes[size],
        className,
      )}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  )
}

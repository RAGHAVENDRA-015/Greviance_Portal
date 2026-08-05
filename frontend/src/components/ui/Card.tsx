import { motion } from 'framer-motion'
import { cn } from '@/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glass?: boolean
  onClick?: () => void
}

export function Card({ children, className, hover = true, glass = true, onClick }: CardProps) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={cn(
        'rounded-2xl p-5 w-full min-w-0 overflow-hidden',
        glass ? 'glass' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

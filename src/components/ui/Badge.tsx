import { cn } from '@/utils'
import { PRIORITY_COLORS, STATUS_COLORS } from '@/constants'
import type { ComplaintPriority, ComplaintStatus } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  className?: string
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  return <Badge className={STATUS_COLORS[status]}>{status}</Badge>
}

export function PriorityBadge({ priority }: { priority: ComplaintPriority }) {
  return <Badge className={PRIORITY_COLORS[priority]}>{priority}</Badge>
}

export function DepartmentBadge({ department }: { department: string }) {
  return (
    <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
      {department}
    </Badge>
  )
}

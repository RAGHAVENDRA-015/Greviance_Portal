import { formatDate } from '@/utils'
import { cn } from '@/utils'

export interface TimelineItem {
  id: string
  title: string
  description?: string
  date: string
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

const tones = {
  default: 'bg-slate-300 dark:bg-slate-600',
  success: 'bg-emerald-500',
  warning: 'bg-orange-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  if (!items.length) {
    return <p className="text-sm text-slate-500">No activity yet.</p>
  }

  return (
    <ol className="relative space-y-6 border-l border-slate-200 pl-6 dark:border-slate-700">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span
            className={cn(
              'absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-white dark:ring-slate-900',
              tones[item.tone || 'default'],
            )}
          />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="font-semibold text-slate-900 dark:text-white">{item.title}</h4>
            <time className="text-xs text-slate-400">{formatDate(item.date, 'MMM d, yyyy HH:mm')}</time>
          </div>
          {item.description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
          )}
        </li>
      ))}
    </ol>
  )
}

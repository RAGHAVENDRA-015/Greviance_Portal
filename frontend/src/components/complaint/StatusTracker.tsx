import { Check } from 'lucide-react'
import { cn } from '@/utils'
import type { ComplaintStatus } from '@/types'

const STEPS: ComplaintStatus[] = ['Pending', 'In Progress', 'Resolved']

export function StatusTracker({ status }: { status: ComplaintStatus }) {
  const rejected = status === 'Rejected'
  const activeIndex = rejected ? -1 : STEPS.indexOf(status)

  return (
    <div className="w-full">
      {rejected ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          This complaint was rejected.
        </div>
      ) : (
        <ol className="flex items-center gap-2">
          {STEPS.map((step, i) => {
            const done = i <= activeIndex
            return (
              <li key={step} className="flex flex-1 items-center gap-2">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    done
                      ? 'gradient-primary text-white'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800',
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    'hidden text-xs font-medium sm:block',
                    done ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400',
                  )}
                >
                  {step}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 flex-1 rounded-full',
                      i < activeIndex ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700',
                    )}
                  />
                )}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

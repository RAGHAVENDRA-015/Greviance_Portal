import { Link } from 'react-router-dom'
import { MapPin, Sparkles, Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { StatusBadge, PriorityBadge, DepartmentBadge } from '@/components/ui/Badge'
import { formatRelative } from '@/utils'
import type { Complaint } from '@/types'

interface ComplaintCardProps {
  complaint: Complaint
  href: string
}

export function ComplaintCard({ complaint, href }: ComplaintCardProps) {
  return (
    <Link to={href}>
      <Card className="h-full">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-base font-bold text-slate-900 dark:text-white">
              {complaint.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
              {complaint.ai_summary || complaint.description}
            </p>
          </div>
          <StatusBadge status={complaint.status} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {complaint.priority && <PriorityBadge priority={complaint.priority} />}
          {complaint.department && <DepartmentBadge department={complaint.department} />}
          {complaint.category && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {complaint.category}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatRelative(complaint.created_at)}
          </span>
          <div className="flex items-center gap-3">
            {complaint.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                Located
              </span>
            )}
            {complaint.ai_confidence != null && (
              <span className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                <Sparkles className="h-3.5 w-3.5" />
                AI {Math.round(complaint.ai_confidence * 100)}%
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}

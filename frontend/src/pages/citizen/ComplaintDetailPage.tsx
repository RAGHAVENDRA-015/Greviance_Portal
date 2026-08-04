import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Sparkles, ArrowLeft, X } from 'lucide-react'
import { complaintsApi } from '@/api'
import { StatusTracker } from '@/components/complaint/StatusTracker'
import { StatusBadge, PriorityBadge, DepartmentBadge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Skeleton } from '@/components/ui/Skeleton'
import { Timeline, type TimelineItem } from '@/components/common/Timeline'
import { ROUTES } from '@/constants'
import { formatDate, formatRelative, getErrorMessage } from '@/utils'

export default function ComplaintDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const [lightbox, setLightbox] = useState<string | null>(null)

  const { data: complaint, isLoading, error } = useQuery({
    queryKey: ['complaints', id],
    queryFn: () => complaintsApi.getById(id),
    enabled: !!id,
  })

  const timelineItems: TimelineItem[] = useMemo(() => {
    if (!complaint) return []
    const items: TimelineItem[] = [
      {
        id: 'created',
        title: 'Complaint filed',
        description: complaint.title,
        date: complaint.created_at,
        tone: 'info',
      },
    ]
    if (complaint.updated_at !== complaint.created_at) {
      items.push({
        id: 'updated',
        title: `Status: ${complaint.status}`,
        description: complaint.resolution_notes || 'Complaint was updated',
        date: complaint.updated_at,
        tone:
          complaint.status === 'Resolved'
            ? 'success'
            : complaint.status === 'Rejected'
              ? 'danger'
              : 'warning',
      })
    }
    if (complaint.assigned_officer) {
      items.push({
        id: 'assigned',
        title: 'Officer assigned',
        description: `Officer ID: ${complaint.assigned_officer}`,
        date: complaint.updated_at,
        tone: 'default',
      })
    }
    return items
  }, [complaint])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !complaint) {
    return (
      <Alert variant="error" title="Unable to load complaint">
        {getErrorMessage(error, 'Complaint not found')}
        <div className="mt-3">
          <Link to={ROUTES.citizen.complaints}>
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to list
            </Button>
          </Link>
        </div>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: ROUTES.citizen.dashboard },
          { label: 'Complaints', href: ROUTES.citizen.complaints },
          { label: complaint.title.slice(0, 40) },
        ]}
      />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <StatusBadge status={complaint.status} />
              {complaint.priority && <PriorityBadge priority={complaint.priority} />}
              {complaint.department && <DepartmentBadge department={complaint.department} />}
              {complaint.category && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {complaint.category}
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
              {complaint.title}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Filed {formatDate(complaint.created_at)} · Updated {formatRelative(complaint.updated_at)}
            </p>
          </div>
          <Link to={ROUTES.citizen.complaints}>
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
        </div>

        <Card hover={false}>
          <CardHeader title="Status progress" />
          <StatusTracker status={complaint.status} />
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card hover={false}>
              <CardHeader title="Description" />
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {complaint.description}
              </p>
            </Card>

            {complaint.ai_summary && (
              <Card hover={false} className="border border-cyan-200/60 dark:border-cyan-800/40">
                <CardHeader
                  title="AI summary"
                  subtitle={
                    complaint.ai_confidence != null
                      ? `Confidence ${Math.round(complaint.ai_confidence * 100)}%`
                      : undefined
                  }
                  action={<Sparkles className="h-5 w-5 text-cyan-500" />}
                />
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {complaint.ai_summary}
                </p>
                {complaint.ai_confidence != null && (
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>Confidence</span>
                      <span>{Math.round(complaint.ai_confidence * 100)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${complaint.ai_confidence * 100}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </div>
                )}
              </Card>
            )}

            {complaint.images?.length > 0 && (
              <Card hover={false}>
                <CardHeader title="Evidence gallery" subtitle={`${complaint.images.length} photo(s)`} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {complaint.images.map((img) => (
                    <button
                      key={img.public_id}
                      type="button"
                      onClick={() => setLightbox(img.url)}
                      className="overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <img
                        src={img.url}
                        alt="Complaint evidence"
                        className="h-32 w-full object-cover transition hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {complaint.resolution_notes && (
              <Card hover={false}>
                <CardHeader title="Resolution notes" />
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {complaint.resolution_notes}
                </p>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {complaint.location && (
              <Card hover={false}>
                <CardHeader title="Location" action={<MapPin className="h-4 w-4 text-primary-500" />} />
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Lat {complaint.location.latitude.toFixed(5)}
                  <br />
                  Lng {complaint.location.longitude.toFixed(5)}
                </p>
                <a
                  href={`https://www.google.com/maps?q=${complaint.location.latitude},${complaint.location.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm font-medium text-primary-600 hover:underline"
                >
                  Open in Maps
                </a>
              </Card>
            )}

            <Card hover={false}>
              <CardHeader title="Activity" />
              <Timeline items={timelineItems} />
            </Card>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
              onClick={() => setLightbox(null)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={lightbox}
              alt="Full size evidence"
              className="max-h-[90vh] max-w-full rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

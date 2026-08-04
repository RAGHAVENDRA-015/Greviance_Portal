import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, MapPin, Sparkles, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { complaintsApi } from '@/api'
import { StatusTracker } from '@/components/complaint/StatusTracker'
import { StatusBadge, PriorityBadge, DepartmentBadge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Alert } from '@/components/ui/Alert'
import { Skeleton } from '@/components/ui/Skeleton'
import { Timeline, type TimelineItem } from '@/components/common/Timeline'
import { COMPLAINT_STATUSES, ROUTES } from '@/constants'
import { formatDate, formatRelative, getErrorMessage } from '@/utils'
import type { ComplaintStatus } from '@/types'

export default function OfficerComplaintDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<ComplaintStatus | ''>('')
  const [notes, setNotes] = useState('')

  const { data: complaint, isLoading, error } = useQuery({
    queryKey: ['complaints', id],
    queryFn: () => complaintsApi.getById(id),
    enabled: !!id,
  })

  useEffect(() => {
    if (complaint) {
      setStatus(complaint.status)
      setNotes(complaint.resolution_notes ?? '')
    }
  }, [complaint])

  const mutation = useMutation({
    mutationFn: () =>
      complaintsApi.updateStatus(id, {
        status: status as ComplaintStatus,
        resolution_notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints', id] })
      queryClient.invalidateQueries({ queryKey: ['complaints', 'department'] })
      toast.success('Complaint updated')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Update failed')),
  })

  const timelineItems: TimelineItem[] = useMemo(() => {
    if (!complaint) return []
    return [
      {
        id: 'created',
        title: 'Filed by citizen',
        description: complaint.title,
        date: complaint.created_at,
        tone: 'info',
      },
      {
        id: 'status',
        title: `Current status: ${complaint.status}`,
        description: complaint.resolution_notes || undefined,
        date: complaint.updated_at,
        tone: complaint.status === 'Resolved' ? 'success' : 'warning',
      },
    ]
  }, [complaint])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error || !complaint) {
    return (
      <Alert variant="error" title="Unable to load complaint">
        {getErrorMessage(error, 'Complaint not found')}
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: ROUTES.officer.dashboard },
          { label: 'Queue', href: ROUTES.officer.queue },
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
            </div>
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{complaint.title}</h1>
            <p className="mt-2 text-sm text-slate-500">
              Filed {formatDate(complaint.created_at)} · Updated {formatRelative(complaint.updated_at)}
            </p>
          </div>
          <Link to={ROUTES.officer.queue}>
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Queue
            </Button>
          </Link>
        </div>

        <Card hover={false}>
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
              <Card hover={false}>
                <CardHeader
                  title="AI summary"
                  action={<Sparkles className="h-5 w-5 text-cyan-500" />}
                />
                <p className="text-sm text-slate-700 dark:text-slate-300">{complaint.ai_summary}</p>
                {complaint.ai_confidence != null && (
                  <p className="mt-2 text-xs font-medium text-cyan-600">
                    Confidence {Math.round(complaint.ai_confidence * 100)}%
                  </p>
                )}
              </Card>
            )}

            {complaint.images?.length > 0 && (
              <Card hover={false}>
                <CardHeader title="Evidence" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {complaint.images.map((img) => (
                    <img
                      key={img.public_id}
                      src={img.url}
                      alt="Evidence"
                      className="h-32 w-full rounded-xl object-cover"
                    />
                  ))}
                </div>
              </Card>
            )}

            <Card hover={false}>
              <CardHeader title="Update status" subtitle="Change status and add resolution notes" />
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ComplaintStatus)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-900/80"
                  >
                    {COMPLAINT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <Textarea
                  label="Resolution notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={2000}
                  showCount
                  placeholder="Describe actions taken or reasons for rejection…"
                />
                <Button
                  leftIcon={<Save className="h-4 w-4" />}
                  loading={mutation.isPending}
                  onClick={() => mutation.mutate()}
                  disabled={!status}
                >
                  Save update
                </Button>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            {complaint.location && (
              <Card hover={false}>
                <CardHeader title="Location" action={<MapPin className="h-4 w-4 text-primary-500" />} />
                <p className="text-sm">
                  {complaint.location.latitude.toFixed(5)}, {complaint.location.longitude.toFixed(5)}
                </p>
              </Card>
            )}
            <Card hover={false}>
              <CardHeader title="Activity" />
              <Timeline items={timelineItems} />
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

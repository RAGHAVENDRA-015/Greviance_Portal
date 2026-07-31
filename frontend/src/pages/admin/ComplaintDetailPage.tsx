import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, MapPin, Sparkles, Save, UserPlus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi, complaintsApi } from '@/api'
import { StatusTracker } from '@/components/complaint/StatusTracker'
import { StatusBadge, PriorityBadge, DepartmentBadge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Alert } from '@/components/ui/Alert'
import { Skeleton } from '@/components/ui/Skeleton'
import { Modal } from '@/components/ui/Modal'
import { Timeline, type TimelineItem } from '@/components/common/Timeline'
import { COMPLAINT_STATUSES, DEPARTMENTS, ROUTES } from '@/constants'
import { formatDate, formatRelative, getErrorMessage } from '@/utils'
import type { ComplaintStatus } from '@/types'

export default function AdminComplaintDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<ComplaintStatus | ''>('')
  const [notes, setNotes] = useState('')
  const [officerId, setOfficerId] = useState('')
  const [department, setDepartment] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: complaint, isLoading, error } = useQuery({
    queryKey: ['complaints', id],
    queryFn: () => complaintsApi.getById(id),
    enabled: !!id,
  })

  const { data: officers = [] } = useQuery({
    queryKey: ['admin', 'officers'],
    queryFn: adminApi.officers,
  })

  useEffect(() => {
    if (complaint) {
      setStatus(complaint.status)
      setNotes(complaint.resolution_notes ?? '')
      setOfficerId(complaint.assigned_officer ?? '')
      setDepartment(complaint.department ?? '')
    }
  }, [complaint])

  const statusMutation = useMutation({
    mutationFn: () =>
      complaintsApi.updateStatus(id, {
        status: status as ComplaintStatus,
        resolution_notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints', id] })
      queryClient.invalidateQueries({ queryKey: ['complaints', 'all'] })
      toast.success('Status updated')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Status update failed')),
  })

  const assignMutation = useMutation({
    mutationFn: () =>
      complaintsApi.assignOfficer(id, {
        officer_id: officerId,
        department: department || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints', id] })
      queryClient.invalidateQueries({ queryKey: ['complaints', 'all'] })
      toast.success('Officer assigned')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Assign failed')),
  })

  const deleteMutation = useMutation({
    mutationFn: () => complaintsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] })
      toast.success('Complaint deleted')
      navigate(ROUTES.admin.complaints)
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Delete failed')),
  })

  const timelineItems: TimelineItem[] = useMemo(() => {
    if (!complaint) return []
    return [
      {
        id: 'created',
        title: 'Complaint created',
        description: complaint.title,
        date: complaint.created_at,
        tone: 'info',
      },
      {
        id: 'updated',
        title: `Status: ${complaint.status}`,
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
          { label: 'Dashboard', href: ROUTES.admin.dashboard },
          { label: 'Complaints', href: ROUTES.admin.complaints },
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
          <div className="flex flex-wrap gap-2">
            <Link to={ROUTES.admin.complaints}>
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back
              </Button>
            </Link>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          </div>
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
              <CardHeader title="Update status" />
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Status</label>
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
                />
                <Button
                  leftIcon={<Save className="h-4 w-4" />}
                  loading={statusMutation.isPending}
                  onClick={() => statusMutation.mutate()}
                  disabled={!status}
                >
                  Save status
                </Button>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card hover={false}>
              <CardHeader title="Assign officer" action={<UserPlus className="h-4 w-4 text-primary-500" />} />
              <div className="space-y-3">
                <select
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-900/80"
                >
                  <option value="">Select officer</option>
                  {officers
                    .filter((o) => o.is_active)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                        {o.department ? ` · ${o.department}` : ''}
                      </option>
                    ))}
                </select>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-900/80"
                >
                  <option value="">Department</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <Button
                  className="w-full"
                  loading={assignMutation.isPending}
                  disabled={!officerId}
                  onClick={() => assignMutation.mutate()}
                >
                  Assign
                </Button>
              </div>
            </Card>

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

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete complaint"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Permanently delete this complaint? This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}

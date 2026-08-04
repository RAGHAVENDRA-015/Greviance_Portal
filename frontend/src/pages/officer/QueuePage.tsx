import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Filter, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { complaintsApi } from '@/api'
import { useFilterStore } from '@/store'
import { useFilteredComplaints, usePagination } from '@/hooks'
import { SearchBox } from '@/components/ui/SearchBox'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'
import { COMPLAINT_STATUSES, ROUTES } from '@/constants'
import { formatRelative, getErrorMessage } from '@/utils'
import type { Complaint, ComplaintStatus, StatusUpdatePayload } from '@/types'

export default function QueuePage() {
  const queryClient = useQueryClient()
  const { search, status, setSearch, setStatus, reset } = useFilterStore()
  const [selected, setSelected] = useState<Complaint | null>(null)
  const [newStatus, setNewStatus] = useState<ComplaintStatus>('In Progress')
  const [notes, setNotes] = useState('')

  const { data: queue, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['complaints', 'department'],
    queryFn: complaintsApi.departmentQueue,
  })

  const filtered = useFilteredComplaints(queue)
  const { page, setPage, totalPages, items } = usePagination(filtered, 10)

  useEffect(() => {
    setPage(1)
  }, [search, status, setPage])

  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: StatusUpdatePayload }) =>
      complaintsApi.updateStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints', 'department'] })
      toast.success('Status updated')
      setSelected(null)
      setNotes('')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to update status')),
  })

  const openUpdate = (complaint: Complaint) => {
    setSelected(complaint)
    setNewStatus(complaint.status === 'Pending' ? 'In Progress' : complaint.status)
    setNotes(complaint.resolution_notes ?? '')
  }

  const submitUpdate = () => {
    if (!selected) return
    mutation.mutate({
      id: selected.id,
      payload: {
        status: newStatus,
        resolution_notes: notes.trim() || undefined,
      },
    })
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: ROUTES.officer.dashboard },
          { label: 'Queue' },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Department Queue</h1>
          <p className="mt-1 text-sm text-slate-500">Review and update complaint statuses</p>
        </div>
        <Button
          variant="outline"
          leftIcon={<RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />}
          onClick={() => refetch()}
        >
          Refresh
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-4"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search queue…"
            className="flex-1"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ComplaintStatus | 'all')}
              className="h-11 rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-900/80"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              {COMPLAINT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Button variant="ghost" size="sm" onClick={reset}>
              Reset
            </Button>
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : items.length === 0 ? (
        <EmptyState title="No complaints in queue" description="Nothing matches your filters." />
      ) : (
        <>
          <Card hover={false} className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Complaint</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Priority</th>
                    <th className="px-4 py-3 font-semibold">Updated</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={ROUTES.officer.complaintDetail(c.id)}
                          className="font-semibold text-slate-900 hover:text-primary-600 dark:text-white"
                        >
                          {c.title}
                        </Link>
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                          {c.category || c.department || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-3">
                        {c.priority ? <PriorityBadge priority={c.priority} /> : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatRelative(c.updated_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => openUpdate(c)}>
                          Update
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Update status"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button loading={mutation.isPending} onClick={submitUpdate}>
              Save
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold">{selected.title}</span>
            </p>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
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
              placeholder="Optional notes for the citizen…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              showCount
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

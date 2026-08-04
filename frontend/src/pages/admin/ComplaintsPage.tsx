import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Filter, UserPlus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi, complaintsApi } from '@/api'
import { useFilterStore } from '@/store'
import { useFilteredComplaints, usePagination } from '@/hooks'
import { SearchBox } from '@/components/ui/SearchBox'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, DEPARTMENTS, ROUTES } from '@/constants'
import { formatRelative, getErrorMessage } from '@/utils'
import type { Complaint, ComplaintCategory, ComplaintStatus } from '@/types'

export default function ComplaintsPage() {
  const queryClient = useQueryClient()
  const { search, status, category, setSearch, setStatus, setCategory, reset } = useFilterStore()
  const [assignTarget, setAssignTarget] = useState<Complaint | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Complaint | null>(null)
  const [officerId, setOfficerId] = useState('')
  const [department, setDepartment] = useState('')

  const { data: complaints, isLoading } = useQuery({
    queryKey: ['complaints', 'all'],
    queryFn: complaintsApi.listAll,
  })

  const { data: officers = [] } = useQuery({
    queryKey: ['admin', 'officers'],
    queryFn: adminApi.officers,
    enabled: !!assignTarget,
  })

  const filtered = useFilteredComplaints(complaints)
  const { page, setPage, totalPages, items } = usePagination(filtered, 10)

  useEffect(() => {
    setPage(1)
  }, [search, status, category, setPage])

  const assignMutation = useMutation({
    mutationFn: () =>
      complaintsApi.assignOfficer(assignTarget!.id, {
        officer_id: officerId,
        department: department || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] })
      toast.success('Officer assigned')
      setAssignTarget(null)
      setOfficerId('')
      setDepartment('')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Assign failed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => complaintsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] })
      toast.success('Complaint deleted')
      setDeleteTarget(null)
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Delete failed')),
  })

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: ROUTES.admin.dashboard },
          { label: 'Complaints' },
        ]}
      />

      <div>
        <h1 className="font-display text-2xl font-extrabold">All Complaints</h1>
        <p className="mt-1 text-sm text-slate-500">Assign officers, filter, and manage records</p>
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
            placeholder="Search complaints…"
            className="flex-1"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ComplaintStatus | 'all')}
              className="h-11 rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-900/80"
            >
              <option value="all">All statuses</option>
              {COMPLAINT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ComplaintCategory | 'all')}
              className="h-11 rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-900/80"
            >
              <option value="all">All categories</option>
              {COMPLAINT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
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
        <EmptyState title="No complaints found" description="Adjust filters or wait for new filings." />
      ) : (
        <>
          <Card hover={false} className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Complaint</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Priority</th>
                    <th className="px-4 py-3 font-semibold">Officer</th>
                    <th className="px-4 py-3 font-semibold">Updated</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-slate-100 dark:border-slate-800"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={ROUTES.admin.complaintDetail(c.id)}
                          className="font-semibold text-slate-900 hover:text-primary-600 dark:text-white"
                        >
                          {c.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {c.department || c.category || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-3">
                        {c.priority ? <PriorityBadge priority={c.priority} /> : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {c.assigned_officer ? `${c.assigned_officer.slice(0, 8)}…` : 'Unassigned'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatRelative(c.updated_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                            onClick={() => {
                              setAssignTarget(c)
                              setDepartment(c.department ?? '')
                              setOfficerId(c.assigned_officer ?? '')
                            }}
                          >
                            Assign
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                            onClick={() => setDeleteTarget(c)}
                          >
                            Delete
                          </Button>
                        </div>
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
        open={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        title="Assign officer"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAssignTarget(null)}>
              Cancel
            </Button>
            <Button
              loading={assignMutation.isPending}
              disabled={!officerId}
              onClick={() => assignMutation.mutate()}
            >
              Assign
            </Button>
          </>
        }
      >
        {assignTarget && (
          <div className="space-y-4">
            <p className="text-sm">
              Assign an officer to <span className="font-semibold">{assignTarget.title}</span>
            </p>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Officer</label>
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
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Department (optional)</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-900/80"
              >
                <option value="">Keep / select department</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete complaint"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Permanently delete <span className="font-semibold">{deleteTarget.title}</span>? This cannot
            be undone.
          </p>
        )}
      </Modal>
    </div>
  )
}

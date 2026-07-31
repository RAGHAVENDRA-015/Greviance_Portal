import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { PlusCircle, Filter } from 'lucide-react'
import { complaintsApi } from '@/api'
import { useFilterStore } from '@/store'
import { useFilteredComplaints, usePagination } from '@/hooks'
import { ComplaintCard } from '@/components/complaint/ComplaintCard'
import { SearchBox } from '@/components/ui/SearchBox'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { Button } from '@/components/ui/Button'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, ROUTES } from '@/constants'
import type { ComplaintCategory, ComplaintStatus } from '@/types'

export default function ComplaintsListPage() {
  const navigate = useNavigate()
  const { search, status, category, setSearch, setStatus, setCategory, reset } = useFilterStore()

  const { data: complaints, isLoading } = useQuery({
    queryKey: ['complaints', 'my'],
    queryFn: complaintsApi.myComplaints,
  })

  const filtered = useFilteredComplaints(complaints)
  const { page, setPage, totalPages, items } = usePagination(filtered, 8)

  useEffect(() => {
    setPage(1)
  }, [search, status, category, setPage])

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: ROUTES.citizen.dashboard },
          { label: 'My Complaints' },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
            My Complaints
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Search and filter your filed grievances
          </p>
        </div>
        <Button
          leftIcon={<PlusCircle className="h-4 w-4" />}
          onClick={() => navigate(ROUTES.citizen.createComplaint)}
        >
          New Complaint
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
            placeholder="Search title, description, category…"
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
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ComplaintCategory | 'all')}
              className="h-11 rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-900/80"
              aria-label="Filter by category"
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
        <TableSkeleton rows={6} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No complaints found"
          description={
            complaints?.length
              ? 'Try adjusting your search or filters.'
              : 'You have not filed any complaints yet.'
          }
          actionLabel="Create complaint"
          onAction={() => navigate(ROUTES.citizen.createComplaint)}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((complaint, i) => (
              <motion.div
                key={complaint.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <ComplaintCard
                  complaint={complaint}
                  href={ROUTES.citizen.complaintDetail(complaint.id)}
                />
              </motion.div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  )
}

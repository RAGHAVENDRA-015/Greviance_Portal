import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  Loader2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { complaintsApi } from '@/api'
import { useAuthStore } from '@/store'
import { StatCard, ProgressRing } from '@/components/dashboard/StatCard'
import { ComplaintCard } from '@/components/complaint/ComplaintCard'
import { StatusPieChart, DepartmentBarChart, ResolutionLineChart } from '@/components/charts/Charts'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ROUTES } from '@/constants'
import { computeStats, formatDate, percent } from '@/utils'
import type { Complaint } from '@/types'

function buildDeptData(complaints: Complaint[]) {
  const map = new Map<string, number>()
  for (const c of complaints) {
    const key = c.department || c.category || 'Unassigned'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
}

function buildResolutionData(complaints: Complaint[]) {
  const map = new Map<string, { resolved: number; pending: number }>()
  const sorted = [...complaints].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  for (const c of sorted) {
    const key = formatDate(c.created_at, 'MMM d')
    const entry = map.get(key) ?? { resolved: 0, pending: 0 }
    if (c.status === 'Resolved') entry.resolved += 1
    else if (c.status !== 'Rejected') entry.pending += 1
    map.set(key, entry)
  }
  return Array.from(map.entries())
    .slice(-7)
    .map(([name, v]) => ({ name, ...v }))
}

export default function OfficerDashboard() {
  const user = useAuthStore((s) => s.user)

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['complaints', 'department'],
    queryFn: complaintsApi.departmentQueue,
  })

  const stats = useMemo(() => computeStats(queue), [queue])
  const resolvedRate = percent(stats.resolved, stats.total)

  const pieData = useMemo(
    () =>
      [
        { name: 'Pending', value: stats.pending },
        { name: 'In Progress', value: stats.inProgress },
        { name: 'Resolved', value: stats.resolved },
        { name: 'Rejected', value: stats.rejected },
      ].filter((d) => d.value > 0),
    [stats],
  )

  const deptData = useMemo(() => buildDeptData(queue), [queue])
  const resolutionData = useMemo(() => buildResolutionData(queue), [queue])

  const pendingPreview = useMemo(
    () =>
      queue
        .filter((c) => c.status === 'Pending' || c.status === 'In Progress')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4),
    [queue],
  )

  const firstName = user?.name?.split(' ')[0] ?? 'Officer'

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl gradient-primary p-6 text-white sm:p-8"
      >
        <div className="absolute inset-0 opacity-30 mesh-bg" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-white/70">
              Officer Workspace
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold">Hello, {firstName}</h1>
            <p className="mt-2 max-w-xl text-white/85">
              {user?.department
                ? `Managing the ${user.department} queue.`
                : 'Review department complaints and update resolution status.'}
            </p>
          </div>
          <Link to={ROUTES.officer.queue}>
            <Button className="bg-white text-primary-700 shadow-none hover:bg-white/90">
              Open queue
            </Button>
          </Link>
        </div>
      </motion.section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Queue total" value={stats.total} icon={ClipboardList} color="blue" />
            <StatCard title="Pending" value={stats.pending} icon={Clock} color="orange" delay={0.05} />
            <StatCard
              title="In progress"
              value={stats.inProgress}
              icon={Loader2}
              color="indigo"
              delay={0.1}
            />
            <StatCard
              title="Resolved"
              value={stats.resolved}
              icon={CheckCircle2}
              color="emerald"
              delay={0.15}
              trend={`${resolvedRate}% resolution rate`}
            />
          </>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {pieData.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              <StatusPieChart data={pieData} />
              {deptData.length > 0 && <DepartmentBarChart data={deptData} />}
            </div>
          )}
          {resolutionData.length > 0 && <ResolutionLineChart data={resolutionData} />}
          {!isLoading && queue.length === 0 && (
            <EmptyState
              title="Queue is empty"
              description="No department complaints are assigned yet."
            />
          )}
        </div>

        <Card hover={false} className="flex flex-col items-center justify-center gap-4">
          <CardHeader
            title="Performance"
            subtitle="Resolved vs total queue"
            action={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          />
          <ProgressRing value={stats.resolved} total={stats.total || 1} label="Resolved rate" />
          <div className="w-full space-y-2 text-sm">
            <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
              <span className="text-slate-500">Active workload</span>
              <span className="font-semibold">{stats.pending + stats.inProgress}</span>
            </div>
            <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
              <span className="text-slate-500">Rejected</span>
              <span className="font-semibold">{stats.rejected}</span>
            </div>
          </div>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Pending queue</h2>
          <Link
            to={ROUTES.officer.queue}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
          >
            Full queue <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {pendingPreview.length === 0 && !isLoading ? (
          <EmptyState title="No pending items" description="You're all caught up." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {pendingPreview.map((c) => (
              <ComplaintCard key={c.id} complaint={c} href={ROUTES.officer.complaintDetail(c.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FileText,
  Users,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Server,
} from 'lucide-react'
import { adminApi, complaintsApi } from '@/api'
import { StatCard } from '@/components/dashboard/StatCard'
import { StatusPieChart, DepartmentBarChart } from '@/components/charts/Charts'
import { ComplaintCard } from '@/components/complaint/ComplaintCard'
import { Card, CardHeader } from '@/components/ui/Card'
import { StatCardSkeleton } from '@/components/ui/Skeleton'
import { Timeline, type TimelineItem } from '@/components/common/Timeline'
import { EmptyState } from '@/components/ui/EmptyState'
import { ROUTES } from '@/constants'
import { formatRelative } from '@/utils'

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.dashboard,
  })

  const { data: allComplaints = [] } = useQuery({
    queryKey: ['complaints', 'all'],
    queryFn: complaintsApi.listAll,
  })

  const pieData = useMemo(() => {
    if (!stats) return []
    return [
      { name: 'Pending', value: stats.pending },
      { name: 'In Progress', value: stats.in_progress },
      { name: 'Resolved', value: stats.resolved },
      { name: 'Rejected', value: stats.rejected },
    ].filter((d) => d.value > 0)
  }, [stats])

  const deptData = useMemo(() => {
    if (!stats?.by_department) return []
    return Object.entries(stats.by_department).map(([name, count]) => ({ name, count }))
  }, [stats])

  const recent = useMemo(() => {
    const source = stats?.recent_complaints?.length
      ? stats.recent_complaints
      : [...allComplaints].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
    return source.slice(0, 4)
  }, [stats, allComplaints])

  const timelineItems: TimelineItem[] = useMemo(
    () =>
      [...allComplaints]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 8)
        .map((c) => ({
          id: c.id,
          title: c.title,
          description: `${c.status}${c.department ? ` · ${c.department}` : ''}`,
          date: c.updated_at,
          tone:
            c.status === 'Resolved'
              ? 'success'
              : c.status === 'Rejected'
                ? 'danger'
                : c.status === 'In Progress'
                  ? 'info'
                  : 'warning',
        })),
    [allComplaints],
  )

  return (
    <div className="space-y-6 sm:space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl gradient-primary p-4 sm:p-6 md:p-8 text-white"
      >
        <div className="absolute inset-0 opacity-30 mesh-bg" />
        <div className="relative z-10">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-white/70">
            Admin Control Center
          </p>
          <h1 className="mt-1 sm:mt-2 font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold">System Analytics</h1>
          <p className="mt-1 sm:mt-2 max-w-2xl text-xs sm:text-sm md:text-base text-white/85">
            Monitor platform health, department workload, and citizen grievance throughput.
          </p>
        </div>
      </motion.section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {statsLoading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Total complaints" value={stats.total_complaints} icon={FileText} color="blue" />
            <StatCard title="Pending" value={stats.pending} icon={Clock} color="orange" delay={0.05} />
            <StatCard
              title="Resolved"
              value={stats.resolved}
              icon={CheckCircle2}
              color="emerald"
              delay={0.1}
            />
            <StatCard title="Users" value={stats.total_users} icon={Users} color="indigo" delay={0.15} />
          </>
        )}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {stats && (
          <>
            <StatCard
              title="In progress"
              value={stats.in_progress}
              icon={Activity}
              color="cyan"
            />
            <StatCard
              title="Rejected"
              value={stats.rejected}
              icon={AlertTriangle}
              color="red"
              delay={0.05}
            />
            <StatCard
              title="Officers"
              value={stats.total_officers}
              icon={Shield}
              color="indigo"
              delay={0.1}
            />
            <Card hover={false} className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">System health</p>
                <p className="font-display text-xl font-extrabold text-emerald-600">Operational</p>
              </div>
            </Card>
          </>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {pieData.length > 0 && <StatusPieChart data={pieData} />}
        {deptData.length > 0 ? (
          <DepartmentBarChart data={deptData} />
        ) : (
          !statsLoading && (
            <Card hover={false}>
              <EmptyState title="No department data" description="Department breakdown will appear as complaints are routed." />
            </Card>
          )
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 overflow-hidden space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Recent complaints</h2>
            <Link
              to={ROUTES.admin.complaints}
              className="text-sm font-medium text-primary-600 hover:underline"
            >
              Manage all
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState title="No complaints yet" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {recent.map((c) => (
                <ComplaintCard key={c.id} complaint={c} href={ROUTES.admin.complaintDetail(c.id)} />
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 overflow-hidden space-y-4">
          <Card hover={false}>
            <CardHeader title="System health" subtitle="Service indicators" />
            <ul className="space-y-3 text-sm">
              {[
                { label: 'API gateway', status: 'Healthy' },
                { label: 'AI routing', status: 'Healthy' },
                { label: 'Storage', status: 'Healthy' },
                {
                  label: 'Last activity',
                  status: timelineItems[0] ? formatRelative(timelineItems[0].date) : '—',
                },
              ].map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60"
                >
                  <span className="text-slate-500">{row.label}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {row.status}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card hover={false}>
            <CardHeader title="Recent activity" />
            <Timeline items={timelineItems.slice(0, 5)} />
          </Card>
        </div>
      </section>
    </div>
  )
}

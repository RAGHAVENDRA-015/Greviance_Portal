import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Sparkles,
  ArrowRight,
  List,
} from 'lucide-react'
import { complaintsApi } from '@/api'
import { useAuthStore } from '@/store'
import { StatCard, ProgressRing } from '@/components/dashboard/StatCard'
import { ComplaintCard } from '@/components/complaint/ComplaintCard'
import { StatusPieChart, TrendAreaChart, ResolutionLineChart } from '@/components/charts/Charts'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatCardSkeleton } from '@/components/ui/Skeleton'
import { Timeline, type TimelineItem } from '@/components/common/Timeline'
import { EmptyState } from '@/components/ui/EmptyState'
import { ROUTES } from '@/constants'
import { computeStats, formatDate, percent } from '@/utils'
import type { Complaint } from '@/types'

function buildTrendData(complaints: Complaint[]) {
  const map = new Map<string, number>()
  const sorted = [...complaints].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  for (const c of sorted) {
    const key = formatDate(c.created_at, 'MMM d')
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .slice(-7)
    .map(([name, count]) => ({ name, count }))
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
    else if (c.status === 'Pending' || c.status === 'In Progress') entry.pending += 1
    map.set(key, entry)
  }
  return Array.from(map.entries())
    .slice(-7)
    .map(([name, v]) => ({ name, ...v }))
}

function statusTone(status: Complaint['status']): TimelineItem['tone'] {
  switch (status) {
    case 'Resolved':
      return 'success'
    case 'Rejected':
      return 'danger'
    case 'In Progress':
      return 'info'
    default:
      return 'warning'
  }
}

export default function CitizenDashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['complaints', 'my'],
    queryFn: complaintsApi.myComplaints,
  })

  const stats = useMemo(() => computeStats(complaints), [complaints])

  const pieData = useMemo(
    () => [
      { name: 'Pending', value: stats.pending },
      { name: 'In Progress', value: stats.inProgress },
      { name: 'Resolved', value: stats.resolved },
      { name: 'Rejected', value: stats.rejected },
    ].filter((d) => d.value > 0),
    [stats],
  )

  const trendData = useMemo(() => buildTrendData(complaints), [complaints])
  const resolutionData = useMemo(() => buildResolutionData(complaints), [complaints])

  const recent = useMemo(
    () =>
      [...complaints]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 4),
    [complaints],
  )

  const aiHighlights = useMemo(
    () =>
      complaints
        .filter((c) => c.ai_summary)
        .sort((a, b) => (b.ai_confidence ?? 0) - (a.ai_confidence ?? 0))
        .slice(0, 3),
    [complaints],
  )

  const timelineItems: TimelineItem[] = useMemo(
    () =>
      [...complaints]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 6)
        .map((c) => ({
          id: c.id,
          title: c.title,
          description: `Status: ${c.status}${c.ai_summary ? ` · ${c.ai_summary.slice(0, 80)}…` : ''}`,
          date: c.updated_at,
          tone: statusTone(c.status),
        })),
    [complaints],
  )

  const firstName = user?.name?.split(' ')[0] ?? 'Citizen'

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl gradient-primary p-6 text-white sm:p-8"
      >
        <div className="absolute inset-0 opacity-30 mesh-bg" />
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-white/70">Citizen Portal</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 max-w-xl text-white/85">
              Track your grievances, review AI insights, and file new issues in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to={ROUTES.citizen.createComplaint}>
              <Button
                leftIcon={<PlusCircle className="h-4 w-4" />}
                className="bg-white text-primary-700 shadow-none hover:bg-white/90"
              >
                New Complaint
              </Button>
            </Link>
            <Link to={ROUTES.citizen.complaints}>
              <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
                View all
              </Button>
            </Link>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Total" value={stats.total} icon={FileText} color="blue" delay={0} />
            <StatCard title="Pending" value={stats.pending} icon={Clock} color="orange" delay={0.05} />
            <StatCard
              title="In Progress"
              value={stats.inProgress}
              icon={AlertCircle}
              color="indigo"
              delay={0.1}
            />
            <StatCard
              title="Resolved"
              value={stats.resolved}
              icon={CheckCircle2}
              color="emerald"
              delay={0.15}
              trend={stats.total ? `${percent(stats.resolved, stats.total)}% resolved` : undefined}
            />
          </>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {pieData.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              <StatusPieChart data={pieData} />
              {trendData.length > 0 && <TrendAreaChart data={trendData} title="Your filing trend" />}
            </div>
          ) : (
            !isLoading && (
              <EmptyState
                title="No complaints yet"
                description="File your first civic issue to see analytics and AI summaries here."
                actionLabel="Create complaint"
                onAction={() => navigate(ROUTES.citizen.createComplaint)}
                icon={<FileText className="h-7 w-7" />}
              />
            )
          )}
          {resolutionData.length > 0 && <ResolutionLineChart data={resolutionData} />}
        </div>

        <Card hover={false} className="flex flex-col items-center justify-center gap-4">
          <CardHeader title="Resolution rate" subtitle="Of your total complaints" />
          <ProgressRing value={stats.resolved} total={stats.total || 1} label="Resolved" />
          <div className="grid w-full grid-cols-2 gap-3 text-center text-sm">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="font-display text-xl font-bold">{stats.pending}</p>
              <p className="text-xs text-slate-500">Pending</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="font-display text-xl font-bold">{stats.inProgress}</p>
              <p className="text-xs text-slate-500">Active</p>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Recent complaints</h2>
            <Link
              to={ROUTES.citizen.complaints}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
            >
              See all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {recent.length === 0 && !isLoading ? (
            <EmptyState title="Nothing here yet" description="Your recent filings will appear here." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {recent.map((c) => (
                <ComplaintCard key={c.id} complaint={c} href={ROUTES.citizen.complaintDetail(c.id)} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card hover={false}>
            <CardHeader
              title="Quick actions"
              subtitle="Jump into common tasks"
              action={<List className="h-4 w-4 text-slate-400" />}
            />
            <div className="space-y-2">
              <Link to={ROUTES.citizen.createComplaint}>
                <Button className="w-full" leftIcon={<PlusCircle className="h-4 w-4" />}>
                  File a complaint
                </Button>
              </Link>
              <Link to={ROUTES.citizen.complaints}>
                <Button className="w-full" variant="outline" leftIcon={<FileText className="h-4 w-4" />}>
                  Browse my complaints
                </Button>
              </Link>
              <Link to={ROUTES.citizen.profile}>
                <Button className="w-full" variant="ghost">
                  Update profile
                </Button>
              </Link>
            </div>
          </Card>

          <Card hover={false}>
            <CardHeader
              title="AI highlights"
              subtitle="Summaries with highest confidence"
              action={<Sparkles className="h-4 w-4 text-cyan-500" />}
            />
            {aiHighlights.length === 0 ? (
              <p className="text-sm text-slate-500">AI summaries will appear after you file complaints.</p>
            ) : (
              <ul className="space-y-3">
                {aiHighlights.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={ROUTES.citizen.complaintDetail(c.id)}
                      className="block rounded-xl bg-slate-50 p-3 transition hover:bg-primary-50 dark:bg-slate-800/50 dark:hover:bg-primary-950/40"
                    >
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{c.ai_summary}</p>
                      {c.ai_confidence != null && (
                        <p className="mt-1 text-xs font-medium text-cyan-600">
                          Confidence {Math.round(c.ai_confidence * 100)}%
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>

      <Card hover={false}>
        <CardHeader title="Recent activity" subtitle="Latest updates on your complaints" />
        <Timeline items={timelineItems} />
      </Card>
    </div>
  )
}

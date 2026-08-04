import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardHeader } from '@/components/ui/Card'

const COLORS = ['#2563eb', '#4f46e5', '#06b6d4', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#64748b']

interface ChartCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}

function ChartCard({ title, subtitle, children, className }: ChartCardProps) {
  return (
    <Card hover={false} className={className}>
      <CardHeader title={title} subtitle={subtitle} />
      <div className="h-64 w-full">{children}</div>
    </Card>
  )
}

export function StatusPieChart({
  data,
}: {
  data: { name: string; value: number }[]
}) {
  return (
    <ChartCard title="Status Distribution" subtitle="Complaints by current status">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function TrendAreaChart({
  data,
  title = 'Complaint Trend',
}: {
  data: { name: string; count: number }[]
  title?: string
}) {
  return (
    <ChartCard title={title} subtitle="Volume over recent periods">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Area type="monotone" dataKey="count" stroke="#2563eb" fill="url(#trendFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function DepartmentBarChart({
  data,
}: {
  data: { name: string; count: number }[]
}) {
  return (
    <ChartCard title="By Department" subtitle="Workload across departments">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#4f46e5" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function ResolutionLineChart({
  data,
}: {
  data: { name: string; resolved: number; pending: number }[]
}) {
  return (
    <ChartCard title="Resolution Pace" subtitle="Resolved vs pending">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="pending" stroke="#f97316" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

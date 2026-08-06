import React from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn, percent } from '@/utils'

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  trend?: string
  color?: 'blue' | 'indigo' | 'emerald' | 'cyan' | 'orange' | 'red'
  delay?: number
}

const colorMap = {
  blue: 'from-blue-500 to-blue-600 shadow-blue-500/25',
  indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-500/25',
  emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/25',
  cyan: 'from-cyan-500 to-cyan-600 shadow-cyan-500/25',
  orange: 'from-orange-500 to-orange-600 shadow-orange-500/25',
  red: 'from-red-500 to-red-600 shadow-red-500/25',
}

export const StatCard = React.memo(function StatCard({ title, value, icon: Icon, trend, color = 'blue', delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -4 }}
      className="glass rounded-2xl p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 font-display text-3xl font-extrabold text-slate-900 dark:text-white">
            {value}
          </p>
          {trend && <p className="mt-2 text-xs font-medium text-emerald-600">{trend}</p>}
        </div>
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg',
            colorMap[color],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  )
})

export const ProgressRing = React.memo(function ProgressRing({
  value,
  total,
  label,
}: {
  value: number
  total: number
  label: string
}) {
  const pct = percent(value, total)
  const r = 36
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} strokeWidth="8" className="fill-none stroke-slate-200 dark:stroke-slate-700" />
        <motion.circle
          cx="48"
          cy="48"
          r={r}
          strokeWidth="8"
          strokeLinecap="round"
          className="fill-none stroke-primary-500"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="-mt-16 text-center">
        <p className="font-display text-lg font-bold">{pct}%</p>
      </div>
      <p className="mt-8 text-xs text-slate-500">{label}</p>
    </div>
  )
})

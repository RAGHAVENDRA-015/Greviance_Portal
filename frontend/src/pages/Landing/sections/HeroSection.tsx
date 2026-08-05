import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileText,
  MapPin,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react'
import { APP_NAME, APP_TAGLINE } from '@/constants'
import { Button } from '@/components/ui/Button'

const floatIcons = [
  { Icon: Bot, className: 'top-[18%] left-[8%] text-primary-500', delay: 0 },
  { Icon: Shield, className: 'top-[28%] right-[10%] text-emerald-500', delay: 0.4 },
  { Icon: MapPin, className: 'bottom-[22%] left-[12%] text-cyan-500', delay: 0.8 },
  { Icon: Zap, className: 'bottom-[30%] right-[14%] text-indigo-brand', delay: 1.2 },
  { Icon: FileText, className: 'top-[55%] left-[4%] text-primary-400', delay: 0.6 },
  { Icon: Sparkles, className: 'top-[12%] right-[22%] text-cyan-brand', delay: 1 },
]

const barHeights = [42, 68, 55, 82, 61, 74, 48, 90]

export function HeroSection() {
  const navigate = useNavigate()

  return (
    <section className="relative min-h-screen overflow-hidden mesh-bg">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="absolute -right-16 top-40 h-80 w-80 rounded-full bg-cyan-brand/15 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-emerald-brand/15 blur-3xl" />
      </div>

      {floatIcons.map(({ Icon, className, delay }, i) => (
        <motion.div
          key={i}
          className={`pointer-events-none absolute hidden rounded-2xl glass p-3 lg:block ${className}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.9, y: [0, -14, 0] }}
          transition={{
            opacity: { delay: delay + 0.3, duration: 0.6 },
            y: { delay: delay + 0.8, duration: 5 + i * 0.4, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          <Icon className="h-5 w-5" />
        </motion.div>
      ))}

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pb-24 lg:pt-32">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-heading text-sm font-semibold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400"
            >
              Smart Citizen Grievance Portal
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-7xl"
            >
              <span className="gradient-text">{APP_NAME}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.25 }}
              className="mt-5 max-w-lg text-lg text-slate-600 dark:text-slate-300 sm:text-xl"
            >
              {APP_TAGLINE}. File, track, and resolve civic issues with Gemini-powered intelligence.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.4 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button
                size="lg"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => navigate('/register')}
              >
                Get Started
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
                Sign In
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary-500/20 via-cyan-brand/10 to-emerald-brand/20 blur-2xl" />
            <div className="relative glass-strong rounded-3xl p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Live operations
                  </p>
                  <p className="font-display text-lg font-bold">City Command Preview</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Open', value: '1,284', tone: 'text-primary-600' },
                  { label: 'Resolved', value: '9,421', tone: 'text-emerald-600' },
                  { label: 'Avg SLA', value: '18h', tone: 'text-cyan-600' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl bg-white/60 p-3 dark:bg-slate-800/60">
                    <p className="text-[11px] text-slate-500">{stat.label}</p>
                    <p className={`mt-1 font-display text-xl font-bold ${stat.tone}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl bg-white/60 p-4 dark:bg-slate-800/60">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">Weekly intake</p>
                  <p className="text-xs text-emerald-600">+12.4%</p>
                </div>
                <div className="flex h-28 items-end gap-2">
                  {barHeights.map((h, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 rounded-t-lg gradient-primary opacity-80"
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.8, delay: 0.6 + i * 0.06, ease: 'easeOut' }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {[
                  { title: 'Water leakage — Sector 14', status: 'In Progress', color: 'bg-blue-500' },
                  { title: 'Streetlight outage — Ward 7', status: 'Assigned', color: 'bg-amber-500' },
                  { title: 'Garbage pickup delay', status: 'Resolved', color: 'bg-emerald-500' },
                ].map((row) => (
                  <div
                    key={row.title}
                    className="flex items-center justify-between rounded-xl bg-white/50 px-3 py-2.5 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-200">{row.title}</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <span className={`h-1.5 w-1.5 rounded-full ${row.color}`} />
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

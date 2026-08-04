import { motion } from 'framer-motion'
import {
  Building2,
  Droplets,
  Flame,
  HeartPulse,
  Landmark,
  Shield,
  Trash2,
  Zap,
} from 'lucide-react'
import { DEPARTMENTS } from '@/constants'

const icons = [Building2, Droplets, Zap, Trash2, HeartPulse, Shield, Landmark, Flame]

const accents = [
  'from-primary-500 to-cyan-brand',
  'from-cyan-brand to-primary-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500',
  'from-blue-600 to-indigo-brand',
  'from-slate-600 to-slate-800',
  'from-red-500 to-orange-600',
]

export function DepartmentsSection() {
  return (
    <section id="departments" className="relative overflow-hidden py-16 sm:py-24 lg:py-28">
      <div className="absolute inset-0 mesh-bg opacity-50" />
      <div className="relative mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary-600">
            Departments
          </p>
          <h2 className="mt-2 sm:mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-4xl">
            Connected civic departments
          </h2>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300">
            Complaints route automatically to the teams responsible for fixing them.
          </p>
        </motion.div>

        <div className="mt-10 sm:mt-14 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {DEPARTMENTS.map((name, i) => {
            const Icon = icons[i % icons.length]
            const accent = accents[i % accents.length]
            return (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                whileHover={{ y: -4 }}
                className="rounded-2xl glass p-3.5 sm:p-5"
              >
                <div
                  className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-md`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 sm:mt-4 font-heading text-xs sm:text-sm font-bold leading-snug">{name}</h3>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

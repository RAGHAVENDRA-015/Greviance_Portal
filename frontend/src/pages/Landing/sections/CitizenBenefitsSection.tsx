import { motion } from 'framer-motion'
import { Clock3, Eye, MessageSquareHeart, Smartphone } from 'lucide-react'

const benefits = [
  {
    icon: Smartphone,
    title: 'File in minutes',
    text: 'Submit grievances from any device with guided forms and photo evidence.',
  },
  {
    icon: Eye,
    title: 'Full transparency',
    text: 'Track every status change — from intake to officer assignment to resolution.',
  },
  {
    icon: Clock3,
    title: 'Faster turnaround',
    text: 'AI routing cuts waiting time so neighborhoods see results sooner.',
  },
  {
    icon: MessageSquareHeart,
    title: 'Stay in the loop',
    text: 'Get notified when officers respond, request info, or mark issues resolved.',
  },
]

export function CitizenBenefitsSection() {
  return (
    <section className="py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
            For citizens
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Civic voice that actually gets heard
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-300">
            Grievance Portal puts clear status and accountability in your hands — not buried in paperwork.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {benefits.map(({ icon: Icon, title, text }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
              className="group relative overflow-hidden rounded-2xl glass p-6"
            >
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/10 transition group-hover:bg-emerald-500/20" />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="relative mt-4 font-heading text-lg font-bold">{title}</h3>
              <p className="relative mt-2 text-sm text-slate-600 dark:text-slate-300">{text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

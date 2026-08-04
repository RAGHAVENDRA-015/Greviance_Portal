import { motion } from 'framer-motion'
import {
  BellRing,
  Brain,
  Camera,
  LayoutDashboard,
  Route,
  ShieldCheck,
} from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'AI Classification',
    description:
      'Gemini automatically categorizes complaints, detects urgency, and routes them to the right department.',
  },
  {
    icon: Route,
    title: 'Smart Routing',
    description:
      'Priority-aware assignment ensures high-impact civic issues reach officers without delay.',
  },
  {
    icon: LayoutDashboard,
    title: 'Live Dashboards',
    description:
      'Citizens, officers, and admins get role-based views with real-time status and SLA tracking.',
  },
  {
    icon: Camera,
    title: 'Evidence Uploads',
    description:
      'Attach geo-tagged photos so field teams can verify and resolve issues faster.',
  },
  {
    icon: BellRing,
    title: 'Instant Updates',
    description:
      'Push notifications keep complainants informed from submission to final resolution.',
  },
  {
    icon: ShieldCheck,
    title: 'Audit-Ready Trail',
    description:
      'Every action is timestamped for transparent governance and accountability reviews.',
  },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
}

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-16 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary-600">Features</p>
          <h2 className="mt-2 sm:mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-4xl">
            Everything civic teams need to act faster
          </h2>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300">
            A unified platform that turns citizen reports into measurable public outcomes.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="mt-10 sm:mt-14 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map(({ icon: Icon, title, description }) => (
            <motion.article
              key={title}
              variants={item}
              whileHover={{ y: -4 }}
              className="glass rounded-2xl p-4 sm:p-6 transition-shadow hover:shadow-xl"
            >
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl gradient-primary text-white shadow-lg shadow-primary-500/25">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 sm:mt-4 font-heading text-base sm:text-lg font-bold">{title}</h3>
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {description}
              </p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

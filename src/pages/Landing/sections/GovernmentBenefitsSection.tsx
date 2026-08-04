import { motion } from 'framer-motion'
import { BarChart3, Building2, GitBranch, Users } from 'lucide-react'

const benefits = [
  {
    icon: GitBranch,
    title: 'Automated triage',
    text: 'Reduce manual sorting with AI classification and department mapping.',
  },
  {
    icon: BarChart3,
    title: 'Operational insight',
    text: 'Monitor backlog, SLA breaches, and department performance in one view.',
  },
  {
    icon: Users,
    title: 'Workforce focus',
    text: 'Officers receive prioritized queues instead of unstructured complaint piles.',
  },
  {
    icon: Building2,
    title: 'Governance ready',
    text: 'Exportable trails support audits, reviews, and public accountability reports.',
  },
]

export function GovernmentBenefitsSection() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24 lg:py-28">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-indigo-brand to-cyan-brand" />
      <div className="absolute inset-0 opacity-30 mesh-bg" />

      <div className="relative mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl text-white"
        >
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-cyan-100">
            For government
          </p>
          <h2 className="mt-2 sm:mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-4xl">
            Digital service delivery that scales with your city
          </h2>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base text-primary-100">
            Equip departments with AI triage, workload visibility, and measurable outcomes.
          </p>
        </motion.div>

        <div className="mt-8 sm:mt-12 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ icon: Icon, title, text }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
              className="rounded-2xl border border-white/20 bg-white/10 p-4 sm:p-5 backdrop-blur-xl"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 sm:mt-4 font-heading text-base font-bold text-white">{title}</h3>
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-primary-100">{text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

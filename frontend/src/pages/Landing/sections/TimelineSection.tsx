import { motion } from 'framer-motion'

const milestones = [
  {
    year: 'Phase 1',
    title: 'Citizen intake',
    text: 'Secure registration, complaint filing, and photo evidence uploads go live.',
  },
  {
    year: 'Phase 2',
    title: 'Gemini intelligence',
    text: 'AI classification, priority scoring, and department routing unlock automation.',
  },
  {
    year: 'Phase 3',
    title: 'Officer operations',
    text: 'Role dashboards, SLA queues, and status workflows empower field teams.',
  },
  {
    year: 'Phase 4',
    title: 'City-wide scale',
    text: 'Multi-department analytics, audits, and public transparency reporting expand.',
  },
]

export function TimelineSection() {
  return (
    <section className="py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">
            Product journey
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Built in stages for lasting civic impact
          </h2>
        </motion.div>

        <div className="relative mx-auto mt-16 max-w-3xl">
          <div className="absolute bottom-0 left-4 top-0 w-px bg-gradient-to-b from-primary-400 via-cyan-brand to-emerald-brand sm:left-1/2 sm:-translate-x-px" />

          <div className="space-y-10">
            {milestones.map((item, i) => {
              const left = i % 2 === 0
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: left ? -24 : 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45 }}
                  className={`relative flex ${left ? 'sm:justify-start' : 'sm:justify-end'}`}
                >
                  <div className="absolute left-4 top-5 z-10 h-3 w-3 -translate-x-1/2 rounded-full gradient-primary ring-4 ring-white dark:ring-slate-900 sm:left-1/2" />
                  <div
                    className={`ml-10 w-full rounded-2xl glass p-5 sm:ml-0 sm:w-[calc(50%-1.5rem)] ${
                      left ? 'sm:mr-auto' : 'sm:ml-auto'
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-cyan-600">
                      {item.year}
                    </p>
                    <h3 className="mt-1 font-heading text-lg font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.text}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

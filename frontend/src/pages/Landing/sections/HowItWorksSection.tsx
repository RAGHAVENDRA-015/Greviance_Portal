import { motion } from 'framer-motion'
import { ClipboardCheck, MapPinned, Send, Wrench } from 'lucide-react'

const steps = [
  {
    icon: Send,
    step: '01',
    title: 'Submit grievance',
    text: 'Describe the issue, add photos, and pin the location in a guided form.',
  },
  {
    icon: ClipboardCheck,
    step: '02',
    title: 'AI classifies',
    text: 'Gemini tags category, priority, and the best-fit civic department.',
  },
  {
    icon: MapPinned,
    step: '03',
    title: 'Officer assigned',
    text: 'The right team receives the case with context and SLA targets.',
  },
  {
    icon: Wrench,
    step: '04',
    title: 'Resolve & close',
    text: 'Track progress until resolution — with a full audit trail preserved.',
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative overflow-hidden py-24 sm:py-28">
      <div className="absolute inset-0 mesh-bg opacity-60" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">
            How it works
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            From report to resolution in four steps
          </h2>
        </motion.div>

        <div className="relative mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-primary-300 to-transparent lg:block" />

          {steps.map(({ icon: Icon, step, title, text }, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.45 }}
              className="relative rounded-2xl glass p-6 text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-white shadow-lg shadow-primary-500/30">
                <Icon className="h-6 w-6" />
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-primary-600">
                Step {step}
              </p>
              <h3 className="mt-2 font-heading text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

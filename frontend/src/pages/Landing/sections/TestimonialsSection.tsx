import { motion } from 'framer-motion'
import { Quote, Star } from 'lucide-react'

const testimonials = [
  {
    quote:
      'I reported a drainage overflow and got updates every step of the way. It felt like the city finally listened.',
    name: 'Ananya Rao',
    role: 'Resident, Ward 12',
  },
  {
    quote:
      'Gemini classification cut our triage time dramatically. Officers now start with context instead of sorting emails.',
    name: 'Vikram Mehta',
    role: 'Municipal Operations Lead',
  },
  {
    quote:
      'The dashboard gives us SLA clarity we never had on paper. Accountability is built into every ticket.',
    name: 'Priya Nair',
    role: 'Public Works Officer',
  },
]

export function TestimonialsSection() {
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
            Testimonials
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Trusted by citizens and civic teams
          </h2>
        </motion.div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.blockquote
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.45 }}
              className="relative rounded-2xl glass p-6"
            >
              <Quote className="absolute right-5 top-5 h-8 w-8 text-primary-200 dark:text-primary-800" />
              <div className="flex gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                &ldquo;{t.quote}&rdquo;
              </p>
              <footer className="mt-6">
                <p className="font-heading text-sm font-bold">{t.name}</p>
                <p className="text-xs text-slate-500">{t.role}</p>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  )
}

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    q: 'Who can file a grievance on Grievance Portal?',
    a: 'Any registered citizen can submit complaints. Officers and admins use separate dashboards to manage and resolve cases.',
  },
  {
    q: 'How does Gemini AI classification work?',
    a: 'When you submit a complaint, Gemini analyzes the text and images to suggest a category, priority level, and department — accelerating routing while humans stay in control.',
  },
  {
    q: 'Can I track the status of my complaint?',
    a: 'Yes. Your dashboard shows real-time status updates from Pending to In Progress and Resolved, with timestamps for every change.',
  },
  {
    q: 'What evidence can I attach?',
    a: 'You can upload photos (JPEG, PNG, or WebP) to help officers verify the issue on the ground.',
  },
  {
    q: 'Is my data secure?',
    a: 'Grievance Portal uses authenticated sessions, role-based access, and audit trails so only authorized users can view or act on sensitive cases.',
  },
  {
    q: 'Which departments are supported?',
    a: 'Public Works, Water Board, Electricity, Sanitation, Health, Public Safety, Municipal Administration, Anti-Corruption, and more can be connected.',
  },
]

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="relative overflow-hidden py-16 sm:py-24 lg:py-28">
      <div className="absolute inset-0 mesh-bg opacity-40" />
      <div className="relative mx-auto max-w-3xl px-3 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary-600">FAQ</p>
          <h2 className="mt-2 sm:mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-4xl">
            Questions, answered
          </h2>
        </motion.div>

        <div className="mt-8 sm:mt-12 space-y-2.5 sm:space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = open === i
            return (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="overflow-hidden rounded-2xl glass"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-heading text-xs sm:text-sm md:text-base font-semibold">{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-primary-600 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p className="border-t border-slate-200/60 px-4 pb-3.5 pt-2.5 sm:px-5 sm:pb-4 sm:pt-3 text-xs sm:text-sm leading-relaxed text-slate-600 dark:border-slate-700/60 dark:text-slate-300">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

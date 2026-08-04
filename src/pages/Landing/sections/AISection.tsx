import { motion } from 'framer-motion'
import { Bot, Sparkles, Tags, Timer } from 'lucide-react'

const pillars = [
  {
    icon: Tags,
    title: 'Auto-categorize',
    text: 'Detects water, roads, electricity, sanitation, and more from natural language.',
  },
  {
    icon: Timer,
    title: 'Priority scoring',
    text: 'Flags urgent public-safety and health issues for accelerated response.',
  },
  {
    icon: Bot,
    title: 'Officer assist',
    text: 'Suggests next actions and similar past resolutions to speed closure.',
  },
]

export function AISection() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24 lg:py-28">
      <div className="absolute inset-0 mesh-bg opacity-70" />
      <div className="relative mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-200/60 bg-primary-50/80 px-3 py-1 text-xs font-semibold text-primary-700 dark:border-primary-800 dark:bg-primary-950/50 dark:text-primary-300">
              <Sparkles className="h-3.5 w-3.5" />
              Powered by Google Gemini
            </div>
            <h2 className="mt-4 sm:mt-5 font-display text-2xl font-extrabold tracking-tight sm:text-4xl">
              An <span className="gradient-text">AI-powered system</span> that understands civic language
            </h2>
            <p className="mt-3 sm:mt-4 max-w-xl text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Grievance Portal uses Gemini to classify grievances, extract location cues, and recommend
              departments — so officers spend less time sorting and more time solving.
            </p>

            <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
              {pillars.map(({ icon: Icon, title, text }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i, duration: 0.4 }}
                  className="flex gap-3 sm:gap-4 rounded-2xl glass p-3.5 sm:p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-heading text-sm sm:text-base font-semibold">{title}</h3>
                    <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">{text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="relative"
          >
            <div className="glass-strong rounded-3xl p-4 sm:p-6 lg:p-8">
              <div className="mb-4 sm:mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl gradient-primary text-white">
                  <Bot className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <p className="font-heading text-sm sm:text-base font-bold">Gemini Classifier</p>
                  <p className="text-xs text-slate-500">Analyzing complaint #CIV-48291</p>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-900 p-3.5 sm:p-4 font-mono text-xs leading-relaxed text-emerald-300 dark:bg-black/40 break-words">
                <p className="text-slate-400">{'>'} Input</p>
                <p className="mt-1.5 text-slate-100">
                  &quot;Water overflowing near the main market road for 2 days. Traffic is blocked
                  and mosquitoes are increasing.&quot;
                </p>
                <p className="mt-3 text-slate-400">{'>'} Gemini output</p>
                <p className="mt-1.5">category: Drainage</p>
                <p>priority: High</p>
                <p>department: Public Works</p>
                <p>confidence: 0.94</p>
                <p>sla_hours: 24</p>
              </div>

              <div className="mt-4 sm:mt-5 grid grid-cols-3 gap-2 sm:gap-3 text-center">
                {[
                  { label: 'Accuracy', value: '96%' },
                  { label: 'Avg classify', value: '1.2s' },
                  { label: 'Languages', value: '12+' },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl bg-white/60 py-2 sm:py-3 dark:bg-slate-800/60">
                    <p className="font-display text-base sm:text-lg font-bold text-primary-600">{m.value}</p>
                    <p className="text-[10px] sm:text-[11px] text-slate-500">{m.label}</p>
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

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Mail } from 'lucide-react'
import { APP_NAME } from '@/constants'
import { Button } from '@/components/ui/Button'

export function ContactCTASection() {
  const navigate = useNavigate()

  return (
    <section className="py-24 sm:py-28" aria-label="Get started">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl gradient-primary px-6 py-14 text-center text-white shadow-2xl shadow-primary-500/30 sm:px-12"
        >
          <div className="absolute inset-0 opacity-40 mesh-bg" />
          <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-cyan-brand/30 blur-2xl" />

          <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-100">
              Get started today
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Ready to modernize civic grievance redressal?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-100">
              Join {APP_NAME} and give citizens a transparent path from report to resolution —
              powered by Gemini AI.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                variant="secondary"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => navigate('/register')}
                className="bg-white text-primary-700 shadow-xl hover:bg-primary-50"
              >
                Create free account
              </Button>
              <Button
                size="lg"
                variant="outline"
                leftIcon={<Mail className="h-4 w-4" />}
                onClick={() => navigate('/login')}
                className="border-white/40 bg-white/10 text-white hover:bg-white/20"
              >
                Sign in to portal
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

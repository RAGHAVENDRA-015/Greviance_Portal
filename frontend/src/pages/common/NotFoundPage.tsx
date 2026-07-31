import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { APP_NAME, ROUTES } from '@/constants'

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden mesh-bg px-4">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-primary-400/20 blur-3xl animate-pulse-soft" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl animate-float" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg text-center"
      >
        <div className="glass-strong rounded-3xl p-10 shadow-2xl">
          <p className="font-display text-8xl font-extrabold tracking-tight text-transparent bg-clip-text gradient-primary">
            404
          </p>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-slate-900 dark:text-white">
            Page not found
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            The page you are looking for does not exist or may have moved. Head back to {APP_NAME} to
            continue.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to={ROUTES.home}>
              <Button leftIcon={<Home className="h-4 w-4" />}>Go home</Button>
            </Link>
            <Button
              variant="outline"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => window.history.back()}
            >
              Go back
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

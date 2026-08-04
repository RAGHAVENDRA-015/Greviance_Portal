import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { loginWithEmail } from '@/services/firebase'
import { useAuthStore } from '@/store'
import { getAuthErrorMessage, getDashboardPath, isAuthPathSafe } from '@/utils'
import { APP_NAME, ROUTES } from '@/constants'

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const syncProfile = useAuthStore((s) => s.syncProfile)
  const syncError = useAuthStore((s) => s.syncError)
  const clearSyncError = useAuthStore((s) => s.clearSyncError)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setError(null)
    clearSyncError()
    try {
      await loginWithEmail(values.email, values.password)
      const profile = await syncProfile()
      toast.success(`Welcome back, ${profile.name.split(' ')[0]}!`)
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname
      const destination =
        from && isAuthPathSafe(from) ? from : getDashboardPath(profile.role)
      navigate(destination, { replace: true })
    } catch (err) {
      const msg = getAuthErrorMessage(err, 'Invalid email or password')
      setError(msg)
    }
  }

  const displayError = error || syncError

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid w-full max-w-5xl overflow-hidden rounded-2xl sm:rounded-3xl glass-strong shadow-2xl lg:grid-cols-2"
    >
      <div className="relative hidden overflow-hidden gradient-primary p-10 text-white lg:block">
        <div className="absolute inset-0 opacity-30 mesh-bg" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-white/70">{APP_NAME}</p>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight">
              Civic issues resolved with intelligence.
            </h1>
            <p className="mt-4 text-white/80">
              Sign in to track grievances, collaborate with officers, and experience AI-assisted routing.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
            <p className="text-sm text-white/90">Trusted by citizens & municipal departments nationwide.</p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-8 md:p-10">
        <Link to="/" className="mb-6 sm:mb-8 inline-flex items-center gap-2 font-heading text-base sm:text-lg font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-sm text-white">G</span>
          {APP_NAME}
        </Link>
        <h2 className="font-display text-xl sm:text-2xl font-extrabold">Welcome back</h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">Sign in to continue to your portal</p>

        {displayError && (
          <Alert variant="error" className="mt-6">
            {displayError}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="flex justify-end">
            <Link to={ROUTES.forgotPassword} className="text-sm font-medium text-primary-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          New here?{' '}
          <Link to={ROUTES.register} className="font-semibold text-primary-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </motion.div>
  )
}

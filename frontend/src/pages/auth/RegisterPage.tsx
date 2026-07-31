import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { registerWithEmail } from '@/services/firebase'
import { useAuthStore } from '@/store'
import { getAuthErrorMessage, getDashboardPath } from '@/utils'
import { APP_NAME, ROUTES } from '@/constants'
import { isFirebaseAuthError } from '@/services/firebase'

const schema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z.string().trim().email('Enter a valid email'),
    password: z
      .string()
      .min(6, 'At least 6 characters')
      .max(128, 'Password is too long'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const syncProfile = useAuthStore((s) => s.syncProfile)
  const clearSyncError = useAuthStore((s) => s.clearSyncError)
  const [error, setError] = useState<string | null>(null)
  const [duplicateEmail, setDuplicateEmail] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setError(null)
    setDuplicateEmail(false)
    clearSyncError()
    try {
      await registerWithEmail(values.email, values.password, values.name)
      const profile = await syncProfile()
      toast.success('Account created successfully')
      navigate(getDashboardPath(profile.role), { replace: true })
    } catch (err) {
      const msg = getAuthErrorMessage(err, 'Registration failed')
      setError(msg)
      if (
        isFirebaseAuthError(err) &&
        err.code === 'auth/email-already-in-use'
      ) {
        setDuplicateEmail(true)
      } else if (typeof err === 'object' && err !== null && 'code' in err) {
        setDuplicateEmail((err as { code: string }).code === 'auth/email-already-in-use')
      } else if (msg.toLowerCase().includes('already exists')) {
        setDuplicateEmail(true)
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md rounded-3xl glass-strong p-8 shadow-2xl sm:p-10"
    >
      <Link to="/" className="mb-6 inline-flex items-center gap-2 font-heading text-lg font-bold">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-sm text-white">C</span>
        {APP_NAME}
      </Link>
      <h2 className="font-display text-2xl font-extrabold">Create your account</h2>
      <p className="mt-1 text-sm text-slate-500">Join the smart civic grievance network</p>

      {error && (
        <Alert variant="error" className="mt-6" title={duplicateEmail ? 'Account already exists' : undefined}>
          <div className="space-y-2">
            <p>{error}</p>
            {duplicateEmail && (
              <Link to={ROUTES.login} className="font-semibold text-primary-700 underline dark:text-primary-300">
                Go to sign in
              </Link>
            )}
          </div>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <Input
          label="Full name"
          autoComplete="name"
          leftIcon={<User className="h-4 w-4" />}
          error={errors.name?.message}
          {...register('name')}
        />
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
          autoComplete="new-password"
          leftIcon={<Lock className="h-4 w-4" />}
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          leftIcon={<Lock className="h-4 w-4" />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already registered?{' '}
        <Link to={ROUTES.login} className="font-semibold text-primary-600 hover:underline">
          Sign in
        </Link>
      </p>
    </motion.div>
  )
}

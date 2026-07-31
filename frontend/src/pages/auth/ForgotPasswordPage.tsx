import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { resetPassword } from '@/services/firebase'
import { getAuthErrorMessage } from '@/utils'
import { APP_NAME, ROUTES } from '@/constants'

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
})

type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setError(null)
    try {
      await resetPassword(values.email)
      setSent(true)
      toast.success('If an account exists, a reset link has been sent')
    } catch (err) {
      // Avoid account enumeration for user-not-found; still map real config errors
      const code =
        typeof err === 'object' && err && 'code' in err
          ? String((err as { code: string }).code)
          : ''
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        setSent(true)
        return
      }
      setError(getAuthErrorMessage(err, 'Unable to send reset email'))
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
      <h2 className="font-display text-2xl font-extrabold">Reset password</h2>
      <p className="mt-1 text-sm text-slate-500">We will email you a secure reset link</p>

      {sent ? (
        <Alert variant="success" title="Check your inbox" className="mt-6">
          If an account exists for that email, a reset link has been sent.
        </Alert>
      ) : (
        <>
          {error && (
            <Alert variant="error" className="mt-6">
              {error}
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
            <Button type="submit" className="w-full" loading={isSubmitting}>
              Send reset link
            </Button>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link to={ROUTES.login} className="font-semibold text-primary-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </motion.div>
  )
}

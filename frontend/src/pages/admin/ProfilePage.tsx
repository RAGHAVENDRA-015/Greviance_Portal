import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { User, Phone, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { usersApi } from '@/api'
import { useAuthStore } from '@/store'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Badge } from '@/components/ui/Badge'
import { ROUTES } from '@/constants'
import { getErrorMessage, formatDate } from '@/utils'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().max(20).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

export default function AdminProfilePage() {
  const user = useAuthStore((s) => s.user)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      address: user?.address ?? '',
    },
  })

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        phone: user.phone ?? '',
        address: user.address ?? '',
      })
    }
  }, [user, reset])

  const mutation = useMutation({
    mutationFn: usersApi.updateMe,
    onSuccess: async () => {
      await refreshProfile()
      toast.success('Profile updated')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to update profile')),
  })

  if (!user) return null

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: ROUTES.admin.dashboard },
          { label: 'Profile' },
        ]}
      />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card hover={false}>
          <div className="mb-6 flex items-center gap-4">
            <Avatar name={user.name} src={user.profile_image} size="lg" />
            <div>
              <h1 className="font-display text-2xl font-extrabold">{user.name}</h1>
              <p className="text-sm text-slate-500">{user.email}</p>
              <div className="mt-2">
                <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 capitalize">
                  {user.role}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Member since {formatDate(user.created_at)}
              </p>
            </div>
          </div>

          <CardHeader title="Edit profile" subtitle="Update your admin contact details" />
          <form
            onSubmit={handleSubmit((values) =>
              mutation.mutate({
                name: values.name,
                phone: values.phone || undefined,
                address: values.address || undefined,
              }),
            )}
            className="space-y-4"
          >
            <Input
              label="Full name"
              leftIcon={<User className="h-4 w-4" />}
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="Phone"
              type="tel"
              leftIcon={<Phone className="h-4 w-4" />}
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Textarea label="Address" error={errors.address?.message} {...register('address')} />
            <Button
              type="submit"
              loading={mutation.isPending}
              disabled={!isDirty}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Save changes
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  )
}

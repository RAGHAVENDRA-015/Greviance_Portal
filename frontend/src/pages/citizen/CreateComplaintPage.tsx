import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  MapPin,
  Upload,
  X,
  ImagePlus,
  Check,
  FileText,
  MapPinned,
  Send,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { complaintsApi } from '@/api'
import { useGeolocation } from '@/hooks'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import {
  ACCEPTED_IMAGE_TYPES,
  COMPLAINT_CATEGORIES,
  COMPLAINT_PRIORITIES,
  MAX_IMAGE_SIZE_MB,
  MAX_IMAGES,
  ROUTES,
} from '@/constants'
import { getErrorMessage, cn } from '@/utils'
import type { ComplaintCategory, ComplaintPriority } from '@/types'

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Max 200 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Max 2000 characters'),
  category: z.string().optional(),
  priority: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const STEPS = [
  { id: 1, label: 'Details', icon: FileText },
  { id: 2, label: 'Evidence', icon: ImagePlus },
  { id: 3, label: 'Location', icon: MapPinned },
  { id: 4, label: 'Submit', icon: Send },
]

export default function CreateComplaintPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { coords, error: geoError, loading: geoLoading, request } = useGeolocation()
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [step, setStep] = useState(1)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', category: '', priority: '' },
  })

  const title = watch('title')
  const description = watch('description')

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files)
      const next: File[] = [...images]
      const nextPreviews: string[] = [...previews]

      for (const file of incoming) {
        if (next.length >= MAX_IMAGES) {
          toast.error(`Maximum ${MAX_IMAGES} images allowed`)
          break
        }
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          toast.error(`${file.name}: only JPEG, PNG, or WebP`)
          continue
        }
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
          toast.error(`${file.name}: max ${MAX_IMAGE_SIZE_MB}MB`)
          continue
        }
        next.push(file)
        nextPreviews.push(URL.createObjectURL(file))
      }
      setImages(next)
      setPreviews(nextPreviews)
    },
    [images, previews],
  )

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index])
    setImages((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const mutation = useMutation({
    mutationFn: complaintsApi.create,
    onSuccess: (complaint) => {
      queryClient.invalidateQueries({ queryKey: ['complaints', 'my'] })
      toast.success('Complaint submitted successfully')
      navigate(ROUTES.citizen.complaintDetail(complaint.id))
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to submit complaint')),
  })

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      title: values.title,
      description: values.description,
      category: (values.category || undefined) as ComplaintCategory | undefined,
      priority: (values.priority || undefined) as ComplaintPriority | undefined,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      images: images.length ? images : undefined,
    })
  }

  const completedSteps = useMemo(() => {
    const done = new Set<number>()
    if (title.length >= 5 && description.length >= 10) done.add(1)
    if (images.length > 0) done.add(2)
    if (coords) done.add(3)
    return done
  }, [title, description, images.length, coords])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: ROUTES.citizen.dashboard },
          { label: 'Complaints', href: ROUTES.citizen.complaints },
          { label: 'New' },
        ]}
      />

      <div>
        <h1 className="font-display text-2xl font-extrabold">File a Complaint</h1>
        <p className="mt-1 text-sm text-slate-500">
          Describe the issue clearly. AI will help summarize and route it.
        </p>
      </div>

      <ol className="flex items-center gap-2 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const active = step === s.id
          const done = completedSteps.has(s.id) || step > s.id
          return (
            <li key={s.id} className="flex flex-1 items-center gap-2 min-w-[4.5rem]">
              <button
                type="button"
                onClick={() => setStep(s.id)}
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition',
                  active || done
                    ? 'gradient-primary text-white'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800',
                )}
              >
                {done && !active ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </button>
              <span
                className={cn(
                  'hidden text-xs font-medium sm:block',
                  active ? 'text-slate-900 dark:text-white' : 'text-slate-400',
                )}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'hidden h-0.5 flex-1 rounded-full sm:block',
                    done ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700',
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
        >
          {step === 1 && (
            <Card hover={false}>
              <CardHeader title="Complaint details" subtitle="Title and description are required" />
              <div className="space-y-4">
                <div>
                  <Input
                    label="Title"
                    placeholder="e.g. Broken streetlight on Main Road"
                    error={errors.title?.message}
                    {...register('title')}
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">{title.length}/200</p>
                </div>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      label="Description"
                      placeholder="Describe the issue, location landmarks, and impact…"
                      maxLength={2000}
                      showCount
                      error={errors.description?.message}
                      {...field}
                    />
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Category (optional)
                    </label>
                    <select
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-900/80"
                      {...register('category')}
                    >
                      <option value="">Select category</option>
                      {COMPLAINT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Priority (optional)
                    </label>
                    <select
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-900/80"
                      {...register('priority')}
                    >
                      <option value="">Select priority</option>
                      {COMPLAINT_PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card hover={false}>
              <CardHeader
                title="Evidence photos"
                subtitle={`Up to ${MAX_IMAGES} images · JPEG/PNG/WebP · max ${MAX_IMAGE_SIZE_MB}MB each`}
              />
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
                }}
                className={cn(
                  'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 transition',
                  dragOver
                    ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30'
                    : 'border-slate-200 dark:border-slate-700',
                )}
              >
                <Upload className="mb-3 h-8 w-8 text-primary-500" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Drag & drop images here
                </p>
                <p className="mt-1 text-xs text-slate-400">or</p>
                <label className="mt-3">
                  <span className="inline-flex h-11 cursor-pointer items-center rounded-xl border border-slate-200 bg-white/80 px-5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-800">
                    Browse files
                  </span>
                  <input
                    type="file"
                    accept={ACCEPTED_IMAGE_TYPES.join(',')}
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) addFiles(e.target.files)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>

              {previews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {previews.map((src, i) => (
                    <div key={src} className="group relative overflow-hidden rounded-xl">
                      <img src={src} alt={`Preview ${i + 1}`} className="h-28 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute right-2 top-2 rounded-full bg-slate-900/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
                        aria-label="Remove image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {step === 3 && (
            <Card hover={false}>
              <CardHeader title="Location" subtitle="Optional — helps officers find the issue" />
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  leftIcon={<MapPin className="h-4 w-4" />}
                  loading={geoLoading}
                  onClick={request}
                >
                  Use my current location
                </Button>
                {coords && (
                  <Alert variant="success" title="Location captured">
                    Lat {coords.latitude.toFixed(5)}, Lng {coords.longitude.toFixed(5)}
                  </Alert>
                )}
                {geoError && <Alert variant="error">{geoError}</Alert>}
                {!coords && !geoError && (
                  <p className="text-sm text-slate-500">
                    You can skip this step and still submit your complaint.
                  </p>
                )}
              </div>
            </Card>
          )}

          {step === 4 && (
            <Card hover={false}>
              <CardHeader title="Review & submit" subtitle="Confirm details before filing" />
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-slate-400">Title</dt>
                  <dd className="font-medium text-slate-900 dark:text-white">{title || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Description</dt>
                  <dd className="text-slate-700 dark:text-slate-300">{description || '—'}</dd>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <dt className="text-slate-400">Images</dt>
                    <dd className="font-medium">{images.length}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Location</dt>
                    <dd className="font-medium">{coords ? 'Attached' : 'Not provided'}</dd>
                  </div>
                </div>
              </dl>
            </Card>
          )}
        </motion.div>

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={step <= 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            Back
          </Button>
          {step < 4 ? (
            <Button type="button" onClick={() => setStep((s) => Math.min(4, s + 1))}>
              Continue
            </Button>
          ) : (
            <Button type="submit" loading={mutation.isPending} leftIcon={<Send className="h-4 w-4" />}>
              Submit complaint
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

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
  AlertTriangle,
  Sparkles,
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

// ─── Image validation helpers ────────────────────────────────────────────────

/**
 * Checks whether a file can be decoded as a valid image and is not
 * blank (all-white / all-black / single-pixel).
 * Returns null if valid, or an error string if invalid.
 */
async function validateImageContent(file: File): Promise<string | null> {
  // 1. Decode check — catches corrupted / unreadable files
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return `"${file.name}" could not be read. The file may be corrupted.`
  }

  const { width, height } = bitmap
  bitmap.close()

  // 2. Dimension check — reject 1×1 placeholder images
  if (width < 2 || height < 2) {
    return `"${file.name}" appears to be a placeholder image (too small). Please upload a real photo.`
  }

  // 3. Blank-image check — sample a canvas region for near-uniform colour
  try {
    const canvas = document.createElement('canvas')
    const sampleSize = Math.min(64, width, height)
    canvas.width = sampleSize
    canvas.height = sampleSize
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const bmp = await createImageBitmap(file, 0, 0, width, height)
      ctx.drawImage(bmp, 0, 0, sampleSize, sampleSize)
      bmp.close()

      const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize)
      let rSum = 0,
        gSum = 0,
        bSum = 0,
        rSq = 0,
        gSq = 0,
        bSq = 0
      const pixels = data.length / 4

      for (let i = 0; i < data.length; i += 4) {
        rSum += data[i]
        gSum += data[i + 1]
        bSum += data[i + 2]
        rSq += data[i] ** 2
        gSq += data[i + 1] ** 2
        bSq += data[i + 2] ** 2
      }

      const rMean = rSum / pixels
      const gMean = gSum / pixels
      const bMean = bSum / pixels
      const rStd = Math.sqrt(rSq / pixels - rMean ** 2)
      const gStd = Math.sqrt(gSq / pixels - gMean ** 2)
      const bStd = Math.sqrt(bSq / pixels - bMean ** 2)
      const avgStd = (rStd + gStd + bStd) / 3

      // Very low standard deviation → near-uniform colour → likely blank
      if (avgStd < 8) {
        return `"${file.name}" appears to be a blank or solid-colour image. Please upload a photo of the issue.`
      }
    }
  } catch {
    // Canvas errors are non-fatal — let the image through
  }

  return null
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CreateComplaintPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { coords, error: geoError, loading: geoLoading, request } = useGeolocation()
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [step, setStep] = useState(1)

  // Issue 3: track per-image validation errors
  const [imageErrors, setImageErrors] = useState<string[]>([])
  const [validatingImages, setValidatingImages] = useState(false)

  // Issue 5: track whether user attempted to advance past an incomplete step
  const [step1Attempted, setStep1Attempted] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', category: '', priority: '' },
  })

  const title = watch('title')
  const description = watch('description')

  const category = watch('category')

  // Issue 5: determine if Step 1 required fields are complete
  const step1Complete = title.trim().length >= 5 && description.trim().length >= 10

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const incoming = Array.from(files)
      const next: File[] = [...images]
      const nextPreviews: string[] = [...previews]
      const newErrors: string[] = []

      setValidatingImages(true)

      try {
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

          // 1. Basic decode & uniformity checks
          const localValidationError = await validateImageContent(file)
          if (localValidationError) {
            newErrors.push(localValidationError)
            continue
          }

          // 2. Gemini Multimodal Vision AI relevance validation
          try {
            const aiResult = await complaintsApi.validateImage(
              file,
              category || undefined,
              description || undefined,
            )
            console.info('[CreateComplaint] validateImage result', file.name, aiResult)
            if (!aiResult.relevant) {
              newErrors.push(
                `"${file.name}": ${aiResult.reason || 'Image does not appear relevant to this civic complaint.'}`,
              )
              continue
            }
          } catch (err) {
            console.warn('[CreateComplaint] Gemini vision validation error:', err)
            newErrors.push(
              `"${file.name}": Could not verify this image right now. Please try again.`,
            )
            continue
          }

          next.push(file)
          nextPreviews.push(URL.createObjectURL(file))
        }
      } finally {
        setValidatingImages(false)
        setImages(next)
        setPreviews(nextPreviews)
        if (newErrors.length > 0) {
          setImageErrors((prev) => [...prev, ...newErrors])
        }
      }
    },
    [images, previews, category, description],
  )

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index])
    setImages((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const clearImageErrors = () => setImageErrors([])

  const mutation = useMutation({
    mutationFn: complaintsApi.create,
    onSuccess: (complaint) => {
      queryClient.invalidateQueries({ queryKey: ['complaints', 'my'] })
      toast.success('Complaint submitted successfully')
      navigate(ROUTES.citizen.complaintDetail(complaint.id))
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to submit complaint')),
  })

  // Issue 4: guard — only allow submission when on Step 4 and not already pending
  const onSubmit = (values: FormValues) => {
    if (step !== 4) {
      // Safety gate: should never reach here from steps 1–3, but prevents
      // any keyboard/programmatic trigger from firing unexpectedly
      console.warn('[CreateComplaint] onSubmit triggered outside Step 4 — blocked')
      return
    }
    if (mutation.isPending) {
      // Duplicate submission guard
      console.warn('[CreateComplaint] Submission already in progress — ignored')
      return
    }
    console.info('[CreateComplaint] Submission triggered by user on Step 4')
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
    if (step1Complete) done.add(1)
    if (images.length > 0) done.add(2)
    if (coords) done.add(3)
    return done
  }, [step1Complete, images.length, coords])

  // Issue 5: handle "Continue" / stepper navigation with validation
  const tryAdvanceStep = async (targetStep: number) => {
    // Only block moving forward
    if (targetStep <= step) {
      setStep(targetStep)
      return
    }

    // If trying to move past Step 1, validate required fields first
    if (step === 1 || (targetStep > 1 && !completedSteps.has(1))) {
      setStep1Attempted(true)
      const valid = await trigger(['title', 'description'])
      if (!valid || !step1Complete) {
        toast.error('Please complete all required fields in Step 1 before continuing.')
        setStep(1) // force back if jumping from stepper
        return
      }
    }

    // Block jumping more than one step ahead from an incomplete step
    if (targetStep > step + 1 && !completedSteps.has(step)) {
      toast.error('Please complete the current step before skipping ahead.')
      return
    }

    setStep(targetStep)
  }

  // Issue 4: intercept Enter key on Steps 1–3 to prevent accidental form submission
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && step < 4) {
      e.preventDefault()
    }
  }

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

      {/* Issue 5: Stepper — forward navigation gated by step completion */}
      <ol className="flex items-center gap-2 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const active = step === s.id
          const done = completedSteps.has(s.id) || step > s.id
          // Disable forward navigation to incomplete future steps
          const isFutureBlocked = s.id > step && !completedSteps.has(s.id - 1) && s.id > 1
          return (
            <li key={s.id} className="flex flex-1 items-center gap-2 min-w-[4.5rem]">
              <button
                type="button"
                onClick={() => tryAdvanceStep(s.id)}
                disabled={isFutureBlocked && !completedSteps.has(1)}
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition',
                  active || done
                    ? 'gradient-primary text-white'
                    : isFutureBlocked && !completedSteps.has(1)
                      ? 'cursor-not-allowed bg-slate-100 text-slate-300 dark:bg-slate-800'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700',
                )}
                aria-label={`Step ${s.id}: ${s.label}${isFutureBlocked && !completedSteps.has(1) ? ' (locked)' : ''}`}
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

      {/* Issue 4: noValidate prevents browser default submit; onKeyDown intercepts Enter */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        onKeyDown={handleFormKeyDown}
        className="space-y-6"
      >
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
                    label="Title *"
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
                      label="Description *"
                      placeholder="Describe the issue, location landmarks, and impact…"
                      maxLength={2000}
                      showCount
                      error={errors.description?.message}
                      {...field}
                    />
                  )}
                />
                {/* Issue 5: show validation hint when user tries to advance with incomplete fields */}
                {step1Attempted && !step1Complete && (
                  <Alert variant="error" title="Required fields incomplete">
                    Please enter a title (min 5 characters) and a description (min 10 characters)
                    before continuing.
                  </Alert>
                )}
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

              {/* Issue 3: show image validation errors as dismissible alert */}
              {imageErrors.length > 0 && (
                <div className="mb-4">
                  <Alert variant="error" title="Some images were rejected">
                    <ul className="mt-1 space-y-1 text-xs">
                      {imageErrors.map((err, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {err}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={clearImageErrors}
                      className="mt-2 text-xs font-medium underline opacity-70 hover:opacity-100"
                    >
                      Dismiss
                    </button>
                  </Alert>
                </div>
              )}

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
                {validatingImages ? (
                  <>
                    <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Validating images…
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="mb-3 h-8 w-8 text-primary-500" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Drag &amp; drop images here
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
                  </>
                )}
              </div>

              {previews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {previews.map((src, i) => (
                    <div key={src} className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                      <img src={src} alt={`Preview ${i + 1}`} className="h-28 w-full object-cover" />
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-md bg-emerald-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm">
                        <Sparkles className="h-3 w-3" />
                        <span>AI Verified</span>
                      </div>
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
              <CardHeader title="Review &amp; submit" subtitle="Confirm details before filing" />
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
            <Button
              type="button"
              disabled={validatingImages}
              onClick={() => tryAdvanceStep(step + 1)}
            >
              {validatingImages ? 'Validating…' : 'Continue'}
            </Button>
          ) : (
            // Issue 4 & 5: disabled when already submitting or Step 1 not complete
            <Button
              type="submit"
              loading={mutation.isPending}
              disabled={mutation.isPending || !step1Complete}
              leftIcon={<Send className="h-4 w-4" />}
            >
              Submit complaint
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

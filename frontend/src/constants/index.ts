import type { ComplaintCategory, ComplaintPriority, ComplaintStatus } from '@/types'

export const APP_NAME = 'CivicAI'
export const APP_TAGLINE = 'AI-Powered Smart Citizen Grievance Portal'

export const COMPLAINT_STATUSES: ComplaintStatus[] = [
  'Pending',
  'In Progress',
  'Resolved',
  'Rejected',
]

export const COMPLAINT_CATEGORIES: ComplaintCategory[] = [
  'Water Supply',
  'Roads',
  'Electricity',
  'Garbage',
  'Drainage',
  'Public Safety',
  'Health',
  'Corruption',
  'Other',
]

export const COMPLAINT_PRIORITIES: ComplaintPriority[] = ['Low', 'Medium', 'High']

export const DEPARTMENTS = [
  'Public Works',
  'Water Board',
  'Electricity Board',
  'Sanitation',
  'Health Department',
  'Police / Public Safety',
  'Municipal Administration',
  'Anti-Corruption Cell',
] as const

export const STATUS_COLORS: Record<ComplaintStatus, string> = {
  Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  Resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  Rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

export const PRIORITY_COLORS: Record<ComplaintPriority, string> = {
  Low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Medium: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  High: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

export const MAX_IMAGES = 5
export const MAX_IMAGE_SIZE_MB = 5
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  citizen: {
    dashboard: '/citizen',
    complaints: '/citizen/complaints',
    createComplaint: '/citizen/complaints/new',
    complaintDetail: (id: string) => `/citizen/complaints/${id}`,
    profile: '/citizen/profile',
  },
  officer: {
    dashboard: '/officer',
    queue: '/officer/queue',
    complaintDetail: (id: string) => `/officer/complaints/${id}`,
    profile: '/officer/profile',
  },
  admin: {
    dashboard: '/admin',
    users: '/admin/users',
    complaints: '/admin/complaints',
    complaintDetail: (id: string) => `/admin/complaints/${id}`,
    officers: '/admin/officers',
    profile: '/admin/profile',
  },
} as const

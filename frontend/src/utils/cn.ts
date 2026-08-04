import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import type { ComplaintStatus, UserRole } from '@/types'
import { ROUTES } from '@/constants'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, pattern = 'MMM d, yyyy') {
  return format(new Date(date), pattern)
}

export function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function getDashboardPath(role: UserRole) {
  switch (role) {
    case 'admin':
      return ROUTES.admin.dashboard
    case 'officer':
      return ROUTES.officer.dashboard
    default:
      return ROUTES.citizen.dashboard
  }
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function computeStats(complaints: { status: ComplaintStatus }[]) {
  return {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === 'Pending').length,
    inProgress: complaints.filter((c) => c.status === 'In Progress').length,
    resolved: complaints.filter((c) => c.status === 'Resolved').length,
    rejected: complaints.filter((c) => c.status === 'Rejected').length,
  }
}

export function percent(part: number, total: number) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

export { getAuthErrorMessage, getErrorMessage } from './authErrors'

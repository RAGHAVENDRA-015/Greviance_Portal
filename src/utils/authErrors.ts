import { FirebaseError } from 'firebase/app'
import { isFirebaseAuthError } from '@/services/firebase'
import type { ApiError } from '@/types'

const FIREBASE_AUTH_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'An account with this email already exists. Please sign in instead.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/operation-not-allowed': 'Email/password sign-in is disabled for this project.',
  'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
  'auth/user-disabled': 'This account has been disabled. Contact an administrator.',
  'auth/user-not-found': 'No account found with this email. Please register first.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Invalid email or password. Please try again.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your internet connection and try again.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/requires-recent-login': 'For security, please sign in again and retry.',
  'auth/invalid-api-key': 'Firebase configuration is invalid. Check your environment variables.',
  'auth/configuration-not-found': 'Firebase Auth is not configured for this project.',
  'auth/missing-password': 'Password is required.',
  'auth/missing-email': 'Email is required.',
  'auth/internal-error': 'Authentication service error. Please try again.',
}

function mapFirebaseCode(code: string): string | null {
  return FIREBASE_AUTH_MESSAGES[code] ?? null
}

export function getAuthErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (!error) return fallback

  if (typeof error === 'string') {
    const codeMatch = error.match(/auth\/[a-z0-9-]+/i)
    if (codeMatch) {
      return mapFirebaseCode(codeMatch[0].toLowerCase()) ?? fallback
    }
    if (error.startsWith('Firebase:')) {
      return fallback
    }
    return error
  }

  if (isFirebaseAuthError(error) || error instanceof FirebaseError) {
    return mapFirebaseCode(error.code) ?? fallback
  }

  const maybe = error as {
    code?: string
    message?: string
    response?: { status?: number; data?: ApiError }
    request?: unknown
  }

  if (maybe.code) {
    const mapped = mapFirebaseCode(maybe.code)
    if (mapped) return mapped
  }

  if (typeof maybe.message === 'string') {
    const codeMatch = maybe.message.match(/auth\/[a-z0-9-]+/i)
    if (codeMatch) {
      return mapFirebaseCode(codeMatch[0].toLowerCase()) ?? fallback
    }
  }

  if (maybe.response) {
    const status = maybe.response.status
    const detail = maybe.response.data?.detail

    if (status === 401) {
      if (typeof detail === 'string' && detail.length > 0) return detail
      return 'Your session expired. Please sign in again.'
    }
    if (status === 403) {
      return typeof detail === 'string' ? detail : 'You do not have permission to perform this action.'
    }
    if (status === 404) {
      return typeof detail === 'string' ? detail : 'The requested resource was not found.'
    }
    if (status === 408 || status === 504) {
      return 'The request timed out. Please try again.'
    }
    if (status && status >= 500) {
      return typeof detail === 'string' && detail.length > 0
        ? detail
        : 'An internal server error occurred. Please try again shortly.'
    }

    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg
    if (maybe.response.data?.message) return maybe.response.data.message
  }

  // Axios network / offline (no response)
  if (maybe.request && !maybe.response) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'You appear to be offline. Check your connection.'
    }
    if (maybe.message?.toLowerCase().includes('timeout')) {
      return 'The request timed out. Please try again.'
    }
    return 'Cannot reach the server. Ensure the API is running and VITE_API_BASE_URL is correct.'
  }

  if (maybe.message && !maybe.message.startsWith('Firebase:')) {
    return maybe.message
  }

  return fallback
}

/** @deprecated Use getAuthErrorMessage — kept for existing imports */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return getAuthErrorMessage(error, fallback)
}

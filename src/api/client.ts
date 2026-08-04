import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { getIdToken, logout } from '@/services/firebase'
import { getAuthErrorMessage } from '@/utils/authErrors'

const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

export const api = axios.create({
  baseURL,
  timeout: 60_000,
  headers: {
    Accept: 'application/json',
  },
  // Stateless Bearer tokens only — no cookies / withCredentials.
  withCredentials: false,
})

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getIdToken(false)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else {
    delete config.headers.Authorization
  }
  return config
})

type QueueItem = {
  resolve: (token: string | null) => void
  reject: (error: unknown) => void
}

let isRefreshing = false
let failedQueue: QueueItem[] = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((item) => {
    if (error) item.reject(error)
    else item.resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail?: string | { msg: string }[] }>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    // Network / offline
    if (!error.response) {
      return Promise.reject(new Error(getAuthErrorMessage(error, 'Network error')))
    }

    // Token expired / invalid — refresh once, then retry
    if (error.response.status === 401 && original && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              if (!token) {
                reject(error)
                return
              }
              original.headers.Authorization = `Bearer ${token}`
              resolve(api(original))
            },
            reject,
          })
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const token = await getIdToken(true)
        if (!token) {
          processQueue(error, null)
          await logout()
          return Promise.reject(new Error('Your session expired. Please sign in again.'))
        }
        processQueue(null, token)
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      } catch (refreshError) {
        processQueue(refreshError, null)
        try {
          await logout()
        } catch {
          // ignore
        }
        return Promise.reject(new Error(getAuthErrorMessage(refreshError, 'Session expired')))
      } finally {
        isRefreshing = false
      }
    }

    // A freshly refreshed token was rejected too. Do not leave the client in
    // a half-authenticated state that can never recover on its own.
    if (error.response.status === 401 && original?._retry) {
      try {
        await logout()
      } catch {
        // The request error remains useful if Firebase local sign-out fails.
      }
      return Promise.reject(new Error('Your session is no longer valid. Please sign in again.'))
    }

    const message = getAuthErrorMessage(error, 'Request failed')
    return Promise.reject(new Error(message))
  },
)

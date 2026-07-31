import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, ThemeMode, NotificationItem, ComplaintStatus, ComplaintCategory } from '@/types'
import { auth, subscribeToAuth, logout as firebaseLogout } from '@/services/firebase'
import { authApi } from '@/api'
import { getAuthErrorMessage } from '@/utils/authErrors'
import { queryClient } from '@/lib/queryClient'

interface AuthState {
  user: User | null
  firebaseReady: boolean
  loading: boolean
  syncError: string | null
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  bootstrap: () => () => void
  syncProfile: () => Promise<User>
  refreshProfile: () => Promise<void>
  logout: () => Promise<void>
  clearSyncError: () => void
}

let bootstrapStarted = false
let authRequestId = 0
let profileSyncPromise: Promise<User> | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseReady: false,
  loading: true,
  syncError: null,

  setUser: (user) => set({ user, syncError: null }),
  setLoading: (loading) => set({ loading }),
  clearSyncError: () => set({ syncError: null }),

  bootstrap: () => {
    if (bootstrapStarted) {
      // Already subscribed — return no-op cleanup for extra callers
      return () => undefined
    }
    bootstrapStarted = true

    const unsub = subscribeToAuth(async (firebaseUser) => {
      const requestId = ++authRequestId

      if (!firebaseUser) {
        queryClient.clear()
        set({ user: null, loading: false, firebaseReady: true, syncError: null })
        return
      }

      set({ loading: true, firebaseReady: true })

      try {
        await get().syncProfile()
        // Ignore stale responses if a newer auth event occurred
        if (requestId !== authRequestId) return
      } catch (err) {
        if (requestId !== authRequestId) return
        const message = getAuthErrorMessage(
          err,
          'Signed in with Firebase, but could not sync your profile with the server.',
        )
        set({ user: null, loading: false, syncError: message })
      }
    })

    return () => {
      unsub()
      bootstrapStarted = false
    }
  },

  syncProfile: async () => {
    // Sign-in forms and the Firebase observer transition at the same time.
    // Share one /auth/me request so they cannot race or provision twice.
    if (profileSyncPromise) return profileSyncPromise

    set({ loading: true, firebaseReady: true, syncError: null })
    const syncUid = auth.currentUser?.uid
    const request = authApi
      .me()
      .then((profile) => {
        // A logout or account switch can happen while this request is in
        // flight. Never restore the previous account from a stale response.
        if (!syncUid || auth.currentUser?.uid !== syncUid || profile.firebase_uid !== syncUid) {
          return profile
        }
        queryClient.setQueryData(['auth', 'me'], profile)
        set({ user: profile, syncError: null, loading: false, firebaseReady: true })
        return profile
      })
      .catch((err) => {
        if (syncUid && auth.currentUser?.uid === syncUid) {
          set({
            user: null,
            loading: false,
            firebaseReady: true,
            syncError: getAuthErrorMessage(
              err,
              'Signed in with Firebase, but could not sync your profile with the server.',
            ),
          })
        }
        throw err
      })
      .finally(() => {
        if (profileSyncPromise === request) profileSyncPromise = null
      })

    profileSyncPromise = request
    return request
  },

  refreshProfile: async () => {
    await get().syncProfile()
  },

  logout: async () => {
    authRequestId += 1
    profileSyncPromise = null
    try {
      await firebaseLogout()
    } finally {
      queryClient.clear()
      set({ user: null, loading: false, firebaseReady: true, syncError: null })
    }
  },
}))

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  resolved: 'light' | 'dark'
  applyTheme: () => void
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      resolved: 'light',
      setMode: (mode) => {
        set({ mode, resolved: resolveTheme(mode) })
        get().applyTheme()
      },
      applyTheme: () => {
        const resolved = resolveTheme(get().mode)
        set({ resolved })
        document.documentElement.classList.toggle('dark', resolved === 'dark')
      },
    }),
    { name: 'civicai-theme' },
  ),
)

interface SidebarState {
  collapsed: boolean
  mobileOpen: boolean
  toggleCollapsed: () => void
  setMobileOpen: (open: boolean) => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: false,
  mobileOpen: false,
  toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
  setMobileOpen: (mobileOpen) => set({ mobileOpen }),
}))

interface NotificationState {
  items: NotificationItem[]
  add: (item: Omit<NotificationItem, 'id' | 'read' | 'createdAt'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clear: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  add: (item) =>
    set((s) => ({
      items: [
        {
          ...item,
          id: crypto.randomUUID(),
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...s.items,
      ].slice(0, 50),
    })),
  markRead: (id) =>
    set((s) => ({
      items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
  markAllRead: () => set((s) => ({ items: s.items.map((n) => ({ ...n, read: true })) })),
  clear: () => set({ items: [] }),
}))

interface FilterState {
  search: string
  status: ComplaintStatus | 'all'
  category: ComplaintCategory | 'all'
  setSearch: (search: string) => void
  setStatus: (status: ComplaintStatus | 'all') => void
  setCategory: (category: ComplaintCategory | 'all') => void
  reset: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  search: '',
  status: 'all',
  category: 'all',
  setSearch: (search) => set({ search }),
  setStatus: (status) => set({ status }),
  setCategory: (category) => set({ category }),
  reset: () => set({ search: '', status: 'all', category: 'all' }),
}))

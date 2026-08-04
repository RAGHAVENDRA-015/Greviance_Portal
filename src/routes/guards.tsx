import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store'
import { ROUTES } from '@/constants'
import type { UserRole } from '@/types'
import { getDashboardPath } from '@/utils'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'

function AuthBootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center mesh-bg">
      <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-label="Loading authentication" />
    </div>
  )
}

function SyncErrorScreen({ message }: { message: string }) {
  const logout = useAuthStore((s) => s.logout)
  const syncProfile = useAuthStore((s) => s.syncProfile)

  return (
    <div className="flex min-h-screen items-center justify-center mesh-bg px-4">
      <div className="w-full max-w-md space-y-4 rounded-3xl glass-strong p-8">
        <Alert variant="error" title="Profile sync failed">
          {message}
        </Alert>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="flex-1"
            onClick={() => {
              void syncProfile().catch(() => undefined)
            }}
          >
            Retry
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              void logout()
            }}
          >
            Sign out
          </Button>
        </div>
        <p className="text-center text-xs text-slate-500">
          Confirm the API is running at <code className="font-mono">VITE_API_BASE_URL</code>.
        </p>
      </div>
    </div>
  )
}

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { user, loading, firebaseReady, syncError } = useAuthStore()
  const location = useLocation()

  if (loading || !firebaseReady) {
    return <AuthBootScreen />
  }

  if (!user && syncError) {
    return <SyncErrorScreen message={syncError} />
  }

  if (!user) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />
  }

  return <Outlet />
}

export function GuestRoute() {
  const { user, loading, firebaseReady, syncError } = useAuthStore()

  if (loading || !firebaseReady) {
    return <AuthBootScreen />
  }

  // Firebase session exists but backend sync failed — show recovery UI
  if (!user && syncError) {
    return <SyncErrorScreen message={syncError} />
  }

  if (user) {
    return <Navigate to={getDashboardPath(user.role)} replace />
  }

  return <Outlet />
}

import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { useAuthStore, useThemeStore } from '@/store'
import { ProtectedRoute, GuestRoute } from '@/routes/guards'
import { AuthLayout, DashboardLayout } from '@/layouts'
import { ROUTES } from '@/constants'
import { queryClient } from '@/lib/queryClient'

const LandingPage = lazy(() => import('@/pages/Landing/LandingPage'))
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))

const CitizenDashboard = lazy(() => import('@/pages/citizen/CitizenDashboard'))
const ComplaintsListPage = lazy(() => import('@/pages/citizen/ComplaintsListPage'))
const CreateComplaintPage = lazy(() => import('@/pages/citizen/CreateComplaintPage'))
const CitizenComplaintDetail = lazy(() => import('@/pages/citizen/ComplaintDetailPage'))
const CitizenProfile = lazy(() => import('@/pages/citizen/ProfilePage'))

const OfficerDashboard = lazy(() => import('@/pages/officer/OfficerDashboard'))
const QueuePage = lazy(() => import('@/pages/officer/QueuePage'))
const OfficerComplaintDetail = lazy(() => import('@/pages/officer/ComplaintDetailPage'))
const OfficerProfile = lazy(() => import('@/pages/officer/ProfilePage'))

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminUsersPage = lazy(() => import('@/pages/admin/UsersPage'))
const AdminComplaintsPage = lazy(() => import('@/pages/admin/ComplaintsPage'))
const AdminComplaintDetail = lazy(() => import('@/pages/admin/ComplaintDetailPage'))
const AdminOfficersPage = lazy(() => import('@/pages/admin/OfficersPage'))
const AdminProfile = lazy(() => import('@/pages/admin/ProfilePage'))

const NotFoundPage = lazy(() => import('@/pages/common/NotFoundPage'))

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
    </div>
  )
}

function AppBootstrap({ children }: { children: React.ReactNode }) {
  const bootstrap = useAuthStore((s) => s.bootstrap)
  const applyTheme = useThemeStore((s) => s.applyTheme)

  useEffect(() => {
    applyTheme()
    const unsub = bootstrap()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme()
    mq.addEventListener('change', onChange)
    return () => {
      unsub()
      mq.removeEventListener('change', onChange)
    }
  }, [bootstrap, applyTheme])

  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppBootstrap>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />

              <Route element={<GuestRoute />}>
                <Route element={<AuthLayout />}>
                  <Route path={ROUTES.login} element={<LoginPage />} />
                  <Route path={ROUTES.register} element={<RegisterPage />} />
                  <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute roles={['citizen']} />}>
                <Route element={<DashboardLayout role="citizen" />}>
                  <Route path={ROUTES.citizen.dashboard} element={<CitizenDashboard />} />
                  <Route path={ROUTES.citizen.complaints} element={<ComplaintsListPage />} />
                  <Route path={ROUTES.citizen.createComplaint} element={<CreateComplaintPage />} />
                  <Route path="/citizen/complaints/:id" element={<CitizenComplaintDetail />} />
                  <Route path={ROUTES.citizen.profile} element={<CitizenProfile />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute roles={['officer']} />}>
                <Route element={<DashboardLayout role="officer" />}>
                  <Route path={ROUTES.officer.dashboard} element={<OfficerDashboard />} />
                  <Route path={ROUTES.officer.queue} element={<QueuePage />} />
                  <Route path="/officer/complaints/:id" element={<OfficerComplaintDetail />} />
                  <Route path={ROUTES.officer.profile} element={<OfficerProfile />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute roles={['admin']} />}>
                <Route element={<DashboardLayout role="admin" />}>
                  <Route path={ROUTES.admin.dashboard} element={<AdminDashboard />} />
                  <Route path={ROUTES.admin.users} element={<AdminUsersPage />} />
                  <Route path={ROUTES.admin.complaints} element={<AdminComplaintsPage />} />
                  <Route path="/admin/complaints/:id" element={<AdminComplaintDetail />} />
                  <Route path={ROUTES.admin.officers} element={<AdminOfficersPage />} />
                  <Route path={ROUTES.admin.profile} element={<AdminProfile />} />
                </Route>
              </Route>

              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </Suspense>
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'text-sm font-medium',
              style: {
                borderRadius: '14px',
                padding: '12px 16px',
              },
            }}
          />
        </AppBootstrap>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

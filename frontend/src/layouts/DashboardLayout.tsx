import { Outlet, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  User,
  ClipboardList,
  Users,
  Shield,
  Menu,
  Home,
} from 'lucide-react'
import { useAuthStore, useSidebarStore } from '@/store'
import { SidebarNav, DashboardTopbar } from '@/components/layout/Navbar'
import { APP_NAME, ROUTES } from '@/constants'
import { cn } from '@/utils'
import { Link } from 'react-router-dom'

const citizenNav = [
  { to: ROUTES.citizen.dashboard, label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: ROUTES.citizen.complaints, label: 'My Complaints', icon: <FileText className="h-4 w-4" /> },
  { to: ROUTES.citizen.createComplaint, label: 'New Complaint', icon: <PlusCircle className="h-4 w-4" /> },
  { to: ROUTES.citizen.profile, label: 'Profile', icon: <User className="h-4 w-4" /> },
]

const officerNav = [
  { to: ROUTES.officer.dashboard, label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: ROUTES.officer.queue, label: 'Queue', icon: <ClipboardList className="h-4 w-4" /> },
  { to: ROUTES.officer.profile, label: 'Profile', icon: <User className="h-4 w-4" /> },
]

const adminNav = [
  { to: ROUTES.admin.dashboard, label: 'Analytics', icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: ROUTES.admin.complaints, label: 'Complaints', icon: <FileText className="h-4 w-4" /> },
  { to: ROUTES.admin.users, label: 'Users', icon: <Users className="h-4 w-4" /> },
  { to: ROUTES.admin.officers, label: 'Officers', icon: <Shield className="h-4 w-4" /> },
  { to: ROUTES.admin.profile, label: 'Profile', icon: <User className="h-4 w-4" /> },
]

const mobileCitizen = [
  { to: ROUTES.citizen.dashboard, label: 'Home', icon: Home },
  { to: ROUTES.citizen.complaints, label: 'List', icon: FileText },
  { to: ROUTES.citizen.createComplaint, label: 'New', icon: PlusCircle },
  { to: ROUTES.citizen.profile, label: 'Profile', icon: User },
]

export function DashboardLayout({ role }: { role: 'citizen' | 'officer' | 'admin' }) {
  const { user } = useAuthStore()
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebarStore()

  if (!user) return <Navigate to={ROUTES.login} replace />
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />

  const nav = role === 'citizen' ? citizenNav : role === 'officer' ? officerNav : adminNav
  const titles: Record<typeof role, string> = {
    citizen: 'Citizen Portal',
    officer: 'Officer Workspace',
    admin: 'Admin Control Center',
  }

  return (
    <div className="min-h-screen mesh-bg">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-200/70 bg-white/80 p-4 backdrop-blur-xl transition-all dark:border-slate-800 dark:bg-slate-950/80 lg:flex',
          collapsed ? 'w-[88px]' : 'w-64',
        )}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <Link to="/" className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-primary font-bold text-white">
              C
            </div>
            {!collapsed && <span className="font-heading font-bold">{APP_NAME}</span>}
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Collapse sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
        {collapsed ? (
          <nav className="space-y-1">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                className="flex items-center justify-center rounded-xl p-3 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {item.icon}
              </Link>
            ))}
          </nav>
        ) : (
          <SidebarNav items={nav} />
        )}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            className="relative z-10 h-full w-72 bg-white p-4 dark:bg-slate-950"
          >
            <SidebarNav items={nav} />
          </motion.aside>
        </div>
      )}

      <div className={cn('transition-all', collapsed ? 'lg:pl-[88px]' : 'lg:pl-64')}>
        <div className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">
          <button
            type="button"
            className="mb-4 rounded-xl p-2 hover:bg-white/70 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <DashboardTopbar title={titles[role]} />
          <Outlet />
        </div>
      </div>

      {role === 'citizen' && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 lg:hidden">
          <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
            {mobileCitizen.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium text-slate-500"
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}

export function AuthLayout() {
  return (
    <div className="relative min-h-screen mesh-bg overflow-hidden">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-primary-400/20 blur-3xl animate-pulse-soft" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl animate-float" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <Outlet />
      </div>
    </div>
  )
}

export function PublicLayout() {
  return <Outlet />
}

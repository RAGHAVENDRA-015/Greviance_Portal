import { Link, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Menu,
  Moon,
  Sun,
  Monitor,
  LogOut,
  User,
  LayoutDashboard,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { APP_NAME, ROUTES } from '@/constants'
import { useAuthStore, useNotificationStore, useThemeStore } from '@/store'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { getDashboardPath } from '@/utils'
import { cn } from '@/utils'

const landingLinks = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#departments', label: 'Departments' },
  { href: '#faq', label: 'FAQ' },
  { href: '#contact', label: 'Contact' },
]

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useAuthStore()
  const { mode, setMode, resolved } = useThemeStore()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const cycleTheme = () => {
    const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light'
    setMode(next)
  }

  const ThemeIcon = mode === 'system' ? Monitor : resolved === 'dark' ? Moon : Sun

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'glass-strong py-2 shadow-lg' : 'bg-transparent py-4',
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-white font-bold">
            G
          </div>
          <span className="font-heading text-lg font-bold tracking-tight">{APP_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {landingLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative text-sm font-medium text-slate-600 transition hover:text-primary-600 dark:text-slate-300"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 rounded-full bg-primary-500 transition-all group-hover:w-full" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cycleTheme}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            <ThemeIcon className="h-5 w-5" />
          </button>

          {user ? (
            <Button size="sm" onClick={() => navigate(getDashboardPath(user.role))}>
              Dashboard
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => navigate(ROUTES.login)}>
                Sign in
              </Button>
              <Button size="sm" onClick={() => navigate(ROUTES.register)}>
                Get started
              </Button>
            </>
          )}

          <button
            type="button"
            className="rounded-xl p-2 md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Open menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-200/60 dark:border-slate-700/60 md:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              {landingLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

export function DashboardTopbar({ title }: { title: string }) {
  const { user, logout } = useAuthStore()
  const { items, markAllRead } = useNotificationStore()
  const { mode, setMode, resolved } = useThemeStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const unread = items.filter((n) => !n.read).length
  const ThemeIcon = mode === 'system' ? Monitor : resolved === 'dark' ? Moon : Sun

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setNotifOpen(false)
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!user) return null

  return (
    <div ref={ref} className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl truncate">
          {title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 truncate">
          Welcome back, {user.name.split(' ')[0]}
        </p>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setMode(mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light')}
          className="rounded-xl p-2 text-slate-500 hover:bg-white/70 dark:hover:bg-slate-800"
          aria-label="Toggle theme"
        >
          <ThemeIcon className="h-5 w-5" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((o) => !o)
              setProfileOpen(false)
            }}
            className="relative rounded-xl p-2 text-slate-500 hover:bg-white/70 dark:hover:bg-slate-800"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute right-0 z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl glass-strong p-3 shadow-xl sm:w-80"
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-sm font-semibold">Notifications</p>
                  <button type="button" className="text-xs text-primary-600" onClick={markAllRead}>
                    Mark all read
                  </button>
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {items.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-slate-500">No notifications</p>
                  ) : (
                    items.slice(0, 8).map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          'rounded-xl px-3 py-2 text-sm',
                          n.read ? 'opacity-60' : 'bg-primary-50 dark:bg-primary-950/30',
                        )}
                      >
                        <p className="font-medium">{n.title}</p>
                        <p className="text-xs text-slate-500">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen((o) => !o)
              setNotifOpen(false)
            }}
            className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-white/70 dark:hover:bg-slate-800"
          >
            <Avatar name={user.name} src={user.profile_image} size="sm" />
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute right-0 z-40 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-2xl glass-strong p-2 shadow-xl"
              >
                <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-700">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => navigate(`/${user.role}/profile`)}
                >
                  <User className="h-4 w-4" /> Profile
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => navigate(getDashboardPath(user.role))}
                >
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={() => logout().then(() => navigate(ROUTES.login))}
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export function SidebarNav({
  items,
}: {
  items: { to: string; label: string; icon: React.ReactNode }[]
}) {
  return (
    <nav className="space-y-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to.split('/').length <= 2}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              isActive
                ? 'gradient-primary text-white shadow-lg shadow-primary-500/20'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            )
          }
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

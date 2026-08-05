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

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const cycleTheme = () => {
    const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light'
    setMode(next)
  }

  const ThemeIcon = mode === 'system' ? Monitor : resolved === 'dark' ? Moon : Sun

  return (
    <>
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
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Full-screen mobile drawer (rendered outside header so it truly covers everything) ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-[70] flex w-[85vw] max-w-xs flex-col bg-white dark:bg-slate-950 shadow-2xl md:hidden"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
                <Link to="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl gradient-primary text-white font-bold text-sm">
                    G
                  </div>
                  <span className="font-heading text-base font-bold tracking-tight">{APP_NAME}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Nav links */}
              <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
                {landingLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center rounded-xl px-4 py-3 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>

              {/* CTA buttons */}
              <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-5 space-y-3">
                {user ? (
                  <Button className="w-full" onClick={() => { navigate(getDashboardPath(user.role)); setMobileOpen(false) }}>
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
                    <Button className="w-full" onClick={() => { navigate(ROUTES.register); setMobileOpen(false) }}>
                      Get Started
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => { navigate(ROUTES.login); setMobileOpen(false) }}>
                      Sign In
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
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
    <div ref={ref} className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">{title}</h1>
        <p className="text-sm text-slate-500">Welcome back, {user.name.split(' ')[0]}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMode(mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light')}
          className="rounded-xl p-2.5 text-slate-500 hover:bg-white/70 dark:hover:bg-slate-800"
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
            className="relative rounded-xl p-2.5 text-slate-500 hover:bg-white/70 dark:hover:bg-slate-800"
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
                className="absolute right-0 z-40 mt-2 w-80 rounded-2xl glass-strong p-3 shadow-xl"
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-sm font-semibold">Notifications</p>
                  <button type="button" className="text-xs text-primary-600" onClick={markAllRead}>
                    Mark all read
                  </button>
                </div>
                <div className="max-h-72 space-y-1.5 overflow-y-auto pr-0.5">
                  {items.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-slate-500">No notifications</p>
                  ) : (
                    items.slice(0, 10).map((n) => {
                      const typeStyles = {
                        success: 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/20',
                        error:   'border-l-red-500 bg-red-50 dark:bg-red-950/20',
                        warning: 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/20',
                        info:    'border-l-primary-500 bg-primary-50 dark:bg-primary-950/30',
                      }
                      const dotStyles = {
                        success: 'bg-emerald-500',
                        error:   'bg-red-500',
                        warning: 'bg-amber-500',
                        info:    'bg-primary-500',
                      }
                      const elapsed = (() => {
                        const diffMs = Date.now() - new Date(n.createdAt).getTime()
                        const mins = Math.floor(diffMs / 60_000)
                        if (mins < 1) return 'Just now'
                        if (mins < 60) return `${mins}m ago`
                        const hrs = Math.floor(mins / 60)
                        if (hrs < 24) return `${hrs}h ago`
                        return `${Math.floor(hrs / 24)}d ago`
                      })()
                      return (
                        <div
                          key={n.id}
                          className={cn(
                            'rounded-xl border-l-4 px-3 py-2.5 text-sm transition-opacity',
                            n.read ? 'opacity-50' : typeStyles[n.type] ?? typeStyles.info,
                            n.read && 'border-l-slate-300 bg-slate-50 dark:bg-slate-800/30',
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                              {n.title}
                            </p>
                            <div className="flex shrink-0 items-center gap-1.5 mt-0.5">
                              {!n.read && (
                                <span className={cn('h-2 w-2 rounded-full shrink-0', dotStyles[n.type] ?? dotStyles.info)} />
                              )}
                            </div>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{n.message}</p>
                          <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{elapsed}</p>
                        </div>
                      )
                    })
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
                className="absolute right-0 z-40 mt-2 w-56 rounded-2xl glass-strong p-2 shadow-xl"
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

import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'
import { APP_NAME, APP_TAGLINE } from '@/constants'

export function Footer() {
  return (
    <footer id="contact" className="border-t border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-3 py-10 sm:grid-cols-2 sm:gap-10 sm:px-6 sm:py-16 md:grid-cols-4 lg:px-8">
        <div className="sm:col-span-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary font-bold text-white">
              G
            </div>
            <span className="font-heading text-lg font-bold">{APP_NAME}</span>
          </div>
          <p className="mt-3 sm:mt-4 max-w-md text-xs sm:text-sm text-slate-500">{APP_TAGLINE}</p>
          <div className="mt-5 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
            {['GitHub', 'LinkedIn', 'Email'].map((label) => (
              <a
                key={label}
                href="#"
                className="flex h-9 sm:h-10 items-center justify-center rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-500 transition hover:border-primary-300 hover:text-primary-600 dark:border-slate-700"
                aria-label={label}
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Platform</h4>
          <ul className="mt-3 sm:mt-4 space-y-2 text-xs sm:text-sm text-slate-500">
            <li><a href="#features" className="hover:text-primary-600">Features</a></li>
            <li><a href="#how-it-works" className="hover:text-primary-600">How it works</a></li>
            <li><Link to="/login" className="hover:text-primary-600">Sign in</Link></li>
            <li><Link to="/register" className="hover:text-primary-600">Register</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Contact</h4>
          <ul className="mt-3 sm:mt-4 space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-slate-500">
            <li className="flex items-center gap-2 min-w-0">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="break-all">support@grievanceportal.gov</span>
            </li>
            <li className="flex items-center gap-2 min-w-0">
              <Phone className="h-4 w-4 shrink-0" />
              <span>1800-GRIEV-AI</span>
            </li>
            <li className="flex items-center gap-2 min-w-0">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>Digital India Hub</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200 px-3 py-5 text-center text-xs text-slate-400 dark:border-slate-800">
        © {new Date().getFullYear()} {APP_NAME}. Built for transparent civic governance.
      </div>
    </footer>
  )
}

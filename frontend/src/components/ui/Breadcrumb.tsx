import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

interface Crumb {
  label: string
  href?: string
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-slate-500">
      {items.map((item, i) => (
        <span key={item.label} className="inline-flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
          {item.href ? (
            <Link to={item.href} className="hover:text-primary-600 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-slate-800 dark:text-slate-200">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

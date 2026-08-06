/**
 * ErrorBoundary — Catches unexpected React render errors gracefully
 * and provides a user-friendly fallback UI with retry capability.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary] Uncaught render error:', error, errorInfo)
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[300px] w-full flex-col items-center justify-center p-6 text-center rounded-3xl border border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/80 backdrop-blur-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-white mb-1">
            Something went wrong
          </h3>
          <p className="max-w-md text-sm text-slate-500 dark:text-slate-400 mb-6">
            {this.state.error?.message || 'An unexpected user interface error occurred.'}
          </p>
          <Button
            onClick={this.handleReset}
            variant="outline"
            className="rounded-xl gap-2 text-xs font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

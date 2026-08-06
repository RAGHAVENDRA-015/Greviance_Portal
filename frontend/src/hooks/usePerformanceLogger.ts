/**
 * usePerformanceLogger — Dev-only hook to log component render counts and render duration.
 */
import { useEffect, useRef } from 'react'

export function usePerformanceLogger(componentName: string, propsToLog?: Record<string, unknown>) {
  if (!import.meta.env.DEV) return

  const renderCount = useRef(0)
  const startTime = useRef(performance.now())

  renderCount.current += 1
  const renderTime = performance.now() - startTime.current
  startTime.current = performance.now()

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug(
      `[Perf] %c${componentName}%c rendered #${renderCount.current} (${renderTime.toFixed(2)}ms)`,
      'color: #3b82f6; font-weight: bold;',
      'color: #94a3b8;',
      propsToLog || '',
    )
  })
}

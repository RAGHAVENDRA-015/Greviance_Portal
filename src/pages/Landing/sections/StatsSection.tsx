import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

const stats = [
  { label: 'Complaints resolved', value: 94200, suffix: '+' },
  { label: 'Avg. response time', value: 18, suffix: 'h' },
  { label: 'Departments connected', value: 48, suffix: '' },
  { label: 'Citizen satisfaction', value: 94, suffix: '%' },
]

function AnimatedCounter({
  value,
  suffix,
  active,
}: {
  value: number
  suffix: string
  active: boolean
}) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!active) return
    let frame = 0
    const duration = 1400
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * value))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, value])

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}

export function StatsSection() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="py-16 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary-600">Impact</p>
          <h2 className="mt-2 sm:mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-4xl">
            Numbers that reflect better governance
          </h2>
        </motion.div>

        <div className="mt-10 sm:mt-14 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.45 }}
              className="rounded-2xl glass p-4 text-center sm:p-6"
            >
              <p className="font-display text-2xl font-extrabold gradient-text sm:text-4xl">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} active={inView} />
              </p>
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

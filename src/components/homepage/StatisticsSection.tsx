import { useEffect, useState } from 'react'
import { useInView } from '@/hooks/useInView'
import type { Statistic } from '@/types'

function useCountUp(target: number, active: boolean, duration = 1400) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) return
    const start = performance.now()
    let frame: number
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(target * eased))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, target, duration])
  return value
}

function StatItem({ stat, active }: { stat: Statistic; active: boolean }) {
  const n = useCountUp(stat.value, active)
  return (
    <div className="text-center">
      <p className="font-display text-4xl font-extrabold text-gold md:text-5xl">
        {stat.prefix}
        {n}
        {stat.suffix}
      </p>
      <p className="mt-2 text-sm font-medium uppercase tracking-wide text-white/80">{stat.label}</p>
    </div>
  )
}

export function StatisticsSection({ items }: { items: Statistic[] }) {
  const { ref, visible } = useInView<HTMLDivElement>(0.3)
  return (
    <section className="bg-brand">
      <div ref={ref} className="page-wrap section-space grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
        {items.map((stat) => (
          <StatItem key={stat.id} stat={stat} active={visible} />
        ))}
      </div>
    </section>
  )
}

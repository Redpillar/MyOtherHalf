import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_LANDING_KPI,
  formatLandingKpiValue,
  landingKpiEntries,
  type LandingKpiStats,
} from '../landing/landingKpiTypes'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'

function easeOutQuart(t: number) {
  return 1 - (1 - t) ** 4
}

export function KpiAnimatedBar() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [stats, setStats] = useState<LandingKpiStats>(DEFAULT_LANDING_KPI)
  const [display, setDisplay] = useState(() => landingKpiEntries(DEFAULT_LANDING_KPI).map(() => 0))
  const hasRun = useRef(false)
  const entries = useMemo(() => landingKpiEntries(stats), [stats])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await apiFetch('/api/landing-kpi')
        const j = await readJsonResponse<{ kpi?: LandingKpiStats }>(r)
        if (!cancelled && r.ok && j.kpi) setStats(j.kpi)
      } catch {
        // fallback to defaults
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    hasRun.current = false
    setDisplay(entries.map(() => 0))
  }, [stats.cumulativeMembers, stats.cumulativeCouples, stats.inProgress, stats.successRate])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const targets = entries.map((item) => item.value)
    const durationMs = 2000

    const run = () => {
      if (hasRun.current) return
      hasRun.current = true

      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches

      if (reduced) {
        setDisplay([...targets])
        return
      }

      const t0 = performance.now()

      const frame = (now: number) => {
        const raw = Math.min(1, (now - t0) / durationMs)
        const eased = easeOutQuart(raw)
        setDisplay(targets.map((v) => Math.round(v * eased)))
        if (raw < 1) requestAnimationFrame(frame)
      }

      requestAnimationFrame(frame)
    }

    const io = new IntersectionObserver(
      (observed) => {
        if (observed.some((e) => e.isIntersecting)) run()
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    )

    io.observe(el)
    return () => io.disconnect()
  }, [stats.cumulativeMembers, stats.cumulativeCouples, stats.inProgress, stats.successRate])

  return (
    <div ref={rootRef} className="kpiBar card">
      {entries.map((item, i) => (
        <div key={item.key} className="kpiItem">
          <p className="kpiValue">{formatLandingKpiValue(item.key, display[i] ?? 0)}</p>
          <p className="kpiLabel">{item.label}</p>
        </div>
      ))}
    </div>
  )
}

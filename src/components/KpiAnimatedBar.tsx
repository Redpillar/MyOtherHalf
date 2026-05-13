import { useEffect, useRef, useState } from 'react'

const KPI_TARGETS = [
  { value: 47758, format: (n: number) => `${n.toLocaleString('ko-KR')}+` },
  { value: 55572, format: (n: number) => `${n.toLocaleString('ko-KR')}+` },
  { value: 74, format: (n: number) => `${n}+` },
  { value: 98, format: (n: number) => `${n}%` },
] as const

const LABELS = ['누적 가입자', '누적 커플', '진행중', '성사율'] as const

function easeOutQuart(t: number) {
  return 1 - (1 - t) ** 4
}

export function KpiAnimatedBar() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [display, setDisplay] = useState(() => KPI_TARGETS.map(() => 0))
  const hasRun = useRef(false)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const targets = KPI_TARGETS.map((k) => k.value)
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
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) run()
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    )

    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={rootRef} className="kpiBar card">
      {KPI_TARGETS.map((item, i) => (
        <div key={item.value} className="kpiItem">
          <p className="kpiValue">{item.format(display[i] ?? 0)}</p>
          <p className="kpiLabel">{LABELS[i]}</p>
        </div>
      ))}
    </div>
  )
}

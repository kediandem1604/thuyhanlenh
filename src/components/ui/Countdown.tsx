import { useEffect, useState } from 'react'

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** Đếm ngược trực tiếp tới một mốc thời gian */
export function Countdown({ to, compact = false }: { to: Date | string; compact?: boolean }) {
  const now = useNow(1000)
  const target = typeof to === 'string' ? new Date(to).getTime() : to.getTime()
  const { d, h, m, s } = parts(target - now)
  const pad = (n: number) => n.toString().padStart(2, '0')
  if (target - now <= 0) return <span>Đang diễn ra</span>
  if (compact) return <span className="tabular-nums">{d > 0 ? `${d}n ${pad(h)}:${pad(m)}` : `${pad(h)}:${pad(m)}:${pad(s)}`}</span>
  return (
    <span className="inline-flex items-baseline gap-1 tabular-nums">
      {d > 0 && (
        <>
          <b className="text-ink">{d}</b>
          <span className="text-muted text-[11px]">ngày</span>
        </>
      )}
      <b className="text-ink">{pad(h)}</b>
      <span className="text-muted">:</span>
      <b className="text-ink">{pad(m)}</b>
      <span className="text-muted">:</span>
      <b className="text-ink">{pad(s)}</b>
    </span>
  )
}

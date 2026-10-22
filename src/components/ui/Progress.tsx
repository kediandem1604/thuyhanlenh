import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export function ProgressBar({
  value,
  max = 100,
  color,
  className,
  height = 8,
}: {
  value: number
  max?: number
  color?: string
  className?: string
  height?: number
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className={cn('progress-track', className)} style={{ height }}>
      <motion.div
        className="progress-fill"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        style={color ? { background: `linear-gradient(90deg, ${color}aa, ${color})`, boxShadow: `0 0 12px ${color}66` } : undefined}
      />
    </div>
  )
}

/** Vòng tiến độ tròn */
export function ProgressRing({
  value,
  max = 100,
  size = 64,
  stroke = 6,
  color = 'var(--gold)',
  children,
}: {
  value: number
  max?: number
  size?: number
  stroke?: number
  color?: string
  children?: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - pct) }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

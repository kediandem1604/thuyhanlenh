import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { alpha } from '@/lib/color'
import { CountUp } from './CountUp'

/** Ô chỉ số lớn: icon, con số chạy, chênh lệch, chú thích */
export function StatCard({
  icon: Icon,
  label,
  value,
  format,
  delta,
  hint,
  color = '#d8b46a',
  index = 0,
  suffix,
}: {
  icon: LucideIcon
  label: string
  value: number
  format?: (n: number) => string
  delta?: number
  hint?: ReactNode
  color?: string
  index?: number
  suffix?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 * index }}
      className="panel panel-hover relative overflow-hidden p-5"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full blur-2xl"
        style={{ background: alpha(color, 0.18) }}
      />
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: alpha(color, 0.14), color }}>
          <Icon size={18} />
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="title-display text-[34px] text-ink tabular-nums">
          <CountUp value={value} format={format} />
        </span>
        {suffix && <span className="text-[14px] text-muted">{suffix}</span>}
      </div>
      <div className="mt-1 flex items-center gap-2 text-[12px]">
        {delta !== undefined && (
          <span className="inline-flex items-center gap-1 font-semibold" style={{ color: delta >= 0 ? 'var(--jade)' : 'var(--cinnabar)' }}>
            {delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {delta >= 0 ? '+' : ''}
            {delta.toFixed(1).replace('.', ',')}%
          </span>
        )}
        {hint && <span className="truncate text-muted">{hint}</span>}
      </div>
    </motion.div>
  )
}

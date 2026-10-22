import type { ReactNode } from 'react'
import { CLASS_CHART_COLOR } from '@/domain/constants'
import type { ClassId } from '@/domain/types'
import { useUi } from '@/store/ui'

/*
 * Quy ước biểu đồ (theo skill dataviz):
 * - Một trục y duy nhất, không dual-axis.
 * - ≥ 2 chuỗi thì luôn có chú thích; 1 chuỗi thì tiêu đề đã gọi tên.
 * - Chữ dùng màu chữ (ink/muted), màu chuỗi chỉ nằm ở mark.
 * - Lưới & trục mờ; nét 2px; có tooltip khi rê chuột.
 */

export const AXIS = {
  tick: { fill: 'var(--muted)', fontSize: 11 },
  axisLine: false,
  tickLine: false,
} as const

export const GRID = { stroke: 'var(--line)', strokeDasharray: '3 6', vertical: false } as const

export function useClassChartColors(): Record<ClassId, string> {
  const theme = useUi((s) => s.theme)
  return CLASS_CHART_COLOR[theme]
}

interface TooltipRow {
  label: ReactNode
  value: ReactNode
  color?: string
}

/** Khung tooltip chung cho recharts — truyền qua prop `content` */
export function ChartTooltipBox({ title, rows }: { title?: ReactNode; rows: TooltipRow[] }) {
  return (
    <div className="panel min-w-[160px] !rounded-xl !bg-[var(--surface-solid)] px-3 py-2.5 text-[12px] shadow-xl">
      {title && <div className="mb-1.5 font-semibold text-ink">{title}</div>}
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-muted">
            {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="font-semibold tabular-nums text-ink">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

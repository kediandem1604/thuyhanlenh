// Biểu đồ chiến lực 8 tuần — tách riêng để thư viện biểu đồ (recharts) không nằm trong gói tải đầu tiên.
import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AXIS, ChartTooltipBox, GRID } from '@/components/charts/chartTheme'
import { fmt, fmtCompact } from '@/lib/utils'

export default function PowerTrendChart({ data, accent }: { data: { week: string; avg: number }[]; accent: string }) {
  const fillId = `powerFill${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="week" {...AXIS} />
        <YAxis {...AXIS} width={52} tickFormatter={(v: number) => fmtCompact(v)} domain={['dataMin - 8000', 'dataMax + 4000']} />
        <Tooltip
          cursor={{ stroke: accent, strokeOpacity: 0.4, strokeWidth: 1 }}
          content={({ active, payload, label }) =>
            active && payload?.length ? <ChartTooltipBox title={label} rows={[{ label: 'Chiến lực TB', value: fmt(payload[0].value as number), color: accent }]} /> : null
          }
        />
        <Area type="monotone" dataKey="avg" stroke={accent} strokeWidth={2} fill={`url(#${fillId})`} activeDot={{ r: 5, stroke: 'var(--surface-solid)', strokeWidth: 2, fill: accent }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

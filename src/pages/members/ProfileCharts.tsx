import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AXIS, ChartTooltipBox, GRID } from '@/components/charts/chartTheme'
import type { Member } from '@/domain/types'
import { fmt, fmtCompact } from '@/lib/utils'

const STAT_LABELS: [keyof Member['stats'], string][] = [
  ['pve', 'PvE'],
  ['pvp', 'PvP'],
  ['support', 'Hỗ trợ'],
  ['survival', 'Sinh tồn'],
  ['teamwork', 'Phối hợp'],
  ['mobility', 'Cơ động'],
]

/** Radar năng lực — một chuỗi, màu lưu phái */
export function StatsRadar({ member, color }: { member: Member; color: string }) {
  const data = useMemo(() => STAT_LABELS.map(([k, label]) => ({ label, value: member.stats[k] })), [member.stats])
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%" margin={{ top: 10, right: 24, bottom: 10, left: 24 }}>
          <PolarGrid stroke="var(--line-strong)" strokeOpacity={0.6} />
          <PolarAngleAxis dataKey="label" tick={{ fill: 'var(--text-2)', fontSize: 12, fontWeight: 600 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} tickCount={5} />
          <Radar
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={0.22}
            dot={{ r: 4, fill: color, stroke: 'var(--surface-solid)', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: color, stroke: 'var(--surface-solid)', strokeWidth: 2 }}
            isAnimationActive
          />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <ChartTooltipBox
                  title={(payload[0].payload as { label: string }).label}
                  rows={[{ label: 'Điểm', value: `${payload[0].value}/100`, color }]}
                />
              ) : null
            }
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Diễn biến chiến lực 8 tuần — một chuỗi */
export function PowerHistoryChart({ member, color }: { member: Member; color: string }) {
  const data = useMemo(
    () => member.powerHistory.map((p, i, arr) => ({ week: i === arr.length - 1 ? 'Tuần này' : `T-${arr.length - 1 - i}`, power: p })),
    [member.powerHistory],
  )
  const gradId = `ph-${member.id}`
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: -6, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="week" {...AXIS} />
          <YAxis {...AXIS} width={52} tickFormatter={(v: number) => fmtCompact(v)} domain={['dataMin - 6000', 'dataMax + 4000']} />
          <Tooltip
            cursor={{ stroke: color, strokeOpacity: 0.45, strokeWidth: 1 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? <ChartTooltipBox title={label} rows={[{ label: 'Chiến lực', value: fmt(payload[0].value as number), color }]} /> : null
            }
          />
          <Area type="monotone" dataKey="power" stroke={color} strokeWidth={2} fill={`url(#${gradId})`} activeDot={{ r: 5, stroke: 'var(--surface-solid)', strokeWidth: 2, fill: color }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

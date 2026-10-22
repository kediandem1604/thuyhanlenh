import type { ReactNode } from 'react'

/* Các mảnh SVG dùng chung cho sơ đồ kiến trúc — màu lấy từ biến CSS nên tự đổi theo giao diện */

export const C = {
  gold: 'var(--gold)',
  jade: 'var(--jade)',
  cinnabar: 'var(--cinnabar)',
  azure: 'var(--azure)',
  violet: 'var(--violet)',
  ember: 'var(--ember)',
  sakura: 'var(--sakura)',
  muted: 'var(--muted)',
}

export function ArchDefs({ id }: { id: string }) {
  return (
    <defs>
      <style>{`
        .arch-flow { stroke-dasharray: 7 7; animation: arch-flow 1.4s linear infinite; }
        .arch-dash { stroke-dasharray: 4 6; }
        @keyframes arch-flow { to { stroke-dashoffset: -28; } }
        @media (prefers-reduced-motion: reduce) { .arch-flow { animation: none; } }
      `}</style>
      <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" style={{ fill: C.gold }} />
      </marker>
      <marker id={`${id}-arrow-muted`} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" style={{ fill: C.muted }} />
      </marker>
      <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="160%">
        <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0.25" />
      </filter>
    </defs>
  )
}

export function Zone({ x, y, w, h, label, color = C.gold }: { x: number; y: number; w: number; h: number; label: string; color?: string }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={22}
        style={{ fill: `color-mix(in oklab, ${color} 5%, transparent)`, stroke: `color-mix(in oklab, ${color} 35%, transparent)` }}
        strokeWidth={1.2}
        strokeDasharray="2 6"
        strokeLinecap="round"
      />
      <text x={x + 20} y={y + 24} style={{ fill: color, fontFamily: 'var(--font-sans)', letterSpacing: '0.2em' }} fontSize={11} fontWeight={700}>
        {label}
      </text>
    </g>
  )
}

export function Box({
  id,
  x,
  y,
  w,
  h,
  title,
  sub,
  sub2,
  han,
  color = C.gold,
  dashed = false,
}: {
  id: string
  x: number
  y: number
  w: number
  h: number
  title: string
  sub?: string
  sub2?: string
  han?: string
  color?: string
  dashed?: boolean
}) {
  const tx = han ? x + 54 : x + 18
  const lines = [sub, sub2].filter(Boolean) as string[]
  const titleY = y + h / 2 - (lines.length ? (lines.length * 15) / 2 : -5) + (lines.length ? 2 : 0)
  return (
    <g filter={dashed ? undefined : `url(#${id}-shadow)`}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={14}
        style={{ fill: dashed ? 'transparent' : 'var(--surface-solid)', stroke: `color-mix(in oklab, ${color} 60%, transparent)` }}
        strokeWidth={1.4}
        strokeDasharray={dashed ? '6 6' : undefined}
      />
      {!dashed && <rect x={x} y={y + 12} width={3.5} height={h - 24} rx={2} style={{ fill: color }} />}
      {han && (
        <g>
          <rect x={x + 14} y={y + h / 2 - 15} width={30} height={30} rx={8} style={{ fill: `color-mix(in oklab, ${color} 85%, black 10%)` }} />
          <text x={x + 29} y={y + h / 2 + 7} textAnchor="middle" style={{ fill: '#fff6ea', fontFamily: 'var(--font-han)' }} fontSize={19}>
            {han}
          </text>
        </g>
      )}
      <text x={tx} y={titleY} style={{ fill: 'var(--text)', fontFamily: 'var(--font-sans)' }} fontSize={14.5} fontWeight={700}>
        {title}
      </text>
      {lines.map((l, i) => (
        <text key={i} x={tx} y={titleY + 18 + i * 15} style={{ fill: 'var(--muted)', fontFamily: 'var(--font-sans)' }} fontSize={11.5}>
          {l}
        </text>
      ))}
    </g>
  )
}

export function Arrow({ id, d, muted = false, animated = true, both = false }: { id: string; d: string; muted?: boolean; animated?: boolean; both?: boolean }) {
  const marker = `url(#${id}-${muted ? 'arrow-muted' : 'arrow'})`
  return (
    <path
      d={d}
      fill="none"
      className={muted ? 'arch-dash' : animated ? 'arch-flow' : undefined}
      style={{ stroke: muted ? C.muted : C.gold }}
      strokeWidth={muted ? 1.4 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      markerEnd={marker}
      markerStart={both ? marker : undefined}
    />
  )
}

export function Label({ x, y, children, anchor = 'middle' }: { x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end' }) {
  const text = String(children)
  const w = text.length * 6.4 + 16
  const rx = anchor === 'middle' ? x - w / 2 : anchor === 'start' ? x : x - w
  return (
    <g>
      <rect x={rx} y={y - 12} width={w} height={19} rx={9.5} style={{ fill: 'var(--bg-2)', stroke: 'var(--line)' }} />
      <text x={rx + w / 2} y={y + 1.5} textAnchor="middle" style={{ fill: 'var(--text-2)', fontFamily: 'var(--font-sans)' }} fontSize={10.5} fontWeight={600}>
        {children}
      </text>
    </g>
  )
}

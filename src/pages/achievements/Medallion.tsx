import { useId } from 'react'
import { Lock } from 'lucide-react'
import { RARITY } from '@/domain/constants'
import type { Rarity } from '@/domain/types'
import { shade } from '@/lib/color'

/** Huy chương lục giác: viền màu độ hiếm phát sáng + chữ Hán ở giữa */
export function Medallion({ glyph, rarity, unlocked, size = 92 }: { glyph: string; rarity: Rarity; unlocked: boolean; size?: number }) {
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const r = RARITY[rarity]
  const hex = (cx: number, cy: number, rad: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 2
      return `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`
    }).join(' ')

  return (
    <div
      className="relative shrink-0 transition-[filter] duration-300"
      style={{
        width: size,
        height: size,
        filter: unlocked ? `drop-shadow(0 0 14px ${r.glow})` : 'grayscale(1) opacity(.5)',
      }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id={`${raw}-ring`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={shade(r.color, 45)} />
            <stop offset="0.5" stopColor={r.color} />
            <stop offset="1" stopColor={shade(r.color, -35)} />
          </linearGradient>
          <radialGradient id={`${raw}-core`} cx="0.4" cy="0.35" r="0.75">
            <stop offset="0" stopColor={shade(r.color, -35)} />
            <stop offset="1" stopColor={shade(r.color, -78)} />
          </radialGradient>
        </defs>
        <polygon points={hex(50, 50, 47)} fill={`url(#${raw}-ring)`} />
        <polygon points={hex(50, 50, 40)} fill={`url(#${raw}-core)`} stroke={shade(r.color, 25)} strokeWidth={1} strokeOpacity={0.6} />
        <polygon points={hex(50, 50, 34)} fill="none" stroke={r.color} strokeWidth={0.8} strokeDasharray="2 3" strokeOpacity={0.7} />
        {/* điểm sáng 6 đỉnh */}
        {Array.from({ length: 6 }, (_, i) => {
          const a = (Math.PI / 3) * i - Math.PI / 2
          return <circle key={i} cx={50 + 43.5 * Math.cos(a)} cy={50 + 43.5 * Math.sin(a)} r={1.8} fill="#fff" opacity={0.75} />
        })}
        <text
          x="50"
          y="51"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="'Ma Shan Zheng','KaiTi','STKaiti',serif"
          fontSize="38"
          fill={shade(r.color, 55)}
          style={{ paintOrder: 'stroke' }}
          stroke={shade(r.color, -60)}
          strokeWidth={1.2}
        >
          {glyph}
        </text>
        <path d="M22,30 Q50,14 78,30" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" opacity={0.18} />
      </svg>
      {!unlocked && (
        <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-line bg-[var(--surface-solid)] text-muted">
          <Lock size={13} />
        </span>
      )}
    </div>
  )
}

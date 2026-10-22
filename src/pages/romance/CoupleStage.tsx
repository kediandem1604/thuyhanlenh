import { useId } from 'react'
import { Swords, Wine } from 'lucide-react'
import { BOND_TYPES } from '@/domain/constants'
import type { BondType, Member } from '@/domain/types'
import { Chibi } from '@/components/chibi/Chibi'

function RedThread() {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 300 160" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`thread${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#e0523f" stopOpacity="0.2" />
          <stop offset="0.5" stopColor="#ff6b81" />
          <stop offset="1" stopColor="#e0523f" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path
        d="M70,136 C110,170 130,96 150,104 C170,96 190,170 230,136"
        fill="none"
        stroke={`url(#thread${id})`}
        strokeWidth="2.2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function Symbol({ type }: { type: BondType }) {
  const color = BOND_TYPES[type].color
  if (type === 'phu-the')
    return (
      <div className="relative grid place-items-center">
        <span className="absolute h-14 w-14 rounded-full blur-xl" style={{ background: `${color}66` }} />
        <svg viewBox="0 0 24 24" className="romance-beat relative h-9 w-9 drop-shadow-[0_0_10px_rgba(255,107,129,.7)]" aria-hidden>
          <path d="M12 21s-7.5-4.6-9.6-9.2C.8 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.1 1.8-1.9 3.3-3.1 5.4-3.1 3.6 0 5.8 3.7 4.2 7.3C19.5 16.4 12 21 12 21z" fill="#ff6b81" stroke="#fff" strokeWidth="0.8" />
        </svg>
      </div>
    )
  if (type === 'tri-ky')
    return (
      <div className="relative grid h-16 w-14 place-items-center">
        <span className="absolute h-14 w-14 rounded-full blur-xl" style={{ background: `${color}55` }} />
        <span className="romance-note absolute left-0 top-1 text-[18px]" style={{ color }}>
          ♪
        </span>
        <span className="romance-note absolute right-0 top-0 text-[15px]" style={{ color, animationDelay: '-1.2s' }}>
          ♫
        </span>
        {/* cây cổ cầm */}
        <svg viewBox="0 0 48 20" className="relative mt-6 w-12" aria-hidden>
          <path d="M3,12 Q4,6 12,6 L40,6 Q46,6 45,12 Q44,15 38,15 L10,15 Q3,15 3,12 Z" fill="#6b3f2a" stroke="#d8b46a" strokeWidth="1" />
          {[8, 10, 12].map((y) => (
            <path key={y} d={`M8,${y} L42,${y}`} stroke="#f3dca0" strokeWidth="0.5" opacity="0.8" />
          ))}
        </svg>
      </div>
    )
  return (
    <div className="relative grid place-items-center gap-1">
      <span className="absolute h-14 w-14 rounded-full blur-xl" style={{ background: `${color}55` }} />
      <Swords size={30} className="relative" style={{ color }} />
      <span className="relative flex gap-1" style={{ color }}>
        <Wine size={14} />
        <Wine size={14} className="-scale-x-100" />
      </span>
    </div>
  )
}

/** Hai chibi đối diện nhau và biểu tượng của mối duyên ở giữa */
export function CoupleStage({ a, b, type, size = 112, animated = false }: { a: Member; b: Member; type: BondType; size?: number; animated?: boolean }) {
  return (
    <div className="relative flex items-end justify-center gap-1">
      {type === 'phu-the' && <RedThread />}
      <Chibi look={a.look} classId={a.classId} size={size} animated={animated} effects={animated} />
      <div className="relative z-[1] mb-10 flex w-14 shrink-0 justify-center">
        <Symbol type={type} />
      </div>
      <Chibi look={b.look} classId={b.classId} size={size} animated={animated} effects={animated} flip />
    </div>
  )
}

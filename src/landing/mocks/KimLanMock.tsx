// Minh họa: Kim Lan Phổ — vòng 12 ghế kết nghĩa (9 người), ấn danh xưng theo ghế, sợi chỉ đỏ, lời thề.
// Đặt trong giao diện Bạch Gia (bạch kim, tuyết, bạch mai) để khoe giao diện riêng theo tổ chức.
import { useId } from 'react'
import { motion } from 'motion/react'
import { Crown } from 'lucide-react'
import { KIMLAN_OATH, ORG_THEMES, kimlanHonorific } from '@/domain/orgs'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { PlumBlossom, SnowCrystal } from '@/components/fx/shapes'
import { SeatSeal } from '@/pages/members/orgRoster'
import { alpha } from '@/lib/color'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { cn } from '@/lib/utils'
import { FrameSnow } from '../decor'
import { MockPanel } from './MockPanel'
import { useSeen } from './useSeen'
import { KIMLAN, type SampleHero } from './sample'

const SEATS = 12
const R = 38
const ACCENT = ORG_THEMES['bach-gia'].accent
const ORIGIN = '二人同心 · 其利断金 · 同心之言 · 其臭如兰 · '
/** nét vẽ / chữ nhấn theo token (bạch kim ở Dạ, lam mực ở Nhật) — luôn đủ tương phản */
const INK = 'var(--gold)'
const tint = (pct: number) => `color-mix(in oklab, var(--gold) ${pct}%, transparent)`

function pt(i: number, r = R) {
  const a = ((-90 + (i * 360) / SEATS) * Math.PI) / 180
  return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) }
}

function Seat({ h, i, total, big }: { h: SampleHero; i: number; total: number; big: boolean }) {
  const p = pt(i)
  const seat = i + 1
  const hon = kimlanHonorific(seat, h.gender, total)
  const elder = seat === 1
  const dim = big ? (elder ? 50 : 42) : elder ? 36 : 30
  return (
    <div className="absolute z-[2] flex -translate-x-1/2 -translate-y-[28%] flex-col items-center" style={{ left: `${p.x}%`, top: `${p.y}%`, width: big ? 88 : 62 }}>
      {elder && <Crown size={big ? 15 : 12} className="absolute -top-3.5 z-[1] text-gold" fill="var(--gold)" aria-hidden />}
      <span className="relative">
        <span className="block rounded-full" style={{ boxShadow: `0 0 0 2.5px var(--surface-solid), 0 0 18px ${alpha(ACCENT, elder ? 0.6 : 0.28)}` }}>
          <ChibiAvatar look={h.look} classId={h.classId} size={dim} />
        </span>
        <span
          className={cn('seal absolute z-[1] leading-none !rounded-[6px]', big ? '-bottom-1 -right-6 h-5 min-w-[2rem] px-1 text-[11px]' : '-bottom-1 -right-4 h-4 min-w-[1.6rem] px-0.5 text-[9px]')}
          style={
            elder
              ? undefined
              : {
                  color: '#1a2130',
                  background: `radial-gradient(circle at 30% 25%, #ffffff, ${ACCENT} 78%)`,
                  boxShadow: `inset 0 0 0 1.2px rgba(255,255,255,.6), 0 4px 10px -4px ${alpha(ACCENT, 0.9)}`,
                }
          }
        >
          {hon.han}
        </span>
      </span>
      {big && <span className="text-halo mt-1.5 max-w-full truncate text-[11.5px] font-semibold text-ink">{h.name}</span>}
      <span className={cn('text-halo font-semibold leading-tight', big ? 'text-[10.5px] tracking-[0.06em]' : 'mt-1 text-[10px]')} style={{ color: INK }}>
        {hon.name}
      </span>
    </div>
  )
}

function EmptySeat({ i, big }: { i: number; big: boolean }) {
  const p = pt(i)
  return (
    <div className="absolute z-[2] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center opacity-70" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
      <SeatSeal seat={i + 1} size="sm" faded />
      {big && <span className="mt-1 text-[10px] text-muted">Ghế trống</span>}
    </div>
  )
}

function Ring({ seen }: { seen: boolean }) {
  const big = useMediaQuery('(min-width: 640px)')
  const orbitId = `lp-orbit${useId().replace(/[^\w-]/g, '')}`
  const points = Array.from({ length: SEATS }, (_, i) => pt(i))
  const filled = KIMLAN.length
  const end = pt(filled - 1)
  const sweep = ((filled - 1) * 360) / SEATS
  const thread = `M ${points[0].x} ${points[0].y} A ${R} ${R} 0 ${sweep > 180 ? 1 : 0} 1 ${end.x} ${end.y}`

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[480px]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        <circle cx={50} cy={50} r={47} fill="none" stroke={INK} strokeOpacity={0.3} strokeWidth={0.3} strokeDasharray="0.6 1.6" />
        <circle cx={50} cy={50} r={R} fill="none" stroke={INK} strokeOpacity={0.4} strokeWidth={0.35} />
        <circle cx={50} cy={50} r={24} fill={tint(6)} stroke={INK} strokeOpacity={0.3} strokeWidth={0.3} />
        {/* sao 12 cánh — mười hai người một lòng */}
        {points.map((p, i) => {
          const q = points[(i + 5) % SEATS]
          return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={INK} strokeOpacity={0.14} strokeWidth={0.25} />
        })}
        <motion.path
          d={thread}
          fill="none"
          stroke="var(--cinnabar)"
          strokeOpacity={0.75}
          strokeWidth={0.6}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: seen ? 1 : 0 }}
          transition={{ duration: 2.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={0.8} fill={i < filled ? 'var(--cinnabar)' : INK} fillOpacity={i < filled ? 0.8 : 0.45} />
        ))}
      </svg>

      {/* câu Kinh Dịch — gốc hai chữ "Kim Lan" — xoay chậm quanh tâm */}
      <div className="animate-spin-slow absolute inset-[25%]" aria-hidden>
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <defs>
            <path id={orbitId} d="M50,50 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
          </defs>
          <text className="han" fontSize={6.4} fill={INK} fillOpacity={0.55}>
            <textPath href={`#${orbitId}`} textLength={274} lengthAdjust="spacing">
              {ORIGIN}
            </textPath>
          </text>
        </svg>
      </div>

      <div className="absolute left-1/2 top-1/2 z-[1] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
        <span className={cn('seal', big ? 'h-14 w-14 text-[30px]' : 'h-11 w-11 text-[24px]')}>兰</span>
        <span className={cn('han mt-1.5 pl-[0.4em] tracking-[0.4em]', big ? 'text-[19px]' : 'text-[15px]')} style={{ color: INK }}>
          金兰
        </span>
        <span className="text-[10.5px] tabular-nums text-muted">
          {filled}/{SEATS} · đồng tâm
        </span>
      </div>

      {KIMLAN.map((h, i) => (
        <Seat key={h.id} h={h} i={i} total={filled} big={big} />
      ))}
      {Array.from({ length: SEATS - filled }, (_, k) => (
        <EmptySeat key={k} i={filled + k} big={big} />
      ))}
    </div>
  )
}

export function KimLanMock() {
  const [ref, seen] = useSeen<HTMLDivElement>()
  return (
    <div ref={ref} data-org-theme="bach-gia" className="text-ink">
      <MockPanel
        han="谱"
        title="Kim Lan Phổ"
        sub="Thứ bậc theo chiều kim đồng hồ"
        className="relative overflow-hidden"
        right={
          <span className="chip">
            <span className="han text-[13px]" aria-hidden>
              白
            </span>
            Bạch Gia
          </span>
        }
      >
        <FrameSnow />
        {/* cành bạch mai góc khung */}
        <div className="pointer-events-none absolute -right-3 bottom-24 flex rotate-[-18deg] gap-1 opacity-80" aria-hidden>
          <PlumBlossom className="h-6 w-6" />
          <PlumBlossom className="mt-4 h-4 w-4" />
          <PlumBlossom className="h-5 w-5" />
        </div>
        <SnowCrystal className="pointer-events-none absolute left-4 top-[72px] h-5 w-5 opacity-50" color="var(--gold-2)" />
        <SnowCrystal className="pointer-events-none absolute bottom-28 left-[12%] h-3.5 w-3.5 opacity-40" color="var(--gold-2)" />

        <div className="relative" role="img" aria-label="Vòng Kim Lan 12 ghế: 9 người đã kết nghĩa, từ Đại ca tới Tiểu muội, còn 3 ghế trống">
          <div aria-hidden>
            <Ring seen={seen} />
          </div>
        </div>

        <figure
          className="relative mt-3 rounded-2xl border p-4 pl-14"
          style={{ borderColor: tint(35), background: `linear-gradient(120deg, ${tint(10)}, transparent 75%)` }}
        >
          <span className="seal absolute left-4 top-4 h-7 w-7 text-[15px]" aria-hidden>
            誓
          </span>
          <figcaption className="text-[10.5px] font-semibold uppercase tracking-[0.22em]" style={{ color: INK }}>
            Lời thề kết nghĩa
          </figcaption>
          <blockquote className="mt-1 text-[13.5px] italic leading-relaxed text-ink">“{KIMLAN_OATH}”</blockquote>
        </figure>
      </MockPanel>
    </div>
  )
}

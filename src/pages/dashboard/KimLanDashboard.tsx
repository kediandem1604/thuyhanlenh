// Kim Lan Đường — tổng quan của một nhóm kết nghĩa (≤ 12 người): thứ bậc, lời thề, phó bản cùng nhau.
import { useMemo } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { ArrowUpRight, CalendarDays, Crown, Flame, ScrollText, Swords, Users } from 'lucide-react'
import { DUNGEON_MAP, partyLabel } from '@/domain/constants'
import { KIMLAN_OATH, kimlanHonorific, themeOf } from '@/domain/orgs'
import type { Member } from '@/domain/types'
import { rankLabel, useCan, useCurrentUser, useFeature, useGuild, useMemberMap, useOrg } from '@/store/guild'
import { alpha } from '@/lib/color'
import { cn, daysBetween, fmtCompact, fmtDate } from '@/lib/utils'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { Panel, SectionTitle } from '@/components/ui/Panel'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { SeatSeal, useKimlanRoster } from '@/pages/members/orgRoster'
import { greeting } from './HeroBanner'
import { ActivityPanel, Announcements, DungeonWidget, PowerTrend, UpcomingEvents, useDungeonSummary, useKpi } from './widgets'

/** Nguyên văn Kinh Dịch — gốc của hai chữ "Kim Lan": 二人同心，其利断金；同心之言，其臭如兰 */
const KIMLAN_ORIGIN = '二人同心 · 其利断金 · 同心之言 · 其臭如兰 · '
const OATH_HAN = '不求同年同月同日生，但愿同年同月同日死'
const RING_SEATS = 12

interface SeatInfo {
  seat: number
  member: Member
  title: string
  han: string
}

/** Huynh đệ theo thứ bậc (ghế 1 = lớn nhất) kèm danh xưng */
function useSeats() {
  const sorted = useKimlanRoster()
  return useMemo<SeatInfo[]>(() => {
    return sorted.map((m, i) => {
      const seat = m.seat ?? i + 1
      const fallback = kimlanHonorific(seat, m.look.gender, sorted.length)
      return { seat, member: m, title: m.honorific ?? fallback.name, han: m.honorificHan ?? fallback.han }
    })
  }, [sorted])
}

/** chữ màu nhấn của giao diện tổ chức, pha với màu chữ để đọc được ở cả nền tối lẫn sáng */
const accentInk = (accent: string) => `color-mix(in oklab, ${accent} 55%, var(--text))`

/* ------------------------------------------------------------------ */
/* Cảnh nền: trăng bạc, núi tuyết, bạch mai, hạc trắng                  */
/* ------------------------------------------------------------------ */

function Blossom({ x, y, r = 5, rot = 0, accent }: { x: number; y: number; r?: number; rot?: number; accent: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={Math.cos((a * Math.PI) / 180) * r * 0.62} cy={Math.sin((a * Math.PI) / 180) * r * 0.62} r={r * 0.55} fill="#fbfdff" fillOpacity={0.88} stroke={accent} strokeOpacity={0.5} strokeWidth={0.5} />
      ))}
      <circle r={r * 0.26} fill={accent} />
      <circle r={r * 0.12} fill="#e0b25a" />
    </g>
  )
}

function Crane({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.svg
      viewBox="0 0 64 32"
      className={className}
      animate={{ y: [0, -7, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay }}
      aria-hidden
    >
      <path d="M24 16 Q29 1 45 3 Q37 10 34 17 Z" fill="#f4f8ff" fillOpacity={0.85} />
      <path d="M29 16 Q39 5 52 7 Q43 13 37 17 Z" fill="#dfe7f3" fillOpacity={0.6} />
      <path d="M3 15 Q12 17 20 17 Q32 16 40 18 Q48 19 56 18" fill="none" stroke="#f4f8ff" strokeOpacity={0.9} strokeWidth={2.2} strokeLinecap="round" />
      <path d="M42 19 L61 23" stroke="#f4f8ff" strokeOpacity={0.7} strokeWidth={0.9} strokeLinecap="round" />
      <circle cx={3.2} cy={14.6} r={1.5} fill="#e0523f" />
    </motion.svg>
  )
}

function SnowScene({ accent }: { accent: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: `radial-gradient(900px 420px at 72% 38%, ${alpha(accent, 0.16)}, transparent 70%)` }} />
      {/* trăng bạc */}
      <div
        className="absolute right-3 top-3 h-16 w-16 rounded-full sm:right-[7%] sm:top-[7%] sm:h-32 sm:w-32"
        style={{
          background: `radial-gradient(circle at 38% 36%, #ffffff, ${alpha(accent, 0.85)} 58%, ${alpha(accent, 0)} 72%)`,
          opacity: 0.32,
          boxShadow: `0 0 80px 10px ${alpha(accent, 0.18)}`,
        }}
      />
      {/* núi tuyết */}
      <svg className="absolute bottom-0 left-0 h-[140px] w-full sm:h-[190px]" viewBox="0 0 1200 200" preserveAspectRatio="none">
        <path d="M0,150 L120,70 L190,112 L300,38 L420,120 L520,64 L610,110 L720,30 L850,118 L940,72 L1040,120 L1130,58 L1200,96 L1200,200 L0,200 Z" fill={alpha(accent, 0.09)} />
        <path
          d="M300,38 L276,56 L292,52 L306,62 L322,50 Z M720,30 L694,50 L712,46 L726,58 L744,44 Z M1130,58 L1110,74 L1126,70 L1138,80 L1152,70 Z M120,70 L104,82 L118,80 L128,88 L140,80 Z"
          fill="#ffffff"
          fillOpacity={0.22}
        />
        <path d="M0,176 C160,150 260,186 420,164 C580,142 660,184 820,168 C980,152 1080,178 1200,160 L1200,200 L0,200 Z" fill="color-mix(in oklab, var(--bg) 72%, transparent)" />
      </svg>
      {/* cành bạch mai */}
      <svg className="absolute -left-4 -top-2 h-[120px] w-[240px] opacity-60 sm:h-[150px] sm:w-[300px]" viewBox="0 0 300 150">
        <path d="M-6,22 C50,40 92,30 138,58 S214,92 262,84" fill="none" stroke="color-mix(in oklab, var(--text) 30%, transparent)" strokeWidth={3.2} strokeLinecap="round" />
        <path d="M138,58 C150,36 170,24 196,20 M88,36 C96,58 110,72 132,82 M214,80 C226,64 240,58 258,56" fill="none" stroke="color-mix(in oklab, var(--text) 26%, transparent)" strokeWidth={1.8} strokeLinecap="round" />
        <Blossom x={60} y={34} r={7} rot={10} accent={accent} />
        <Blossom x={120} y={50} r={6} rot={40} accent={accent} />
        <Blossom x={196} y={20} r={7.5} rot={-12} accent={accent} />
        <Blossom x={170} y={72} r={5} rot={22} accent={accent} />
        <Blossom x={132} y={82} r={6.5} rot={64} accent={accent} />
        <Blossom x={238} y={86} r={6} rot={5} accent={accent} />
        <Blossom x={258} y={56} r={5} rot={30} accent={accent} />
        <circle cx={154} cy={42} r={2.4} fill={accent} fillOpacity={0.8} />
        <circle cx={222} cy={70} r={2} fill={accent} fillOpacity={0.8} />
      </svg>
      {/* hạc trắng */}
      <Crane className="absolute left-[58%] top-[1.5%] w-12 opacity-70 sm:left-[42%] sm:top-[9%] sm:w-16" />
      <Crane className="absolute left-[48%] top-[4%] w-8 opacity-50 sm:left-[52%] sm:top-[17%] sm:w-10" delay={1.4} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Kim Lan Phổ — vòng kết nghĩa                                         */
/* ------------------------------------------------------------------ */

const SEAT_R = 38

function seatPoint(i: number, n: number, r = SEAT_R) {
  const a = ((-90 + (i * 360) / n) * Math.PI) / 180
  return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) }
}

function HonorSeal({ s, accent, className }: { s: SeatInfo; accent: string; className?: string }) {
  const elder = s.member.rank === 'dai-ca'
  return (
    <span
      className={cn('seal h-6 min-w-[2.2rem] px-1.5 text-[12px] leading-none !rounded-[7px]', className)}
      style={
        elder
          ? undefined
          : {
              color: '#1a2130',
              background: `radial-gradient(circle at 30% 25%, #ffffff, ${accent} 78%)`,
              boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,.6), 0 4px 12px -4px ${alpha(accent, 0.9)}`,
            }
      }
      title={s.title}
    >
      {s.han}
    </span>
  )
}

function RingSeat({ s, i, n, accent }: { s: SeatInfo; i: number; n: number; accent: string }) {
  const p = seatPoint(i, n)
  const elder = i === 0
  const dim = elder ? 58 : 48
  return (
    // neo ở tâm ảnh đại diện (≈ 30% chiều cao khối) để ảnh nằm đúng trên vòng
    <div className="absolute z-[2] w-[94px] -translate-x-1/2 -translate-y-[30%]" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 + i * 0.07, type: 'spring', damping: 14 }}
        className="flex flex-col items-center"
      >
        <Link to={`/thanh-vien/${s.member.id}`} className="group relative flex flex-col items-center" aria-label={`${s.title} ${s.member.name}`}>
          {elder && <Crown size={16} className="absolute -top-4 z-[1] text-gold drop-shadow-[0_0_8px_var(--gold)]" fill="var(--gold)" />}
          <span className="relative transition-transform duration-300 group-hover:-translate-y-1">
            <span className="block rounded-full" style={{ boxShadow: `0 0 0 3px var(--surface-solid), 0 0 22px ${alpha(accent, elder ? 0.6 : 0.3)}`, borderRadius: 999 }}>
              <ChibiAvatar look={s.member.look} classId={s.member.classId} rank={s.member.rank} size={dim} />
            </span>
            <HonorSeal s={s} accent={accent} className="absolute -bottom-1 -right-5 z-[1]" />
          </span>
          <span className="text-halo mt-1 max-w-[94px] truncate text-[12px] font-semibold text-ink group-hover:text-gold">{s.member.name}</span>
        </Link>
        <span className="text-halo text-[10px] font-semibold uppercase leading-tight tracking-[0.14em]" style={{ color: accentInk(accent) }}>
          {s.title}
        </span>
      </motion.div>
    </div>
  )
}

function EmptySeat({ i, n, seat }: { i: number; n: number; seat: number }) {
  const p = seatPoint(i, n)
  return (
    <div className="absolute z-[2] flex w-[90px] -translate-x-1/2 -translate-y-1/2 flex-col items-center opacity-60" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
      <SeatSeal seat={seat} faded />
      <span className="mt-1 text-[10.5px] text-muted">Ghế trống</span>
    </div>
  )
}

function KimLanRing({ seats, accent, han }: { seats: SeatInfo[]; accent: string; han: string }) {
  const n = Math.max(RING_SEATS, seats.length)
  const points = Array.from({ length: n }, (_, i) => seatPoint(i, n))
  const filled = seats.length
  // sợi chỉ đỏ nối các ghế đã có người, theo thứ bậc
  const arcEnd = seatPoint(Math.max(0, filled - 1), n)
  const sweep = filled > 1 ? ((filled - 1) * 360) / n : 0
  const thread = sweep > 0 ? `M ${points[0].x} ${points[0].y} A ${SEAT_R} ${SEAT_R} 0 ${sweep > 180 ? 1 : 0} 1 ${arcEnd.x} ${arcEnd.y}` : ''

  return (
    <div className="relative mx-auto mb-5 aspect-square w-full max-w-[580px]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        <circle cx={50} cy={50} r={46} fill="none" stroke={accent} strokeOpacity={0.22} strokeWidth={0.3} strokeDasharray="0.6 1.6" />
        <circle cx={50} cy={50} r={SEAT_R} fill="none" stroke={accent} strokeOpacity={0.3} strokeWidth={0.35} />
        <circle cx={50} cy={50} r={25} fill={alpha(accent, 0.05)} stroke={accent} strokeOpacity={0.25} strokeWidth={0.3} />
        {/* sao 12 cánh — mười hai người một lòng */}
        {n === RING_SEATS &&
          points.map((p, i) => {
            const q = points[(i + 5) % n]
            return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={accent} strokeOpacity={0.11} strokeWidth={0.25} />
          })}
        {thread && (
          <motion.path
            d={thread}
            fill="none"
            stroke="var(--cinnabar)"
            strokeOpacity={0.7}
            strokeWidth={0.55}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={0.8} fill={i < filled ? 'var(--cinnabar)' : accent} fillOpacity={i < filled ? 0.8 : 0.35} />
        ))}
      </svg>

      {/* chữ Kinh Dịch xoay quanh tâm */}
      <div className="animate-spin-slow absolute inset-[24%]" aria-hidden>
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <defs>
            <path id="kimlan-orbit" d="M50,50 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
          </defs>
          <text className="han" fontSize={6.4} fill={accentInk(accent)} fillOpacity={0.55}>
            <textPath href="#kimlan-orbit" textLength={274} lengthAdjust="spacing">
              {KIMLAN_ORIGIN}
            </textPath>
          </text>
        </svg>
      </div>

      {/* tâm */}
      <div className="absolute left-1/2 top-1/2 z-[1] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
        <motion.span
          initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12, delay: 0.1 }}
          className="seal h-[64px] w-[64px] text-[36px] 2xl:h-[76px] 2xl:w-[76px] 2xl:text-[42px]"
        >
          {han}
        </motion.span>
        <span className="han mt-2 pl-[0.4em] text-[20px] tracking-[0.4em]" style={{ color: accentInk(accent) }}>
          金兰
        </span>
        <span className="text-[11px] tabular-nums text-muted">
          {filled}/{RING_SEATS} · đồng tâm
        </span>
      </div>

      {seats.map((s, i) => (
        <RingSeat key={s.member.id} s={s} i={i} n={n} accent={accent} />
      ))}
      {Array.from({ length: Math.max(0, RING_SEATS - filled) }, (_, k) => (
        <EmptySeat key={`empty-${k}`} i={filled + k} n={n} seat={filled + k + 1} />
      ))}
    </div>
  )
}

/** Màn hẹp: hai hàng thẻ theo thứ bậc thay cho vòng tròn */
function KimLanGrid({ seats, accent }: { seats: SeatInfo[]; accent: string }) {
  return (
    <ol className="grid grid-cols-3 gap-2.5">
      {seats.map((s, i) => (
        <motion.li key={s.member.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
          <Link
            to={`/thanh-vien/${s.member.id}`}
            className="flex flex-col items-center rounded-2xl border px-1.5 pb-2 pt-3 text-center"
            style={{ borderColor: alpha(accent, i === 0 ? 0.55 : 0.22), background: `linear-gradient(180deg, ${alpha(accent, i === 0 ? 0.14 : 0.06)}, transparent 80%)` }}
          >
            <ChibiAvatar look={s.member.look} classId={s.member.classId} rank={s.member.rank} status={s.member.status} size={i === 0 ? 54 : 46} />
            <HonorSeal s={s} accent={accent} className="relative -mt-2" />
            <span className="mt-1 w-full truncate text-[11.5px] font-semibold text-ink">{s.member.name}</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: accentInk(accent) }}>
              {s.title}
            </span>
          </Link>
        </motion.li>
      ))}
    </ol>
  )
}

/* ------------------------------------------------------------------ */
/* Đầu trang                                                           */
/* ------------------------------------------------------------------ */

function KimLanHero({ seats, accent }: { seats: SeatInfo[]; accent: string }) {
  const org = useOrg()
  const me = useCurrentUser()
  const hasLich = useFeature('lich')
  const hasDungeon = useFeature('pho-ban')
  const canRecord = useCan('clear.record')
  const ring = useMediaQuery('(min-width: 640px)')
  const online = seats.filter((s) => s.member.status === 'online' || s.member.status === 'in-raid').length
  const days = org?.createdAt ? daysBetween(org.createdAt) : 0
  const capacity = org?.capacity ?? RING_SEATS

  return (
    <section className="panel corners relative overflow-hidden p-0">
      <SnowScene accent={accent} />
      <div className="relative grid grid-cols-1 gap-8 p-6 sm:p-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,520px)] xl:items-center 2xl:grid-cols-[minmax(0,1fr)_580px]">
        <div className="flex min-w-0 flex-col justify-center pt-12 sm:pt-14">
          <div className="text-halo">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="eyebrow flex flex-wrap items-center gap-2" style={{ color: accentInk(accent) }}>
              <span className="h-px w-6" style={{ background: accent }} />
              Kim Lan Đường · {greeting()}, {me ? `${rankLabel(me)} ${me.name}` : 'huynh đệ'}
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="title-display text-gold-grad mt-3 text-[40px] sm:text-[54px]">
              {org?.name ?? 'Kim Lan'}
            </motion.h1>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-1 flex items-center gap-3">
              {org?.han && (
                <span className="han text-[30px]" style={{ color: accentInk(accent) }}>
                  {org.han}
                </span>
              )}
              <span className="han text-[14px] tracking-[0.5em] text-muted">金兰结义</span>
              <span className="h-px max-w-[120px] flex-1" style={{ background: `linear-gradient(90deg, ${alpha(accent, 0.7)}, transparent)` }} />
            </motion.div>
            {org?.motto && <p className="mt-3 max-w-lg text-[15px] italic text-ink">“{org.motto}”</p>}
            {org?.description && <p className="mt-2 max-w-lg text-[13px] text-ink-2">{org.description}</p>}
          </div>

          {/* lời thề kết nghĩa */}
          <motion.figure
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="relative mt-5 max-w-xl rounded-2xl border p-4 pl-[3.75rem]"
            style={{ borderColor: alpha(accent, 0.35), background: `linear-gradient(120deg, ${alpha(accent, 0.12)}, transparent 75%)` }}
          >
            <span className="seal absolute left-4 top-4 h-8 w-8 text-[17px]">誓</span>
            <figcaption className="text-[10.5px] font-semibold uppercase tracking-[0.22em]" style={{ color: accentInk(accent) }}>
              Lời thề kết nghĩa
            </figcaption>
            <blockquote className="mt-1 text-[14px] italic leading-relaxed text-ink">“{KIMLAN_OATH}”</blockquote>
            <div className="han mt-1.5 text-[12.5px] tracking-[0.08em] text-muted">{OATH_HAN}</div>
          </motion.figure>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="chip" style={{ color: accentInk(accent) }}>
              <Users size={12} /> {seats.length}/{capacity} huynh đệ
            </span>
            <span className="chip" style={{ color: 'var(--jade)' }}>
              <span className="relative h-1.5 w-1.5 rounded-full bg-jade pulse-online" /> {online} đang trực tuyến
            </span>
            {days >= 1 && (
              <span className="chip" title={`Ngày kết nghĩa: ${fmtDate(org!.createdAt)}`}>
                <span className="han text-[12px]">义</span> Kết nghĩa {days} ngày
              </span>
            )}
            {org?.server && <span className="chip">Máy chủ {org.server}</span>}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {hasLich && (
              <Link to="/lich" className="btn btn-gold">
                <CalendarDays size={16} /> Lịch phó bản
              </Link>
            )}
            {hasDungeon && (
              <Link to={canRecord ? '/pho-ban?action=record' : '/pho-ban'} className="btn">
                <Swords size={16} /> {canRecord ? 'Ghi nhận phó bản' : 'Tiến độ phó bản'}
              </Link>
            )}
            <Link to="/thanh-vien" className="btn btn-ghost">
              <ScrollText size={16} /> Kim Lan Phổ
            </Link>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-center gap-2 text-center xl:hidden">
            <span className="seal h-7 w-7 text-[15px]">谱</span>
            <span className="title-display text-[20px] text-ink">Kim Lan Phổ</span>
          </div>
          {seats.length === 0 ? (
            <EmptyState han="兰" title="Chưa có huynh đệ nào" desc="Gửi link mời để kết nghĩa Kim Lan." />
          ) : ring ? (
            <KimLanRing seats={seats} accent={accent} han={org?.han?.[0] || '兰'} />
          ) : (
            <KimLanGrid seats={seats} accent={accent} />
          )}
          <p className="mt-2 text-center text-[11.5px] text-muted">Thứ bậc từ lớn đến nhỏ, theo chiều kim đồng hồ — sợi chỉ đỏ nối những người đã kết nghĩa.</p>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Trận phổ đã lưu                                                     */
/* ------------------------------------------------------------------ */

function FormationsWidget() {
  const teams = useGuild((s) => s.teams)
  const members = useMemberMap()
  const list = useMemo(() => [...teams].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3), [teams])
  return (
    <Panel corners>
      <SectionTitle
        han="阵"
        title="Trận phổ của nhà"
        subtitle={`${teams.length} đội hình đã lưu`}
        right={
          <Link to="/bay-tran" className="btn btn-ghost btn-sm text-gold">
            Bày trận <ArrowUpRight size={14} />
          </Link>
        }
      />
      {list.length === 0 ? (
        <EmptyState han="阵" title="Chưa có trận phổ nào" desc="Xếp đội hình ở Bày Trận rồi lưu lại để dùng mỗi tuần." />
      ) : (
        <ul className="space-y-3">
          {list.map((t) => {
            const d = t.dungeonId ? DUNGEON_MAP[t.dungeonId] : undefined
            const ids = t.slots.filter((x): x is string => !!x && !!members[x])
            const avg = ids.length ? ids.reduce((s, id) => s + members[id].power, 0) / ids.length : 0
            return (
              <li key={t.id} className="rounded-2xl border border-line bg-black/10 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-bold text-ink">{t.name}</div>
                    <div className="truncate text-[11.5px] text-muted">
                      {d ? `${d.name} · ${partyLabel(d)} người` : 'Chưa gắn phó bản'} · CL TB {fmtCompact(avg)}
                    </div>
                  </div>
                  {d && (
                    <span className="han shrink-0 text-[18px]" style={{ color: d.color }}>
                      {d.han[0]}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex -space-x-2">
                  {ids.slice(0, 10).map((id) => {
                    const m = members[id]
                    return <ChibiAvatar key={id} look={m.look} classId={m.classId} rank={m.rank} size={26} className="rounded-full ring-2 ring-[var(--surface-solid)]" />
                  })}
                  {ids.length > 10 && <span className="grid h-[26px] w-[26px] place-items-center rounded-full border border-line bg-[var(--surface-solid)] text-[10px] text-muted">+{ids.length - 10}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

/* ------------------------------------------------------------------ */

export function KimLanDashboard() {
  const org = useOrg()
  const seats = useSeats()
  const kpi = useKpi()
  const { pct } = useDungeonSummary()
  const hasLich = useFeature('lich')
  const hasDungeon = useFeature('pho-ban')
  const hasFormation = useFeature('bay-tran')
  const accent = themeOf(org?.theme).accent
  const capacity = org?.capacity ?? RING_SEATS

  const cards = [
    <StatCard key="m" index={0} icon={Users} label="Huynh đệ" value={seats.length} suffix={`/ ${capacity}`} hint={`${kpi.online} đang hoạt động`} color="#9fc3e8" />,
    <StatCard key="p" index={1} icon={Flame} label="Chiến lực TB" value={kpi.avg} format={fmtCompact} delta={kpi.delta} hint="so với tuần trước" color="#d8b46a" />,
    hasDungeon && (
      <StatCard key="d" index={2} icon={Swords} label="Tiến độ phó bản" value={pct} format={(n) => `${Math.round(n)}`} suffix="%" hint={`${kpi.clearsWeek} lượt hạ boss tuần này`} color="#5ec7b0" />
    ),
    hasLich && <StatCard key="e" index={3} icon={CalendarDays} label="Hẹn 7 ngày tới" value={kpi.eventsWeek} hint="buổi cùng nhau xuất chinh" color="#a08cf5" />,
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <KimLanHero seats={seats} accent={accent} />

      <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', cards.length >= 4 && 'xl:grid-cols-4', cards.length === 3 && 'xl:grid-cols-3')}>{cards}</div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        {hasLich ? <UpcomingEvents title="Lịch đi phó bản" subtitle="Hẹn giờ cùng huynh đệ tỷ muội" /> : <PowerTrend accent={accent} />}
        {hasDungeon ? <DungeonWidget title="Cùng nhau chinh phạt" compact /> : hasFormation ? <FormationsWidget /> : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Announcements title="Gia huấn" han="训" subtitle="Lời dặn trong nhà — Đại ca ghim lên đầu" noun="gia huấn" />
        <div className="space-y-6">
          <ActivityPanel title="Nhật ký Kim Lan" subtitle={`Những ngày cùng nhau của ${org?.name ?? 'Kim Lan'}`} limit={6} />
          {hasFormation && hasDungeon && <FormationsWidget />}
        </div>
      </div>

      {hasLich && <PowerTrend accent={accent} />}
    </div>
  )
}

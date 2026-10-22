// Tổng quan Team — team tự lập: đầu trang, lối tắt tới các chức năng đang bật, lịch, tiến độ, xếp hạng.
import { useMemo } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { ArrowUpRight, CalendarDays, Crown, Flame, Settings, Swords, Target, Users } from 'lucide-react'
import { CLASSES, RANKS } from '@/domain/constants'
import { ROUTE_FEATURE, themeOf } from '@/domain/orgs'
import type { Member } from '@/domain/types'
import { rankLabel, useCan, useCurrentUser, useFeature, useGuild, useOrg } from '@/store/guild'
import { useNavItems } from '@/app/useNav'
import { alpha } from '@/lib/color'
import { cn, fmtCompact } from '@/lib/utils'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { Panel, SectionTitle } from '@/components/ui/Panel'
import { StatCard } from '@/components/ui/StatCard'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { greeting } from './HeroBanner'
import {
  ActivityPanel,
  Announcements,
  ClassDistribution,
  DungeonWidget,
  MentorWidget,
  PowerTop,
  PowerTrend,
  UpcomingEvents,
  WeeklyHonor,
  useDungeonSummary,
  useKpi,
} from './widgets'

/* ------------------------------------------------------------------ */
/* Chòm sao của team (tối đa 7 người, xếp theo hình Bắc Đẩu)            */
/* ------------------------------------------------------------------ */

/** Bắc Đẩu thất tinh — tọa độ % trong khung 10:7 */
const STARS = [
  { x: 8, y: 26 },
  { x: 24, y: 18 },
  { x: 39, y: 27 },
  { x: 53, y: 40 },
  { x: 56, y: 76 },
  { x: 86, y: 80 },
  { x: 90, y: 44 },
]
const LINKS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 3],
]
/** người thứ k đứng ở ngôi sao nào: trưởng nhóm ở chỗ giao giữa cán và gáo */
const STAR_ORDER = [3, 6, 2, 4, 5, 1, 0]

function Constellation({ members, accent }: { members: Member[]; accent: string }) {
  const wide = useMediaQuery('(min-width: 640px)')
  const shown = members.slice(0, STARS.length)
  const at = new Map(shown.map((m, k) => [STAR_ORDER[k], m]))
  return (
    <div className="relative mx-auto aspect-[10/7] w-full max-w-[540px]">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        {LINKS.filter(([a, b]) => at.has(a) && at.has(b)).map(([a, b], i) => (
          <motion.line
            key={`${a}-${b}`}
            x1={STARS[a].x}
            y1={STARS[a].y}
            x2={STARS[b].x}
            y2={STARS[b].y}
            stroke={accent}
            strokeOpacity={0.75}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="4 5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.12, duration: 0.6 }}
          />
        ))}
      </svg>
      {/* sao lấp lánh nền */}
      {[
        [16, 60, 0],
        [70, 12, 0.8],
        [34, 86, 1.4],
        [72, 56, 0.4],
        [96, 18, 1.9],
        [4, 80, 1.1],
      ].map(([x, y, d], i) => (
        <span
          key={i}
          aria-hidden
          className="chibi-twinkle pointer-events-none absolute h-1.5 w-1.5 rotate-45 rounded-[2px]"
          style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s`, background: i % 2 ? accent : '#fff', boxShadow: `0 0 8px ${accent}` }}
        />
      ))}
      {[...at.entries()].map(([star, m], k) => {
        const p = STARS[star]
        const lead = k === 0
        const size = (wide ? 58 : 40) + (lead ? 12 : 0)
        return (
          <div key={m.id} className="absolute z-[1] w-[96px] -translate-x-1/2 -translate-y-[30%]" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + k * 0.08, type: 'spring', damping: 14 }}
              className="flex flex-col items-center"
            >
              <Link to={`/thanh-vien/${m.id}`} className="group relative flex flex-col items-center" title={`${m.name} · ${rankLabel(m)}`}>
                {lead && <Crown size={wide ? 16 : 12} className="absolute -top-4 z-[1] text-gold drop-shadow-[0_0_8px_var(--gold)]" fill="var(--gold)" />}
                <span className="rounded-full transition-transform duration-300 group-hover:-translate-y-1" style={{ boxShadow: `0 0 0 3px var(--surface-solid), 0 0 24px ${alpha(accent, lead ? 0.65 : 0.35)}`, borderRadius: 999 }}>
                  <ChibiAvatar look={m.look} classId={m.classId} rank={m.rank} status={m.status} size={size} />
                </span>
                <span className="text-halo mt-1 hidden max-w-[96px] truncate text-[12px] font-semibold text-ink group-hover:text-gold sm:block">{m.name}</span>
              </Link>
              <span className="text-halo hidden text-[10.5px] text-muted sm:block">{lead ? rankLabel(m) : CLASSES[m.classId].name}</span>
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Đầu trang                                                           */
/* ------------------------------------------------------------------ */

function TeamHero({ ordered, accent }: { ordered: Member[]; accent: string }) {
  const org = useOrg()
  const me = useCurrentUser()
  const hasLich = useFeature('lich')
  const hasDungeon = useFeature('pho-ban')
  const canRecord = useCan('clear.record')
  const online = ordered.filter((m) => m.status === 'online' || m.status === 'in-raid').length
  const leader = ordered[0]
  const more = Math.max(0, ordered.length - STARS.length)

  return (
    <section className="panel corners relative overflow-hidden p-0">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0" style={{ background: `radial-gradient(820px 380px at 76% 42%, ${alpha(accent, 0.16)}, transparent 70%)` }} />
        <span className="han absolute -bottom-10 right-[34%] select-none text-[240px] leading-none opacity-[0.05]" style={{ color: accent }}>
          队
        </span>
        <svg className="absolute bottom-0 left-0 w-full opacity-60" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,90 C150,60 260,110 420,84 C560,62 640,104 800,88 C950,72 1050,100 1200,80 L1200,120 L0,120 Z" fill="color-mix(in oklab, var(--bg) 70%, transparent)" />
        </svg>
      </div>

      <div className="relative grid grid-cols-1 gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div className="min-w-0">
          <div className="text-halo">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="eyebrow flex flex-wrap items-center gap-2">
              <span className="h-px w-6 bg-gold/60" />
              Tổng Quan Team · {greeting()}, {me?.name ?? 'đại hiệp'}
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="title-display text-gold-grad mt-3 text-[40px] sm:text-[54px]">
              {org?.name ?? 'Team'}
            </motion.h1>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-1 flex items-center gap-3">
              {org?.han && <span className="han text-[30px] text-cinnabar">{org.han}</span>}
              <span className="h-px max-w-[120px] flex-1 bg-gradient-to-r from-gold/60 to-transparent" />
            </motion.div>
            {org?.motto && <p className="mt-3 max-w-md text-[14.5px] italic text-ink-2">“{org.motto}”</p>}
            {org?.description && <p className="mt-2 max-w-md text-[13px] text-muted">{org.description}</p>}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="chip text-gold">
              <Users size={12} /> {ordered.length} thành viên
            </span>
            <span className="chip" style={{ color: 'var(--jade)' }}>
              <span className="relative h-1.5 w-1.5 rounded-full bg-jade pulse-online" /> {online} đang trực tuyến
            </span>
            {leader && (
              <span className="chip">
                <Crown size={12} className="text-gold" /> {rankLabel(leader)}: {leader.name}
              </span>
            )}
            {org?.server && <span className="chip">Máy chủ {org.server}</span>}
          </div>

          {(hasLich || hasDungeon) && (
            <div className="mt-6 flex flex-wrap gap-2">
              {hasLich && (
                <Link to="/lich" className="btn btn-gold">
                  <CalendarDays size={16} /> Lịch của team
                </Link>
              )}
              {hasDungeon && (
                <Link to={canRecord ? '/pho-ban?action=record' : '/pho-ban'} className="btn">
                  <Swords size={16} /> {canRecord ? 'Ghi nhận phó bản' : 'Tiến độ phó bản'}
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <Constellation members={ordered} accent={accent} />
          {more > 0 && (
            <div className="mt-1 text-center">
              <Link to="/thanh-vien" className="chip hover:text-gold">
                +{more} thành viên khác <ArrowUpRight size={12} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Lối tắt chức năng                                                    */
/* ------------------------------------------------------------------ */

function FeatureLinks() {
  const items = useNavItems()
  const canManage = useCan('org.manage')
  const links = useMemo(() => items.filter((it) => ROUTE_FEATURE[it.path]), [items])
  return (
    <Panel corners>
      <SectionTitle
        han="门"
        title="Chức năng của team"
        subtitle={links.length ? `${links.length} chức năng đang bật` : 'Chưa bật chức năng nào'}
        right={
          canManage ? (
            <Link to="/thiet-lap" className="btn btn-ghost btn-sm text-gold">
              <Settings size={14} /> Bật / tắt
            </Link>
          ) : undefined
        }
      />
      {links.length === 0 ? (
        <p className="text-[12.5px] text-muted">{canManage ? 'Vào Thiết Lập để bật những chức năng team cần dùng.' : 'Trưởng nhóm chưa bật chức năng nào.'}</p>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {links.map((it, i) => (
            <motion.div key={it.path} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
              <Link to={it.path} className="group panel panel-hover relative flex h-full items-center gap-3 overflow-hidden !rounded-2xl p-3.5">
                <span className="han pointer-events-none absolute -bottom-4 -right-1 text-[56px] leading-none text-gold opacity-[0.07]">{it.han}</span>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--gold)_14%,transparent)] text-gold">
                  <it.icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-ink group-hover:text-gold">{it.label}</span>
                  <span className="block truncate text-[11.5px] text-muted">{it.desc}</span>
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </Panel>
  )
}

/* ------------------------------------------------------------------ */

export function TeamDashboard() {
  const org = useOrg()
  const members = useGuild((s) => s.members)
  const kpi = useKpi()
  const { pct } = useDungeonSummary()
  const hasLich = useFeature('lich')
  const hasDungeon = useFeature('pho-ban')
  const hasRankings = useFeature('phong-van')
  const hasTreasury = useFeature('bang-kho')
  const hasMentor = useFeature('su-do')
  const accent = themeOf(org?.theme).accent

  // trưởng nhóm → phó nhóm → theo chiến lực
  const ordered = useMemo(() => [...members].sort((a, b) => RANKS[a.rank].order - RANKS[b.rank].order || b.power - a.power), [members])

  const cards = [
    <StatCard key="m" index={0} icon={Users} label="Thành viên" value={members.length} hint={`${kpi.online} đang hoạt động`} color="#6fa8ff" />,
    <StatCard key="p" index={1} icon={Flame} label="Chiến lực TB" value={kpi.avg} format={fmtCompact} delta={kpi.delta} hint="so với tuần trước" color="#d8b46a" />,
    hasDungeon && (
      <StatCard key="d" index={2} icon={Swords} label="Tiến độ phó bản" value={pct} format={(n) => `${Math.round(n)}`} suffix="%" hint={`${kpi.clearsWeek} lượt clear tuần này`} color="#5ec7b0" />
    ),
    hasLich && <StatCard key="e" index={3} icon={CalendarDays} label="Hẹn 7 ngày tới" value={kpi.eventsWeek} hint="hoạt động đã lên lịch" color="#a08cf5" />,
    hasTreasury && <StatCard key="c" index={4} icon={Target} label="Cống hiến tuần" value={kpi.weekly} format={fmtCompact} hint="tổng cả team" color="#e0523f" />,
  ]
    .filter(Boolean)
    .slice(0, 4)

  const side = [hasRankings && <PowerTop key="r" />, hasTreasury && <WeeklyHonor key="h" />, hasMentor && <MentorWidget key="s" />].filter(Boolean)
  if (!side.length) side.push(<ClassDistribution key="c" />)

  return (
    <div className="space-y-6">
      <TeamHero ordered={ordered} accent={accent} />

      <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', cards.length >= 4 && 'xl:grid-cols-4', cards.length === 3 && 'xl:grid-cols-3')}>{cards}</div>

      <FeatureLinks />

      {(hasLich || hasDungeon) && (
        <div className={cn('grid grid-cols-1 gap-6', hasLich && hasDungeon && 'xl:grid-cols-[1.4fr_1fr]')}>
          {hasLich && <UpcomingEvents subtitle="Hoạt động của team trong những ngày tới" />}
          {hasDungeon && <DungeonWidget compact />}
        </div>
      )}

      {/* hai cột xếp chồng để không còn ô trống khi số khối lẻ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Announcements title="Bảng tin team" han="告" subtitle="Thông báo từ trưởng nhóm" noun="thông báo" />
          {side.filter((_, i) => i % 2 === 1)}
        </div>
        <div className="space-y-6">
          <ActivityPanel title="Nhật ký team" limit={8} />
          {side.filter((_, i) => i % 2 === 0)}
        </div>
      </div>

      <PowerTrend accent={accent} />
    </div>
  )
}

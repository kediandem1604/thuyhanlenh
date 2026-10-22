// Khối dùng chung cho các bảng tổng quan (Bang Hội · Kim Lan · Team).
import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { ArrowUpRight, Check, Clock, GraduationCap, MapPin, Megaphone, Pin, PinOff, Plus, Target, Trash, Trophy, Users } from 'lucide-react'
import { useCan, useCurrentUser, useFeature, useGuild, useMemberMap, useOrgType } from '@/store/guild'
import { toast } from '@/store/ui'
import { CLASSES, CLASS_CHART_ORDER, DUNGEONS, MENTOR_STAGES, MODES, MODE_IDS } from '@/domain/constants'
import type { DungeonMode } from '@/domain/types'
import { cn, fmt, fmtCompact, fmtDateTime, sum, timeAgo } from '@/lib/utils'
import { Panel, SectionTitle } from '@/components/ui/Panel'
import { ProgressBar, ProgressRing } from '@/components/ui/Progress'
import { Countdown } from '@/components/ui/Countdown'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChibiAvatar, MemberChip } from '@/components/chibi/ChibiAvatar'
import { ActivityFeed } from '@/components/feed/ActivityFeed'
import { useClassChartColors } from '@/components/charts/chartTheme'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { eventMeta } from '@/pages/calendar/calendarUtils'
import { AnnouncementComposer } from './AnnouncementComposer'
import { useOrgWords } from './orgWords'

/* ------------------------------------------------------------------ */
/* Số liệu                                                             */
/* ------------------------------------------------------------------ */

export function useDungeonSummary() {
  const progress = useGuild((s) => s.progress)
  return useMemo(() => {
    let total = 0
    let killed = 0
    const rows = DUNGEONS.map((d) => {
      const byMode = Object.fromEntries(
        MODE_IDS.map((mode) => {
          const map = progress[d.id]?.[mode] ?? {}
          const k = d.bosses.filter((b) => (map[b.id]?.kills ?? 0) > 0).length
          total += d.bosses.length
          killed += k
          return [mode, k]
        }),
      ) as Record<DungeonMode, number>
      return { d, byMode }
    })
    // mục tiêu: độ khó thấp nhất chưa clear hết của phó bản mới nhất đã có tiến độ (chưa có gì → phó bản đầu tiên)
    let goal: { dungeon: (typeof DUNGEONS)[number]; mode: DungeonMode; next: string } | null = null
    for (const { d, byMode } of [...rows].reverse()) {
      const mode = MODE_IDS.find((m) => byMode[m] < d.bosses.length)
      const started = MODE_IDS.some((m) => byMode[m] > 0)
      if (mode && (started || d === DUNGEONS[0])) {
        const map = progress[d.id]?.[mode] ?? {}
        const next = d.bosses.find((b) => (map[b.id]?.kills ?? 0) === 0)
        goal = { dungeon: d, mode, next: next?.name ?? d.bosses[0].name }
        break
      }
    }
    return { rows, pct: total ? (killed / total) * 100 : 0, killed, total, goal }
  }, [progress])
}

/** Chỉ số nhanh dùng chung cho thẻ thống kê */
export function useKpi() {
  const members = useGuild((s) => s.members)
  const clears = useGuild((s) => s.clears)
  const events = useGuild((s) => s.events)
  return useMemo(() => {
    const online = members.filter((m) => m.status !== 'offline').length
    const avg = sum(members.map((m) => m.power)) / Math.max(1, members.length)
    const avgPrev = sum(members.map((m) => m.powerHistory[6] ?? m.power)) / Math.max(1, members.length)
    const weekly = sum(members.map((m) => m.weeklyContribution))
    const now = Date.now()
    const weekAgo = now - 7 * 86400000
    const clearsWeek = clears.filter((c) => new Date(c.date).getTime() > weekAgo).length
    const eventsWeek = events.filter((e) => {
      const t = new Date(e.start).getTime()
      return t > now - 86400000 && t < now + 7 * 86400000
    }).length
    return { online, avg, delta: avgPrev ? ((avg - avgPrev) / avgPrev) * 100 : 0, weekly, clearsWeek, eventsWeek }
  }, [members, clears, events])
}

/* ------------------------------------------------------------------ */
/* Chiến lực trung bình                                                */
/* ------------------------------------------------------------------ */

const PowerTrendChart = lazy(() => import('./PowerTrendChart'))

/** Khung chờ biểu đồ: vài vạch lưới mờ đúng kích thước biểu đồ thật */
function ChartSkeleton() {
  return (
    <div className="flex h-full flex-col justify-between py-3 pl-12 pr-2" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="block h-px w-full bg-[var(--line)]" />
      ))}
    </div>
  )
}

export function PowerTrend({ accent = 'var(--gold)' }: { accent?: string }) {
  const members = useGuild((s) => s.members)
  const w = useOrgWords()
  const data = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const values = members.map((m) => m.powerHistory[i] ?? m.power)
      return {
        week: i === 7 ? 'Tuần này' : `T-${7 - i}`,
        avg: Math.round(sum(values) / Math.max(1, values.length)),
      }
    })
  }, [members])
  const first = data[0]?.avg ?? 0
  const last = data.at(-1)?.avg ?? 0
  const growth = first ? ((last - first) / first) * 100 : 0

  return (
    <Panel corners className="flex flex-col">
      <SectionTitle
        han="力"
        title="Chiến lực trung bình"
        subtitle={`Trung bình chiến lực ${w.all} qua 8 tuần`}
        right={
          <span className="chip" style={{ color: growth >= 0 ? 'var(--jade)' : 'var(--cinnabar)' }}>
            <ArrowUpRight size={12} className={growth < 0 ? 'rotate-90' : undefined} /> {growth >= 0 ? '+' : ''}
            {growth.toFixed(1).replace('.', ',')}% / 8 tuần
          </span>
        }
      />
      <div className="h-[240px] w-full">
        {members.length === 0 ? (
          <EmptyState han="力" title="Chưa có dữ liệu" />
        ) : (
          // biểu đồ (recharts ~340 KB) tải riêng sau khi trang hiện — khung giữ sẵn chiều cao nên không bị giật
          <Suspense fallback={<ChartSkeleton />}>
            <PowerTrendChart data={data} accent={accent} />
          </Suspense>
        )}
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Sự kiện sắp tới                                                     */
/* ------------------------------------------------------------------ */

export function UpcomingEvents({ title = 'Sắp diễn ra', subtitle, limit = 4 }: { title?: string; subtitle?: string; limit?: number }) {
  const events = useGuild((s) => s.events)
  const setRsvp = useGuild((s) => s.setRsvp)
  const orgType = useOrgType()
  const w = useOrgWords()
  const canRsvp = useCan('event.rsvp')
  const [rsvpBusy, setRsvpBusy] = useState(false)
  const me = useCurrentUser()
  const members = useMemberMap()
  const upcoming = useMemo(() => {
    const now = Date.now()
    return [...events]
      .filter((e) => new Date(e.start).getTime() + e.durationMin * 60000 > now)
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, limit)
  }, [events, limit])

  const next = upcoming[0]
  const nextMeta = next ? eventMeta(next.type, orgType) : null
  return (
    <Panel corners className="flex flex-col">
      <SectionTitle
        han="历"
        title={title}
        subtitle={subtitle ?? `Hoạt động của ${w.all} trong những ngày tới`}
        right={
          <Link to="/lich" className="btn btn-ghost btn-sm text-gold">
            Xem lịch <ArrowUpRight size={14} />
          </Link>
        }
      />
      {!next && <EmptyState han="静" title="Chưa có hẹn nào" desc="Lịch những ngày tới còn trống." />}
      {next && nextMeta && (
        <div
          className="relative mb-3 overflow-hidden rounded-2xl border p-4"
          style={{
            borderColor: `color-mix(in oklab, ${nextMeta.color} 45%, transparent)`,
            background: `linear-gradient(135deg, color-mix(in oklab, ${nextMeta.color} 16%, transparent), transparent 70%)`,
          }}
        >
          <span className="han absolute -right-2 -top-5 text-[90px] leading-none opacity-10" style={{ color: nextMeta.color }}>
            {nextMeta.han}
          </span>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: nextMeta.color }}>
            {nextMeta.name} · tiếp theo
          </div>
          <div className="mt-1 text-[16px] font-bold text-ink">{next.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> {fmtDateTime(next.start)}
            </span>
            {next.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} /> {next.location}
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-[13px]">
              <span className="text-muted">Bắt đầu sau </span>
              <Countdown to={next.start} />
            </div>
            {me && canRsvp && (
              <button
                className={cn('btn btn-sm', next.rsvp[me.id] === 'yes' ? 'btn-gold' : '')}
                disabled={rsvpBusy}
                onClick={async () => {
                  const going = next.rsvp[me.id] === 'yes'
                  setRsvpBusy(true)
                  // store cập nhật lạc quan + tự báo lỗi; chỉ chúc mừng khi máy chủ xác nhận
                  const r = await setRsvp(next.id, me.id, going ? null : 'yes')
                  setRsvpBusy(false)
                  if (r.ok) toast({ tone: going ? 'info' : 'success', title: going ? 'Đã hủy điểm danh' : 'Đã điểm danh tham gia', desc: next.title })
                }}
              >
                {next.rsvp[me.id] === 'yes' ? (
                  <>
                    <Check size={14} /> Đã điểm danh
                  </>
                ) : (
                  'Tham gia'
                )}
              </button>
            )}
          </div>
        </div>
      )}
      <ul className="space-y-1">
        {upcoming.slice(1).map((e) => {
          const t = eventMeta(e.type, orgType)
          const yes = Object.values(e.rsvp).filter((v) => v === 'yes').length
          const leader = members[e.leaderId]
          return (
            <li key={e.id} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.03]">
              <span className="han grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[18px]" style={{ background: `color-mix(in oklab, ${t.color} 16%, transparent)`, color: t.color }}>
                {t.han}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold text-ink">{e.title}</div>
                <div className="truncate text-[11.5px] text-muted">
                  {fmtDateTime(e.start)}
                  {leader ? ` · ${leader.name}` : ''}
                </div>
              </div>
              <span className="chip shrink-0">
                <Users size={11} /> {yes}/{e.capacity}
              </span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Tiến độ phó bản                                                     */
/* ------------------------------------------------------------------ */

export function DungeonWidget({ title = 'Tiến độ phó bản', compact = false }: { title?: string; compact?: boolean }) {
  const { rows, pct, killed, total, goal } = useDungeonSummary()
  const visible = compact ? rows.filter(({ d, byMode }) => MODE_IDS.some((m) => byMode[m] > 0) || d === goal?.dungeon) : rows
  return (
    <Panel corners>
      <SectionTitle
        han="征"
        title={title}
        subtitle={`${killed}/${total} lượt boss theo độ khó đã hạ`}
        right={
          <Link to="/pho-ban" className="btn btn-ghost btn-sm text-gold">
            Chi tiết <ArrowUpRight size={14} />
          </Link>
        }
      />
      <div className="mb-4 flex items-center gap-4 rounded-2xl border border-line bg-black/10 p-3">
        <ProgressRing value={pct} size={68} stroke={6}>
          <span className="text-[14px] font-bold text-ink">{Math.round(pct)}%</span>
        </ProgressRing>
        {goal ? (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-cinnabar">
              <Target size={12} /> Mục tiêu tuần
            </div>
            <div className="truncate text-[14.5px] font-bold text-ink">
              {goal.dungeon.name} · {MODES[goal.mode].name}
            </div>
            <div className="truncate text-[12px] text-muted">Boss kế tiếp: {goal.next}</div>
          </div>
        ) : (
          <div className="min-w-0 text-[13px] font-semibold text-gold">
            <Trophy size={14} className="mr-1 inline" /> Đã chinh phục toàn bộ phó bản!
          </div>
        )}
      </div>
      <div className="space-y-3">
        {visible.map(({ d, byMode }) => (
          <div key={d.id}>
            <div className="mb-1.5 flex items-center gap-2 text-[12.5px]">
              <span className="han text-[14px]" style={{ color: d.color }}>
                {d.han[0]}
              </span>
              <span className="truncate font-semibold text-ink">{d.name}</span>
              <span className="ml-auto shrink-0 text-[11px] text-muted">{d.size} người</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MODE_IDS.map((m) => (
                <div key={m} title={`${MODES[m].name}: ${byMode[m]}/${d.bosses.length} boss`}>
                  <ProgressBar value={byMode[m]} max={d.bosses.length} color={MODES[m].color} height={5} />
                  <div className="mt-0.5 text-[10.5px] tabular-nums" style={{ color: byMode[m] === d.bosses.length ? MODES[m].color : 'var(--muted)' }}>
                    {MODES[m].name} {byMode[m]}/{d.bosses.length}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Vinh danh tuần (cống hiến — cần Quỹ & Đấu Giá)                      */
/* ------------------------------------------------------------------ */

const MEDALS = ['#f3c969', '#cfd6e6', '#d9925a']

export function WeeklyHonor() {
  const members = useGuild((s) => s.members)
  const hasRankings = useFeature('phong-van')
  const top = useMemo(() => [...members].sort((a, b) => b.weeklyContribution - a.weeklyContribution).slice(0, 6), [members])
  const max = top[0]?.weeklyContribution || 1
  return (
    <Panel corners>
      <SectionTitle
        han="荣"
        title="Vinh danh tuần"
        subtitle="Cống hiến nhiều nhất từ đầu tuần"
        right={
          hasRankings ? (
            <Link to="/phong-van" className="btn btn-ghost btn-sm text-gold">
              Bảng Phong Vân <ArrowUpRight size={14} />
            </Link>
          ) : undefined
        }
      />
      {top.length === 0 && <EmptyState han="荣" title="Chưa có ai" />}
      <ol className="space-y-2">
        {top.map((m, i) => (
          <motion.li
            key={m.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i }}
            className="flex items-center gap-3 rounded-xl px-2 py-1.5"
            style={i < 3 ? { background: `linear-gradient(90deg, ${MEDALS[i]}1f, transparent 70%)` } : undefined}
          >
            <span
              className="title-display grid h-7 w-7 shrink-0 place-items-center rounded-full text-[15px]"
              style={i < 3 ? { background: MEDALS[i], color: '#1b1406' } : { color: 'var(--muted)' }}
            >
              {i + 1}
            </span>
            <MemberChip member={m} size={34} className="flex-1" />
            <div className="w-24 shrink-0 text-right">
              <div className="text-[13px] font-bold tabular-nums text-ink">{fmt(m.weeklyContribution)}</div>
              <div className="progress-track mt-1" style={{ height: 4 }}>
                <div className="progress-fill" style={{ width: `${(m.weeklyContribution / max) * 100}%` }} />
              </div>
            </div>
          </motion.li>
        ))}
      </ol>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Bảng xếp hạng thu gọn (chiến lực)                                    */
/* ------------------------------------------------------------------ */

export function PowerTop({ limit = 5 }: { limit?: number }) {
  const members = useGuild((s) => s.members)
  const top = useMemo(() => [...members].sort((a, b) => b.power - a.power).slice(0, limit), [members, limit])
  const max = top[0]?.power || 1
  return (
    <Panel corners>
      <SectionTitle
        han="榜"
        title="Bảng xếp hạng"
        subtitle="Chiến lực cao nhất"
        right={
          <Link to="/phong-van" className="btn btn-ghost btn-sm text-gold">
            Xem bảng <ArrowUpRight size={14} />
          </Link>
        }
      />
      {top.length === 0 && <EmptyState han="榜" title="Chưa có ai" />}
      <ol className="space-y-2">
        {top.map((m, i) => (
          <motion.li
            key={m.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i }}
            className="flex items-center gap-3 rounded-xl px-2 py-1.5"
            style={i < 3 ? { background: `linear-gradient(90deg, ${MEDALS[i]}1f, transparent 70%)` } : undefined}
          >
            <span
              className="title-display grid h-7 w-7 shrink-0 place-items-center rounded-full text-[15px]"
              style={i < 3 ? { background: MEDALS[i], color: '#1b1406' } : { color: 'var(--muted)' }}
            >
              {i + 1}
            </span>
            <MemberChip member={m} size={34} className="flex-1" sub={CLASSES[m.classId].name} />
            <div className="w-24 shrink-0 text-right">
              <div className="text-[13px] font-bold tabular-nums text-ink">{fmtCompact(m.power)}</div>
              <div className="progress-track mt-1" style={{ height: 4 }}>
                <div className="progress-fill" style={{ width: `${(m.power / max) * 100}%` }} />
              </div>
            </div>
          </motion.li>
        ))}
      </ol>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Bảng tin                                                            */
/* ------------------------------------------------------------------ */

const TAG_META = {
  'thong-bao': { name: 'Thông báo', color: 'var(--azure)' },
  'su-kien': { name: 'Sự kiện', color: 'var(--jade)' },
  'quy-dinh': { name: 'Quy định', color: 'var(--cinnabar)' },
  'vinh-danh': { name: 'Vinh danh', color: 'var(--gold)' },
} as const

export function Announcements({
  title = 'Bảng cáo thị',
  han = '告',
  subtitle = 'Thông báo từ ban quản lý',
  noun = 'cáo thị',
}: {
  title?: string
  han?: string
  subtitle?: string
  /** cách gọi một tin: "cáo thị", "gia huấn", "thông báo" */
  noun?: string
}) {
  const announcements = useGuild((s) => s.announcements)
  const togglePin = useGuild((s) => s.togglePin)
  const removeAnnouncement = useGuild((s) => s.removeAnnouncement)
  const canManage = useCan('announce.manage')
  const w = useOrgWords()
  const members = useMemberMap()
  const [composing, setComposing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const sorted = useMemo(() => [...announcements].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date)), [announcements])
  const list = expanded ? sorted : sorted.slice(0, 3)
  const confirming = confirmId ? announcements.find((a) => a.id === confirmId) : undefined

  const pin = async (id: string, pinned: boolean) => {
    const r = await togglePin(id)
    if (r.ok) toast({ tone: 'info', title: pinned ? `Đã bỏ ghim ${noun}` : 'Đã ghim lên đầu bảng' })
  }
  const remove = async (id: string) => {
    const r = await removeAnnouncement(id)
    if (r.ok) toast({ tone: 'info', title: `Đã gỡ ${noun}` })
  }

  return (
    <Panel corners>
      <SectionTitle
        han={han}
        title={title}
        subtitle={subtitle}
        right={
          canManage ? (
            <button className="btn btn-gold btn-sm" onClick={() => setComposing(true)}>
              <Plus size={14} /> Viết {noun}
            </button>
          ) : (
            <Megaphone size={18} className="text-gold" />
          )
        }
      />
      {list.length === 0 && <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-[12.5px] text-muted">Chưa có {noun} nào.</p>}
      <div className="space-y-3">
        {list.map((a) => {
          const author = members[a.authorId]
          const tag = TAG_META[a.tag]
          return (
            <article key={a.id} className={cn('group rounded-2xl border bg-black/10 p-4', a.pinned ? 'border-gold/40' : 'border-line')}>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="chip !h-5 !text-[10.5px]" style={{ color: tag.color }}>
                  {tag.name}
                </span>
                {a.pinned && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-gold">
                    <Pin size={11} /> Ghim
                  </span>
                )}
                <span className="ml-auto text-[11px] text-muted">{timeAgo(a.date)}</span>
                {canManage && (
                  <span className="flex items-center gap-0.5">
                    <button
                      className={cn('btn btn-ghost btn-icon !h-6 !w-6 !rounded-lg', a.pinned ? 'text-gold' : 'text-muted hover:text-gold')}
                      onClick={() => pin(a.id, a.pinned)}
                      title={a.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                      aria-label={a.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                    >
                      {a.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                    </button>
                    <button
                      className="btn btn-ghost btn-icon !h-6 !w-6 !rounded-lg text-muted hover:text-cinnabar"
                      onClick={() => setConfirmId(a.id)}
                      title={`Gỡ ${noun}`}
                      aria-label={`Gỡ ${noun}`}
                    >
                      <Trash size={13} />
                    </button>
                  </span>
                )}
              </div>
              <h4 className="text-[14px] font-bold text-ink">{a.title}</h4>
              <p className={cn('mt-1 whitespace-pre-line text-[12.5px] text-ink-2', !expanded && 'line-clamp-2')}>{a.body}</p>
              {author && (
                <div className="mt-2 flex items-center gap-2 text-[11.5px] text-muted">
                  <ChibiAvatar look={author.look} classId={author.classId} rank={author.rank} size={20} />
                  {author.name}
                </div>
              )}
            </article>
          )
        })}
      </div>
      {sorted.length > 3 && (
        <button className="btn btn-ghost btn-sm mt-3 w-full text-gold" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Thu gọn' : `Xem tất cả ${sorted.length} ${noun}`}
        </button>
      )}

      <AnnouncementComposer open={composing} onClose={() => setComposing(false)} noun={noun} />
      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirmId(null)}
        onConfirm={() => confirming && remove(confirming.id)}
        title={`Gỡ ${noun}?`}
        han="撤"
        confirmLabel="Gỡ xuống"
      >
        <span className="capitalize">{noun}</span> <b className="text-ink">“{confirming?.title}”</b> sẽ biến mất khỏi {w.home} của mọi người.
      </ConfirmDialog>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Nhật ký hoạt động                                                   */
/* ------------------------------------------------------------------ */

export function ActivityPanel({ title, subtitle, limit = 10 }: { title?: string; subtitle?: string; limit?: number }) {
  const w = useOrgWords()
  const count = useGuild((s) => s.activities.length)
  return (
    <Panel corners>
      <SectionTitle han="志" title={title ?? 'Nhật ký hoạt động'} subtitle={subtitle ?? `Mọi biến động gần đây trong ${w.name}`} />
      {count === 0 ? <EmptyState han="志" title="Chưa có biến động nào" /> : <ActivityFeed limit={limit} />}
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Lưu phái                                                            */
/* ------------------------------------------------------------------ */

export function ClassDistribution() {
  const members = useGuild((s) => s.members)
  const w = useOrgWords()
  const colors = useClassChartColors()
  const rows = useMemo(() => {
    const counts = Object.fromEntries(CLASS_CHART_ORDER.map((c) => [c, 0])) as Record<string, number>
    members.forEach((m) => counts[m.classId]++)
    return CLASS_CHART_ORDER.map((id) => ({ id, count: counts[id] }))
  }, [members])
  const max = Math.max(...rows.map((r) => r.count), 1)
  return (
    <Panel corners>
      <SectionTitle han="派" title={`Lưu phái trong ${w.short}`} subtitle={`${members.length} ${w.member} · 7 lưu phái`} />
      <ul className="space-y-2.5">
        {rows.map((r) => {
          const c = CLASSES[r.id]
          return (
            <li key={r.id} className="group grid grid-cols-[96px_1fr_34px] items-center gap-3" title={`${c.name}: ${r.count} người`}>
              <span className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-2">
                <span className="han text-[14px] text-muted">{c.han[0]}</span>
                {c.name}
              </span>
              <span className="relative h-3 overflow-hidden rounded-full bg-black/15">
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: colors[r.id] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(r.count / max) * 100}%` }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
              <span className="text-right text-[12.5px] font-bold tabular-nums text-ink">{r.count}</span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Sư đồ                                                               */
/* ------------------------------------------------------------------ */

export function MentorWidget() {
  const mentorships = useGuild((s) => s.mentorships)
  const members = useMemberMap()
  const active = mentorships.filter((m) => m.status === 'active')
  const near = [...active].sort((a, b) => b.stage - a.stage).slice(0, 3)
  return (
    <Panel corners>
      <SectionTitle
        han="师"
        title="Sư Đồ Đường"
        subtitle={`${active.length} cặp đang truyền nghề · ${mentorships.length - active.length} đã xuất sư`}
        right={
          <Link to="/su-do" className="btn btn-ghost btn-sm text-gold" aria-label="Sư Đồ Đường">
            <GraduationCap size={14} />
          </Link>
        }
      />
      {near.length === 0 && <p className="text-[12.5px] text-muted">Chưa có cặp sư đồ nào đang truyền nghề.</p>}
      <ul className="space-y-3">
        {near.map((ms) => {
          const master = members[ms.masterId]
          const disciple = members[ms.discipleId]
          if (!master || !disciple) return null
          const done = ms.tasks.filter((t) => t.done).length
          return (
            <li key={ms.id} className="rounded-2xl border border-line bg-black/10 p-3">
              <div className="flex items-center gap-2">
                <ChibiAvatar look={master.look} classId={master.classId} rank={master.rank} size={30} />
                <span className="text-[11px] text-muted">→</span>
                <ChibiAvatar look={disciple.look} classId={disciple.classId} rank={disciple.rank} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-semibold text-ink">
                    {master.name} · {disciple.name}
                  </div>
                  <div className="text-[11px] text-gold">
                    {MENTOR_STAGES[ms.stage].name} ({ms.stage + 1}/5)
                  </div>
                </div>
              </div>
              <ProgressBar value={done} max={ms.tasks.length} className="mt-2.5" height={5} />
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

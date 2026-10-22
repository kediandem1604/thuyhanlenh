import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Crown, Flame, GraduationCap, HeartPulse, Swords, Target, TrendingUp, Trophy } from 'lucide-react'
import { useCurrentUser, useGuild, useOrg, useOrgType } from '@/store/guild'
import type { Feature } from '@/domain/orgs'
import { useOrgWords, type OrgWords } from '@/pages/dashboard/orgWords'
import { CLASSES, CLASS_IDS } from '@/domain/constants'
import type { ClassId, Member } from '@/domain/types'
import { alpha } from '@/lib/color'
import { cn, fmt } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, SectionTitle } from '@/components/ui/Panel'
import { Segmented } from '@/components/ui/Segmented'
import { ClassBadge, RankSeal } from '@/components/ui/Badges'
import { Chibi } from '@/components/chibi/Chibi'
import { ChibiAvatar, MemberChip } from '@/components/chibi/ChibiAvatar'
import { useMediaQuery } from '@/lib/useMediaQuery'

type Tab = 'power' | 'weekly' | 'total' | 'activity' | 'pvp' | 'master'

interface TabMeta {
  label: string
  unit: string
  han: string
  icon: typeof Flame
  desc: (w: OrgWords) => string
  /** hạng mục chỉ hiện khi tổ chức bật chức năng này */
  feature?: Feature
}

const TABS: Record<Tab, TabMeta> = {
  power: { label: 'Chiến lực', unit: 'chiến lực', han: '力', icon: Flame, desc: (w) => `Ai mạnh nhất ${w.name}?` },
  weekly: { label: 'Cống hiến tuần', unit: 'cống hiến', han: '勤', icon: Target, desc: () => 'Cống hiến từ đầu tuần đến nay', feature: 'bang-kho' },
  total: { label: 'Tổng cống hiến', unit: 'cống hiến', han: '功', icon: Trophy, desc: (w) => `Công lao tích lũy từ ngày gia nhập ${w.short}`, feature: 'bang-kho' },
  activity: { label: 'Sôi nổi', unit: 'điểm', han: '活', icon: HeartPulse, desc: (w) => `Độ sôi nổi trong ${w.short} (tối đa 100)` },
  pvp: { label: 'PvP', unit: 'hạ gục', han: '斩', icon: Swords, desc: () => 'Số lần hạ gục đối thủ trên chiến trường', feature: 'bang-chien' },
  master: { label: 'Sư phụ', unit: 'đồ đệ', han: '师', icon: GraduationCap, desc: () => 'Số đồ đệ đã xuất sư dưới trướng', feature: 'su-do' },
}

const TAB_ORDER: Tab[] = ['power', 'weekly', 'total', 'activity', 'pvp', 'master']

const MEDAL = {
  1: { color: '#f3c969', name: 'Quán quân', deep: '#a67c25' },
  2: { color: '#cfd6e6', name: 'Á quân', deep: '#7f889c' },
  3: { color: '#d9925a', name: 'Hạng ba', deep: '#8a4f24' },
} as const

/** Màu chữ huy chương: pha với màu chữ chính để đủ tương phản ở cả nền tối lẫn nền sáng */
const medalInk = (place: 1 | 2 | 3) => `color-mix(in oklab, ${MEDAL[place].color} 55%, var(--text))`

interface Row {
  member: Member
  value: number
  rank: number
  change?: number
}

function formatValue(tab: Tab, v: number) {
  if (tab === 'activity') return `${v}`
  return fmt(v)
}

function subText(tab: Tab, m: Member, value: number) {
  switch (tab) {
    case 'pvp': {
      const kd = m.pvp.deaths ? m.pvp.kills / m.pvp.deaths : m.pvp.kills
      return `K/D ${kd.toFixed(2).replace('.', ',')}`
    }
    case 'master':
      return `${value} đồ đệ xuất sư`
    case 'activity':
      return 'điểm sôi nổi'
    default:
      return TABS[tab].unit
  }
}

/* ------------------------------------------------------------------ */
/* Bục vinh danh                                                        */
/* ------------------------------------------------------------------ */

function Podium({ rows, tab }: { rows: Row[]; tab: Tab }) {
  const wide = useMediaQuery('(min-width: 640px)')
  const first = rows[0]
  const second = rows[1]
  const third = rows[2]
  const order: [Row | undefined, 1 | 2 | 3][] = [
    [second, 2],
    [first, 1],
    [third, 3],
  ]
  const chibiSize = (place: 1 | 2 | 3) => (place === 1 ? (wide ? 176 : 112) : wide ? 134 : 88)
  const pedestalH = (place: 1 | 2 | 3) => (place === 1 ? (wide ? 128 : 96) : place === 2 ? (wide ? 96 : 72) : wide ? 76 : 58)

  return (
    <div className="relative overflow-hidden rounded-[18px]">
      {/* tia sáng xoay sau quán quân */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2">
        <div
          className="animate-spin-slow h-[520px] w-[520px] rounded-full opacity-70"
          style={{
            background: 'repeating-conic-gradient(from 0deg, color-mix(in oklab, var(--gold) 22%, transparent) 0deg 8deg, transparent 8deg 24deg)',
            maskImage: 'radial-gradient(circle, black 10%, transparent 62%)',
            WebkitMaskImage: 'radial-gradient(circle, black 10%, transparent 62%)',
          }}
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[34%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: 'color-mix(in oklab, var(--gold) 28%, transparent)' }}
      />
      {/* lấp lánh */}
      {[
        [18, 22, 0],
        [80, 16, 0.6],
        [30, 58, 1.2],
        [72, 50, 1.8],
        [50, 8, 0.9],
        [88, 70, 0.3],
        [10, 72, 1.5],
      ].map(([x, y, d], i) => (
        <span
          key={i}
          aria-hidden
          className="chibi-twinkle pointer-events-none absolute h-2 w-2 rotate-45 rounded-[2px]"
          style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s`, background: i % 2 ? 'var(--gold-2)' : '#fff', boxShadow: '0 0 10px var(--gold)' }}
        />
      ))}

      <div className="relative grid grid-cols-3 items-end gap-2 px-1 pt-8 sm:gap-6 sm:px-6">
        {order.map(([row, place]) =>
          row ? (
            <motion.div
              key={`${row.member.id}-${place}`}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 16, delay: place === 1 ? 0.15 : place === 2 ? 0.3 : 0.4 }}
              className="flex min-w-0 flex-col items-center"
            >
              <Link to={`/thanh-vien/${row.member.id}`} className="group relative flex flex-col items-center" aria-label={row.member.name}>
                {place === 1 && (
                  <motion.span
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="absolute -top-6 z-[2] text-gold"
                  >
                    <Crown size={wide ? 30 : 22} className="drop-shadow-[0_0_12px_var(--gold)]" fill="var(--gold)" />
                  </motion.span>
                )}
                <Chibi
                  look={row.member.look}
                  classId={row.member.classId}
                  size={chibiSize(place)}
                  className="relative z-[1] drop-shadow-[0_16px_20px_rgba(0,0,0,.45)] transition-transform duration-300 group-hover:-translate-y-1.5"
                />
              </Link>
              <div className="relative z-[1] -mt-2 w-full text-center">
                <div className="truncate px-1 text-[12.5px] font-bold text-ink sm:text-[14.5px]">{row.member.name}</div>
                <div className="title-display text-[18px] tabular-nums sm:text-[24px]" style={{ color: medalInk(place) }}>
                  {formatValue(tab, row.value)}
                </div>
                <div className="hidden truncate text-[11px] text-muted sm:block">{subText(tab, row.member, row.value)}</div>
              </div>
              {/* bục */}
              <div
                className="relative mt-2 w-full overflow-hidden rounded-t-2xl border border-b-0"
                style={{
                  height: pedestalH(place),
                  borderColor: alpha(MEDAL[place].color, 0.55),
                  background: `linear-gradient(180deg, ${alpha(MEDAL[place].color, 0.42)}, ${alpha(MEDAL[place].deep, 0.12)} 85%)`,
                  boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.35)}, 0 -8px 30px -12px ${alpha(MEDAL[place].color, 0.7)}`,
                }}
              >
                <div className="flex flex-col items-center gap-1 pt-2">
                  <span
                    className="title-display text-[30px] leading-none sm:text-[42px]"
                    style={{ color: medalInk(place), textShadow: `0 0 18px ${alpha(MEDAL[place].color, 0.6)}` }}
                  >
                    {place}
                  </span>
                  <span className="hidden text-[10.5px] font-semibold uppercase tracking-[0.2em] text-ink-2 sm:block">{MEDAL[place].name}</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <div key={`empty-${place}`} className="flex flex-col items-center opacity-40">
              <div className="mb-2 text-[12px] text-muted">Còn trống</div>
              <div className="w-full rounded-t-2xl border border-dashed border-line" style={{ height: pedestalH(place) }} />
            </div>
          ),
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export default function RankingsPage() {
  const members = useGuild((s) => s.members)
  const mentorships = useGuild((s) => s.mentorships)
  const me = useCurrentUser()
  const org = useOrg()
  const orgType = useOrgType()
  const w = useOrgWords()
  const features = org?.features
  // hạng mục thuộc chức năng đang tắt thì ẩn (vd. cống hiến cần Quỹ & Đấu Giá)
  const tabs = useMemo(() => TAB_ORDER.filter((t) => !TABS[t].feature || !features || features.includes(TABS[t].feature)), [features])
  const [pickedTab, setTab] = useState<Tab>('power')
  const tab: Tab = tabs.includes(pickedTab) ? pickedTab : 'power'
  const [cls, setCls] = useState<ClassId | 'all'>('all')

  const graduatedBy = useMemo(() => {
    const map: Record<string, number> = {}
    mentorships.forEach((ms) => {
      if (ms.status === 'graduated') map[ms.masterId] = (map[ms.masterId] ?? 0) + 1
    })
    return map
  }, [mentorships])

  const rows = useMemo<Row[]>(() => {
    const value = (m: Member) => {
      switch (tab) {
        case 'power':
          return m.power
        case 'weekly':
          return m.weeklyContribution
        case 'total':
          return m.contribution
        case 'activity':
          return m.activity
        case 'pvp':
          return m.pvp.kills
        case 'master':
          return graduatedBy[m.id] ?? 0
      }
    }
    let pool = members.filter((m) => cls === 'all' || m.classId === cls)
    if (tab === 'master') pool = pool.filter((m) => (graduatedBy[m.id] ?? 0) > 0)
    const sorted = [...pool].sort((a, b) => value(b) - value(a) || b.power - a.power)

    let prevRank: Record<string, number> = {}
    if (tab === 'power') {
      const prev = [...pool].sort((a, b) => (b.powerHistory[6] ?? b.power) - (a.powerHistory[6] ?? a.power))
      prevRank = Object.fromEntries(prev.map((m, i) => [m.id, i + 1]))
    }
    return sorted.map((m, i) => ({
      member: m,
      value: value(m),
      rank: i + 1,
      change: tab === 'power' ? prevRank[m.id] - (i + 1) : undefined,
    }))
  }, [members, tab, cls, graduatedBy])

  const leader = rows[0]?.value ?? 1
  const mine = me ? rows.find((r) => r.member.id === me.id) : undefined
  const ahead = mine && mine.rank > 1 ? rows[mine.rank - 2] : undefined
  const meta = TABS[tab]

  const classCounts = useMemo(() => {
    const c: Record<string, number> = {}
    members.forEach((m) => (c[m.classId] = (c[m.classId] ?? 0) + 1))
    return c
  }, [members])

  return (
    <div>
      <PageHeader
        eyebrow={orgType === 'guild' ? 'Vinh Quang · Phong Vân Bảng' : 'Vinh Quang · Xếp Hạng'}
        title={orgType === 'guild' ? 'Bảng Phong Vân' : 'Bảng Xếp Hạng'}
        han="榜"
        description={`Bảng xếp hạng ${w.all} — nơi anh hùng ${w.name} lưu danh. Cập nhật theo thời gian thực mỗi khi có biến động.`}
      />

      <div className="mb-5 flex flex-col gap-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={tabs.map((t) => {
            const Icon = TABS[t].icon
            return {
              value: t,
              label: (
                <>
                  <Icon size={13} /> {TABS[t].label}
                </>
              ),
            }
          })}
        />
        <div className="scroll-x -mx-1 flex gap-1.5 px-1 pb-1">
          <button
            onClick={() => setCls('all')}
            className={cn('chip shrink-0 transition', cls === 'all' ? '!border-line-strong !text-gold' : 'hover:text-ink')}
          >
            Tất cả lưu phái
          </button>
          {CLASS_IDS.map((id) => {
            const c = CLASSES[id]
            const active = cls === id
            return (
              <button
                key={id}
                onClick={() => setCls(active ? 'all' : id)}
                className="chip shrink-0 transition"
                style={
                  active
                    ? { color: c.palette.accent, borderColor: alpha(c.palette.accent, 0.6), background: alpha(c.palette.accent, 0.14) }
                    : undefined
                }
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.palette.accent }} />
                {c.name}
                <span className="text-muted">{classCounts[id] ?? 0}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel corners className="relative overflow-hidden" padded={false}>
          <div className="flex items-start justify-between gap-3 px-5 pt-5">
            <div className="flex items-center gap-3">
              <span className="seal h-9 w-9 text-[19px]">{meta.han}</span>
              <div>
                <h3 className="title-display text-[22px] text-ink">Bục vinh danh · {meta.label}</h3>
                <p className="text-[12.5px] text-muted">{meta.desc(w)}</p>
              </div>
            </div>
            <span className="chip shrink-0">{rows.length} người</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={`${tab}-${cls}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              {rows.length ? (
                <Podium rows={rows} tab={tab} />
              ) : (
                <div className="px-6 py-16 text-center text-[13px] text-muted">Chưa có ai trong hạng mục này.</div>
              )}
            </motion.div>
          </AnimatePresence>
        </Panel>

        <div className="flex flex-col gap-6">
          {/* Vị trí của bạn */}
          <Panel corners className="relative overflow-hidden">
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full blur-3xl" style={{ background: 'color-mix(in oklab, var(--gold) 20%, transparent)' }} />
            <SectionTitle han="我" title="Vị trí của bạn" subtitle={`Hạng mục: ${meta.label}`} />
            {me && mine ? (
              <div className="relative flex items-center gap-4">
                <ChibiAvatar look={me.look} classId={me.classId} rank={me.rank} status={me.status} size={64} animated />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold text-ink">{me.name}</div>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="title-display text-gold-grad text-[40px] leading-none">#{mine.rank}</span>
                    <span className="text-[12.5px] text-muted">/ {rows.length}</span>
                  </div>
                  <div className="mt-1 text-[13px] text-ink-2">
                    {formatValue(tab, mine.value)} <span className="text-muted">{meta.unit}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-muted">
                {me ? 'Bạn chưa có mặt trong bảng này với bộ lọc hiện tại.' : 'Chưa chọn nhân vật.'}
              </p>
            )}
            {mine && (
              <div className="mt-4 rounded-2xl border border-line bg-black/10 p-3 text-[12.5px]">
                {ahead ? (
                  <div className="flex items-center gap-2 text-ink-2">
                    <TrendingUp size={15} className="shrink-0 text-jade" />
                    <span>
                      Cần thêm <b className="text-gold">{formatValue(tab, ahead.value - mine.value + 1)}</b> {meta.unit} để vượt{' '}
                      <b className="text-ink">{ahead.member.name}</b> lên hạng {ahead.rank}.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gold">
                    <Crown size={15} className="shrink-0" /> Bạn đang đứng đầu bảng — thiên hạ vô song!
                  </div>
                )}
              </div>
            )}
          </Panel>

          {/* Thống kê nhanh */}
          <Panel corners>
            <SectionTitle han="览" title="Toàn cảnh" subtitle="Một vài con số đáng chú ý" />
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Quán quân', value: rows[0]?.member.name ?? '—', sub: rows[0] ? `${formatValue(tab, rows[0].value)} ${meta.unit}` : '' },
                {
                  label: 'Trung bình',
                  value: rows.length ? formatValue(tab, Math.round(rows.reduce((s, r) => s + r.value, 0) / rows.length)) : '—',
                  sub: meta.unit,
                },
                {
                  label: 'Lưu phái mạnh nhất',
                  value: rows[0] ? CLASSES[rows[0].member.classId].name : '—',
                  sub: 'theo quán quân',
                },
                {
                  label: 'Thăng hạng mạnh nhất',
                  value:
                    tab === 'power' && rows.some((r) => (r.change ?? 0) > 0)
                      ? [...rows].sort((a, b) => (b.change ?? 0) - (a.change ?? 0))[0].member.name
                      : '—',
                  sub: tab === 'power' ? 'so với tuần trước' : 'chỉ ở mục chiến lực',
                },
              ].map((s) => (
                <div key={s.label} className="min-w-0 rounded-2xl border border-line bg-black/10 p-3">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted">{s.label}</div>
                  <div className="mt-1 truncate text-[14.5px] font-bold text-ink">{s.value}</div>
                  <div className="truncate text-[11.5px] text-muted">{s.sub}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Danh sách 4..N */}
      <Panel corners className="mt-6" padded={false}>
        <div className="px-5 pt-5">
          <SectionTitle han="列" title="Quần hùng bảng" subtitle={`Xếp hạng từ thứ 4 trở đi · ${meta.label}`} />
        </div>
        <AnimatePresence mode="wait">
          <motion.ol
            key={`${tab}-${cls}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-3 pb-4 sm:px-4"
          >
            {rows.slice(3).map((r, i) => {
              const isMe = me?.id === r.member.id
              return (
                <motion.li
                  key={r.member.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 20) * 0.02 }}
                  className={cn(
                    'grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2 py-2 transition sm:grid-cols-[40px_minmax(0,1.3fr)_minmax(0,1fr)_auto]',
                    isMe ? 'border border-line-strong bg-[color-mix(in_oklab,var(--gold)_10%,transparent)]' : 'hover:bg-white/[0.03]',
                  )}
                >
                  <span className="title-display text-center text-[19px] tabular-nums text-muted">{r.rank}</span>
                  <div className="flex min-w-0 items-center gap-2">
                    <MemberChip member={r.member} size={36} className="min-w-0" />
                    <ClassBadge classId={r.member.classId} className="hidden shrink-0 lg:inline-flex" />
                  </div>
                  <div className="hidden sm:block">
                    <div className="progress-track" style={{ height: 6 }}>
                      <motion.div
                        className="progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${leader ? (r.value / leader) * 100 : 0}%` }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <div className="text-[14px] font-bold tabular-nums text-ink">{formatValue(tab, r.value)}</div>
                      <div className="text-[11px] text-muted">{subText(tab, r.member, r.value)}</div>
                    </div>
                    {r.change !== undefined && (
                      <span
                        className="w-9 text-[11.5px] font-bold tabular-nums"
                        style={{ color: r.change > 0 ? 'var(--jade)' : r.change < 0 ? 'var(--cinnabar)' : 'var(--muted)' }}
                        title="So với xếp hạng tuần trước"
                      >
                        {r.change > 0 ? `▲${r.change}` : r.change < 0 ? `▼${-r.change}` : '—'}
                      </span>
                    )}
                  </div>
                </motion.li>
              )
            })}
            {rows.length <= 3 && <li className="px-3 py-8 text-center text-[13px] text-muted">Không còn ai khác trong bảng này.</li>}
          </motion.ol>
        </AnimatePresence>
      </Panel>

      {me && (
        <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-muted">
          <RankSeal rank={me.rank} member={me} size="sm" withName={false} /> Bảng xếp hạng chỉ mang tính giải trí — hãy luyện công chăm chỉ!
        </div>
      )}
    </div>
  )
}

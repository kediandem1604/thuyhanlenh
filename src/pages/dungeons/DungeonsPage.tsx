import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { motion } from 'motion/react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Flame, Hourglass, Lock, ScrollText, Skull, Swords, Timer, Trophy, Users } from 'lucide-react'
import { DUNGEONS, DUNGEON_MAP, MODES, MODE_IDS } from '@/domain/constants'
import type { Dungeon, DungeonMode, ProgressMap } from '@/domain/types'
import { useCan, useGuild, useMemberMap, useOrgType } from '@/store/guild'
import { useOrgWords } from '@/pages/dashboard/orgWords'
import { toast } from '@/store/ui'
import { alpha } from '@/lib/color'
import { cn, fmt, fmtCompact, fmtDateTime, fmtDuration, nextWeeklyReset, sum } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, SectionTitle } from '@/components/ui/Panel'
import { Segmented } from '@/components/ui/Segmented'
import { ProgressBar, ProgressRing } from '@/components/ui/Progress'
import { Countdown } from '@/components/ui/Countdown'
import { ModeTag } from '@/components/ui/Badges'
import { EmptyState } from '@/components/ui/EmptyState'
import { MemberChip } from '@/components/chibi/ChibiAvatar'
import { AXIS, ChartTooltipBox, GRID } from '@/components/charts/chartTheme'
import { BossCard } from './BossCard'
import { RecordClearModal } from './RecordClearModal'
import { permHint } from '@/domain/permissions'

type ModeFilter = 'all' | DungeonMode

function killedCount(d: Dungeon, map: Record<string, { kills: number }> | undefined) {
  return d.bosses.filter((b) => (map?.[b.id]?.kills ?? 0) > 0).length
}

/**
 * Phó bản mở sẵn khi vào trang: phó bản mới nhất đã có tiến độ mà còn boss chưa hạ,
 * chỉ xét phó bản vừa sĩ số tổ chức (Kim Lan 12 người không mặc định vào phó bản 25 người).
 */
function defaultDungeon(progress: ProgressMap, memberCount: number) {
  const fits = DUNGEONS.filter((d) => d.size <= Math.max(5, memberCount))
  const pool = fits.length ? fits : DUNGEONS
  const open = (d: Dungeon) => MODE_IDS.some((m) => killedCount(d, progress[d.id]?.[m]) < d.bosses.length)
  const started = (d: Dungeon) => MODE_IDS.some((m) => killedCount(d, progress[d.id]?.[m]) > 0)
  const newest = [...pool].reverse()
  return newest.find((d) => open(d) && started(d)) ?? newest.find(open) ?? pool[pool.length - 1]
}

/* ------------------------------------------------------------------ */
/* Chọn phó bản                                                        */
/* ------------------------------------------------------------------ */

function DungeonSelector({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  const progress = useGuild((s) => s.progress)
  const memberCount = useGuild((s) => s.members.length)
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {DUNGEONS.map((d, i) => {
        const total = d.bosses.length * MODE_IDS.length
        const killed = sum(MODE_IDS.map((m) => killedCount(d, progress[d.id]?.[m])))
        const active = d.id === selectedId
        const pct = total ? (killed / total) * 100 : 0
        // phó bản cần đông hơn sĩ số hiện có
        const tooBig = memberCount > 0 && d.size > memberCount
        return (
          <motion.button
            key={d.id}
            type="button"
            onClick={() => onSelect(d.id)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i }}
            className={cn('panel panel-hover relative overflow-hidden p-4 text-left', active && 'corners', tooBig && !active && 'opacity-60')}
            title={tooBig ? `Cần ${d.size} người — đông hơn sĩ số hiện có (${memberCount})` : undefined}
            style={{
              borderColor: active ? alpha(d.color, 0.7) : undefined,
              boxShadow: active ? `var(--shadow), 0 0 0 1px ${alpha(d.color, 0.35)}, 0 12px 36px -12px ${alpha(d.color, 0.55)}` : undefined,
              background: `linear-gradient(160deg, ${alpha(d.color, active ? 0.2 : 0.09)}, transparent 65%), var(--surface)`,
            }}
            aria-pressed={active}
          >
            <span aria-hidden className="han pointer-events-none absolute -bottom-4 -right-1 text-[72px] leading-none opacity-[0.12]" style={{ color: d.color }}>
              {d.han[0]}
            </span>
            <div className="relative flex items-center justify-between">
              <span className="chip !h-5 !px-2 !text-[10.5px]" style={{ color: d.color, borderColor: alpha(d.color, 0.4) }}>
                <Users size={10} /> {d.size}
              </span>
              {pct === 100 && <Trophy size={14} className="text-gold" />}
            </div>
            <div className="han relative mt-3 text-[15px] text-muted">{d.han}</div>
            <div className="title-display relative text-[19px] leading-tight text-ink">{d.name}</div>
            <div className="relative mt-3">
              <ProgressBar value={killed} max={total} color={d.color} height={5} />
              <div className="mt-1 flex justify-between text-[10.5px] text-muted">
                <span>Chinh phục</span>
                <span className="tabular-nums">{Math.round(pct)}%</span>
              </div>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Chi tiết phó bản                                                    */
/* ------------------------------------------------------------------ */

function DungeonDetail({ dungeon, mode, onMode }: { dungeon: Dungeon; mode: DungeonMode; onMode: (m: DungeonMode) => void }) {
  const progress = useGuild((s) => s.progress)
  const members = useGuild((s) => s.members)
  const w = useOrgWords()
  const map = progress[dungeon.id]?.[mode]

  const topAvg = useMemo(() => {
    const top = [...members].sort((a, b) => b.power - a.power).slice(0, dungeon.size)
    return top.length ? sum(top.map((m) => m.power)) / top.length : 0
  }, [members, dungeon.size])

  const rec = dungeon.recommendedPower[mode]
  const ratio = rec ? topAvg / rec : 0
  const verdict =
    ratio >= 1.05
      ? { text: 'Dư sức chinh phục', color: 'var(--jade)' }
      : ratio >= 0.95
        ? { text: 'Ngang tài ngang sức', color: 'var(--gold)' }
        : { text: 'Thử thách cam go', color: 'var(--cinnabar)' }

  const killed = killedCount(dungeon, map)
  const targetIdx = dungeon.bosses.findIndex((b) => (map?.[b.id]?.kills ?? 0) === 0)

  return (
    <Panel corners className="relative overflow-hidden p-0">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(700px 260px at 15% 0%, ${alpha(dungeon.color, 0.16)}, transparent 70%)` }}
      />
      <span aria-hidden className="han pointer-events-none absolute -top-8 right-4 select-none text-[150px] leading-none opacity-[0.06]" style={{ color: dungeon.color }}>
        {dungeon.han}
      </span>

      <div className="relative grid grid-cols-[minmax(0,1fr)] gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="eyebrow" style={{ color: dungeon.color }}>
            {dungeon.han} · Phó bản {dungeon.size} người
          </div>
          <h2 className="title-display text-gold-grad mt-1 text-[34px] sm:text-[40px]">{dungeon.name}</h2>
          <p className="mt-2 max-w-xl text-[13.5px] italic text-ink-2">{dungeon.lore}</p>
          <div className="mt-4">
            <Segmented
              value={mode}
              onChange={onMode}
              options={MODE_IDS.map((m) => ({
                value: m,
                label: (
                  <>
                    <span className="han text-[13px]">{MODES[m].han}</span> {MODES[m].name}
                  </>
                ),
                count: killedCount(dungeon, progress[dungeon.id]?.[m]),
              }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-2xl border border-line bg-black/10 p-4">
          <ProgressRing value={killed} max={dungeon.bosses.length} size={84} stroke={7} color={MODES[mode].color}>
            <div>
              <div className="text-[18px] font-bold leading-none text-ink">
                {killed}/{dungeon.bosses.length}
              </div>
              <div className="mt-0.5 text-[10px] text-muted">boss</div>
            </div>
          </ProgressRing>
          <div className="min-w-0 space-y-1.5 text-[12.5px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted">Chiến lực khuyến nghị</span>
              <span className="font-bold tabular-nums text-ink">{fmt(rec)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted">
                {members.length < dungeon.size ? `Cả ${members.length} ${w.member}` : `Top ${dungeon.size} của ${w.short}`} (TB)
              </span>
              <span className="font-bold tabular-nums text-ink">{fmt(topAvg)}</span>
            </div>
            <ProgressBar value={Math.min(ratio, 1.3)} max={1.3} color={ratio >= 1.05 ? '#5ec7b0' : ratio >= 0.95 ? '#d8b46a' : '#e0523f'} height={6} />
            <div className="flex items-center gap-1.5 font-semibold" style={{ color: verdict.color }}>
              <Flame size={13} /> {verdict.text} · {Math.round(ratio * 100)}%
            </div>
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-[minmax(0,1fr)] gap-4 px-5 pb-6 sm:px-6 md:grid-cols-2 xl:grid-cols-4">
        {dungeon.bosses.map((b, i) => (
          <BossCard key={`${dungeon.id}-${mode}-${b.id}`} boss={b} index={i} progress={map?.[b.id]} isTarget={i === targetIdx} />
        ))}
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Biểu đồ lượt clear theo tuần                                       */
/* ------------------------------------------------------------------ */

function WeeklyClearsChart() {
  const clears = useGuild((s) => s.clears)
  const data = useMemo(() => {
    const now = Date.now()
    const WEEK = 7 * 86400000
    return Array.from({ length: 8 }, (_, i) => {
      const end = now - (7 - i) * WEEK
      const start = end - WEEK
      const count = clears.filter((c) => {
        const t = new Date(c.date).getTime()
        return t > start && t <= end
      }).length
      return { week: i === 7 ? 'Tuần này' : `T-${7 - i}`, count }
    })
  }, [clears])
  const total = sum(data.map((d) => d.count))

  return (
    <Panel corners className="flex flex-col">
      <SectionTitle han="周" title="Lượt hạ boss theo tuần" subtitle={`${total} lượt trong 8 tuần gần nhất`} />
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="week" {...AXIS} />
            <YAxis {...AXIS} allowDecimals={false} width={40} />
            <Tooltip
              cursor={{ fill: 'color-mix(in oklab, var(--gold) 8%, transparent)' }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <ChartTooltipBox title={label} rows={[{ label: 'Lượt hạ boss', value: payload[0].value as number, color: 'var(--jade)' }]} />
                ) : null
              }
            />
            <Bar dataKey="count" fill="var(--jade)" radius={[4, 4, 0, 0]} maxBarSize={34} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Kỷ lục & thống kê nhanh                                             */
/* ------------------------------------------------------------------ */

function HallOfRecords() {
  const clears = useGuild((s) => s.clears)
  const members = useMemberMap()
  const stats = useMemo(() => {
    const mvpCount: Record<string, number> = {}
    clears.forEach((c) => (mvpCount[c.mvpId] = (mvpCount[c.mvpId] ?? 0) + 1))
    const topMvp = Object.entries(mvpCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
    const fastest = [...clears].sort((a, b) => a.durationSec - b.durationSec)[0]
    const flawless = clears.filter((c) => c.wipes === 0).length
    const wipes = sum(clears.map((c) => c.wipes))
    return { topMvp, fastest, flawless, wipes }
  }, [clears])

  return (
    <Panel corners>
      <SectionTitle han="录" title="Bia kỷ lục" subtitle="Những cái tên khắc vào sử sách" />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-black/10 p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <Timer size={12} /> Nhanh nhất
          </div>
          <div className="mt-1 text-[20px] font-bold tabular-nums text-gold">{stats.fastest ? fmtDuration(stats.fastest.durationSec) : '—'}</div>
          <div className="truncate text-[11px] text-muted">
            {stats.fastest ? DUNGEON_MAP[stats.fastest.dungeonId]?.bosses.find((b) => b.id === stats.fastest!.bossId)?.name : ''}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-black/10 p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <Skull size={12} /> Không wipe
          </div>
          <div className="mt-1 text-[20px] font-bold tabular-nums text-jade">{stats.flawless}</div>
          <div className="text-[11px] text-muted">tổng {stats.wipes} lần wipe</div>
        </div>
      </div>
      <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">MVP nhiều nhất</div>
      <ol className="mt-2 space-y-2">
        {stats.topMvp.map(([id, n], i) => {
          const m = members[id]
          if (!m) return null
          return (
            <li key={id} className="flex items-center gap-3">
              <span className="title-display w-5 text-center text-[16px] text-gold">{i + 1}</span>
              <MemberChip member={m} size={32} className="flex-1" />
              <span className="chip text-gold">{n} MVP</span>
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Lịch sử clear                                                       */
/* ------------------------------------------------------------------ */

function ClearHistory() {
  const clears = useGuild((s) => s.clears)
  const members = useMemberMap()
  const [dungeonFilter, setDungeonFilter] = useState('all')
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all')
  const [limit, setLimit] = useState(12)

  const rows = useMemo(
    () => clears.filter((c) => (dungeonFilter === 'all' || c.dungeonId === dungeonFilter) && (modeFilter === 'all' || c.mode === modeFilter)),
    [clears, dungeonFilter, modeFilter],
  )

  return (
    <Panel corners className="p-0">
      <div className="flex flex-col gap-3 p-5 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <SectionTitle han="史" title="Sử ký chinh phạt" subtitle={`${rows.length} lượt hạ boss`} className="!mb-0" />
        <div className="flex flex-wrap gap-2">
          <select className="field !h-8 !w-auto !text-[12.5px]" value={dungeonFilter} onChange={(e) => setDungeonFilter(e.target.value)}>
            <option value="all">Tất cả phó bản</option>
            {DUNGEONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <Segmented
            size="sm"
            value={modeFilter}
            onChange={setModeFilter}
            options={[{ value: 'all' as ModeFilter, label: 'Tất cả' }, ...MODE_IDS.map((m) => ({ value: m as ModeFilter, label: MODES[m].name }))]}
          />
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState han="史" title="Chưa có lượt clear nào" desc="Thử đổi bộ lọc, hoặc ghi nhận lượt clear đầu tiên." />
      ) : (
        <div className="scroll-x">
          <table className="table-ink min-w-[760px]">
            <thead>
              <tr>
                <th>Thời điểm</th>
                <th>Boss · Phó bản</th>
                <th>Độ khó</th>
                <th className="text-right">Thời gian</th>
                <th className="text-right">Wipe</th>
                <th>MVP</th>
                <th className="text-right">Đội</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((c) => {
                const d = DUNGEON_MAP[c.dungeonId]
                const boss = d?.bosses.find((b) => b.id === c.bossId)
                const mvp = members[c.mvpId]
                return (
                  <tr key={c.id}>
                    <td className="whitespace-nowrap text-[12.5px] text-muted tabular-nums">{fmtDateTime(c.date)}</td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span className="han grid h-8 w-8 shrink-0 place-items-center rounded-full text-[15px] text-white" style={{ background: boss?.color ?? '#555' }}>
                          {boss?.glyph}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-ink">{boss?.name ?? '—'}</div>
                          <div className="truncate text-[11.5px] text-muted">{d?.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <ModeTag mode={c.mode} />
                    </td>
                    <td className="text-right font-semibold tabular-nums text-ink">{fmtDuration(c.durationSec)}</td>
                    <td className={cn('text-right tabular-nums', c.wipes === 0 ? 'text-jade' : c.wipes >= 4 ? 'text-cinnabar' : 'text-ink-2')}>{c.wipes}</td>
                    <td>{mvp ? <MemberChip member={mvp} size={26} sub={`${fmtCompact(mvp.power)} chiến lực`} /> : <span className="text-muted">—</span>}</td>
                    <td className="text-right text-[12.5px] text-muted tabular-nums">{c.memberIds.length} người</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > limit && (
        <div className="border-t border-line p-3 text-center">
          <button className="btn btn-ghost btn-sm text-gold" onClick={() => setLimit((l) => l + 12)}>
            <ScrollText size={14} /> Xem thêm {Math.min(12, rows.length - limit)} lượt
          </button>
        </div>
      )}
    </Panel>
  )
}

/* ------------------------------------------------------------------ */

export default function DungeonsPage() {
  const progress = useGuild((s) => s.progress)
  const memberCount = useGuild((s) => s.members.length)
  const [params, setParams] = useSearchParams()
  const [recordOpen, setRecordOpen] = useState(false)

  // mặc định: phó bản mới nhất đang chinh phạt dở, vừa sĩ số
  const [dungeonId, setDungeonId] = useState(() => defaultDungeon(progress, memberCount).id)
  const dungeon = DUNGEON_MAP[dungeonId] ?? DUNGEONS[0]
  const [mode, setMode] = useState<DungeonMode>(() => {
    const d = DUNGEON_MAP[dungeonId]
    return MODE_IDS.find((m) => killedCount(d, progress[d.id]?.[m]) < d.bosses.length) ?? 'thuong'
  })

  const canRecord = useCan('clear.record')
  const orgType = useOrgType()
  const w = useOrgWords()

  useEffect(() => {
    if (params.get('action') === 'record') {
      if (canRecord) setRecordOpen(true)
      else toast({ tone: 'info', title: 'Chưa đủ quyền ghi nhận', desc: `${permHint('clear.record', orgType)}.` })
      const next = new URLSearchParams(params)
      next.delete('action')
      setParams(next, { replace: true })
    }
  }, [params, setParams, canRecord, orgType])

  const selectDungeon = (id: string) => {
    setDungeonId(id)
    const d = DUNGEON_MAP[id]
    setMode(MODE_IDS.find((m) => killedCount(d, progress[d.id]?.[m]) < d.bosses.length) ?? 'ac-mong')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Chinh Chiến · Phó Bản"
        title="Phó Bản Chinh Phạt"
        han="征"
        description={`Theo dõi từng ải boss qua ba độ khó, khắc ghi first kill và kỷ lục tốc độ của ${w.name}.`}
        actions={
          <>
            <span className="chip !h-10 !rounded-xl !px-3.5 !text-[12.5px]">
              <Hourglass size={14} className="text-gold" />
              <span className="text-muted">Reset tuần</span>
              <span className="font-bold text-gold">
                <Countdown to={nextWeeklyReset()} compact />
              </span>
            </span>
            <button
              className="btn btn-gold"
              onClick={() => setRecordOpen(true)}
              disabled={!canRecord}
              title={canRecord ? undefined : permHint('clear.record', orgType)}
            >
              {canRecord ? <Swords size={16} /> : <Lock size={15} />} Ghi nhận lượt clear
            </button>
          </>
        }
      />

      <DungeonSelector selectedId={dungeon.id} onSelect={selectDungeon} />

      <motion.div key={dungeon.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <DungeonDetail dungeon={dungeon} mode={mode} onMode={setMode} />
      </motion.div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <WeeklyClearsChart />
        <HallOfRecords />
      </div>

      <ClearHistory />

      <RecordClearModal open={recordOpen} onClose={() => setRecordOpen(false)} defaultDungeonId={dungeon.id} defaultMode={mode} />
    </div>
  )
}

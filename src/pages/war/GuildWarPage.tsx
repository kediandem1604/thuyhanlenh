import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Crown, Flag, Flame, Percent, Plus, Swords } from 'lucide-react'
import { useCan, useGuild, useMemberMap, useOrgType } from '@/store/guild'
import { useOrgWords } from '@/pages/dashboard/orgWords'
import { permHint } from '@/domain/permissions'
import { PermButton } from '@/components/ui/PermButton'
import { useUi } from '@/store/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, SectionTitle } from '@/components/ui/Panel'
import { StatCard } from '@/components/ui/StatCard'
import { Segmented } from '@/components/ui/Segmented'
import { EmptyState } from '@/components/ui/EmptyState'
import { Chibi } from '@/components/chibi/Chibi'
import { MemberChip } from '@/components/chibi/ChibiAvatar'
import { AXIS, ChartTooltipBox, GRID } from '@/components/charts/chartTheme'
import { CLASSES } from '@/domain/constants'
import type { WarRecord } from '@/domain/types'
import { fmt, fmtDate, sum } from '@/lib/utils'
import { RESULT_META, WAR_SERIES, sortWars, warTotals } from './warUtils'
import { WarCard } from './WarCard'
import { RecordWarModal } from './RecordWarModal'

type Filter = 'all' | WarRecord['result']

function KillsChart({ wars }: { wars: WarRecord[] }) {
  const theme = useUi((s) => s.theme)
  const colors = WAR_SERIES[theme]
  const data = useMemo(
    () =>
      [...wars]
        .slice(0, 10)
        .reverse()
        .map((w) => {
          const t = warTotals(w)
          return { label: fmtDate(w.date, { day: '2-digit', month: '2-digit' }), opponent: w.opponent, result: w.result, kills: t.k, deaths: t.d }
        }),
    [wars],
  )
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid {...GRID} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} width={44} />
          <Tooltip
            cursor={{ fill: 'color-mix(in oklab, var(--gold) 8%, transparent)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as (typeof data)[number]
              return (
                <ChartTooltipBox
                  title={
                    <span>
                      vs {p.opponent} · <span style={{ color: RESULT_META[p.result].color }}>{RESULT_META[p.result].name}</span>
                    </span>
                  }
                  rows={[
                    { label: 'Hạ địch', value: fmt(p.kills), color: colors.kills },
                    { label: 'Bị hạ', value: fmt(p.deaths), color: colors.deaths },
                  ]}
                />
              )
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={28}
            iconType="circle"
            iconSize={8}
            itemSorter={null}
            formatter={(v: string) => <span className="text-[12px] text-ink-2">{v}</span>}
          />
          <Bar name="Hạ địch" dataKey="kills" fill={colors.kills} radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Bar name="Bị hạ" dataKey="deaths" fill={colors.deaths} radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function GuildWarPage() {
  const wars = useGuild((s) => s.wars)
  const members = useMemberMap()
  const canRecord = useCan('war.record')
  const orgType = useOrgType()
  const w = useOrgWords()
  const isGuild = orgType === 'guild'
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState(false)
  const [limit, setLimit] = useState(8)

  const sorted = useMemo(() => sortWars(wars), [wars])

  const stats = useMemo(() => {
    const wins = sorted.filter((w) => w.result === 'win').length
    let streak = 0
    for (const w of sorted) {
      if (w.result === 'win') streak++
      else break
    }
    let best = 0
    let run = 0
    for (const w of [...sorted].reverse()) {
      run = w.result === 'win' ? run + 1 : 0
      best = Math.max(best, run)
    }
    const kills = sum(sorted.map((w) => warTotals(w).k))
    return { total: sorted.length, wins, rate: sorted.length ? (wins / sorted.length) * 100 : 0, streak, best, kills }
  }, [sorted])

  const legends = useMemo(() => {
    const count: Record<string, number> = {}
    const kills: Record<string, number> = {}
    for (const w of sorted) {
      count[w.mvpId] = (count[w.mvpId] ?? 0) + 1
      for (const l of w.lines) kills[l.memberId] = (kills[l.memberId] ?? 0) + l.k
    }
    return Object.entries(count)
      .filter(([id]) => members[id])
      .sort((a, b) => b[1] - a[1] || (kills[b[0]] ?? 0) - (kills[a[0]] ?? 0))
      .slice(0, 6)
      .map(([id, n]) => ({ member: members[id], mvp: n, kills: kills[id] ?? 0 }))
  }, [sorted, members])

  const list = filter === 'all' ? sorted : sorted.filter((w) => w.result === filter)
  const champ = legends[0]

  return (
    <div>
      <PageHeader
        eyebrow="Chinh Chiến · Sa trường"
        title={isGuild ? 'Bang Chiến' : 'Thi Đấu'}
        han="战"
        description={`Sử sách các trận ${isGuild ? 'bang chiến và công thành' : 'thi đấu'} của ${w.name} — ai xông pha, ai trụ vững, ai là chiến thần.`}
        actions={
          <PermButton allowed={canRecord} hint={permHint('war.record', orgType)} className="btn btn-gold" onClick={() => setOpen(true)}>
            <Plus size={16} /> Ghi nhận trận
          </PermButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} icon={Flag} label="Tổng số trận" value={stats.total} hint={`${stats.wins} thắng`} color="#6fa8ff" />
        <StatCard index={1} icon={Percent} label="Tỉ lệ thắng" value={stats.rate} format={(n) => `${Math.round(n)}`} suffix="%" hint="toàn bộ lịch sử" color="#5ec7b0" />
        <StatCard index={2} icon={Flame} label="Chuỗi thắng" value={stats.streak} hint={`kỷ lục ${stats.best} trận`} color="#e0523f" />
        <StatCard index={3} icon={Swords} label="Tổng hạ địch" value={stats.kills} hint="cộng dồn mọi trận" color="#d8b46a" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel corners>
          <SectionTitle han="势" title="Hạ địch & bị hạ" subtitle="10 trận gần nhất — tổng của cả đội" />
          {sorted.length ? <KillsChart wars={sorted} /> : <EmptyState han="战" title="Chưa có trận nào" desc={canRecord ? 'Bấm “Ghi nhận trận” sau mỗi trận để lưu vào sử sách.' : undefined} />}
        </Panel>

        <Panel corners className="relative overflow-hidden">
          <SectionTitle han="帅" title="Chiến thần" subtitle="Nhiều lần đạt MVP nhất" />
          {!champ && <p className="text-[12.5px] text-muted">Chưa có ai đạt MVP — ghi nhận trận đầu tiên để tìm ra chiến thần.</p>}
          {champ && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-3 flex items-center gap-4 rounded-2xl border border-line-strong bg-[linear-gradient(135deg,color-mix(in_oklab,var(--gold)_16%,transparent),transparent_70%)] p-3">
              <div className="relative shrink-0">
                <Chibi look={champ.member.look} classId={champ.member.classId} size={84} effects={false} />
                <Crown size={18} className="absolute left-1/2 top-0 -translate-x-1/2 text-gold drop-shadow-[0_0_8px_var(--gold)]" />
              </div>
              <div className="min-w-0">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold">Vạn Nhân Địch</div>
                <div className="title-display truncate text-[24px] text-ink">{champ.member.name}</div>
                <div className="text-[12px] text-muted">
                  {CLASSES[champ.member.classId].name} · {champ.mvp} lần MVP · {fmt(champ.kills)} hạ
                </div>
              </div>
            </motion.div>
          )}
          <ol className="space-y-1.5">
            {legends.slice(1).map((l, i) => (
              <li key={l.member.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-white/[0.03]">
                <span className="title-display w-5 text-center text-[16px] text-muted">{i + 2}</span>
                <MemberChip member={l.member} size={30} className="flex-1" />
                <span className="text-right text-[12px] text-muted">
                  <b className="text-[13px] text-ink">{l.mvp}</b> MVP
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <div className="mt-8">
        <SectionTitle
          han="史"
          title="Sử sách chiến trận"
          subtitle="Bấm vào một trận để xem chiến tích từng người"
          right={
            <Segmented
              size="sm"
              value={filter}
              onChange={(v) => {
                setFilter(v)
                setLimit(8)
              }}
              options={[
                { value: 'all', label: 'Tất cả', count: sorted.length },
                { value: 'win', label: 'Thắng', count: sorted.filter((w) => w.result === 'win').length },
                { value: 'lose', label: 'Thua', count: sorted.filter((w) => w.result === 'lose').length },
                { value: 'draw', label: 'Hòa', count: sorted.filter((w) => w.result === 'draw').length },
              ]}
            />
          }
          className="flex-wrap"
        />
        {list.length === 0 ? (
          <Panel>
            <EmptyState han="和" title="Không có trận nào" desc="Thử chọn bộ lọc khác." />
          </Panel>
        ) : (
          <div className="space-y-3">
            {list.slice(0, limit).map((w, i) => (
              <WarCard key={w.id} war={w} members={members} index={i} />
            ))}
            {list.length > limit && (
              <div className="flex justify-center pt-2">
                <button className="btn" onClick={() => setLimit((l) => l + 8)}>
                  Xem thêm {Math.min(8, list.length - limit)} trận
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <RecordWarModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

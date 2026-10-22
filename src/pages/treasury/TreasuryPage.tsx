import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Coins, Gavel, Info, Package, PackagePlus, Scale, Search, TrendingUp } from 'lucide-react'
import { useCan, useGuild, useMemberMap, useOrgType } from '@/store/guild'
import { useOrgWords } from '@/pages/dashboard/orgWords'
import { celebrate, toast } from '@/store/ui'
import { LEDGER_CATEGORIES } from '@/domain/constants'
import type { LedgerEntry } from '@/domain/types'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, SectionTitle } from '@/components/ui/Panel'
import { StatCard } from '@/components/ui/StatCard'
import { Segmented } from '@/components/ui/Segmented'
import { EmptyState } from '@/components/ui/EmptyState'
import { RarityTag } from '@/components/ui/Badges'
import { useNow } from '@/components/ui/Countdown'
import { ChibiAvatar, MemberChip } from '@/components/chibi/ChibiAvatar'
import { AXIS, ChartTooltipBox, GRID } from '@/components/charts/chartTheme'
import { cn, fmt, fmtCompact, fmtDate, fmtDateTime, normalize, sum, timeAgo } from '@/lib/utils'
import { AuctionCard, LootIcon } from './AuctionCard'
import { BidModal } from './BidModal'
import { AddLootModal, AdjustModal } from './TreasuryModals'
import { KIND_META } from './lootMeta'
import { permHint } from '@/domain/permissions'
import { PermButton } from '@/components/ui/PermButton'

type Tab = 'auction' | 'ledger' | 'distribution'
type CatFilter = 'all' | LedgerEntry['category']

const PAGE = 20

/* ---------------- Sổ cống hiến ---------------- */

function LedgerTab({ onAdjust }: { onAdjust: () => void }) {
  const ledger = useGuild((s) => s.ledger)
  const members = useMemberMap()
  const canAdjust = useCan('ledger.adjust')
  const orgType = useOrgType()
  const w = useOrgWords()
  const [cat, setCat] = useState<CatFilter>('all')
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const rows = useMemo(() => {
    const nq = normalize(q.trim())
    return [...ledger]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((e) => (cat === 'all' || e.category === cat) && (!nq || normalize(members[e.memberId]?.name ?? '').includes(nq)))
  }, [ledger, cat, q, members])

  return (
    <Panel corners>
      <SectionTitle
        han="账"
        title="Sổ cống hiến"
        subtitle={`${fmt(rows.length)} bút toán phù hợp`}
        right={
          <PermButton allowed={canAdjust} hint={permHint('ledger.adjust', orgType)} className="btn btn-sm" onClick={onAdjust}>
            <Scale size={14} /> Điều chỉnh
          </PermButton>
        }
      />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-line bg-[color-mix(in_oklab,var(--azure)_8%,transparent)] px-3 py-2.5 text-[12px] text-ink-2">
        <Info size={14} className="mt-0.5 shrink-0 text-azure" />
        <span>
          Sổ chỉ <b className="text-ink">ghi thêm</b>, không sửa, không xóa. Nếu ghi nhầm, ban quản lý thêm một bút toán <b className="text-ink">điều chỉnh</b> có ghi lý do và người duyệt — để ai cũng kiểm tra được.
        </span>
      </div>
      <div className="mb-3 flex flex-col gap-2 2xl:flex-row 2xl:items-center">
        <div className="flex flex-wrap gap-1.5">
          {(['all', ...Object.keys(LEDGER_CATEGORIES)] as CatFilter[]).map((c) => {
            const active = cat === c
            const meta = c === 'all' ? { name: 'Tất cả', color: 'var(--gold)' } : LEDGER_CATEGORIES[c]
            return (
              <button
                key={c}
                onClick={() => {
                  setCat(c)
                  setLimit(PAGE)
                }}
                className={cn('chip !h-7 shrink-0 transition', active ? 'text-ink' : 'hover:text-ink')}
                style={active ? { borderColor: meta.color, background: `color-mix(in oklab, ${meta.color} 16%, transparent)` } : undefined}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                {meta.name}
              </button>
            )
          })}
        </div>
        <div className="relative 2xl:ml-auto 2xl:w-60 2xl:shrink-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="field !h-9 !pl-9"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setLimit(PAGE)
            }}
            placeholder="Lọc theo thành viên…"
          />
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState han="账" title="Không có bút toán" desc="Thử bỏ bớt bộ lọc." />
      ) : (
        <>
          <div className="scroll-x -mx-2">
            <table className="table-ink min-w-[520px] table-fixed">
              <colgroup>
                <col className="w-[38%]" />
                <col />
                <col className="w-[96px]" />
              </colgroup>
              <thead>
                <tr>
                  <th>Thành viên</th>
                  <th>Nội dung</th>
                  <th className="!text-right">Biến động</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, limit).map((e) => {
                  const m = members[e.memberId]
                  const meta = LEDGER_CATEGORIES[e.category]
                  return (
                    <tr key={e.id}>
                      <td className="overflow-hidden">{m ? <MemberChip member={m} size={26} className="max-w-full" /> : <span className="text-muted">{w.left}</span>}</td>
                      <td className="overflow-hidden">
                        <div className="truncate text-[12.5px] text-ink-2" title={e.reason}>
                          {e.reason}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted" title={fmtDateTime(e.date)}>
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                          {meta.name} · {timeAgo(e.date)}
                        </div>
                      </td>
                      <td className={cn('text-right font-bold tabular-nums', e.delta >= 0 ? 'text-jade' : 'text-cinnabar')}>
                        {e.delta >= 0 ? '+' : '−'}
                        {fmt(Math.abs(e.delta))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {rows.length > limit && (
            <div className="mt-4 flex justify-center">
              <button className="btn btn-sm" onClick={() => setLimit((l) => l + PAGE)}>
                Xem thêm ({fmt(rows.length - limit)} còn lại)
              </button>
            </div>
          )}
        </>
      )}
    </Panel>
  )
}

/* ---------------- Lịch sử phân phát ---------------- */

function DistributionTab() {
  const loot = useGuild((s) => s.loot)
  const members = useMemberMap()
  const words = useOrgWords()
  const done = useMemo(() => loot.filter((l) => l.status === 'assigned').sort((a, b) => b.endsAt.localeCompare(a.endsAt)), [loot])
  const owned = done.filter((l) => l.assignedTo).length
  if (!done.length)
    return (
      <Panel>
        <EmptyState han="宝" title="Chưa phân phát vật phẩm nào" />
      </Panel>
    )
  return (
    <Panel corners>
      <SectionTitle
        han="赏"
        title="Lịch sử phân phát"
        subtitle={`${owned} bảo vật đã có chủ${done.length > owned ? ` · ${done.length - owned} không ai nhận` : ''}`}
      />
      <ul className="space-y-2">
        {done.map((l, i) => {
          const w = l.assignedTo ? members[l.assignedTo] : undefined
          const unsold = !l.assignedTo
          return (
            <motion.li
              key={l.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i, 10) * 0.03 }}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-black/10 p-3 sm:flex-nowrap"
            >
              <LootIcon item={l} size={44} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-bold text-ink">{l.name}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
                  <RarityTag rarity={l.rarity} />
                  {KIND_META[l.kind].name} · {l.source}
                </div>
              </div>
              <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                {w ? (
                  <MemberChip member={w} size={30} sub={fmtDate(l.endsAt)} />
                ) : unsold ? (
                  <span className="text-[12px] text-muted">
                    Không ai nhận · {fmtDate(l.endsAt)}
                  </span>
                ) : (
                  <span className="text-[12px] text-muted">{words.left}</span>
                )}
                <div className="text-right">
                  <div className={cn('text-[14px] font-bold tabular-nums', unsold ? 'text-muted' : 'text-gold')}>{unsold ? '—' : fmt(l.price ?? 0)}</div>
                  <div className="text-[10.5px] text-muted">{unsold ? 'chưa bán' : 'cống hiến'}</div>
                </div>
              </div>
            </motion.li>
          )
        })}
      </ul>
    </Panel>
  )
}

/* ---------------- Cột phụ ---------------- */

function BalanceBoard() {
  const members = useGuild((s) => s.members)
  const w = useOrgWords()
  const top = useMemo(() => [...members].sort((a, b) => b.contribution - a.contribution).slice(0, 10), [members])
  const max = top[0]?.contribution || 1
  return (
    <Panel corners>
      <SectionTitle han="富" title={w.type === 'guild' ? 'Phú hộ bang hội' : `Phú hộ ${w.short}`} subtitle="Số dư cống hiến cao nhất" />
      {top.length === 0 && <EmptyState han="富" title="Chưa có ai" />}
      <ol className="space-y-1.5">
        {top.map((m, i) => (
          <li key={m.id} className="flex items-center gap-2.5 rounded-xl px-1.5 py-1">
            <span className={cn('title-display w-5 text-center text-[15px]', i < 3 ? 'text-gold' : 'text-muted')}>{i + 1}</span>
            <ChibiAvatar look={m.look} classId={m.classId} rank={m.rank} size={28} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-semibold text-ink">{m.name}</div>
              <div className="progress-track mt-1" style={{ height: 4 }}>
                <div className="progress-fill" style={{ width: `${(m.contribution / max) * 100}%` }} />
              </div>
            </div>
            <span className="w-16 text-right text-[12.5px] font-bold tabular-nums text-ink">{fmtCompact(m.contribution)}</span>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

function EarnedChart() {
  const ledger = useGuild((s) => s.ledger)
  const data = useMemo(() => {
    const since = Date.now() - 30 * 86400000
    const totals: Record<string, number> = {}
    for (const e of ledger) {
      if (e.delta > 0 && new Date(e.date).getTime() >= since) totals[e.category] = (totals[e.category] ?? 0) + e.delta
    }
    return (Object.keys(LEDGER_CATEGORIES) as LedgerEntry['category'][])
      .filter((c) => totals[c])
      .map((c) => ({ name: LEDGER_CATEGORIES[c].name, value: totals[c] }))
      .sort((a, b) => b.value - a.value)
  }, [ledger])
  return (
    <Panel corners>
      <SectionTitle han="源" title="Nguồn cống hiến" subtitle="Điểm kiếm được theo loại · 30 ngày" />
      {data.length === 0 ? (
        <EmptyState han="源" title="Chưa có dữ liệu" />
      ) : (
        <div className="w-full" style={{ height: 40 + data.length * 38 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }} barCategoryGap="26%">
              <CartesianGrid {...GRID} vertical horizontal={false} />
              <XAxis type="number" {...AXIS} tickFormatter={(v: number) => fmtCompact(v)} />
              <YAxis type="category" dataKey="name" {...AXIS} width={92} interval={0} />
              <Tooltip
                cursor={{ fill: 'color-mix(in oklab, var(--gold) 8%, transparent)' }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? <ChartTooltipBox title={label} rows={[{ label: 'Cống hiến', value: fmt(payload[0].value as number), color: 'var(--gold)' }]} /> : null
                }
              />
              <Bar dataKey="value" fill="var(--gold)" radius={[0, 4, 4, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  )
}

/* ---------------- Trang ---------------- */

export default function TreasuryPage() {
  const members = useGuild((s) => s.members)
  const loot = useGuild((s) => s.loot)
  const closeAuction = useGuild((s) => s.closeAuction)
  const memberMap = useMemberMap()
  const canOpen = useCan('loot.open')
  const canClose = useCan('loot.close')
  const canAdjust = useCan('ledger.adjust')
  const orgType = useOrgType()
  const w = useOrgWords()
  const now = useNow(15000)
  const [tab, setTab] = useState<Tab>('auction')
  const [bidId, setBidId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [closingId, setClosingId] = useState<string | null>(null)

  const auctions = useMemo(() => loot.filter((l) => l.status === 'auction').sort((a, b) => a.endsAt.localeCompare(b.endsAt)), [loot])
  const assigned = loot.length - auctions.length
  const bidItem = bidId ? (loot.find((l) => l.id === bidId && l.status === 'auction') ?? null) : null

  const stats = useMemo(
    () => ({ total: sum(members.map((m) => m.contribution)), weekly: sum(members.map((m) => m.weeklyContribution)) }),
    [members],
  )

  const onClose = async (id: string) => {
    const item = loot.find((l) => l.id === id)
    if (!item || closingId) return
    setClosingId(id)
    const res = await closeAuction(id)
    setClosingId(null)
    if (!res.ok) return toast({ tone: 'error', title: 'Chưa thể chốt phiên', desc: res.error })
    // người thắng có thể không phải người dẫn đầu (nếu họ không còn đủ điểm) → đọc từ dữ liệu máy chủ trả về
    const closed = useGuild.getState().loot.find((l) => l.id === id)
    const winner = closed?.assignedTo ? memberMap[closed.assignedTo]?.name : ''
    const price = closed?.price ?? 0
    if (item.rarity === 'hong') {
      celebrate({ title: 'Bảo vật có chủ!', subtitle: `${item.name} thuộc về ${winner} với ${fmt(price)} cống hiến`, han: '宝' })
    } else {
      toast({ tone: 'gold', title: 'Đã chốt phiên', desc: `${item.name} → ${winner} (${fmt(price)})` })
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Vinh Quang · Kho báu"
        title={orgType === 'guild' ? 'Bang Khố' : 'Quỹ Team'}
        han="库"
        description={`Điểm cống hiến là đồng tiền của ${w.short}: kiếm được khi góp sức, tiêu khi đấu giá bảo vật. Minh bạch từng đồng.`}
        actions={
          <>
            <PermButton allowed={canAdjust} hint={permHint('ledger.adjust', orgType)} className="btn" onClick={() => setAdjustOpen(true)}>
              <Scale size={16} /> Điều chỉnh
            </PermButton>
            <PermButton allowed={canOpen} hint={permHint('loot.open', orgType)} className="btn btn-gold" onClick={() => setAddOpen(true)}>
              <PackagePlus size={16} /> Thêm vật phẩm
            </PermButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} icon={Coins} label="Cống hiến lưu hành" value={stats.total} format={fmtCompact} hint={`tổng số dư ${w.all}`} color="#d8b46a" />
        <StatCard index={1} icon={TrendingUp} label="Cống hiến tuần" value={stats.weekly} format={fmtCompact} hint="kiếm được từ thứ Hai" color="#5ec7b0" />
        <StatCard index={2} icon={Gavel} label="Phiên đấu giá" value={auctions.length} hint="đang mở" color="#a08cf5" />
        <StatCard index={3} icon={Package} label="Đã phân phát" value={assigned} hint="bảo vật có chủ" color="#e0523f" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div className="mb-4">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: 'auction', label: 'Đấu giá', count: auctions.length },
                { value: 'ledger', label: 'Sổ cống hiến' },
                { value: 'distribution', label: 'Phân phát', count: assigned },
              ]}
            />
          </div>

          {tab === 'auction' &&
            (auctions.length === 0 ? (
              <Panel>
                <EmptyState
                  han="拍"
                  title="Không có phiên đấu giá nào"
                  desc={canOpen ? `Thêm chiến lợi phẩm vừa rơi từ phó bản để các ${w.member} tranh giành.` : 'Khi ban quản lý mở phiên mới, bảo vật sẽ hiện ở đây.'}
                  action={
                    canOpen ? (
                      <button className="btn btn-gold" onClick={() => setAddOpen(true)}>
                        <PackagePlus size={16} /> Thêm vật phẩm
                      </button>
                    ) : undefined
                  }
                />
              </Panel>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {auctions.map((item, i) => (
                  <AuctionCard
                    key={item.id}
                    item={item}
                    members={memberMap}
                    now={now}
                    index={i}
                    onBid={() => setBidId(item.id)}
                    onClose={() => onClose(item.id)}
                    canClose={canClose}
                    closeHint={permHint('loot.close', orgType)}
                    closing={closingId === item.id}
                  />
                ))}
              </div>
            ))}
          {tab === 'ledger' && <LedgerTab onAdjust={() => setAdjustOpen(true)} />}
          {tab === 'distribution' && <DistributionTab />}
        </div>

        <div className="space-y-6">
          <BalanceBoard />
          <EarnedChart />
        </div>
      </div>

      <BidModal item={bidItem} onClose={() => setBidId(null)} />
      <AddLootModal open={addOpen} onClose={() => setAddOpen(false)} />
      <AdjustModal open={adjustOpen} onClose={() => setAdjustOpen(false)} />
    </div>
  )
}

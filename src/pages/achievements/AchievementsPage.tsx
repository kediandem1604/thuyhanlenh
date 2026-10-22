import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Award, Gem, Medal, Sparkles, Users } from 'lucide-react'
import { useCurrentUser, useGuild } from '@/store/guild'
import { useOrgWords } from '@/pages/dashboard/orgWords'
import { ACHIEVEMENTS, RARITY } from '@/domain/constants'
import type { AchievementDef, Rarity } from '@/domain/types'
import { alpha } from '@/lib/color'
import { cn, fmt } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, SectionTitle } from '@/components/ui/Panel'
import { Segmented } from '@/components/ui/Segmented'
import { StatCard } from '@/components/ui/StatCard'
import { RarityTag } from '@/components/ui/Badges'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar, ProgressRing } from '@/components/ui/Progress'
import { MemberChip } from '@/components/chibi/ChibiAvatar'
import { Medallion } from './Medallion'

type Cat = 'all' | AchievementDef['category']

const CATS: { value: Cat; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pve', label: 'PvE' },
  { value: 'pvp', label: 'PvP' },
  { value: 'xa-giao', label: 'Xã giao' },
  { value: 'bang-hoi', label: 'Bang hội' },
  { value: 'su-do', label: 'Sư đồ' },
]

const CAT_LABEL: Record<AchievementDef['category'], string> = {
  pve: 'PvE',
  pvp: 'PvP',
  'xa-giao': 'Xã giao',
  'bang-hoi': 'Bang hội',
  'su-do': 'Sư đồ',
}

const RARITY_ORDER: Rarity[] = ['hong', 'kim', 'tu', 'lam']

export default function AchievementsPage() {
  const members = useGuild((s) => s.members)
  const me = useCurrentUser()
  const w = useOrgWords()
  const [cat, setCat] = useState<Cat>('all')
  const [rarity, setRarity] = useState<Rarity | 'all'>('all')
  const [mineOnly, setMineOnly] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const owners = useMemo(() => {
    const map: Record<string, string[]> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, []]))
    members.forEach((m) => m.achievements.forEach((id) => map[id]?.push(m.id)))
    return map
  }, [members])

  const stats = useMemo(() => {
    const total = members.reduce((s, m) => s + m.achievements.filter((id) => owners[id]).length, 0)
    const pct = (id: string) => (members.length ? (owners[id].length / members.length) * 100 : 0)
    const rarest = [...ACHIEVEMENTS].sort((a, b) => pct(a.id) - pct(b.id) || RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity))[0]
    const collectors = [...members].sort((a, b) => b.achievements.length - a.achievements.length).slice(0, 5)
    return { total, pct, rarest, collectors }
  }, [members, owners])

  const myIds = useMemo(() => new Set(me?.achievements ?? []), [me])
  const myCount = ACHIEVEMENTS.filter((a) => myIds.has(a.id)).length

  const list = useMemo(
    () =>
      ACHIEVEMENTS.filter((a) => (cat === 'all' || a.category === cat) && (rarity === 'all' || a.rarity === rarity) && (!mineOnly || myIds.has(a.id))).sort(
        (a, b) => Number(myIds.has(b.id)) - Number(myIds.has(a.id)) || RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity),
      ),
    [cat, rarity, mineOnly, myIds],
  )

  const catCount = (c: Cat) => (c === 'all' ? ACHIEVEMENTS.length : ACHIEVEMENTS.filter((a) => a.category === c).length)
  const open = openId ? ACHIEVEMENTS.find((a) => a.id === openId) : undefined
  const openOwners = open ? owners[open.id].map((id) => members.find((m) => m.id === id)!).filter(Boolean) : []

  return (
    <div>
      <PageHeader
        eyebrow="Vinh Quang · Huân Chương"
        title="Thành Tựu"
        han="勋"
        description={`Mỗi huy chương là một dấu ấn trên con đường giang hồ. Sưu tầm đủ bộ để lưu danh ${w.name}.`}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} icon={Medal} label="Tổng huy chương" value={stats.total} hint={`trao cho ${members.length} ${w.member}`} color="#d8b46a" />
        <StatCard index={1} icon={Award} label="Của bạn" value={myCount} suffix={`/ ${ACHIEVEMENTS.length}`} hint={me?.name} color="#5ec7b0" />
        <StatCard
          index={2}
          icon={Users}
          label="Trung bình / người"
          value={members.length ? stats.total / members.length : 0}
          format={(n) => n.toFixed(1).replace('.', ',')}
          hint={`huy chương mỗi ${w.member}`}
          color="#6fa8ff"
        />
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          onClick={() => stats.rarest && setOpenId(stats.rarest.id)}
          className="panel panel-hover relative flex items-center gap-4 overflow-hidden p-5 text-left"
        >
          {stats.rarest && (
            <>
              <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full blur-2xl" style={{ background: RARITY[stats.rarest.rarity].glow }} />
              <Medallion glyph={stats.rarest.icon} rarity={stats.rarest.rarity} unlocked size={62} />
              <div className="min-w-0">
                <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">Hiếm nhất</div>
                <div className="truncate text-[15px] font-bold text-ink">{stats.rarest.name}</div>
                <div className="text-[12px] text-muted">
                  {owners[stats.rarest.id].length === 0 ? 'Chưa ai đạt được' : `${stats.pct(stats.rarest.id).toFixed(1).replace('.', ',')}% ${w.member} sở hữu`}
                </div>
              </div>
            </>
          )}
        </motion.button>
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented value={cat} onChange={setCat} options={CATS.map((c) => ({ value: c.value, label: c.label, count: catCount(c.value) }))} />
        <div className="scroll-x flex gap-1.5 pb-1">
          <button onClick={() => setRarity('all')} className={cn('chip shrink-0', rarity === 'all' && '!border-line-strong !text-gold')}>
            Mọi độ hiếm
          </button>
          {RARITY_ORDER.map((r) => {
            const meta = RARITY[r]
            const active = rarity === r
            return (
              <button
                key={r}
                onClick={() => setRarity(active ? 'all' : r)}
                className="chip shrink-0"
                style={active ? { color: meta.color, borderColor: alpha(meta.color, 0.6), background: alpha(meta.color, 0.14), boxShadow: `0 0 12px -4px ${meta.glow}` } : undefined}
              >
                <Gem size={11} style={{ color: meta.color }} />
                {meta.name}
              </button>
            )
          })}
          <button onClick={() => setMineOnly((v) => !v)} className={cn('chip shrink-0', mineOnly && '!border-line-strong !text-jade')}>
            <Sparkles size={11} /> Chỉ của tôi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div>
          {list.length === 0 ? (
            <Panel corners>
              <EmptyState han="勋" title="Không có huy chương nào" desc="Thử đổi bộ lọc khác xem sao." />
            </Panel>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((a, i) => {
                const unlocked = myIds.has(a.id)
                const pct = stats.pct(a.id)
                const r = RARITY[a.rarity]
                return (
                  <motion.button
                    key={a.id}
                    layout
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 18) * 0.025 }}
                    onClick={() => setOpenId(a.id)}
                    className={cn('panel panel-hover group relative flex flex-col items-center overflow-hidden p-5 text-center', !unlocked && 'opacity-80')}
                    style={unlocked ? { borderColor: alpha(r.color, 0.35) } : undefined}
                  >
                    {unlocked && (
                      <div aria-hidden className="pointer-events-none absolute -top-16 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full blur-3xl" style={{ background: r.glow }} />
                    )}
                    <div className="relative transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105">
                      <Medallion glyph={a.icon} rarity={a.rarity} unlocked={unlocked} size={88} />
                    </div>
                    <div className="relative mt-3 flex items-center gap-2">
                      <RarityTag rarity={a.rarity} />
                      <span className="chip">{CAT_LABEL[a.category]}</span>
                    </div>
                    <h4 className={cn('relative mt-2 text-[15px] font-bold', unlocked ? 'text-ink' : 'text-ink-2')}>{a.name}</h4>
                    <p className="relative mt-1 min-h-[36px] text-[12.5px] text-muted">{a.desc}</p>
                    <div className="relative mt-3 w-full">
                      <div className="mb-1 flex justify-between text-[11px] text-muted">
                        <span>{owners[a.id].length} người sở hữu</span>
                        <span className="tabular-nums">{pct.toFixed(0)}%</span>
                      </div>
                      <ProgressBar value={pct} color={r.color} height={5} />
                    </div>
                    {unlocked && (
                      <span className="absolute right-3 top-3 text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: r.color }}>
                        Đã đạt
                      </span>
                    )}
                  </motion.button>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Panel corners>
            <SectionTitle han="集" title="Tiến độ của bạn" subtitle="Bộ sưu tập huy chương" />
            <div className="flex items-center gap-4">
              <ProgressRing value={myCount} max={ACHIEVEMENTS.length} size={84} stroke={7}>
                <span className="text-[16px] font-bold text-ink">{Math.round((myCount / ACHIEVEMENTS.length) * 100)}%</span>
              </ProgressRing>
              <div className="flex-1 space-y-1.5">
                {RARITY_ORDER.map((r) => {
                  const all = ACHIEVEMENTS.filter((a) => a.rarity === r)
                  const got = all.filter((a) => myIds.has(a.id)).length
                  return (
                    <div key={r} className="flex items-center gap-2 text-[12px]">
                      <span className="w-10 font-semibold" style={{ color: RARITY[r].color }}>
                        {RARITY[r].name}
                      </span>
                      <ProgressBar value={got} max={all.length} color={RARITY[r].color} height={5} className="flex-1" />
                      <span className="w-9 text-right tabular-nums text-muted">
                        {got}/{all.length}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </Panel>

          <Panel corners>
            <SectionTitle han="藏" title="Nhà sưu tầm" subtitle={`Nhiều huy chương nhất ${w.short}`} />
            <ol className="space-y-2">
              {stats.collectors.map((m, i) => (
                <li key={m.id} className="flex items-center gap-3">
                  <span className="title-display w-5 text-center text-[16px] text-muted">{i + 1}</span>
                  <MemberChip member={m} size={34} className="flex-1" />
                  <span className="chip shrink-0 text-gold">
                    <Medal size={11} /> {fmt(m.achievements.length)}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>

      <Modal
        open={!!open}
        onClose={() => setOpenId(null)}
        title={open?.name ?? ''}
        han={open?.icon}
        subtitle={open ? `${RARITY[open.rarity].name} · ${CAT_LABEL[open.category]}` : undefined}
        size="lg"
      >
        {open && (
          <div>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <Medallion glyph={open.icon} rarity={open.rarity} unlocked size={110} />
              <div className="flex-1 text-center sm:text-left">
                <p className="text-[14px] text-ink-2">{open.desc}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-line bg-black/10 p-2.5">
                    <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted">Sở hữu</div>
                    <div className="text-[18px] font-bold text-ink">{owners[open.id].length}</div>
                  </div>
                  <div className="rounded-xl border border-line bg-black/10 p-2.5">
                    <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted">Tỉ lệ</div>
                    <div className="text-[18px] font-bold text-ink">{stats.pct(open.id).toFixed(1).replace('.', ',')}%</div>
                  </div>
                  <div className="rounded-xl border border-line bg-black/10 p-2.5">
                    <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted">Bạn</div>
                    <div className={cn('text-[14px] font-bold', myIds.has(open.id) ? 'text-jade' : 'text-muted')}>
                      {myIds.has(open.id) ? 'Đã đạt' : 'Chưa đạt'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="divider-cloud my-5" />
            <h4 className="mb-3 text-[13px] font-semibold text-ink-2">Những người đã đạt ({openOwners.length})</h4>
            {openOwners.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {openOwners.map((m) => (
                  <div key={m.id} className="rounded-xl border border-line bg-black/10 p-2" onClick={() => setOpenId(null)}>
                    <MemberChip member={m} size={34} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState han="空" title="Chưa ai đạt được" desc="Hãy là người đầu tiên khắc tên vào huy chương này!" />
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

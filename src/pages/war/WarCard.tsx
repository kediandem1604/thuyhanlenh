import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, ChevronUp, Crown, Crosshair, HeartPulse, Swords, Users } from 'lucide-react'
import type { Member, WarLine, WarRecord } from '@/domain/types'
import { ChibiAvatar, MemberChip } from '@/components/chibi/ChibiAvatar'
import { cn, fmt, fmtDate } from '@/lib/utils'
import { useOrgWords } from '@/pages/dashboard/orgWords'
import { MODE_META, RESULT_META, fmtBig, warTotals } from './warUtils'

type SortKey = 'k' | 'd' | 'a' | 'dmg' | 'heal' | 'kda'

const COLS: { key: SortKey; label: string }[] = [
  { key: 'k', label: 'Hạ' },
  { key: 'd', label: 'Ngã' },
  { key: 'a', label: 'Hỗ trợ' },
  { key: 'kda', label: 'KDA' },
  { key: 'dmg', label: 'Sát thương' },
  { key: 'heal', label: 'Trị liệu' },
]

const kda = (l: WarLine) => (l.k + l.a) / Math.max(1, l.d)

function Highlight({ icon: Icon, label, member, value, color }: { icon: typeof Swords; label: string; member?: Member; value: string; color: string }) {
  if (!member) return null
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-black/10 p-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}>
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</div>
        <div className="truncate text-[13px] font-semibold text-ink">{member.name}</div>
      </div>
      <span className="text-[13px] font-bold tabular-nums text-ink">{value}</span>
    </div>
  )
}

export function WarCard({ war, members, index }: { war: WarRecord; members: Record<string, Member>; index: number }) {
  const [open, setOpen] = useState(false)
  const [sort, setSort] = useState<SortKey>('k')
  const w = useOrgWords()
  const res = RESULT_META[war.result]
  const mode = MODE_META[war.mode]
  const mvp = members[war.mvpId]
  const totals = useMemo(() => warTotals(war), [war])

  const lines = useMemo(() => {
    const val = (l: WarLine) => (sort === 'kda' ? kda(l) : l[sort])
    return [...war.lines].filter((l) => members[l.memberId]).sort((a, b) => val(b) - val(a))
  }, [war.lines, sort, members])

  const top = useMemo(() => {
    const by = (f: (l: WarLine) => number) => [...war.lines].sort((a, b) => f(b) - f(a))[0]
    return { kills: by((l) => l.k), dmg: by((l) => l.dmg), heal: by((l) => l.heal) }
  }, [war.lines])

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04 }}
      className="panel panel-hover relative overflow-hidden p-0"
    >
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1.5" style={{ background: res.color, opacity: 0.8 }} />
      <span aria-hidden className="han pointer-events-none absolute -right-3 -top-8 select-none text-[120px] leading-none opacity-[0.06]" style={{ color: res.color }}>
        {res.han}
      </span>

      <button onClick={() => setOpen((v) => !v)} className="relative flex w-full items-center gap-3 px-4 py-4 text-left sm:gap-4 sm:px-5" aria-expanded={open}>
        <span
          className="seal h-11 w-11 shrink-0 rounded-[12px] text-[25px] sm:h-14 sm:w-14 sm:rounded-[14px] sm:text-[32px]"
          style={{
            background: `radial-gradient(circle at 30% 25%, color-mix(in oklab, ${res.color} 80%, white 20%), ${res.color} 75%)`,
            boxShadow: `inset 0 0 0 2px rgba(255,240,220,.5), 0 8px 20px -8px ${res.color}`,
          }}
        >
          {res.han}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: res.color }}>
              {res.name}
            </span>
            <span className="chip !h-5 !text-[10.5px]">
              <span className="han text-[12px]">{mode.han}</span>
              {mode.name}
            </span>
            <span className="hidden text-[11.5px] text-muted sm:inline">{fmtDate(war.date)}</span>
          </div>
          <div className="mt-0.5 truncate text-[15px] font-bold text-ink sm:text-[16px]">
            <span className="font-normal text-muted">
              <span className="hidden sm:inline">{w.name} </span>vs{' '}
            </span>
            {war.opponent}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[12px] text-muted">
            <span className="sm:hidden">{fmtDate(war.date, { day: '2-digit', month: '2-digit' })}</span>
            <span className="inline-flex items-center gap-1">
              <Users size={12} /> {war.lines.length} người
            </span>
            <span className="inline-flex items-center gap-1">
              <Crosshair size={12} /> {fmt(totals.k)} hạ / {fmt(totals.d)} ngã
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="title-display text-[26px] tabular-nums leading-none text-ink sm:text-[34px]">
            <span style={{ color: war.result === 'lose' ? 'var(--text-2)' : res.color }}>{war.score[0]}</span>
            <span className="mx-1.5 text-muted">–</span>
            <span>{war.score[1]}</span>
          </div>
          {mvp && (
            <div className="hidden items-center gap-2 md:flex">
              <div className="relative">
                <ChibiAvatar look={mvp.look} classId={mvp.classId} rank={mvp.rank} size={42} />
                <Crown size={14} className="absolute -top-2 left-1/2 -translate-x-1/2 text-gold drop-shadow-[0_0_6px_var(--gold)]" />
              </div>
              <div className="w-24">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">MVP</div>
                <div className="truncate text-[12.5px] font-semibold text-ink">{mvp.name}</div>
              </div>
            </div>
          )}
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="border-t border-line px-5 pb-5 pt-4">
              {mvp && (
                <div className="mb-3 flex items-center gap-2 md:hidden">
                  <Crown size={14} className="text-gold" />
                  <span className="text-[12px] text-muted">MVP:</span>
                  <span className="text-[13px] font-semibold text-ink">{mvp.name}</span>
                </div>
              )}
              <div className="mb-4 grid gap-2 sm:grid-cols-3">
                <Highlight icon={Swords} label="Hạ nhiều nhất" member={top.kills ? members[top.kills.memberId] : undefined} value={`${top.kills?.k ?? 0}`} color="var(--cinnabar)" />
                <Highlight icon={Crosshair} label="Sát thương cao nhất" member={top.dmg ? members[top.dmg.memberId] : undefined} value={fmtBig(top.dmg?.dmg ?? 0)} color="var(--ember)" />
                {top.heal && top.heal.heal > 0 && (
                  <Highlight icon={HeartPulse} label="Trị liệu cao nhất" member={members[top.heal.memberId]} value={fmtBig(top.heal.heal)} color="var(--jade)" />
                )}
              </div>
              <div className="scroll-x -mx-2">
                <table className="table-ink min-w-[680px]">
                  <thead>
                    <tr>
                      <th>Thành viên</th>
                      {COLS.map((c) => (
                        <th key={c.key} className="!text-right">
                          <button onClick={() => setSort(c.key)} className={cn('inline-flex items-center gap-1 uppercase', sort === c.key ? 'text-gold' : 'hover:text-ink')}>
                            {c.label}
                            {sort === c.key && <ChevronDown size={12} />}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => {
                      const m = members[l.memberId]
                      return (
                        <tr key={l.memberId}>
                          <td>
                            <span className="flex items-center gap-2">
                              <MemberChip member={m} size={28} />
                              {l.memberId === war.mvpId && <Crown size={13} className="shrink-0 text-gold" />}
                            </span>
                          </td>
                          <td className="text-right font-semibold tabular-nums text-ink">{l.k}</td>
                          <td className="text-right tabular-nums text-ink-2">{l.d}</td>
                          <td className="text-right tabular-nums text-ink-2">{l.a}</td>
                          <td className="text-right tabular-nums text-ink-2">{kda(l).toFixed(1).replace('.', ',')}</td>
                          <td className="text-right tabular-nums text-ink-2">{fmtBig(l.dmg)}</td>
                          <td className="text-right tabular-nums text-ink-2">{fmtBig(l.heal)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

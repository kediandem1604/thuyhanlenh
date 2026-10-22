import { useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { ArrowRight, Check, GraduationCap, HeartHandshake, Trash } from 'lucide-react'
import { CLASSES, MENTOR_STAGES } from '@/domain/constants'
import type { Member, Mentorship } from '@/domain/types'
import { useCan, useGuild, useOrgType } from '@/store/guild'
import { celebrate, toast } from '@/store/ui'
import { permHint } from '@/domain/permissions'
import { cn, daysBetween, fmt } from '@/lib/utils'
import { Chibi } from '@/components/chibi/Chibi'
import { ProgressBar } from '@/components/ui/Progress'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export const BOND_TIERS = [
  { min: 0, name: 'Sơ Giao' },
  { min: 500, name: 'Thân Thiết' },
  { min: 1500, name: 'Tận Tâm' },
  { min: 3000, name: 'Ân Trọng Như Sơn' },
]

export function bondTier(bond: number) {
  let idx = 0
  BOND_TIERS.forEach((t, i) => {
    if (bond >= t.min) idx = i
  })
  const cur = BOND_TIERS[idx]
  const next = BOND_TIERS[idx + 1]
  return { cur, next, pct: next ? (bond - cur.min) / (next.min - cur.min) : 1 }
}

function Stepper({ stage }: { stage: number }) {
  return (
    <ol className="grid grid-cols-5 gap-1">
      {MENTOR_STAGES.map((st) => {
        const state = st.id < stage ? 'done' : st.id === stage ? 'current' : 'todo'
        return (
          <li key={st.id} className="relative flex flex-col items-center text-center">
            {st.id > 0 && (
              <span
                className="absolute right-1/2 top-[15px] h-[2px] w-full"
                style={{ background: st.id <= stage ? 'linear-gradient(90deg, var(--gold-3), var(--gold))' : 'var(--line)' }}
              />
            )}
            <span
              className={cn(
                'han relative z-[1] grid h-8 w-8 place-items-center rounded-full border text-[15px] transition',
                state === 'done' && 'border-transparent text-on-gold',
                state === 'current' && 'border-gold text-gold shadow-[0_0_0_4px_color-mix(in_oklab,var(--gold)_18%,transparent)]',
                state === 'todo' && 'border-line text-muted',
              )}
              style={{
                background:
                  state === 'done'
                    ? 'var(--gold-grad)'
                    : 'var(--surface-solid)',
              }}
            >
              {st.han}
            </span>
            <span className={cn('mt-1 text-[10.5px] leading-tight', state === 'current' ? 'font-semibold text-gold' : 'text-muted')}>{st.name}</span>
          </li>
        )
      })}
    </ol>
  )
}

/** Thẻ một cặp sư đồ đang học: hai chibi đối diện, thang giai đoạn, nhiệm vụ, hành động */
export function PairCard({ ms, master, disciple, index }: { ms: Mentorship; master: Member; disciple: Member; index: number }) {
  const toggleTask = useGuild((s) => s.toggleMentorTask)
  const advance = useGuild((s) => s.advanceMentorship)
  const graduate = useGuild((s) => s.graduate)
  const dissolve = useGuild((s) => s.dissolveMentorship)
  const currentUserId = useGuild((s) => s.currentUserId)
  const canManage = useCan('mentor.manage')
  const type = useOrgType()
  const [hover, setHover] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  // sư phụ điều hành cặp; đồ đệ chỉ được tick nhiệm vụ; Trưởng Lão trở lên quản lý mọi cặp
  const isMaster = currentUserId === master.id
  const isDisciple = currentUserId === disciple.id
  const canLead = isMaster || canManage
  const canTick = isMaster || isDisciple || canManage
  const leadHint = canLead ? undefined : `Chỉ sư phụ ${master.name} (hoặc ${permHint('mentor.manage', type).replace('Cần chức vụ ', '')}) được làm việc này`
  const tickHint = canTick ? undefined : 'Chỉ sư phụ, đồ đệ hoặc Trưởng Lão trở lên được đánh dấu nhiệm vụ'

  const stageTasks = ms.tasks.filter((t) => t.stage === ms.stage)
  const stageDone = stageTasks.every((t) => t.done)
  const allDone = ms.tasks.every((t) => t.done)
  const totalDone = ms.tasks.filter((t) => t.done).length
  const tier = bondTier(ms.bond)
  const days = Math.max(1, daysBetween(ms.startedAt))
  const accent = CLASSES[disciple.classId].palette.accent

  const onAdvance = async () => {
    const next = MENTOR_STAGES[ms.stage + 1]
    setBusy(true)
    const r = await advance(ms.id)
    setBusy(false)
    if (r.ok) toast({ tone: 'success', title: `${disciple.name} bước vào ${next.name}`, desc: next.desc })
    else toast({ tone: 'error', title: 'Chưa thể thăng giai đoạn', desc: r.error })
  }

  const onGraduate = async () => {
    setBusy(true)
    const r = await graduate(ms.id)
    setBusy(false)
    if (r.ok) {
      celebrate({ han: '成', title: 'Xuất Sư!', subtitle: `${disciple.name} đã thành tài dưới sự dìu dắt của ${master.name}. Sư phụ +500, đồ đệ +300 cống hiến.` })
    } else toast({ tone: 'error', title: 'Chưa thể xuất sư', desc: r.error })
  }

  const onDissolve = async () => {
    const r = await dissolve(ms.id)
    if (r.ok) toast({ tone: 'info', title: 'Đã giải tán quan hệ sư đồ', desc: `${master.name} và ${disciple.name} mỗi người một ngả.` })
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="panel panel-hover corners flex flex-col overflow-hidden p-0"
    >
      {/* sân khấu hai chibi */}
      <div
        className="relative flex items-end justify-between gap-2 px-4 pb-2 pt-4"
        style={{ background: `radial-gradient(420px 180px at 50% 100%, color-mix(in oklab, ${accent} 16%, transparent), transparent 70%)` }}
      >
        <span aria-hidden className="han pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 text-[84px] leading-none text-gold opacity-[0.06]">
          师
        </span>
        <Link to={`/thanh-vien/${master.id}`} className="group flex flex-col items-center">
          <Chibi look={master.look} classId={master.classId} size={104} animated={hover} effects={false} className="transition-transform duration-300 group-hover:-translate-y-1" />
          <span className="mt-1 max-w-[120px] truncate text-[13px] font-bold text-ink group-hover:text-gold">{master.name}</span>
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-gold">Sư phụ</span>
        </Link>
        <div className="flex flex-1 flex-col items-center gap-1 self-center pb-8">
          <span className="seal h-10 w-10 text-[21px]">{MENTOR_STAGES[ms.stage].han}</span>
          <span className="h-px w-full max-w-[90px] border-t border-dashed border-gold/50" />
          <span className="text-center text-[10.5px] text-muted">{days} ngày truyền nghề</span>
        </div>
        <Link to={`/thanh-vien/${disciple.id}`} className="group flex flex-col items-center">
          <Chibi look={disciple.look} classId={disciple.classId} size={92} animated={hover} effects={false} flip className="transition-transform duration-300 group-hover:-translate-y-1" />
          <span className="mt-1 max-w-[120px] truncate text-[13px] font-bold text-ink group-hover:text-gold">{disciple.name}</span>
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-ink-2">Đồ đệ</span>
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-4 border-t border-line px-5 pb-5 pt-4">
        <Stepper stage={ms.stage} />

        {/* tình sư đồ */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[12px]">
            <span className="inline-flex items-center gap-1.5 font-semibold text-ink-2">
              <HeartHandshake size={14} className="text-sakura" /> Tình sư đồ · <span className="text-sakura">{tier.cur.name}</span>
            </span>
            <span className="tabular-nums text-muted">
              {fmt(ms.bond)}
              {tier.next && ` / ${fmt(tier.next.min)}`}
            </span>
          </div>
          <ProgressBar value={tier.pct * 100} color="#f2a7bf" height={6} />
        </div>

        {/* nhiệm vụ giai đoạn hiện tại */}
        <div>
          <div className="mb-2 flex items-center justify-between text-[12px]">
            <span className="font-semibold text-ink-2">Nhiệm vụ · {MENTOR_STAGES[ms.stage].name}</span>
            <span className="text-muted">
              Tổng {totalDone}/{ms.tasks.length}
            </span>
          </div>
          <ul className="space-y-1.5">
            {stageTasks.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => void toggleTask(ms.id, t.id)}
                  disabled={!canTick}
                  title={tickHint}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-black/10 px-3 py-2 text-left text-[13px] transition hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-line"
                  aria-pressed={t.done}
                >
                  <span
                    className={cn(
                      'grid h-5 w-5 shrink-0 place-items-center rounded-md border transition',
                      t.done ? 'border-transparent bg-jade text-[#0b1a16]' : 'border-line-strong',
                    )}
                  >
                    {t.done && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className={t.done ? 'text-muted line-through' : 'text-ink-2'}>{t.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          {ms.stage < 4 ? (
            <button className={cn('btn btn-sm', stageDone && canLead && 'btn-gold')} onClick={onAdvance} disabled={busy || !canLead} title={leadHint}>
              Thăng giai đoạn <ArrowRight size={14} />
            </button>
          ) : (
            <button className={cn('btn btn-sm', allDone && canLead ? 'btn-cinnabar' : '')} onClick={onGraduate} disabled={busy || !canLead} title={leadHint}>
              <GraduationCap size={15} /> Cử hành lễ xuất sư
            </button>
          )}
          {!stageDone && <span className="text-[11.5px] text-muted">Hoàn thành nhiệm vụ để tiến bước</span>}
          {canLead && (
            <button className="btn btn-ghost btn-sm ml-auto text-muted hover:text-cinnabar" onClick={() => setConfirm(true)} aria-label="Giải tán sư đồ">
              <Trash size={14} /> Giải tán
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Giải tán sư đồ?"
        han="散"
        confirmLabel="Giải tán"
        onConfirm={() => void onDissolve()}
      >
        Tình sư đồ giữa <b className="text-ink">{master.name}</b> và <b className="text-ink">{disciple.name}</b> sẽ bị xóa cùng toàn bộ tiến độ nhiệm vụ. Không thể hoàn tác.
      </ConfirmDialog>
    </motion.article>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Sparkles } from 'lucide-react'
import { CLASSES, RANKS } from '@/domain/constants'
import type { Member, Mentorship } from '@/domain/types'
import { rankLabel, useCan, useGuild, useOrgType } from '@/store/guild'
import { toast } from '@/store/ui'
import { permHint } from '@/domain/permissions'
import { cn, fmt, fmtCompact } from '@/lib/utils'
import { Field, Modal } from '@/components/ui/Modal'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { Chibi } from '@/components/chibi/Chibi'
import { ClassBadge } from '@/components/ui/Badges'

const MAX_ACTIVE = 3

interface Suggestion {
  master: Member
  score: number
  reasons: string[]
}

/** Chấm điểm sư phụ phù hợp cho một đồ đệ */
function suggestMasters(disciple: Member, members: Member[], mentorships: Mentorship[]): Suggestion[] {
  const activeCount = new Map<string, number>()
  const learning = new Set<string>()
  mentorships.forEach((m) => {
    if (m.status !== 'active') return
    activeCount.set(m.masterId, (activeCount.get(m.masterId) ?? 0) + 1)
    learning.add(m.discipleId)
  })
  const role = CLASSES[disciple.classId].role
  return members
    .filter((m) => m.id !== disciple.id && !learning.has(m.id) && (activeCount.get(m.id) ?? 0) < MAX_ACTIVE && m.power > disciple.power)
    .map((m) => {
      const reasons: string[] = []
      let score = 0
      if (m.classId === disciple.classId) {
        score += 30
        reasons.push('Cùng lưu phái')
      } else if (CLASSES[m.classId].role === role) {
        score += 15
        reasons.push('Cùng vai trò')
      }
      const gap = m.power - disciple.power
      const gapScore = Math.min(20, gap / 4000)
      score += gapScore
      if (gapScore >= 10) reasons.push(`Hơn ${fmtCompact(gap)} chiến lực`)
      score += m.activity / 5
      if (m.activity >= 80) reasons.push(`Sôi nổi ${m.activity}`)
      const free = MAX_ACTIVE - (activeCount.get(m.id) ?? 0)
      score += free * 5
      reasons.push(`Còn ${free} chỗ`)
      const rankBonus = (6 - RANKS[m.rank].order) * 2
      score += rankBonus
      if (RANKS[m.rank].order <= 3) reasons.push(rankLabel(m))
      return { master: m, score, reasons }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

const MAX_SCORE = 30 + 20 + 20 + 15 + 12

export function CreateMentorshipModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const members = useGuild((s) => s.members)
  const mentorships = useGuild((s) => s.mentorships)
  const createMentorship = useGuild((s) => s.createMentorship)
  const currentUserId = useGuild((s) => s.currentUserId)
  // không có mentor.manage → chỉ được tự nhận đồ đệ, sư phụ khóa là chính mình
  const canManage = useCan('mentor.manage')
  const type = useOrgType()
  const [discipleId, setDiscipleId] = useState('')
  const [masterId, setMasterId] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setDiscipleId('')
      setMasterId(canManage ? '' : currentUserId)
      setBusy(false)
    }
  }, [open, canManage, currentUserId])

  const { disciples, masters, activeCount, learning } = useMemo(() => {
    const activeCount = new Map<string, number>()
    const learning = new Set<string>()
    mentorships.forEach((m) => {
      if (m.status !== 'active') return
      activeCount.set(m.masterId, (activeCount.get(m.masterId) ?? 0) + 1)
      learning.add(m.discipleId)
    })
    const disciples = members
      .filter((m) => !learning.has(m.id))
      .sort((a, b) => RANKS[b.rank].order - RANKS[a.rank].order || a.power - b.power)
    const masters = [...members].sort((a, b) => RANKS[a.rank].order - RANKS[b.rank].order || b.power - a.power)
    return { disciples, masters, activeCount, learning }
  }, [members, mentorships])

  const disciple = members.find((m) => m.id === discipleId)
  const master = members.find((m) => m.id === masterId)
  const suggestions = useMemo(() => (disciple ? suggestMasters(disciple, members, mentorships) : []), [disciple, members, mentorships])

  const submit = async () => {
    if (!disciple || !master) {
      toast({ tone: 'error', title: 'Thiếu thông tin', desc: 'Hãy chọn cả sư phụ và đồ đệ.' })
      return
    }
    setBusy(true)
    const r = await createMentorship(master.id, disciple.id)
    setBusy(false)
    if (r.ok) {
      toast({ tone: 'gold', title: 'Lễ bái sư hoàn tất', desc: `${disciple.name} chính thức bái ${master.name} làm sư phụ.` })
      onClose()
    } else toast({ tone: 'error', title: 'Không thể bái sư', desc: r.error })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Lễ Bái Sư"
      han="拜"
      subtitle="Một ngày làm thầy, cả đời làm cha"
      size="lg"
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-gold" onClick={submit} disabled={!disciple || !master || busy}>
            {busy ? 'Đang hành lễ…' : 'Hành lễ bái sư'}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Đồ đệ" hint="Chỉ hiện người chưa có sư phụ đang dạy">
          <select className="field" value={discipleId} onChange={(e) => setDiscipleId(e.target.value)}>
            <option value="">— Chọn đồ đệ —</option>
            {disciples.map((m) => (
              <option key={m.id} value={m.id} disabled={m.id === masterId}>
                {m.name} · {CLASSES[m.classId].name} · {rankLabel(m)}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Sư phụ"
          hint={
            canManage
              ? `Mỗi sư phụ dạy tối đa ${MAX_ACTIVE} đồ đệ cùng lúc`
              : `Bạn tự nhận đồ đệ cho mình — ${permHint('mentor.manage', type).replace('Cần', 'cần')} để ghép cặp hộ người khác`
          }
        >
          <select className="field" value={masterId} onChange={(e) => setMasterId(e.target.value)} disabled={!canManage}>
            <option value="">— Chọn sư phụ —</option>
            {masters.map((m) => {
              const full = (activeCount.get(m.id) ?? 0) >= MAX_ACTIVE
              const busy = learning.has(m.id)
              return (
                <option key={m.id} value={m.id} disabled={m.id === discipleId || full || busy}>
                  {m.name} · {rankLabel(m)}
                  {full ? ' (đủ đồ đệ)' : busy ? ' (đang học)' : ''}
                </option>
              )
            })}
          </select>
        </Field>
      </div>

      {/* xem trước hai người */}
      <div className="mt-5 flex items-end justify-center gap-6 rounded-2xl border border-line bg-black/10 px-4 pb-3 pt-4">
        <div className="flex flex-col items-center">
          {master ? (
            <Chibi look={master.look} classId={master.classId} size={96} effects={false} />
          ) : (
            <div className="grid h-[120px] w-[96px] place-items-center text-[12px] text-muted">Sư phụ?</div>
          )}
          <span className="mt-1 text-[12px] font-semibold text-ink">{master?.name ?? '—'}</span>
        </div>
        <span className="seal mb-10 h-10 w-10 text-[21px]">拜</span>
        <div className="flex flex-col items-center">
          {disciple ? (
            <Chibi look={disciple.look} classId={disciple.classId} size={84} effects={false} flip />
          ) : (
            <div className="grid h-[105px] w-[84px] place-items-center text-[12px] text-muted">Đồ đệ?</div>
          )}
          <span className="mt-1 text-[12px] font-semibold text-ink">{disciple?.name ?? '—'}</span>
        </div>
      </div>

      {/* gợi ý sư phụ — chỉ khi được ghép cặp hộ người khác */}
      {disciple && canManage && (
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-ink">
            <Sparkles size={15} className="text-gold" /> Gợi ý sư phụ cho {disciple.name}
            <ClassBadge classId={disciple.classId} />
          </div>
          {suggestions.length === 0 ? (
            <p className="text-[12.5px] text-muted">Chưa có sư phụ phù hợp còn chỗ trống — hãy chọn thủ công.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3">
              {suggestions.map((s, i) => {
                const pct = Math.round((s.score / MAX_SCORE) * 100)
                const picked = s.master.id === masterId
                return (
                  <motion.button
                    key={s.master.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                    onClick={() => setMasterId(s.master.id)}
                    className={cn(
                      'flex flex-col gap-2 rounded-2xl border p-3 text-left transition',
                      picked ? 'border-gold bg-[color-mix(in_oklab,var(--gold)_12%,transparent)]' : 'border-line bg-black/10 hover:border-line-strong',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <ChibiAvatar look={s.master.look} classId={s.master.classId} rank={s.master.rank} size={38} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-ink">{s.master.name}</div>
                        <div className="truncate text-[11px] text-muted">
                          {CLASSES[s.master.classId].name} · {fmt(s.master.power)}
                        </div>
                      </div>
                      <span className="title-display text-[20px] text-gold tabular-nums">{pct}%</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {s.reasons.map((r) => (
                        <span key={r} className="chip !h-5 !px-2 !text-[10.5px]">
                          {r}
                        </span>
                      ))}
                    </div>
                    <span className={cn('text-[11.5px] font-semibold', picked ? 'text-gold' : 'text-ink-2')}>{picked ? '✓ Đã chọn' : 'Chọn làm sư phụ'}</span>
                  </motion.button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

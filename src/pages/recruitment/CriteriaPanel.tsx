import { useMemo } from 'react'
import { motion } from 'motion/react'
import { Target } from 'lucide-react'
import { CLASSES, CLASS_IDS, ROLES } from '@/domain/constants'
import type { ClassId, CombatRole, Member } from '@/domain/types'
import { fmt } from '@/lib/utils'
import { useOrg, useOrgType } from '@/store/guild'
import { recruitWords } from './words'
import { Panel, SectionTitle } from '@/components/ui/Panel'
import { ClassBadge, RoleIcon } from '@/components/ui/Badges'

/** Tỉ lệ vai trò lý tưởng: mỗi tổ 6 người trong game = 1 tank · 1 trị liệu · 4 sát thương */
const TARGET: Record<CombatRole, number> = { tank: 1 / 6, healer: 1 / 6, dps: 4 / 6 }

export function CriteriaPanel({ members }: { members: Member[] }) {
  const org = useOrg()
  const type = useOrgType()
  const capacity = org?.capacity ?? null
  const data = useMemo(() => {
    const total = members.length || 1
    const roleCount: Record<CombatRole, number> = { tank: 0, healer: 0, dps: 0 }
    const classCount = Object.fromEntries(CLASS_IDS.map((c) => [c, 0])) as Record<ClassId, number>
    members.forEach((m) => {
      roleCount[CLASSES[m.classId].role]++
      classCount[m.classId]++
    })
    const roles = (Object.keys(TARGET) as CombatRole[]).map((r) => {
      const need = Math.max(0, Math.ceil(TARGET[r] * total - roleCount[r]))
      return { role: r, count: roleCount[r], pct: roleCount[r] / total, target: TARGET[r], need }
    })
    const avg = total / CLASS_IDS.length
    const lacking = CLASS_IDS.filter((c) => classCount[c] < avg * 0.8).sort((a, b) => classCount[a] - classCount[b])
    const veterans = members.filter((m) => m.rank !== 'tan-binh').map((m) => m.power).sort((a, b) => a - b)
    const p20 = veterans.length ? veterans[Math.floor(veterans.length * 0.2)] : 150000
    const minPower = Math.max(80000, Math.floor((p20 * 0.85) / 5000) * 5000)
    // null = tổ chức không giới hạn số người
    const slots = capacity === null ? null : Math.max(0, capacity - members.length)
    return { roles, classCount, lacking, minPower, slots }
  }, [members, capacity])

  const priority = [
    ...data.roles.filter((r) => r.need > 0).map((r) => ROLES[r.role].short),
    ...data.lacking.slice(0, 2).map((c) => CLASSES[c].name),
  ]

  return (
    <Panel corners>
      <SectionTitle han="准" title="Tiêu chí chiêu mộ" subtitle={`Tự tính từ đội hình hiện tại của ${recruitWords(type).org}`} right={<Target size={18} className="text-gold" />} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-black/10 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Chiến lực tối thiểu đề xuất</div>
          <div className="title-display text-gold-grad mt-1 text-[34px] tabular-nums">{fmt(data.minPower)}</div>
          <p className="mt-1 text-[12px] text-ink-2">Bằng ~85% mức chiến lực của nhóm 20% thấp nhất (không tính tân binh), đủ theo kịp phó bản Anh Hùng.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="chip">{data.slots === null ? 'Không giới hạn số người' : data.slots === 0 ? 'Đã đủ người' : `Còn ${data.slots} chỗ trống`}</span>
            {priority.length > 0 && <span className="chip text-cinnabar">Ưu tiên: {priority.join(' · ')}</span>}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-black/10 p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Cân bằng vai trò</div>
          <ul className="space-y-3">
            {data.roles.map((r) => (
              <li key={r.role}>
                <div className="mb-1 flex items-center justify-between text-[12.5px]">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-ink-2">
                    <RoleIcon role={r.role} size={13} /> {ROLES[r.role].short}
                  </span>
                  <span className="tabular-nums text-muted">
                    {r.count} người · {Math.round(r.pct * 100)}% / mục tiêu {Math.round(r.target * 100)}%
                  </span>
                </div>
                <div className="relative h-2.5 overflow-visible rounded-full bg-black/20">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: ROLES[r.role].color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, r.pct * 100)}%` }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <span className="absolute -top-1 bottom-[-4px] w-[2px] rounded bg-ink" style={{ left: `${r.target * 100}%` }} title="Mục tiêu" />
                </div>
                <div className="mt-1 text-[11px]" style={{ color: r.need > 0 ? 'var(--cinnabar)' : 'var(--jade)' }}>
                  {r.need > 0 ? `Thiếu khoảng ${r.need} người` : 'Đã đủ'}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-black/10 p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Lưu phái cần thêm</div>
          {data.lacking.length === 0 ? (
            <p className="text-[12.5px] text-jade">Các lưu phái đang khá cân bằng.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {data.lacking.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5">
                  <ClassBadge classId={c} />
                  <span className="text-[11px] text-muted">{data.classCount[c]} người</span>
                </span>
              ))}
            </div>
          )}
          <div className="mt-4 grid grid-cols-7 gap-1" aria-label="Số người mỗi lưu phái">
            {CLASS_IDS.map((c) => (
              <div key={c} className="flex flex-col items-center gap-1" title={`${CLASSES[c].name}: ${data.classCount[c]}`}>
                <span className="han text-[15px]" style={{ color: CLASSES[c].palette.accent }}>
                  {CLASSES[c].han[0]}
                </span>
                <span className="text-[11px] font-semibold tabular-nums text-ink">{data.classCount[c]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}

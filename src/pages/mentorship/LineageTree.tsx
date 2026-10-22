import { useMemo } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { MENTOR_STAGES } from '@/domain/constants'
import type { Member, Mentorship } from '@/domain/types'
import { cn } from '@/lib/utils'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { EmptyState } from '@/components/ui/EmptyState'

interface TreeNode {
  member: Member
  via?: Mentorship
  children: TreeNode[]
  size: number
}

/** Dựng rừng truyền thừa: gốc là sư phụ không bái ai; đệ tử từng làm sư phụ thì nhánh tiếp */
function buildForest(mentorships: Mentorship[], members: Record<string, Member>): TreeNode[] {
  const byMaster = new Map<string, Mentorship[]>()
  mentorships.forEach((ms) => {
    const list = byMaster.get(ms.masterId) ?? []
    list.push(ms)
    byMaster.set(ms.masterId, list)
  })
  const disciples = new Set(mentorships.map((m) => m.discipleId))
  const visited = new Set<string>()

  const build = (memberId: string, via?: Mentorship): TreeNode | null => {
    const member = members[memberId]
    if (!member) return null
    if (visited.has(memberId)) return { member, via, children: [], size: 1 }
    visited.add(memberId)
    const kids = [...(byMaster.get(memberId) ?? [])]
      .sort((a, b) => (a.status === b.status ? b.stage - a.stage : a.status === 'active' ? -1 : 1))
      .map((k) => build(k.discipleId, k))
      .filter((n): n is TreeNode => n !== null)
    return { member, via, children: kids, size: 1 + kids.reduce((s, k) => s + k.size, 0) }
  }

  const forest: TreeNode[] = []
  for (const id of byMaster.keys()) {
    if (!disciples.has(id)) {
      const n = build(id)
      if (n) forest.push(n)
    }
  }
  // sư phụ nằm trong vòng lặp (hiếm) — vẫn hiển thị
  for (const id of byMaster.keys()) {
    if (!visited.has(id)) {
      const n = build(id)
      if (n) forest.push(n)
    }
  }
  return forest.sort((a, b) => b.size - a.size)
}

function NodeCard({ node, root }: { node: TreeNode; root?: boolean }) {
  const { member, via } = node
  const graduated = via?.status === 'graduated'
  const sub = root
    ? `${node.children.length} đồ đệ`
    : graduated
      ? 'Đã xuất sư'
      : via
        ? MENTOR_STAGES[via.stage].name
        : ''
  return (
    <Link
      to={`/thanh-vien/${member.id}`}
      className={cn(
        'group relative flex w-[108px] flex-col items-center rounded-2xl px-1.5 pb-2 pt-2.5 text-center transition',
        root ? 'border border-line-strong bg-[color-mix(in_oklab,var(--gold)_10%,transparent)]' : 'hover:bg-white/[0.03]',
      )}
      title={member.name}
    >
      <div className="relative">
        <ChibiAvatar look={member.look} classId={member.classId} rank={member.rank} size={root ? 54 : 46} />
        {graduated && (
          <span className="seal absolute -bottom-1 -right-2 h-5 w-5 !rounded-[6px] text-[11px]" title="Đã xuất sư">
            成
          </span>
        )}
      </div>
      <span className="mt-1.5 w-full truncate text-[12px] font-semibold text-ink group-hover:text-gold">{member.name}</span>
      <span className={cn('text-[10.5px]', graduated ? 'text-gold' : root ? 'text-ink-2' : 'text-muted')}>{sub}</span>
    </Link>
  )
}

const LINE = 'color-mix(in oklab, var(--gold) 42%, transparent)'

function Branch({ node, root }: { node: TreeNode; root?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <NodeCard node={node} root={root} />
      {node.children.length > 0 && (
        <>
          <span className="h-5 w-px" style={{ background: LINE }} />
          <div className="flex">
            {node.children.map((c, i) => (
              <div key={c.member.id} className="relative flex flex-col items-center px-1.5 pt-5">
                <span
                  className="absolute top-0 h-px"
                  style={{
                    background: LINE,
                    left: i === 0 ? '50%' : 0,
                    right: i === node.children.length - 1 ? '50%' : 0,
                  }}
                />
                <span
                  className="absolute left-1/2 top-0 h-5 w-px -translate-x-1/2"
                  style={{ background: c.via?.status === 'graduated' ? 'var(--gold)' : LINE }}
                />
                <Branch node={c} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/** Cây truyền thừa sư đồ — cuộn ngang trong khung riêng khi quá rộng */
export function LineageTree({ mentorships, members }: { mentorships: Mentorship[]; members: Record<string, Member> }) {
  const forest = useMemo(() => buildForest(mentorships, members), [mentorships, members])
  if (!forest.length) return <EmptyState han="师" title="Chưa có mạch truyền thừa" desc="Hãy mở lễ bái sư đầu tiên — mạch truyền thừa sẽ mọc từ đây." />
  return (
    <div className="scroll-x -mx-1 pb-2">
      <div className="flex min-w-max items-start gap-5 px-1 py-1">
        {forest.map((root, i) => (
          <motion.div
            key={root.member.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="rounded-2xl border border-line/70 bg-black/10 p-3"
          >
            <Branch node={root} root />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

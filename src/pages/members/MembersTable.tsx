import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { MemberChip } from '@/components/chibi/ChibiAvatar'
import { ClassBadge, RankSeal, StatusText } from '@/components/ui/Badges'
import { CLASSES } from '@/domain/constants'
import type { Member } from '@/domain/types'
import { alpha } from '@/lib/color'
import { cn, fmt, timeAgo } from '@/lib/utils'
import type { SortDir, SortKey } from './sorting'

const COLUMNS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'name', label: 'Môn hạ' },
  { key: 'class', label: 'Lưu phái' },
  { key: 'rank', label: 'Chức vụ' },
  { key: 'level', label: 'Cấp', align: 'right' },
  { key: 'power', label: 'Chiến lực', align: 'right' },
  { key: 'weekly', label: 'Cống hiến tuần', align: 'right' },
  { key: 'activity', label: 'Sôi nổi' },
  { key: 'lastOnline', label: 'Lần cuối' },
]

export function MembersTable({
  members,
  sortKey,
  sortDir,
  onSort,
  nameLabel = 'Môn hạ',
  showContribution = true,
}: {
  members: Member[]
  sortKey: SortKey
  sortDir: SortDir
  onSort: (k: SortKey) => void
  /** tiêu đề cột tên (Môn hạ / Thành viên…) */
  nameLabel?: string
  /** cột cống hiến tuần — chỉ khi tổ chức bật Quỹ & Đấu Giá */
  showContribution?: boolean
}) {
  const columns = COLUMNS.filter((c) => showContribution || c.key !== 'weekly').map((c) => (c.key === 'name' ? { ...c, label: nameLabel } : c))
  return (
    <div className="panel scroll-x !p-0">
      <table className={cn('table-ink', showContribution ? 'min-w-[880px]' : 'min-w-[780px]')}>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sortKey === c.key
              const Icon = active ? (sortDir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown
              return (
                <th key={c.key} className={c.align === 'right' ? 'text-right' : undefined} aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button
                    onClick={() => onSort(c.key)}
                    className={cn('inline-flex items-center gap-1 uppercase tracking-[0.14em] transition hover:text-ink', active && 'text-gold', c.align === 'right' && 'flex-row-reverse')}
                  >
                    {c.label}
                    <Icon size={12} className={active ? '' : 'opacity-40'} />
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const accent = CLASSES[m.classId].palette.accent
            return (
              <tr key={m.id}>
                <td>
                  <MemberChip member={m} size={36} sub={m.title} />
                </td>
                <td>
                  <ClassBadge classId={m.classId} />
                </td>
                <td>
                  <RankSeal rank={m.rank} member={m} size="sm" />
                </td>
                <td className="text-right tabular-nums text-ink-2">{m.level}</td>
                <td className="text-right font-bold tabular-nums text-ink">{fmt(m.power)}</td>
                {showContribution && <td className="text-right tabular-nums text-ink-2">{fmt(m.weeklyContribution)}</td>}
                <td>
                  <div className="flex w-28 items-center gap-2">
                    <div className="progress-track flex-1" style={{ height: 5 }}>
                      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${m.activity}%`, background: `linear-gradient(90deg, ${alpha(accent, 0.5)}, ${accent})` }} />
                    </div>
                    <span className="w-6 text-right text-[11.5px] tabular-nums text-muted">{m.activity}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap">
                  {m.status === 'offline' ? <span className="text-[12px] text-muted">{timeAgo(m.lastOnline)}</span> : <StatusText status={m.status} />}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

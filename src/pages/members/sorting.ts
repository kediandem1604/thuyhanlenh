import { CLASSES, RANKS } from '@/domain/constants'
import type { Member } from '@/domain/types'

export type SortKey = 'power' | 'weekly' | 'activity' | 'joined' | 'rank' | 'name' | 'level' | 'lastOnline' | 'class'
export type SortDir = 'asc' | 'desc'

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'power', label: 'Chiến lực' },
  { value: 'weekly', label: 'Cống hiến tuần' },
  { value: 'activity', label: 'Độ sôi nổi' },
  { value: 'joined', label: 'Mới gia nhập' },
  { value: 'rank', label: 'Chức vụ' },
]

/** Hướng sắp xếp tự nhiên khi chọn một cột */
export const DEFAULT_DIR: Record<SortKey, SortDir> = {
  power: 'desc',
  weekly: 'desc',
  activity: 'desc',
  joined: 'desc',
  rank: 'asc',
  name: 'asc',
  level: 'desc',
  lastOnline: 'desc',
  class: 'asc',
}

function value(m: Member, key: SortKey): number | string {
  switch (key) {
    case 'power':
      return m.power
    case 'weekly':
      return m.weeklyContribution
    case 'activity':
      return m.activity
    case 'joined':
      return new Date(m.joinedAt).getTime()
    case 'rank':
      return RANKS[m.rank].order
    case 'name':
      return m.name
    case 'level':
      return m.level
    case 'lastOnline':
      return m.status !== 'offline' ? Number.MAX_SAFE_INTEGER : new Date(m.lastOnline).getTime()
    case 'class':
      return CLASSES[m.classId].name
  }
}

export function sortMembers(list: Member[], key: SortKey, dir: SortDir) {
  const mul = dir === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    const va = value(a, key)
    const vb = value(b, key)
    const c = typeof va === 'string' ? va.localeCompare(vb as string, 'vi') : va - (vb as number)
    // phụ: chiến lực giảm dần để thứ tự ổn định
    return c !== 0 ? c * mul : b.power - a.power
  })
}

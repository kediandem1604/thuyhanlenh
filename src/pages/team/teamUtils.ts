import { CLASSES } from '@/domain/constants'
import type { CombatRole, Member } from '@/domain/types'

/** Vai trò gợi ý cho từng vị trí trong một tổ 5 người */
export const SLOT_ROLE: CombatRole[] = ['tank', 'healer', 'dps', 'dps', 'dps']

export function roleOfMember(m: Pick<Member, 'classId'>): CombatRole {
  return CLASSES[m.classId].role
}

/** Ép danh sách vị trí về đúng kích thước, bỏ người không còn trong tổ chức */
export function fitSlots(slots: (string | null)[], size: number, exists: (id: string) => boolean): (string | null)[] {
  const cleaned = slots.map((id) => (id && exists(id) ? id : null))
  const seen = new Set<string>()
  const unique = cleaned.map((id) => {
    if (!id || seen.has(id)) return null
    seen.add(id)
    return id
  })
  if (unique.length >= size) return unique.slice(0, size)
  return [...unique, ...Array<string | null>(size - unique.length).fill(null)]
}

export function quotas(size: number) {
  const groups = Math.max(1, Math.floor(size / 5))
  return { tank: groups, healer: groups, dps: size - groups * 2 }
}

function availability(m: Member) {
  if (m.status === 'online') return 1.08
  if (m.status === 'afk') return 1.02
  if (m.status === 'in-raid') return 1
  return 0.94
}

/** Tự xếp đội: đủ chỉ tiêu vai trò, ưu tiên chiến lực cao và đang trực tuyến */
export function autoFill(members: Member[], size: number): (string | null)[] {
  const q = quotas(size)
  const score = (m: Member) => m.power * availability(m)
  const pool = [...members].sort((a, b) => score(b) - score(a))
  const used = new Set<string>()
  const take = (role: CombatRole, n: number) => {
    const picked: Member[] = []
    for (const m of pool) {
      if (picked.length >= n) break
      if (!used.has(m.id) && roleOfMember(m) === role) {
        picked.push(m)
        used.add(m.id)
      }
    }
    return picked
  }
  const tanks = take('tank', q.tank)
  const healers = take('healer', q.healer)
  const dps = take('dps', q.dps)
  // thiếu vai trò nào thì lấp bằng người mạnh nhất còn lại
  const rest = pool.filter((m) => !used.has(m.id))
  const fill = (arr: Member[], n: number) => {
    while (arr.length < n && rest.length) {
      const m = rest.shift()!
      used.add(m.id)
      arr.push(m)
    }
  }
  fill(tanks, q.tank)
  fill(healers, q.healer)
  fill(dps, q.dps)

  const slots: (string | null)[] = Array(size).fill(null)
  const groups = Math.ceil(size / 5)
  for (let g = 0; g < groups; g++) {
    const base = g * 5
    const order: Member[] = [tanks.shift(), healers.shift(), dps.shift(), dps.shift(), dps.shift()].filter(Boolean) as Member[]
    order.forEach((m, i) => {
      if (base + i < size) slots[base + i] = m.id
    })
  }
  // còn dư (do chỉ tiêu không chia hết) → lấp vào ô trống
  const leftovers = [...tanks, ...healers, ...dps]
  for (let i = 0; i < size && leftovers.length; i++) if (!slots[i]) slots[i] = leftovers.shift()!.id
  return slots
}

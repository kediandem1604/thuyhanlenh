// Phân quyền theo chức vụ, tùy loại tổ chức (ARCHITECTURE.md §8 + giai đoạn 3) — dùng chung frontend + server.
// Server là nơi kiểm tra thật; frontend chỉ dùng để ẩn/khóa nút.
import { RANKS } from './constants'
import { ORG_TYPES, type Feature } from './orgs'
import type { OrgType, RankId } from './types'

/** Bảng quyền của Bang Hội (chức vụ tối thiểu) */
export const PERMISSION_MIN_RANK = {
  'event.rsvp': 'tan-binh',
  'loot.bid': 'tan-binh',
  'bond.self': 'tan-binh',
  'profile.self': 'tan-binh',
  'mentor.take': 'tinh-anh',
  'clear.record': 'duong-chu',
  'war.record': 'duong-chu',
  'event.manage': 'duong-chu',
  'team.manage': 'duong-chu',
  'recruit.review': 'truong-lao',
  'loot.open': 'truong-lao',
  'member.edit': 'truong-lao',
  'announce.manage': 'truong-lao',
  'mentor.manage': 'truong-lao',
  'bond.manage': 'truong-lao',
  'ledger.adjust': 'pho-bang-chu',
  'loot.close': 'pho-bang-chu',
  'rank.assign': 'pho-bang-chu',
  'member.expel': 'pho-bang-chu',
  'org.manage': 'pho-bang-chu',
} as const satisfies Record<string, RankId>

export type Permission = keyof typeof PERMISSION_MIN_RANK
export const PERMISSIONS = Object.keys(PERMISSION_MIN_RANK) as Permission[]

// Kim Lan: Đại ca có mọi quyền; huynh đệ cùng nhau lên lịch, ghi nhận phó bản, xếp đội
const KIMLAN_MEMBER: Permission[] = ['event.rsvp', 'profile.self', 'clear.record', 'event.manage', 'team.manage']
// Team: thành viên cơ bản; phó nhóm gần như đủ, trừ các quyền của chủ team
const TEAM_MEMBER: Permission[] = ['event.rsvp', 'loot.bid', 'bond.self', 'profile.self', 'mentor.take']
const TEAM_OWNER_ONLY: Permission[] = ['org.manage', 'rank.assign', 'member.expel', 'ledger.adjust', 'loot.close']

export const PERMISSION_MIN_RANK_BY_TYPE: Record<OrgType, Record<Permission, RankId>> = {
  guild: PERMISSION_MIN_RANK,
  kimlan: Object.fromEntries(PERMISSIONS.map((p) => [p, KIMLAN_MEMBER.includes(p) ? 'huynh-de' : 'dai-ca'])) as Record<Permission, RankId>,
  team: Object.fromEntries(
    PERMISSIONS.map((p) => [p, TEAM_MEMBER.includes(p) ? 'thanh-vien' : TEAM_OWNER_ONLY.includes(p) ? 'truong-nhom' : 'pho-nhom']),
  ) as Record<Permission, RankId>,
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  'event.rsvp': 'Điểm danh sự kiện',
  'loot.bid': 'Ra giá đấu giá',
  'bond.self': 'Kết duyên',
  'profile.self': 'Sửa hồ sơ của mình',
  'mentor.take': 'Nhận đồ đệ',
  'clear.record': 'Ghi nhận phó bản',
  'war.record': 'Ghi nhận trận đấu',
  'event.manage': 'Tạo / xóa sự kiện',
  'team.manage': 'Lưu đội hình',
  'recruit.review': 'Mời / duyệt thành viên mới',
  'loot.open': 'Mở đấu giá',
  'member.edit': 'Thêm / sửa thành viên',
  'announce.manage': 'Quản lý bảng tin',
  'mentor.manage': 'Quản lý mọi cặp sư đồ',
  'bond.manage': 'Quản lý tình duyên',
  'ledger.adjust': 'Điều chỉnh cống hiến',
  'loot.close': 'Chốt phiên đấu giá',
  'rank.assign': 'Bổ nhiệm / đổi thứ bậc',
  'member.expel': 'Mời ra khỏi tổ chức',
  'org.manage': 'Quản lý tổ chức (tên, giao diện, chức năng)',
}

/** Quyền thuộc chức năng nào — quyền của chức năng đang tắt thì không hiện */
export const PERMISSION_FEATURE: Partial<Record<Permission, Feature>> = {
  'loot.bid': 'bang-kho',
  'loot.open': 'bang-kho',
  'loot.close': 'bang-kho',
  'ledger.adjust': 'bang-kho',
  'bond.self': 'tinh-duyen',
  'bond.manage': 'tinh-duyen',
  'mentor.take': 'su-do',
  'mentor.manage': 'su-do',
  'clear.record': 'pho-ban',
  'war.record': 'bang-chien',
  'event.rsvp': 'lich',
  'event.manage': 'lich',
  'team.manage': 'bay-tran',
}

function rankOrder(rank: RankId) {
  return RANKS[rank].order
}

/** Câu gợi ý cho nút bị khóa vì thiếu quyền, ví dụ "Cần chức vụ Phó Bang Chủ trở lên" */
export function permHint(perm: Permission, type: OrgType = 'guild') {
  const rank = PERMISSION_MIN_RANK_BY_TYPE[type][perm]
  if (rank === ORG_TYPES[type].entryRank) return 'Bạn chưa thể làm việc này'
  if (rank === ORG_TYPES[type].leaderRank) return `Chỉ ${RANKS[rank].name} được làm việc này`
  return `Cần chức vụ ${RANKS[rank].name} trở lên`
}

/** rank cao hơn hoặc bằng min (cùng loại tổ chức; Bang Chủ / Đại ca / Trưởng nhóm cao nhất) */
export function rankAtLeast(rank: RankId, min: RankId) {
  return rankOrder(rank) <= rankOrder(min)
}

export function rankAbove(rank: RankId, other: RankId) {
  return rankOrder(rank) < rankOrder(other)
}

function rankInType(rank: RankId, type: OrgType) {
  return ORG_TYPES[type].ranks.includes(rank)
}

export function can(rank: RankId | null | undefined, perm: Permission, type: OrgType = 'guild') {
  return !!rank && rankInType(rank, type) && rankAtLeast(rank, PERMISSION_MIN_RANK_BY_TYPE[type][perm])
}

export function permissionsFor(rank: RankId | null | undefined, type: OrgType = 'guild'): Permission[] {
  if (!rank) return []
  return PERMISSIONS.filter((p) => can(rank, p, type))
}

export type RuleCheck = { ok: true } | { ok: false; error: string }

/**
 * Luật bổ nhiệm.
 * - Người đứng đầu (Bang Chủ / Đại ca / Trưởng nhóm) làm được mọi thứ; giao chức đứng đầu = truyền ngôi.
 * - Bang: Phó Bang chỉ bổ nhiệm người dưới mình, tối đa tới Trưởng Lão.
 */
export function checkAssignRank(actor: RankId, target: RankId, next: RankId, isSelf: boolean, type: OrgType = 'guild'): RuleCheck {
  if (!can(actor, 'rank.assign', type)) return { ok: false, error: 'Chức vụ của bạn chưa được bổ nhiệm người khác.' }
  if (!rankInType(next, type)) return { ok: false, error: 'Chức vụ này không có ở loại tổ chức hiện tại.' }
  if (isSelf) return { ok: false, error: 'Không thể tự bổ nhiệm chính mình.' }
  if (actor === ORG_TYPES[type].leaderRank) return { ok: true }
  if (!rankAbove(actor, target)) return { ok: false, error: 'Chỉ được bổ nhiệm người có chức vụ thấp hơn mình.' }
  if (type === 'guild' && !rankAtLeast('truong-lao', next)) return { ok: false, error: 'Phó Bang Chủ chỉ bổ nhiệm tới Trưởng Lão.' }
  if (!rankAbove(actor, next)) return { ok: false, error: 'Không thể bổ nhiệm ngang hoặc cao hơn chức của mình.' }
  return { ok: true }
}

export function checkExpel(actor: RankId, target: RankId, isSelf: boolean, type: OrgType = 'guild'): RuleCheck {
  if (!can(actor, 'member.expel', type)) return { ok: false, error: 'Chức vụ của bạn chưa được mời người khác ra.' }
  if (isSelf) return { ok: false, error: 'Không thể tự mời mình ra — hãy dùng "Rời tổ chức".' }
  if (!rankAbove(actor, target)) return { ok: false, error: 'Chỉ mời ra được người có chức vụ thấp hơn mình.' }
  return { ok: true }
}

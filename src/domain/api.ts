// Hợp đồng dữ liệu giữa frontend và server (dùng chung — không import React ở đây).
import type {
  Activity,
  Announcement,
  Application,
  Bond,
  ClearRecord,
  GuildEvent,
  LedgerEntry,
  LootItem,
  Member,
  Mentorship,
  ProgressMap,
  TeamTemplate,
  WarRecord,
} from './types'
import type { Permission } from './permissions'
import type { Feature, OrgThemeId } from './orgs'
import type { ChibiLook, ClassId, OrgType, RankId } from './types'

export const SLICES = [
  'members',
  'mentorships',
  'bonds',
  'progress',
  'clears',
  'events',
  'wars',
  'ledger',
  'loot',
  'applications',
  'announcements',
  'activities',
  'teams',
] as const

export type Slice = (typeof SLICES)[number]

export interface GuildSnapshot {
  members: Member[]
  mentorships: Mentorship[]
  bonds: Bond[]
  progress: ProgressMap
  clears: ClearRecord[]
  events: GuildEvent[]
  wars: WarRecord[]
  ledger: LedgerEntry[]
  loot: LootItem[]
  applications: Application[]
  announcements: Announcement[]
  activities: Activity[]
  teams: TeamTemplate[]
}

/** Giới hạn số bản ghi trả về trong snapshot (mới nhất trước) */
export const SNAPSHOT_LIMITS = { clears: 300, ledger: 500, activities: 120 } as const

export interface MeUser {
  id: string
  name: string
  avatarUrl: string | null
  provider: 'discord' | 'dev'
}

/** Thông tin một tổ chức (bang hội / Kim Lan / team) */
export interface OrgInfo {
  id: string
  type: OrgType
  name: string
  han: string
  server: string
  motto: string
  description: string
  level: number
  /** null = không giới hạn */
  capacity: number | null
  theme: OrgThemeId
  /** chức năng đang bật */
  features: Feature[]
  isPublic: boolean
  memberCount: number
  createdAt: string
}

/** Một tổ chức mà người dùng đang ở trong */
export interface OrgMembership {
  org: OrgInfo
  memberId: string
  rank: RankId
  /** danh xưng hiển thị (Kim Lan: Nhị tỷ…; loại khác: tên chức vụ) */
  title: string
}

/** Nhân vật trong game của người dùng — dùng chung ở mọi tổ chức */
export interface Character {
  id: string
  name: string
  classId: ClassId
  level: number
  power: number
  title: string
  bio: string
  look: ChibiLook
}

export interface Me {
  user: MeUser
  /** nhân vật của tài khoản (null = chưa tạo / chưa nhận) */
  character: Character | null
  /** mọi tổ chức mình đang ở */
  orgs: OrgMembership[]
  /** tổ chức đang xem (theo header x-org-id) */
  org: OrgInfo | null
  /** tư cách thành viên trong tổ chức đang xem */
  member: Member | null
  permissions: Permission[]
  /** đơn xin vào bang đang chờ (nếu có) */
  application: (Application & { orgId?: string; orgName?: string }) | null
  /** @deprecated dùng `org` */
  guild: { id: string; name: string }
  devLogin: boolean
}

/** Lời mời vào tổ chức */
export interface Invite {
  code: string
  kind: 'join' | 'claim'
  memberId: string | null
  createdAt: string
  expiresAt: string | null
  maxUses: number | null
  uses: number
  createdByName: string | null
}

export interface InvitePreview {
  code: string
  kind: 'join' | 'claim'
  valid: boolean
  reason?: string
  org: OrgInfo
  /** lời mời nhận danh tính: nhân vật được nhận */
  character?: Pick<Member, 'id' | 'name' | 'classId' | 'rank' | 'look' | 'honorific'> | null
  invitedBy?: string | null
}

export const ORG_HEADER = 'x-org-id'

export interface DevMemberOption {
  /** id nhân vật (đăng nhập thử theo nhân vật) */
  id: string
  name: string
  classId: Member['classId']
  rank: Member['rank']
  look: Member['look']
  claimed: boolean
  /** các tổ chức nhân vật này đang ở, vd "Kinh Hồng Các · Thất Tinh Đội" */
  orgs?: string
}

export interface AuthProviders {
  discord: boolean
  dev: boolean
  devMembers?: DevMemberOption[]
}

/** Môn hạ chưa có chủ — dùng ở màn Nhập môn */
export interface UnclaimedMember {
  id: string
  name: string
  classId: Member['classId']
  rank: Member['rank']
  look: Member['look']
}

export interface ApiErrorBody {
  ok: false
  error: { code: string; message: string }
}

export interface ApiOkBody<T = unknown> {
  ok: true
  result?: T
  snapshot?: Partial<GuildSnapshot>
}

export type WsMessage =
  | { type: 'hello'; clientId: string }
  | { type: 'invalidate'; slices: Slice[]; by?: string | null }
  | { type: 'presence'; online: string[] }
  /** thông tin tổ chức / quyền thay đổi → tải lại /api/me */
  | { type: 'org' }

export const CLIENT_HEADER = 'x-client-id'
export const CSRF_HEADER = 'x-requested-with'
export const CSRF_VALUE = 'thuy-han-lenh'
export const IDEMPOTENCY_HEADER = 'idempotency-key'

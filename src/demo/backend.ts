// "Máy chủ giả" cho chế độ Vào xem thử: trả lời các lời gọi API bằng dữ liệu mẫu, ngay trong trình duyệt.
// Khách xem với tư cách người đứng đầu mỗi tổ chức mẫu (thấy đủ trang), nhưng mọi thao tác ghi đều bị từ chối.
// Không import React — dùng chung được trong kiểm thử Node.
import { ApiError, type DemoHandler } from '@/api/client'
import type { Character, GuildSnapshot, Me, OrgInfo, OrgMembership, Slice } from '@/domain/api'
import { SLICES } from '@/domain/api'
import { RANKS } from '@/domain/constants'
import { featuresOf, ORG_TYPES, type Feature } from '@/domain/orgs'
import { permissionsFor } from '@/domain/permissions'
import type { Member } from '@/domain/types'
import { generateAllSeeds, type OrgSeed } from '@/data/seedOrgs'

const DEFAULT_ORG = 'kinh-hong-cac'
const DAY = 86400000

/** slice thuộc chức năng nào — chức năng tắt thì trả rỗng, giống máy chủ thật (server/src/snapshot.ts) */
const SLICE_FEATURE: Partial<Record<Slice, Feature>> = {
  mentorships: 'su-do',
  bonds: 'tinh-duyen',
  applications: 'chieu-mo',
  progress: 'pho-ban',
  clears: 'pho-ban',
  teams: 'bay-tran',
  wars: 'bang-chien',
  events: 'lich',
  ledger: 'bang-kho',
  loot: 'bang-kho',
}

const READ_ONLY = 'Đây là bản xem thử — đăng nhập Discord để dùng thật nhé.'

interface DemoOrg {
  info: OrgInfo
  snapshot: GuildSnapshot
  leader: Member
}

function buildOrg(seed: OrgSeed, index: number, now: number): DemoOrg {
  const { org, data } = seed
  const info = ORG_TYPES[org.type]
  const features = featuresOf(org.type, org.features)
  const { currentUserId: _ignored, ...rest } = data
  const snapshot = Object.fromEntries(
    SLICES.map((k) => {
      const f = SLICE_FEATURE[k]
      const off = f && !features.includes(f)
      return [k, off ? (k === 'progress' ? {} : []) : rest[k]]
    }),
  ) as unknown as GuildSnapshot
  const leader = data.members.find((m) => m.rank === info.leaderRank) ?? data.members[0]
  return {
    info: {
      id: org.id,
      type: org.type,
      name: org.name,
      han: org.han,
      server: org.server,
      motto: org.motto,
      description: org.description,
      level: org.level,
      capacity: org.type === 'team' ? null : org.type === 'kimlan' ? 12 : org.capacity,
      theme: org.theme,
      features,
      isPublic: org.isPublic,
      memberCount: data.members.length,
      createdAt: new Date(now - (180 - index * 40) * DAY).toISOString(),
    },
    snapshot,
    leader,
  }
}

function titleOf(m: Member) {
  return m.honorific ?? RANKS[m.rank].name
}

function characterOf(m: Member): Character {
  return { id: m.characterId ?? `ch-${m.id}`, name: m.name, classId: m.classId, level: m.level, power: m.power, title: m.title, bio: m.bio, look: m.look }
}

function slicesOf(path: string): Slice[] {
  const q = new URL(path, 'http://demo').searchParams.get('slices')
  if (!q) return [...SLICES]
  const wanted = q.split(',').map((x) => x.trim())
  return SLICES.filter((k) => wanted.includes(k))
}

export function createDemoBackend(now = Date.now()): DemoHandler {
  const orgs = new Map<string, DemoOrg>(generateAllSeeds(now).map((seed, i) => [seed.org.id, buildOrg(seed, i, now)]))
  const pick = (id: string | null) => orgs.get(id ?? '') ?? orgs.get(DEFAULT_ORG)!

  const memberships = (): OrgMembership[] =>
    [...orgs.values()].map((o) => ({ org: o.info, memberId: o.leader.id, rank: o.leader.rank, title: titleOf(o.leader) }))

  const me = (orgId: string | null): Me => {
    const o = pick(orgId)
    return {
      user: { id: 'demo', name: 'Khách xem thử', avatarUrl: null, provider: 'dev' },
      character: characterOf(o.leader),
      orgs: memberships(),
      org: o.info,
      member: structuredClone(o.leader),
      permissions: permissionsFor(o.leader.rank, o.info.type),
      application: null,
      guild: { id: o.info.id, name: o.info.name },
      devLogin: false,
      isAdmin: false,
    }
  }

  return async (method, path, _body, orgId) => {
    const route = path.split('?')[0]
    if (method !== 'GET') throw new ApiError(403, 'demo', READ_ONLY)
    switch (route) {
      case '/api/me':
        return me(orgId)
      case '/api/snapshot': {
        const o = pick(orgId)
        // bản sao để giao diện có lỡ sửa (cập nhật lạc quan) cũng không làm hỏng dữ liệu mẫu
        return structuredClone(Object.fromEntries(slicesOf(path).map((k) => [k, o.snapshot[k]])))
      }
      case '/api/orgs/public':
        return { orgs: [...orgs.values()].map((o) => o.info).filter((o) => o.isPublic && o.features.includes('chieu-mo')) }
      case '/api/invites':
        return { invites: [] }
      case '/api/onboarding/unclaimed':
        return { members: [] }
      case '/api/health':
        return { ok: true, db: 'demo', clients: 0, time: new Date().toISOString() }
      case '/auth/providers':
        return { discord: false, dev: false }
      case '/api/admin/orgs':
        throw new ApiError(403, 'not_admin', 'Chỉ chủ hệ thống mới dùng được trang quản trị.')
      default:
        if (route.startsWith('/api/invites/')) throw new ApiError(404, 'demo', 'Bản xem thử không dùng link mời — đăng nhập Discord để nhận lời mời.')
        throw new ApiError(404, 'not_found', 'Bản xem thử không có dữ liệu này.')
    }
  }
}

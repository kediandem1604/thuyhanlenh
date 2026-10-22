import { and, eq, isNull, sql } from 'drizzle-orm'
import type { OrgInfo } from '@/domain/api'
import { featuresOf, themeOf, type Feature } from '@/domain/orgs'
import type { OrgType } from '@/domain/types'
import type { DbOrTx } from './db/client'
import * as s from './db/schema'

export type OrgRow = typeof s.guilds.$inferSelect

/** Tổ chức theo id (null nếu không có) */
export async function loadOrg(db: DbOrTx, id: string): Promise<OrgRow | null> {
  const rows = await db.select().from(s.guilds).where(eq(s.guilds.id, id))
  return rows[0] ?? null
}

export function orgType(org: Pick<OrgRow, 'type'>): OrgType {
  return org.type as OrgType
}

export function orgFeatures(org: Pick<OrgRow, 'type' | 'features'>): Feature[] {
  return featuresOf(orgType(org), org.features)
}

export function orgHas(org: Pick<OrgRow, 'type' | 'features'>, f: Feature) {
  return orgFeatures(org).includes(f)
}

export async function memberCount(db: DbOrTx, orgId: string) {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.members)
    .where(and(eq(s.members.guildId, orgId), isNull(s.members.deletedAt)))
  return rows[0]?.n ?? 0
}

export function toOrgInfo(org: OrgRow, count: number): OrgInfo {
  return {
    id: org.id,
    type: orgType(org),
    name: org.name,
    han: org.han,
    server: org.server,
    motto: org.motto,
    description: org.description,
    level: org.level,
    capacity: org.type === 'team' ? null : org.capacity,
    theme: themeOf(org.theme).id,
    features: orgFeatures(org),
    isPublic: org.isPublic,
    memberCount: count,
    createdAt: org.createdAt.toISOString(),
  }
}

/** Đường dẫn API → chức năng; route của chức năng đang tắt sẽ bị chặn */
export const API_FEATURE: [prefix: string, feature: Feature][] = [
  ['/api/mentorships', 'su-do'],
  ['/api/bonds', 'tinh-duyen'],
  ['/api/applications', 'chieu-mo'],
  ['/api/clears', 'pho-ban'],
  ['/api/teams', 'bay-tran'],
  ['/api/wars', 'bang-chien'],
  ['/api/events', 'lich'],
  ['/api/ledger', 'bang-kho'],
  ['/api/loot', 'bang-kho'],
]

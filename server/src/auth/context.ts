import { and, asc, eq, isNull } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { CSRF_HEADER, CSRF_VALUE, CLIENT_HEADER, ORG_HEADER } from '@/domain/api'
import { FEATURE_INFO } from '@/domain/orgs'
import { can, permissionsFor, type Permission } from '@/domain/permissions'
import type { OrgType, RankId } from '@/domain/types'
import * as s from '../db/schema'
import { forbidden, notFound, unauthorized } from '../lib/errors'
import { API_FEATURE, loadOrg, orgHas, orgType, type OrgRow } from '../orgs'
import { SESSION_COOKIE, findSession, setSessionCookie } from './sessions'

export type UserRow = typeof s.users.$inferSelect
export type CharacterRow = typeof s.characters.$inferSelect
/** Tư cách thành viên + vài trường của nhân vật (tên, lưu phái…) cho tiện dùng trong module */
export type MemberRow = typeof s.members.$inferSelect & {
  name: string
  classId: string
  level: number
  power: number
  userId: string | null
}

export interface AuthContext {
  user: UserRow
  /** nhân vật của tài khoản (null = chưa tạo / chưa nhận) */
  character: CharacterRow | null
  /** tư cách thành viên trong tổ chức đang xem */
  member: MemberRow | null
  rank: RankId | null
  permissions: Permission[]
  token: string
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null
    clientId: string | null
    /** id tổ chức đang thao tác (header x-org-id → tổ chức đầu tiên của mình → mặc định) */
    orgId: string
    org: OrgRow | null
  }
}

/** Gắn `req.auth`, `req.orgId` cho mọi request + chặn CSRF cho request ghi + chặn chức năng đang tắt. */
export function registerAuthHooks(app: FastifyInstance) {
  app.decorateRequest('auth', null)
  app.decorateRequest('clientId', null)
  app.decorateRequest('orgId', '')
  app.decorateRequest('org', null)

  app.addHook('onRequest', async (req, reply) => {
    const query = (req.query as Record<string, string> | undefined) ?? {}
    const client = req.headers[CLIENT_HEADER]
    req.clientId = typeof client === 'string' ? client.slice(0, 64) : (query.clientId ?? null)

    // CSRF: request ghi phải đến từ app (header tùy biến không gửi được qua form/thẻ ảnh) và đúng origin
    const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(req.method)
    const guarded = req.url.startsWith('/api/') || req.url.startsWith('/auth/')
    if (isWrite && guarded) {
      if (req.headers[CSRF_HEADER] !== CSRF_VALUE) throw forbidden('Yêu cầu bị chặn (thiếu header bảo vệ CSRF).', 'csrf')
      const origin = req.headers.origin
      if (origin && origin !== app.ctx.config.webOrigin && !isSameHost(origin, req.headers.host)) {
        throw forbidden('Yêu cầu bị chặn (origin không hợp lệ).', 'csrf')
      }
    }

    const headerOrg = req.headers[ORG_HEADER]
    const wantedOrg = typeof headerOrg === 'string' && headerOrg ? headerOrg.slice(0, 64) : (query.org ?? null)
    req.orgId = wantedOrg ?? app.ctx.guildId

    const token = req.cookies[SESSION_COOKIE]
    if (!token) return
    const found = await findSession(app.ctx.db, token)
    if (!found) return
    if (found.refreshed) setSessionCookie(reply, token, found.refreshed, app.ctx.config.secureCookies)
    const auth = await resolveAuth(app, found.user, wantedOrg)
    auth.token = token
    req.auth = auth
    if (auth.member) req.orgId = auth.member.guildId
    else if (!wantedOrg) req.orgId = app.ctx.guildId
  })

  // Tải tổ chức hiện tại + chặn route của chức năng đang tắt (sau khi đã biết orgId)
  app.addHook('preHandler', async (req) => {
    if (!req.url.startsWith('/api/')) return
    req.org = await loadOrg(app.ctx.db, req.orgId)
    const hit = API_FEATURE.find(([prefix]) => req.url.startsWith(prefix))
    if (hit && req.org && !orgHas(req.org, hit[1])) {
      throw notFound(`Chức năng ${FEATURE_INFO[hit[1]].name} không có ở ${req.org.name}.`, 'feature_off')
    }
  })
}

/** Tìm nhân vật + tư cách thành viên của người dùng trong tổ chức mong muốn (hoặc tổ chức đầu tiên). */
export async function resolveAuth(app: FastifyInstance, user: UserRow, wantedOrg: string | null): Promise<AuthContext> {
  const db = app.ctx.db
  const chars = await db.select().from(s.characters).where(eq(s.characters.userId, user.id))
  const character = chars[0] ?? null
  let member: MemberRow | null = null
  if (character) {
    const rows = await db
      .select({ m: s.members })
      .from(s.members)
      .where(and(eq(s.members.characterId, character.id), isNull(s.members.deletedAt)))
      .orderBy(asc(s.members.joinedAt))
    const pick = (wantedOrg ? rows.find((r) => r.m.guildId === wantedOrg) : null) ?? (wantedOrg ? null : (rows.find((r) => r.m.guildId === app.ctx.guildId) ?? rows[0]))
    if (pick) member = { ...pick.m, name: character.name, classId: character.classId, level: character.level, power: character.power, userId: character.userId }
  }
  let type: OrgType = 'guild'
  if (member) {
    const org = await loadOrg(db, member.guildId)
    if (org) type = orgType(org)
  }
  const rank = (member?.rank as RankId | undefined) ?? null
  return { user, character, member, rank, permissions: permissionsFor(rank, type), token: '' }
}

function isSameHost(origin: string, host: string | undefined) {
  try {
    return !!host && new URL(origin).host === host
  } catch {
    return false
  }
}

export function requireUser(req: FastifyRequest) {
  if (!req.auth) throw unauthorized()
  return req.auth
}

/** Đã đăng nhập và là thành viên của tổ chức đang thao tác. */
export function requireMember(req: FastifyRequest) {
  const auth = requireUser(req)
  if (!auth.member || !auth.rank) throw forbidden('Bạn chưa là thành viên của tổ chức này.', 'not_member')
  return { ...auth, member: auth.member, rank: auth.rank }
}

/** Loại của tổ chức đang thao tác */
export function typeOf(req: FastifyRequest): OrgType {
  return req.org ? orgType(req.org) : 'guild'
}

export function requirePerm(req: FastifyRequest, perm: Permission) {
  const auth = requireMember(req)
  if (!can(auth.rank, perm, typeOf(req))) throw forbidden()
  return auth
}

export function hasPerm(req: FastifyRequest, perm: Permission) {
  return !!req.auth?.rank && can(req.auth.rank, perm, typeOf(req))
}

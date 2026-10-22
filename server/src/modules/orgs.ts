import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Invite, InvitePreview, OrgInfo } from '@/domain/api'
import { FEATURES, ORG_THEME_IDS, ORG_TYPES, kimlanHonorific, type Feature, type OrgThemeId } from '@/domain/orgs'
import type { ClassId, OrgType, RankId } from '@/domain/types'
import { requireMember, requirePerm, requireUser, typeOf } from '../auth/context'
import type { DbOrTx } from '../db/client'
import * as s from '../db/schema'
import { badRequest, conflict, notFound } from '../lib/errors'
import { newId, randomToken } from '../lib/ids'
import { loadOrg, memberCount, toOrgInfo } from '../orgs'
import { addMembership, CharacterInputSchema, createCharacter, removeMembership, upsertPowerHistory, assertRenameFreeFor } from './members'
import { isCharacterUnclaimed } from './recruitment'
import { audit, getMember, idempotent, logActivity } from './shared'

/* ---------------- Kiểm tra đầu vào ---------------- */

const Han = z.string().trim().min(1, 'Cần một chữ Hán làm biểu tượng.').max(3, 'Tối đa 3 chữ Hán.')
const ThemeZ = z.enum(ORG_THEME_IDS as [OrgThemeId, ...OrgThemeId[]])
const FeatureZ = z.enum(FEATURES as unknown as [Feature, ...Feature[]])

const NewOrg = z.object({
  type: z.enum(['guild', 'kimlan', 'team']),
  name: z.string().trim().min(2, 'Tên cần ít nhất 2 ký tự.').max(40, 'Tên tối đa 40 ký tự.'),
  han: Han,
  server: z.string().trim().max(40).optional(),
  motto: z.string().trim().max(120).optional(),
  description: z.string().trim().max(400).optional(),
  theme: ThemeZ.optional(),
  features: z.array(FeatureZ).max(FEATURES.length).optional(),
  isPublic: z.boolean().optional(),
})

const PatchOrg = z
  .object({
    name: z.string().trim().min(2).max(40),
    han: Han,
    server: z.string().trim().max(40),
    motto: z.string().trim().max(120),
    description: z.string().trim().max(400),
    theme: ThemeZ,
    capacity: z.number().int().min(5).max(200),
    level: z.number().int().min(1).max(20),
    isPublic: z.boolean(),
    features: z.array(FeatureZ).max(FEATURES.length),
  })
  .partial()

const NewInvite = z.object({
  kind: z.enum(['join', 'claim']).default('join'),
  memberId: z.string().min(1).optional(),
  maxUses: z.number().int().min(1).max(200).nullable().optional(),
  expiresInDays: z.number().int().min(1).max(30).nullable().optional(),
})

/* ---------------- Tiện ích ---------------- */

async function orgInfo(db: DbOrTx, id: string): Promise<OrgInfo> {
  const org = await loadOrg(db, id)
  if (!org) throw notFound('Không tìm thấy tổ chức.')
  return toOrgInfo(org, await memberCount(db, id))
}

async function characterOfUser(db: DbOrTx, userId: string) {
  const rows = await db.select().from(s.characters).where(eq(s.characters.userId, userId))
  return rows[0] ?? null
}

/** Mã mời dễ gõ: 8 ký tự chữ hoa/số, bỏ ký tự dễ nhầm */
function inviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const raw = randomToken(12)
  let out = ''
  for (let i = 0; out.length < 8 && i < raw.length; i++) out += alphabet[raw.charCodeAt(i) % alphabet.length]
  return out
}

function inviteValid(inv: typeof s.orgInvites.$inferSelect): { ok: true } | { ok: false; reason: string } {
  if (inv.revokedAt) return { ok: false, reason: 'Lời mời đã bị thu hồi.' }
  if (inv.expiresAt && inv.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'Lời mời đã hết hạn.' }
  if (inv.maxUses !== null && inv.uses >= inv.maxUses) return { ok: false, reason: 'Lời mời đã dùng hết lượt.' }
  return { ok: true }
}

/* ---------------- Routes ---------------- */

export async function orgRoutes(app: FastifyInstance) {
  const { ctx } = app

  /** Danh bạ tổ chức nhận đơn công khai (bang hội / team có Chiêu Mộ) */
  app.get('/api/orgs/public', async (req): Promise<{ orgs: OrgInfo[] }> => {
    requireUser(req)
    const rows = await ctx.db.select().from(s.guilds).where(eq(s.guilds.isPublic, true)).orderBy(desc(s.guilds.level), s.guilds.name)
    const orgs: OrgInfo[] = []
    for (const r of rows) {
      const info = toOrgInfo(r, await memberCount(ctx.db, r.id))
      if (info.features.includes('chieu-mo')) orgs.push(info)
    }
    return { orgs }
  })

  /** Lập tổ chức mới — người lập là chủ (Bang Chủ / Đại ca / Trưởng nhóm) */
  app.post('/api/orgs', async (req, reply) =>
    idempotent(req, reply, async () => {
      const auth = requireUser(req)
      const body = NewOrg.parse(req.body)
      const type = body.type as OrgType
      const info = ORG_TYPES[type]
      const orgId = await ctx.db.transaction(async (tx) => {
        const character = await characterOfUser(tx, auth.user.id)
        if (!character) throw conflict('Hãy tạo nhân vật trước khi lập tổ chức.')
        const owned = await tx
          .select({ n: sql<number>`count(*)::int` })
          .from(s.guilds)
          .where(eq(s.guilds.createdBy, auth.user.id))
        if ((owned[0]?.n ?? 0) >= 10) throw conflict('Mỗi tài khoản lập tối đa 10 tổ chức.')
        const id = newId('org')
        const features = type === 'team' ? (body.features ?? [...info.defaults]).filter((f) => info.allowed.includes(f)) : null
        await tx.insert(s.guilds).values({
          id,
          type,
          name: body.name,
          han: body.han,
          server: body.server || 'Biện Kinh',
          level: 1,
          motto: body.motto ?? '',
          description: body.description ?? '',
          capacity: type === 'team' ? null : (info.capacity ?? 80),
          theme: body.theme ?? (type === 'kimlan' ? 'bach-gia' : type === 'team' ? 'thanh-ngoc' : 'kinh-hong'),
          features,
          isPublic: type === 'guild' ? (body.isPublic ?? true) : false,
          createdBy: auth.user.id,
        })
        await addMembership(tx, id, character.id, { rank: info.leaderRank, founding: true })
        await logActivity(tx, id, 'event', `${character.name} lập ${info.name} ${body.name}!`)
        await tx.insert(s.auditLog).values({ id: newId('aud'), guildId: id, userId: auth.user.id, action: 'org.create', target: id, payload: body as never, at: new Date() })
        return id
      })
      reply.code(201)
      return { ok: true as const, result: { orgId, org: await orgInfo(ctx.db, orgId) } }
    }),
  )

  /** Sửa thông tin tổ chức đang chọn */
  app.patch('/api/orgs/current', async (req) => {
    requirePerm(req, 'org.manage')
    const type = typeOf(req)
    const info = ORG_TYPES[type]
    const body = PatchOrg.parse(req.body)
    const patch: Partial<typeof s.guilds.$inferInsert> = {}
    if (body.name !== undefined) patch.name = body.name
    if (body.han !== undefined) patch.han = body.han
    if (body.server !== undefined) patch.server = body.server
    if (body.motto !== undefined) patch.motto = body.motto
    if (body.description !== undefined) patch.description = body.description
    if (body.theme !== undefined) patch.theme = body.theme
    if (body.capacity !== undefined) {
      if (type !== 'guild') throw badRequest(type === 'kimlan' ? 'Kim Lan luôn tối đa 12 người.' : 'Team không giới hạn số người.')
      const n = await memberCount(ctx.db, req.orgId)
      if (body.capacity < n) throw badRequest(`Bang đang có ${n} người — sức chứa không được nhỏ hơn.`)
      patch.capacity = body.capacity
    }
    if (body.level !== undefined) {
      if (type !== 'guild') throw badRequest('Chỉ bang hội có cấp bang.')
      patch.level = body.level
    }
    if (body.isPublic !== undefined) {
      if (type === 'kimlan') throw badRequest('Kim Lan chỉ nhận người qua link mời.')
      patch.isPublic = body.isPublic
    }
    if (body.features !== undefined) {
      if (!info.toggleable) throw badRequest(`Chức năng của ${info.name} cố định theo trò chơi, không bật/tắt được.`)
      patch.features = FEATURES.filter((f) => body.features!.includes(f) && info.allowed.includes(f))
    }
    if (!Object.keys(patch).length) throw badRequest('Không có gì để cập nhật.')
    await ctx.db.transaction(async (tx) => {
      await tx.update(s.guilds).set(patch).where(eq(s.guilds.id, req.orgId))
      await audit(tx, req, 'org.update', req.orgId, body)
    })
    ctx.hub.broadcastOrg(req.orgId)
    return { ok: true as const, result: { org: await orgInfo(ctx.db, req.orgId) } }
  })

  /** Tự rời tổ chức (người đứng đầu phải truyền ngôi trước) */
  app.post('/api/orgs/current/leave', async (req) => {
    const me = requireMember(req)
    const type = typeOf(req)
    if (me.rank === ORG_TYPES[type].leaderRank) {
      const n = await memberCount(ctx.db, req.orgId)
      if (n > 1) throw badRequest(`Bạn là ${type === 'kimlan' ? 'Đại ca' : 'người đứng đầu'} — hãy truyền ngôi cho người khác trước khi rời.`)
    }
    await ctx.db.transaction(async (tx) => {
      await removeMembership(tx, req.orgId, me.member.id)
      await logActivity(tx, req.orgId, 'event', `${me.member.name} đã rời ${type === 'kimlan' ? 'Kim Lan' : type === 'team' ? 'team' : 'bang'}.`)
      await audit(tx, req, 'org.leave', me.member.id)
    })
    ctx.hub.invalidate(req.orgId, ['members', 'activities', 'teams', 'events', 'mentorships', 'bonds'], null)
    return { ok: true as const }
  })

  /* ---------------- Nhân vật của tôi ---------------- */

  app.post('/api/characters', async (req, reply) =>
    idempotent(req, reply, async () => {
      const auth = requireUser(req)
      const body = CharacterInputSchema.parse(req.body)
      const id = await ctx.db.transaction(async (tx) => {
        if (await characterOfUser(tx, auth.user.id)) throw conflict('Tài khoản của bạn đã có nhân vật rồi.')
        const id = await createCharacter(tx, { ...body, userId: auth.user.id })
        await tx.insert(s.auditLog).values({ id: newId('aud'), guildId: '-', userId: auth.user.id, action: 'character.create', target: id, payload: body as never, at: new Date() })
        return id
      })
      reply.code(201)
      return { ok: true as const, result: { characterId: id } }
    }),
  )

  app.patch('/api/characters/me', async (req) => {
    const auth = requireUser(req)
    const body = CharacterInputSchema.partial().parse(req.body)
    const orgs = await ctx.db.transaction(async (tx) => {
      const own = await characterOfUser(tx, auth.user.id)
      if (!own) throw notFound('Bạn chưa có nhân vật.')
      if (body.name && body.name.toLowerCase() !== own.name.toLowerCase()) await assertRenameFreeFor(tx, own.id, body.name)
      const { gender: _g, ...rest } = body
      void _g
      if (Object.keys(rest).length) await tx.update(s.characters).set(rest as Partial<typeof s.characters.$inferInsert>).where(eq(s.characters.id, own.id))
      if (body.power !== undefined && body.power !== own.power) await upsertPowerHistory(tx, own.id, body.power)
      const ms = await tx
        .select({ guildId: s.members.guildId })
        .from(s.members)
        .where(and(eq(s.members.characterId, own.id), isNull(s.members.deletedAt)))
      return ms.map((m) => m.guildId)
    })
    for (const o of orgs) ctx.hub.invalidate(o, ['members'], null, req.clientId)
    return { ok: true as const }
  })

  /* ---------------- Lời mời ---------------- */

  app.get('/api/invites', async (req): Promise<{ invites: Invite[] }> => {
    requirePerm(req, 'recruit.review')
    const rows = await ctx.db
      .select({ inv: s.orgInvites, by: s.characters.name })
      .from(s.orgInvites)
      .leftJoin(s.characters, eq(s.orgInvites.createdBy, s.characters.userId))
      .where(and(eq(s.orgInvites.guildId, req.orgId), isNull(s.orgInvites.revokedAt), or(isNull(s.orgInvites.expiresAt), gt(s.orgInvites.expiresAt, new Date()))))
      .orderBy(desc(s.orgInvites.createdAt))
    return {
      invites: rows
        .filter((r) => inviteValid(r.inv).ok)
        .map(({ inv, by }) => ({
          code: inv.code,
          kind: inv.kind as Invite['kind'],
          memberId: inv.memberId,
          createdAt: inv.createdAt.toISOString(),
          expiresAt: inv.expiresAt?.toISOString() ?? null,
          maxUses: inv.maxUses,
          uses: inv.uses,
          createdByName: by ?? null,
        })),
    }
  })

  app.post('/api/invites', async (req, reply) =>
    idempotent(req, reply, async () => {
      requirePerm(req, 'recruit.review')
      const body = NewInvite.parse(req.body)
      const code = await ctx.db.transaction(async (tx) => {
        if (body.kind === 'claim') {
          if (!body.memberId) throw badRequest('Lời mời nhận danh tính cần chọn nhân vật.')
          const target = await getMember(tx, req.orgId, body.memberId)
          if (!(await isCharacterUnclaimed(tx, target.characterId))) throw conflict('Nhân vật này đã có chủ.')
        }
        const code = inviteCode()
        const days = body.expiresInDays === undefined ? 7 : body.expiresInDays
        await tx.insert(s.orgInvites).values({
          code,
          guildId: req.orgId,
          kind: body.kind,
          memberId: body.kind === 'claim' ? body.memberId! : null,
          createdBy: req.auth!.user.id,
          expiresAt: days ? new Date(Date.now() + days * 86400000) : null,
          maxUses: body.kind === 'claim' ? 1 : (body.maxUses ?? null),
        })
        await audit(tx, req, 'invite.create', code, body)
        return code
      })
      reply.code(201)
      return { ok: true as const, result: { code } }
    }),
  )

  app.delete('/api/invites/:code', async (req) => {
    requirePerm(req, 'recruit.review')
    const { code } = req.params as { code: string }
    await ctx.db.transaction(async (tx) => {
      const rows = await tx
        .update(s.orgInvites)
        .set({ revokedAt: new Date() })
        .where(and(eq(s.orgInvites.code, code.toUpperCase()), eq(s.orgInvites.guildId, req.orgId)))
        .returning({ code: s.orgInvites.code })
      if (!rows.length) throw notFound('Không tìm thấy lời mời.')
      await audit(tx, req, 'invite.revoke', code)
    })
    return { ok: true as const }
  })

  app.get('/api/invites/:code', async (req): Promise<InvitePreview> => {
    requireUser(req)
    const { code } = req.params as { code: string }
    const rows = await ctx.db.select().from(s.orgInvites).where(eq(s.orgInvites.code, code.toUpperCase()))
    const inv = rows[0]
    if (!inv) throw notFound('Mã mời không đúng hoặc đã bị xóa.')
    const org = await orgInfo(ctx.db, inv.guildId)
    const valid = inviteValid(inv)
    let character: InvitePreview['character'] = null
    if (inv.kind === 'claim' && inv.memberId) {
      const m = await getMember(ctx.db, inv.guildId, inv.memberId).catch(() => null)
      if (m) {
        const c = (await ctx.db.select().from(s.characters).where(eq(s.characters.id, m.characterId)))[0]
        const total = org.memberCount
        character = {
          id: m.id,
          name: c.name,
          classId: c.classId as ClassId,
          rank: m.rank as RankId,
          look: c.look,
          honorific: org.type === 'kimlan' && m.seat ? kimlanHonorific(m.seat, c.look.gender, total).name : undefined,
        }
      }
    }
    const by = inv.createdBy ? (await ctx.db.select({ name: s.characters.name }).from(s.characters).where(eq(s.characters.userId, inv.createdBy)))[0]?.name : null
    return { code: inv.code, kind: inv.kind as InvitePreview['kind'], valid: valid.ok, reason: valid.ok ? undefined : valid.reason, org, character, invitedBy: by ?? null }
  })

  app.post('/api/invites/:code/accept', async (req) => {
    const auth = requireUser(req)
    const { code } = req.params as { code: string }
    const orgId = await ctx.db.transaction(async (tx) => {
      const rows = await tx.select().from(s.orgInvites).where(eq(s.orgInvites.code, code.toUpperCase())).for('update')
      const inv = rows[0]
      if (!inv) throw notFound('Mã mời không đúng hoặc đã bị xóa.')
      const valid = inviteValid(inv)
      if (!valid.ok) throw conflict(valid.reason)
      const own = await characterOfUser(tx, auth.user.id)
      if (inv.kind === 'join') {
        if (!own) throw conflict('Hãy tạo hoặc nhận nhân vật trước khi vào tổ chức.')
        await addMembership(tx, inv.guildId, own.id)
      } else {
        if (own) throw conflict('Tài khoản của bạn đã có nhân vật — lời mời này dành cho người chưa có nhân vật.')
        const target = await getMember(tx, inv.guildId, inv.memberId ?? '')
        if (!(await isCharacterUnclaimed(tx, target.characterId))) throw conflict('Nhân vật này đã có chủ.')
        await tx.update(s.characters).set({ userId: auth.user.id }).where(eq(s.characters.id, target.characterId))
        await logActivity(tx, inv.guildId, 'join', `${target.name} đã nhận danh tính qua lời mời`, target.id)
      }
      await tx.update(s.orgInvites).set({ uses: inv.uses + 1 }).where(eq(s.orgInvites.code, inv.code))
      await tx.insert(s.auditLog).values({ id: newId('aud'), guildId: inv.guildId, userId: auth.user.id, action: 'invite.accept', target: inv.code, payload: null, at: new Date() })
      return inv.guildId
    })
    ctx.hub.invalidate(orgId, ['members', 'activities'], null)
    return { ok: true as const, result: { orgId, org: await orgInfo(ctx.db, orgId) } }
  })
}

import { and, asc, eq, isNull } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import type { AdminOrgRow } from '@/domain/api'
import { RANKS } from '@/domain/constants'
import { kimlanHonorific, ORG_TYPES } from '@/domain/orgs'
import type { RankId } from '@/domain/types'
import { requireUser } from '../auth/context'
import type { Config } from '../config'
import type { DbOrTx } from '../db/client'
import * as s from '../db/schema'
import { conflict, forbidden, notFound } from '../lib/errors'
import { newId } from '../lib/ids'
import { loadOrg, memberCount, orgType, toOrgInfo } from '../orgs'
import { addMembership, makeLeader, removeMembership } from './members'
import { logActivity } from './shared'

/**
 * Quản trị hệ thống.
 * Chủ hệ thống = người đang giữ ghế đứng đầu bang chính (config.guildId), hoặc có ID Discord trong ADMIN_DISCORD_IDS.
 * Dùng khi một tổ chức không còn ai quản lý được (vd Kim Lan mẫu mà Đại tỷ là nhân vật chưa có chủ).
 */

export async function isSystemAdmin(db: DbOrTx, config: Config, user: { id: string; discordId: string | null }) {
  if (user.discordId && config.adminDiscordIds.includes(user.discordId)) return true
  const leaderRank = ORG_TYPES[(await loadOrg(db, config.guildId).then((o) => (o ? orgType(o) : 'guild')))].leaderRank
  const rows = await db
    .select({ userId: s.characters.userId })
    .from(s.members)
    .innerJoin(s.characters, eq(s.members.characterId, s.characters.id))
    .where(and(eq(s.members.guildId, config.guildId), eq(s.members.rank, leaderRank), isNull(s.members.deletedAt)))
  return rows.some((r) => r.userId === user.id)
}

async function requireAdmin(req: FastifyRequest, db: DbOrTx, config: Config) {
  const auth = requireUser(req)
  if (!(await isSystemAdmin(db, config, auth.user))) throw forbidden('Chỉ chủ hệ thống mới dùng được trang quản trị.', 'not_admin')
  return auth
}

async function roster(db: DbOrTx, guildId: string) {
  return db
    .select({ m: s.members, c: s.characters })
    .from(s.members)
    .innerJoin(s.characters, eq(s.members.characterId, s.characters.id))
    .where(and(eq(s.members.guildId, guildId), isNull(s.members.deletedAt)))
    .orderBy(asc(s.members.seat), asc(s.members.joinedAt))
}

const LeadBody = z.object({ replaceMemberId: z.string().min(1).optional() })

export async function adminRoutes(app: FastifyInstance) {
  const { ctx } = app

  /** Mọi tổ chức trong hệ thống + tình trạng của mình ở đó */
  app.get('/api/admin/orgs', async (req): Promise<{ orgs: AdminOrgRow[] }> => {
    const auth = await requireAdmin(req, ctx.db, ctx.config)
    const myCharacter = auth.character?.id ?? null
    const guilds = await ctx.db.select().from(s.guilds).orderBy(asc(s.guilds.createdAt))
    const orgs: AdminOrgRow[] = []
    for (const g of guilds) {
      const type = orgType(g)
      const info = ORG_TYPES[type]
      const rows = await roster(ctx.db, g.id)
      const count = await memberCount(ctx.db, g.id)
      const cap = type === 'team' ? null : type === 'kimlan' ? 12 : (g.capacity ?? info.capacity)
      const title = (r: (typeof rows)[number]) =>
        type === 'kimlan' && r.m.seat ? kimlanHonorific(r.m.seat, r.c.look.gender, rows.length).name : RANKS[r.m.rank as RankId].name
      const leaderRow = rows.find((r) => r.m.rank === info.leaderRank)
      orgs.push({
        org: toOrgInfo(g, count),
        leader: leaderRow ? { memberId: leaderRow.m.id, name: leaderRow.c.name, claimed: !!leaderRow.c.userId } : null,
        isMember: rows.some((r) => r.c.id === myCharacter),
        isLeader: !!leaderRow && leaderRow.c.id === myCharacter,
        isFull: cap !== null && cap !== undefined && rows.length >= cap,
        // ưu tiên người ghế cuối / mới vào gần nhất lên đầu danh sách
        replaceable: rows
          .filter((r) => !r.c.userId)
          .reverse()
          .map((r) => ({ memberId: r.m.id, name: r.c.name, title: title(r), seat: r.m.seat })),
      })
    }
    return { orgs }
  })

  /** Chủ hệ thống vào một tổ chức và đứng đầu (Kim Lan: ghế 1). Tổ chức đã đủ người → nhường chỗ của một nhân vật chưa có chủ. */
  app.post('/api/admin/orgs/:orgId/lead', async (req) => {
    const auth = await requireAdmin(req, ctx.db, ctx.config)
    const { orgId } = req.params as { orgId: string }
    const body = LeadBody.parse(req.body ?? {})
    const character = auth.character
    if (!character) throw conflict('Hãy tạo nhân vật trước khi vào tổ chức.')

    await ctx.db.transaction(async (tx) => {
      const org = await loadOrg(tx, orgId)
      if (!org) throw notFound('Không tìm thấy tổ chức.')
      const type = orgType(org)
      const info = ORG_TYPES[type]
      const rows = await roster(tx, orgId)
      const mine = rows.find((r) => r.c.id === character.id)

      let memberId: string
      if (mine) {
        if (mine.m.rank === info.leaderRank) throw conflict(`Bạn đang đứng đầu ${org.name} rồi.`)
        memberId = mine.m.id
      } else {
        const cap = type === 'team' ? null : type === 'kimlan' ? 12 : (org.capacity ?? info.capacity)
        if (cap !== null && cap !== undefined && rows.length >= cap) {
          if (!body.replaceMemberId)
            throw conflict(
              type === 'kimlan'
                ? 'Kim Lan đã đủ 12 người — chọn một nhân vật chưa có chủ để nhường chỗ.'
                : `${org.name} đã đủ ${cap} người — chọn một nhân vật chưa có chủ để nhường chỗ.`,
            )
          const target = rows.find((r) => r.m.id === body.replaceMemberId)
          if (!target) throw notFound('Không tìm thấy người được chọn nhường chỗ.')
          if (target.c.userId) throw conflict(`${target.c.name} đã có chủ tài khoản — chỉ được nhường chỗ của nhân vật chưa có chủ.`)
          await removeMembership(tx, orgId, target.m.id)
          await logActivity(tx, orgId, 'event', `${target.c.name} nhường chỗ trong ${org.name}`)
        }
        memberId = await addMembership(tx, orgId, character.id)
      }

      await makeLeader(tx, orgId, type, memberId)
      await logActivity(tx, orgId, 'promote', `${character.name} được chủ hệ thống đưa lên đứng đầu ${info.name} ${org.name}`, memberId)
      await tx.insert(s.auditLog).values({ id: newId('aud'), guildId: orgId, userId: auth.user.id, action: 'admin.lead', target: orgId, payload: body as never, at: new Date() })
    })

    ctx.hub.invalidate(orgId, ['members', 'activities', 'mentorships', 'bonds', 'events', 'teams'], null)
    ctx.hub.broadcastOrg(orgId)
    return { ok: true as const, result: { orgId } }
  })
}

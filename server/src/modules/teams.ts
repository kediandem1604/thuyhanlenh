import { and, eq, inArray, isNull } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { DUNGEONS, DUNGEON_MAP } from '@/domain/constants'
import { requirePerm } from '../auth/context'
import * as s from '../db/schema'
import { badRequest, notFound } from '../lib/errors'
import { newId } from '../lib/ids'
import { audit, idempotent, respond } from './shared'

/** Module Đội hình — lưu / xóa mẫu bày trận. */

/** đoàn đông nhất trong game (Vĩnh Dạ Tinh Đô: 12 người) */
const MAX_SLOTS = Math.max(...DUNGEONS.map((d) => d.size))

const TeamBody = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1, 'Hãy đặt tên cho mẫu đội hình.').max(40, 'Tên mẫu tối đa 40 ký tự.'),
  dungeonId: z.string().min(1).optional(),
  slots: z.array(z.string().min(1).nullable()).min(1, 'Đội hình trống.').max(MAX_SLOTS, `Tối đa ${MAX_SLOTS} vị trí.`),
})

export async function teamRoutes(app: FastifyInstance) {
  const { ctx } = app

  app.post('/api/teams', async (req, reply) =>
    idempotent(req, reply, async () => {
      const me = requirePerm(req, 'team.manage')
      const body = TeamBody.parse(req.body)
      const dungeon = body.dungeonId ? DUNGEON_MAP[body.dungeonId] : undefined
      if (body.dungeonId && !dungeon) throw badRequest('Phó bản không tồn tại.')
      if (dungeon && body.slots.length > dungeon.size) throw badRequest(`${dungeon.name} chỉ xếp được ${dungeon.size} người.`)
      const ids = body.slots.filter((x): x is string => !!x)
      if (new Set(ids).size !== ids.length) throw badRequest('Một người bị xếp vào hai vị trí.')
      const result = await ctx.db.transaction(async (tx) => {
        if (ids.length) {
          const found = await tx
            .select({ id: s.members.id })
            .from(s.members)
            .where(and(eq(s.members.guildId, req.orgId), isNull(s.members.deletedAt), inArray(s.members.id, ids)))
          if (found.length !== ids.length) throw badRequest('Có người trong đội hình không còn ở trong bang.')
        }
        if (body.id) {
          const existing = await tx
            .select({ id: s.teams.id })
            .from(s.teams)
            .where(and(eq(s.teams.id, body.id), eq(s.teams.guildId, req.orgId)))
          if (!existing[0]) throw notFound('Không tìm thấy mẫu đội hình này.')
          await tx
            .update(s.teams)
            .set({ name: body.name, dungeonId: body.dungeonId ?? null, slots: body.slots })
            .where(eq(s.teams.id, body.id))
          await audit(tx, req, 'team.update', body.id, body)
          return { id: body.id, created: false }
        }
        const id = newId('team')
        await tx.insert(s.teams).values({
          id,
          guildId: req.orgId,
          name: body.name,
          dungeonId: body.dungeonId ?? null,
          slots: body.slots,
          createdBy: me.user.id,
        })
        await audit(tx, req, 'team.create', id, body)
        return { id, created: true }
      })
      if (result.created) reply.code(201)
      return respond(req, ['teams'], { id: result.id })
    }),
  )

  app.delete('/api/teams/:id', async (req) => {
    requirePerm(req, 'team.manage')
    const { id } = req.params as { id: string }
    await ctx.db.transaction(async (tx) => {
      const rows = await tx
        .delete(s.teams)
        .where(and(eq(s.teams.id, id), eq(s.teams.guildId, req.orgId)))
        .returning({ id: s.teams.id, name: s.teams.name })
      if (!rows[0]) throw notFound('Không tìm thấy mẫu đội hình này.')
      await audit(tx, req, 'team.delete', id, { name: rows[0].name })
    })
    return respond(req, ['teams'])
  })
}

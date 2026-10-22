import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { DUNGEON_MAP, MODE_IDS } from '@/domain/constants'
import type { DungeonMode } from '@/domain/types'
import { requirePerm } from '../auth/context'
import * as s from '../db/schema'
import { badRequest } from '../lib/errors'
import { newId } from '../lib/ids'
import { audit, credit, getMember, idempotent, logActivity, respond } from './shared'

/** Module Phó bản — ghi nhận lượt clear; tiến độ boss được tính từ bảng clears (snapshot.ts). */

const REWARD_PER_SIZE: Record<DungeonMode, number> = { thuong: 5, 'anh-hung': 8, 'ac-mong': 12 }

const ClearBody = z.object({
  dungeonId: z.string().min(1),
  mode: z.enum(MODE_IDS as [DungeonMode, ...DungeonMode[]]),
  bossId: z.string().min(1),
  durationSec: z.number().int().min(30, 'Thời gian tối thiểu 30 giây.').max(7200, 'Thời gian tối đa 2 giờ.'),
  memberIds: z.array(z.string().min(1)).min(1, 'Đội phải có ít nhất 1 người.'),
  mvpId: z.string().min(1),
  wipes: z.number().int().min(0).max(50).default(0),
  date: z.string().datetime({ offset: true }).optional(),
})

export async function dungeonRoutes(app: FastifyInstance) {
  const { ctx } = app

  app.post('/api/clears', async (req, reply) =>
    idempotent(req, reply, async () => {
      const me = requirePerm(req, 'clear.record')
      const body = ClearBody.parse(req.body)
      const dungeon = DUNGEON_MAP[body.dungeonId]
      if (!dungeon) throw badRequest('Phó bản không tồn tại.')
      const boss = dungeon.bosses.find((b) => b.id === body.bossId)
      if (!boss) throw badRequest(`Boss này không thuộc ${dungeon.name}.`)
      const ids = body.memberIds
      if (new Set(ids).size !== ids.length) throw badRequest('Một người bị chọn hai lần trong đội.')
      if (ids.length > dungeon.size) throw badRequest(`${dungeon.name} chỉ cho phép tối đa ${dungeon.size} người.`)
      if (!ids.includes(body.mvpId)) throw badRequest('MVP phải là người trong đội.')
      const date = body.date ? new Date(body.date) : new Date()
      if (date.getTime() > Date.now() + 60_000) throw badRequest('Không thể ghi nhận lượt clear ở tương lai.')

      const result = await ctx.db.transaction(async (tx) => {
        const found = await tx
          .select({ id: s.members.id })
          .from(s.members)
          .where(and(eq(s.members.guildId, req.orgId), isNull(s.members.deletedAt), inArray(s.members.id, ids)))
        if (found.length !== ids.length) throw badRequest('Có người trong đội không còn ở trong bang.')
        const mvp = await getMember(tx, req.orgId, body.mvpId)

        const prev = await tx
          .select({ kills: sql<number>`count(*)::int`, best: sql<number | null>`min(${s.clears.durationSec})` })
          .from(s.clears)
          .where(
            and(eq(s.clears.guildId, req.orgId), eq(s.clears.dungeonId, dungeon.id), eq(s.clears.mode, body.mode), eq(s.clears.bossId, boss.id)),
          )
        const kills = prev[0]?.kills ?? 0
        const best = prev[0]?.best ?? null
        const firstKill = kills === 0
        const newRecord = best === null || body.durationSec < Number(best)

        const id = newId('c')
        await tx.insert(s.clears).values({
          id,
          guildId: req.orgId,
          dungeonId: dungeon.id,
          mode: body.mode,
          bossId: boss.id,
          date,
          durationSec: body.durationSec,
          memberIds: ids,
          mvpId: body.mvpId,
          wipes: body.wipes,
          createdBy: me.user.id,
        })
        const reward = dungeon.size * REWARD_PER_SIZE[body.mode]
        for (const memberId of ids) {
          await credit(tx, {
            guildId: req.orgId,
            memberId,
            delta: reward,
            reason: `Hạ ${boss.name} · ${dungeon.name}`,
            category: 'pho-ban',
            createdBy: me.user.id,
          })
        }
        if (firstKill) {
          await logActivity(tx, req.orgId, 'first-kill', `Bang hạ gục lần đầu ${boss.name} (${dungeon.name})!`, mvp.id)
        } else {
          await logActivity(tx, req.orgId, 'clear', `Đội của ${mvp.name} hạ ${boss.name} · ${dungeon.name}`, mvp.id)
        }
        await audit(tx, req, 'clear.create', id, body)
        return { firstKill, newRecord }
      })
      reply.code(201)
      return respond(req, ['progress', 'clears', 'members', 'ledger', 'activities'], result)
    }),
  )
}

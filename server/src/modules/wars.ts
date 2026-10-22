import { and, eq, inArray, isNull } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requirePerm } from '../auth/context'
import * as s from '../db/schema'
import { badRequest } from '../lib/errors'
import { newId } from '../lib/ids'
import { audit, credit, idempotent, logActivity, respond } from './shared'

/* ---------------- Kiểm tra đầu vào ---------------- */

const Int = z.number().int().min(0)

const WarLineZ = z.object({
  memberId: z.string().min(1),
  k: Int.max(9999),
  d: Int.max(9999),
  a: Int.max(9999),
  dmg: Int.max(1_000_000_000),
  heal: Int.max(1_000_000_000),
})

const NewWar = z
  .object({
    date: z.iso.datetime({ offset: true }),
    opponent: z.string().trim().min(2, 'Tên bang đối thủ cần ít nhất 2 ký tự.').max(40, 'Tên bang đối thủ tối đa 40 ký tự.'),
    result: z.enum(['win', 'lose', 'draw']),
    score: z.tuple([Int.max(99), Int.max(99)]),
    mode: z.enum(['bang-chien', 'cong-thanh']),
    mvpId: z.string().min(1),
    lines: z.array(WarLineZ).min(1, 'Cần ít nhất một người tham chiến.').max(60, 'Tối đa 60 người tham chiến.'),
  })
  .superRefine((w, ctx) => {
    const [ours, theirs] = w.score
    if (w.result === 'win' && ours <= theirs) ctx.addIssue({ code: 'custom', path: ['score'], message: 'Thắng thì điểm của ta phải cao hơn.' })
    if (w.result === 'lose' && ours >= theirs) ctx.addIssue({ code: 'custom', path: ['score'], message: 'Thua thì điểm của ta phải thấp hơn.' })
    if (w.result === 'draw' && ours !== theirs) ctx.addIssue({ code: 'custom', path: ['score'], message: 'Hòa thì hai bên bằng điểm.' })
    if (new Set(w.lines.map((l) => l.memberId)).size !== w.lines.length)
      ctx.addIssue({ code: 'custom', path: ['lines'], message: 'Một người chỉ được ghi một dòng chiến tích.' })
    if (!w.lines.some((l) => l.memberId === w.mvpId)) ctx.addIssue({ code: 'custom', path: ['mvpId'], message: 'MVP phải là người tham chiến.' })
  })

const RESULT_TEXT = { win: 'Thắng', lose: 'Thua', draw: 'Hòa' } as const

/* ---------------- Routes ---------------- */

export async function warRoutes(app: FastifyInstance) {
  const { ctx } = app

  app.post('/api/wars', async (req, reply) =>
    idempotent(req, reply, async () => {
      const me = requirePerm(req, 'war.record')
      const body = NewWar.parse(req.body)
      const date = new Date(body.date)
      if (date.getTime() > Date.now() + 3600000) throw badRequest('Thời gian trận đấu không được ở tương lai.')

      const id = await ctx.db.transaction(async (tx) => {
        const ids = body.lines.map((l) => l.memberId)
        const found = await tx
          .select({ id: s.members.id })
          .from(s.members)
          .where(and(eq(s.members.guildId, req.orgId), isNull(s.members.deletedAt), inArray(s.members.id, ids)))
        if (found.length !== ids.length) throw badRequest('Có người tham chiến không còn trong bang.')

        const id = newId('w')
        await tx.insert(s.wars).values({
          id,
          guildId: req.orgId,
          date,
          opponent: body.opponent,
          result: body.result,
          score: body.score,
          mvpId: body.mvpId,
          mode: body.mode,
          lines: body.lines,
          createdBy: me.user.id,
        })
        const reward = body.result === 'win' ? 200 : 120
        for (const l of body.lines) {
          await credit(tx, {
            guildId: req.orgId,
            memberId: l.memberId,
            delta: reward,
            reason: `Bang chiến vs ${body.opponent}`,
            category: 'bang-chien',
            createdBy: me.user.id,
          })
        }
        await logActivity(tx, req.orgId, 'war', `${RESULT_TEXT[body.result]} bang chiến trước ${body.opponent} (${body.score[0]} - ${body.score[1]})`, body.mvpId)
        await audit(tx, req, 'war.create', id, { opponent: body.opponent, result: body.result, score: body.score, lines: body.lines.length })
        return id
      })
      reply.code(201)
      return respond(req, ['wars', 'members', 'ledger', 'activities'], { id })
    }),
  )
}

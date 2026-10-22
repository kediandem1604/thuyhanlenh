import { and, eq, inArray, or } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { can } from '@/domain/permissions'
import type { BondType } from '@/domain/types'
import { requireMember } from '../auth/context'
import type { DbOrTx } from '../db/client'
import * as s from '../db/schema'
import { badRequest, forbidden, notFound } from '../lib/errors'
import { newId } from '../lib/ids'
import { audit, getMember, idempotent, logActivity, respond } from './shared'

/** Module Tình duyên — hợp đồng API: docs/superpowers/specs/2026-10-22-phase2-backend-design.md §7 */

const BOND_WORDS: Record<BondType, string> = {
  'phu-the': 'phu thê',
  'tri-ky': 'tri kỷ',
  'ket-nghia': 'huynh đệ kết nghĩa',
}

const CreateBody = z.object({
  aId: z.string().min(1),
  bId: z.string().min(1),
  type: z.enum(['phu-the', 'tri-ky', 'ket-nghia']),
  note: z.string().trim().max(200, 'Lời nhắn tối đa 200 ký tự.').default(''),
})

const IntimacyBody = z.object({ amount: z.number().int().min(1).max(999) })

async function getBond(tx: DbOrTx, guildId: string, id: string) {
  const rows = await tx
    .select()
    .from(s.bonds)
    .where(and(eq(s.bonds.id, id), eq(s.bonds.guildId, guildId)))
  const b = rows[0]
  if (!b) throw notFound('Không tìm thấy mối duyên này.')
  return b
}

export async function bondRoutes(app: FastifyInstance) {
  const { ctx } = app

  /* ---------------- Kết duyên ---------------- */
  app.post('/api/bonds', async (req, reply) =>
    idempotent(req, reply, async () => {
      const me = requireMember(req)
      const body = CreateBody.parse(req.body)
      const involved = body.aId === me.member.id || body.bId === me.member.id
      if (!(involved && can(me.rank, 'bond.self')) && !can(me.rank, 'bond.manage')) {
        throw forbidden('Chỉ được kết duyên cho chính mình (Trưởng Lão trở lên mới se duyên hộ người khác).')
      }
      if (body.aId === body.bId) throw badRequest('Hãy chọn hai người khác nhau.')
      const id = await ctx.db.transaction(async (tx) => {
        const a = await getMember(tx, req.orgId, body.aId)
        const b = await getMember(tx, req.orgId, body.bId)
        const existing = await tx
          .select({ id: s.bonds.id })
          .from(s.bonds)
          .where(
            and(
              eq(s.bonds.guildId, req.orgId),
              or(and(eq(s.bonds.aId, a.id), eq(s.bonds.bId, b.id)), and(eq(s.bonds.aId, b.id), eq(s.bonds.bId, a.id))),
            ),
          )
        if (existing.length) throw badRequest('Hai người này đã có quan hệ rồi.')
        if (body.type === 'phu-the') {
          const married = await tx
            .select({ id: s.bonds.id })
            .from(s.bonds)
            .where(
              and(
                eq(s.bonds.guildId, req.orgId),
                eq(s.bonds.type, 'phu-the'),
                or(inArray(s.bonds.aId, [a.id, b.id]), inArray(s.bonds.bId, [a.id, b.id])),
              ),
            )
          if (married.length) throw badRequest('Một trong hai người đã thành thân.')
        }
        const id = newId('b')
        await tx.insert(s.bonds).values({ id, guildId: req.orgId, aId: a.id, bId: b.id, type: body.type, since: new Date(), intimacy: 0, note: body.note })
        await logActivity(tx, req.orgId, 'bond', `${a.name} và ${b.name} kết thành ${BOND_WORDS[body.type]}`, a.id)
        await audit(tx, req, 'bond.create', id, body)
        return id
      })
      reply.code(201)
      return respond(req, ['bonds', 'activities'], { id })
    }),
  )

  /* ---------------- Tặng hoa (thân mật) ---------------- */
  app.post('/api/bonds/:id/intimacy', async (req) => {
    const me = requireMember(req)
    const { id } = req.params as { id: string }
    const { amount } = IntimacyBody.parse(req.body)
    await ctx.db.transaction(async (tx) => {
      const bond = await getBond(tx, req.orgId, id)
      const involved = bond.aId === me.member.id || bond.bId === me.member.id
      if (!involved && !can(me.rank, 'bond.manage')) throw forbidden('Chỉ người trong cuộc mới tặng hoa được.')
      await tx
        .update(s.bonds)
        .set({ intimacy: bond.intimacy + amount })
        .where(eq(s.bonds.id, id))
      await audit(tx, req, 'bond.intimacy', id, { amount })
    })
    return respond(req, ['bonds'])
  })

  /* ---------------- Giải trừ ---------------- */
  app.delete('/api/bonds/:id', async (req) => {
    const me = requireMember(req)
    const { id } = req.params as { id: string }
    await ctx.db.transaction(async (tx) => {
      const bond = await getBond(tx, req.orgId, id)
      const involved = bond.aId === me.member.id || bond.bId === me.member.id
      if (!involved && !can(me.rank, 'bond.manage')) throw forbidden('Chỉ người trong cuộc (hoặc Trưởng Lão trở lên) được giải trừ.')
      await tx.delete(s.bonds).where(eq(s.bonds.id, id))
      await audit(tx, req, 'bond.remove', id, { aId: bond.aId, bId: bond.bId, type: bond.type })
    })
    return respond(req, ['bonds'])
  })
}

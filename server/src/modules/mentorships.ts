import { and, eq, sql } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { MENTOR_TASK_TEMPLATES } from '@/domain/constants'
import { can } from '@/domain/permissions'
import type { MentorshipStage } from '@/domain/types'
import { requireMember } from '../auth/context'
import type { DbOrTx } from '../db/client'
import * as s from '../db/schema'
import { badRequest, forbidden, notFound } from '../lib/errors'
import { newId } from '../lib/ids'
import { audit, credit, getMember, idempotent, logActivity, respond } from './shared'

/** Module Sư đồ — hợp đồng API: docs/superpowers/specs/2026-10-22-phase2-backend-design.md §7 */

const CreateBody = z.object({ masterId: z.string().min(1), discipleId: z.string().min(1) })
const TaskBody = z.object({ done: z.boolean() })

type MentorshipRow = typeof s.mentorships.$inferSelect

async function getMentorship(tx: DbOrTx, guildId: string, id: string) {
  const rows = await tx
    .select()
    .from(s.mentorships)
    .where(and(eq(s.mentorships.id, id), eq(s.mentorships.guildId, guildId)))
  const ms = rows[0]
  if (!ms) throw notFound('Không tìm thấy quan hệ sư đồ.')
  return ms
}

/** Sư phụ (hoặc người có mentor.manage) mới được điều hành cặp này. */
function assertMaster(me: ReturnType<typeof requireMember>, ms: MentorshipRow) {
  if (ms.masterId === me.member.id) return
  if (can(me.rank, 'mentor.manage')) return
  throw forbidden('Chỉ sư phụ của cặp này (hoặc Trưởng Lão trở lên) được làm việc này.')
}

function assertActive(ms: MentorshipRow) {
  if (ms.status !== 'active') throw badRequest('Cặp sư đồ này đã xuất sư, không thể thay đổi nữa.')
}

export async function mentorshipRoutes(app: FastifyInstance) {
  const { ctx } = app

  const loadForMaster = async (tx: DbOrTx, req: FastifyRequest, id: string) => {
    const me = requireMember(req)
    const ms = await getMentorship(tx, req.orgId, id)
    assertMaster(me, ms)
    return { me, ms }
  }

  /* ---------------- Bái sư ---------------- */
  app.post('/api/mentorships', async (req, reply) =>
    idempotent(req, reply, async () => {
      const me = requireMember(req)
      const body = CreateBody.parse(req.body)
      const isMaster = body.masterId === me.member.id
      if (!(isMaster && can(me.rank, 'mentor.take')) && !can(me.rank, 'mentor.manage')) {
        throw forbidden(
          isMaster
            ? 'Cần chức vụ Tinh Anh trở lên mới được nhận đồ đệ.'
            : 'Chỉ được tự nhận đồ đệ cho mình (Trưởng Lão trở lên mới ghép cặp hộ người khác).',
        )
      }
      if (body.masterId === body.discipleId) throw badRequest('Không thể tự bái mình làm sư phụ.')
      const id = await ctx.db.transaction(async (tx) => {
        const master = await getMember(tx, req.orgId, body.masterId)
        const disciple = await getMember(tx, req.orgId, body.discipleId)
        const discipleActive = await tx
          .select({ id: s.mentorships.id })
          .from(s.mentorships)
          .where(and(eq(s.mentorships.discipleId, disciple.id), eq(s.mentorships.status, 'active')))
        if (discipleActive.length) throw badRequest('Người này đang có sư phụ rồi.')
        const masterActive = await tx
          .select({ n: sql<number>`count(*)::int` })
          .from(s.mentorships)
          .where(and(eq(s.mentorships.masterId, master.id), eq(s.mentorships.status, 'active')))
        if ((masterActive[0]?.n ?? 0) >= 3) throw badRequest('Sư phụ đã nhận đủ 3 đồ đệ đang học.')
        const id = newId('ms')
        await tx.insert(s.mentorships).values({
          id,
          guildId: req.orgId,
          masterId: master.id,
          discipleId: disciple.id,
          stage: 0,
          status: 'active',
          startedAt: new Date(),
          bond: 0,
          tasks: MENTOR_TASK_TEMPLATES.map((t, i) => ({ id: `t${i}`, label: t.label, stage: t.stage, done: false })),
        })
        await logActivity(tx, req.orgId, 'mentor', `${master.name} nhận ${disciple.name} làm đồ đệ`, master.id)
        await audit(tx, req, 'mentorship.create', id, body)
        return id
      })
      reply.code(201)
      return respond(req, ['mentorships', 'activities'], { id })
    }),
  )

  /* ---------------- Tick nhiệm vụ ---------------- */
  app.patch('/api/mentorships/:id/tasks/:taskId', async (req) => {
    const me = requireMember(req)
    const { id, taskId } = req.params as { id: string; taskId: string }
    const { done } = TaskBody.parse(req.body)
    await ctx.db.transaction(async (tx) => {
      const ms = await getMentorship(tx, req.orgId, id)
      const involved = ms.masterId === me.member.id || ms.discipleId === me.member.id
      if (!involved && !can(me.rank, 'mentor.manage')) throw forbidden('Chỉ sư phụ, đồ đệ (hoặc Trưởng Lão trở lên) được đánh dấu nhiệm vụ.')
      assertActive(ms)
      const task = ms.tasks.find((t) => t.id === taskId)
      if (!task) throw notFound('Không tìm thấy nhiệm vụ.')
      if (task.done === done) return
      await tx
        .update(s.mentorships)
        .set({
          bond: ms.bond + (done ? 120 : -120),
          tasks: ms.tasks.map((t) => (t.id === taskId ? { ...t, done } : t)),
        })
        .where(eq(s.mentorships.id, id))
      await audit(tx, req, 'mentorship.task', id, { taskId, done })
    })
    return respond(req, ['mentorships'])
  })

  /* ---------------- Thăng giai đoạn ---------------- */
  app.post('/api/mentorships/:id/advance', async (req) => {
    const { id } = req.params as { id: string }
    await ctx.db.transaction(async (tx) => {
      const { ms } = await loadForMaster(tx, req, id)
      assertActive(ms)
      if (ms.stage >= 4) throw badRequest('Đã ở giai đoạn cuối, hãy cử hành lễ xuất sư.')
      const pending = ms.tasks.filter((t) => t.stage === ms.stage && !t.done)
      if (pending.length) throw badRequest(`Còn ${pending.length} nhiệm vụ chưa xong ở giai đoạn này.`)
      await tx
        .update(s.mentorships)
        .set({ stage: (ms.stage + 1) as MentorshipStage, bond: ms.bond + 300 })
        .where(eq(s.mentorships.id, id))
      await audit(tx, req, 'mentorship.advance', id, { from: ms.stage, to: ms.stage + 1 })
    })
    return respond(req, ['mentorships'])
  })

  /* ---------------- Lễ xuất sư ---------------- */
  app.post('/api/mentorships/:id/graduate', async (req) => {
    const { id } = req.params as { id: string }
    await ctx.db.transaction(async (tx) => {
      const { me, ms } = await loadForMaster(tx, req, id)
      assertActive(ms)
      if (ms.stage < 4 || ms.tasks.some((t) => !t.done)) throw badRequest('Đồ đệ cần hoàn thành mọi nhiệm vụ trước khi xuất sư.')
      const master = await getMember(tx, req.orgId, ms.masterId)
      const disciple = await getMember(tx, req.orgId, ms.discipleId)
      await tx
        .update(s.mentorships)
        .set({ status: 'graduated', graduatedAt: new Date(), bond: ms.bond + 1000 })
        .where(eq(s.mentorships.id, id))
      await credit(tx, {
        guildId: req.orgId,
        memberId: master.id,
        delta: 500,
        reason: `Đồ đệ ${disciple.name} xuất sư`,
        category: 'nhiem-vu',
        createdBy: me.user.id,
      })
      await credit(tx, { guildId: req.orgId, memberId: disciple.id, delta: 300, reason: 'Lễ xuất sư', category: 'nhiem-vu', createdBy: me.user.id })
      await logActivity(tx, req.orgId, 'graduate', `${disciple.name} chính thức xuất sư dưới trướng ${master.name}`, disciple.id)
      await audit(tx, req, 'mentorship.graduate', id)
    })
    return respond(req, ['mentorships', 'members', 'ledger', 'activities'])
  })

  /* ---------------- Giải tán ---------------- */
  app.delete('/api/mentorships/:id', async (req) => {
    const { id } = req.params as { id: string }
    await ctx.db.transaction(async (tx) => {
      const { ms } = await loadForMaster(tx, req, id)
      await tx.delete(s.mentorships).where(eq(s.mentorships.id, id))
      await audit(tx, req, 'mentorship.dissolve', id, { masterId: ms.masterId, discipleId: ms.discipleId })
    })
    return respond(req, ['mentorships'])
  })
}

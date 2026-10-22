import { and, eq, ne, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { EVENT_TYPES } from '@/domain/constants'
import { eventTypesFor } from '@/domain/orgs'
import { can } from '@/domain/permissions'
import type { EventType } from '@/domain/types'
import { requireMember, requirePerm, typeOf } from '../auth/context'
import { orgFeatures } from '../orgs'
import type { DbOrTx } from '../db/client'
import * as s from '../db/schema'
import { badRequest, conflict, forbidden, notFound } from '../lib/errors'
import { newId } from '../lib/ids'
import { audit, getMember, idempotent, logActivity, respond } from './shared'

/** Module Sự kiện — lịch hoạt động bang + điểm danh. */

const EVENT_TYPE_IDS = Object.keys(EVENT_TYPES) as [EventType, ...EventType[]]

const EventBody = z.object({
  type: z.enum(EVENT_TYPE_IDS),
  title: z.string().trim().min(2, 'Tên sự kiện cần ít nhất 2 ký tự.').max(80, 'Tên sự kiện tối đa 80 ký tự.'),
  start: z.string().datetime({ offset: true }),
  durationMin: z.number().int().min(15, 'Thời lượng tối thiểu 15 phút.').max(600, 'Thời lượng tối đa 600 phút.'),
  location: z.string().trim().max(80).default(''),
  leaderId: z.string().min(1),
  capacity: z.number().int().min(1, 'Sức chứa tối thiểu 1 người.').max(200, 'Sức chứa tối đa 200 người.'),
  note: z.string().trim().max(300).default(''),
})

const RsvpBody = z.object({
  status: z.enum(['yes', 'maybe', 'no']).nullable(),
  memberId: z.string().min(1).optional(),
})

async function getEvent(tx: DbOrTx, guildId: string, id: string) {
  const rows = await tx
    .select()
    .from(s.events)
    .where(and(eq(s.events.id, id), eq(s.events.guildId, guildId)))
  const ev = rows[0]
  if (!ev) throw notFound('Không tìm thấy sự kiện này.')
  return ev
}

export async function eventRoutes(app: FastifyInstance) {
  const { ctx } = app

  app.post('/api/events', async (req, reply) =>
    idempotent(req, reply, async () => {
      const me = requirePerm(req, 'event.manage')
      const body = EventBody.parse(req.body)
      if (!eventTypesFor(typeOf(req), req.org ? orgFeatures(req.org) : []).includes(body.type))
        throw badRequest(typeOf(req) === 'kimlan' ? 'Kim Lan chỉ hẹn lịch phó bản hoặc boss.' : `Tổ chức này không có loại sự kiện “${EVENT_TYPES[body.type].name}”.`)
      const start = new Date(body.start)
      const id = await ctx.db.transaction(async (tx) => {
        const leader = await getMember(tx, req.orgId, body.leaderId)
        const id = newId('ev')
        await tx.insert(s.events).values({
          id,
          guildId: req.orgId,
          type: body.type,
          title: body.title,
          start,
          durationMin: body.durationMin,
          location: body.location,
          leaderId: leader.id,
          capacity: body.capacity,
          note: body.note,
          createdBy: me.user.id,
        })
        await tx.insert(s.eventRsvps).values({ eventId: id, memberId: leader.id, status: 'yes', updatedAt: new Date() })
        await logActivity(tx, req.orgId, 'event', `Sự kiện mới: ${body.title}`, leader.id)
        await audit(tx, req, 'event.create', id, body)
        return id
      })
      reply.code(201)
      return respond(req, ['events', 'activities'], { id })
    }),
  )

  app.delete('/api/events/:id', async (req) => {
    const me = requireMember(req)
    const { id } = req.params as { id: string }
    await ctx.db.transaction(async (tx) => {
      const ev = await getEvent(tx, req.orgId, id)
      if (ev.createdBy !== me.user.id && !can(me.rank, 'event.manage')) throw forbidden('Chỉ người tạo hoặc Đường Chủ trở lên mới xóa được sự kiện.')
      await tx.delete(s.events).where(eq(s.events.id, id))
      await audit(tx, req, 'event.delete', id, { title: ev.title })
    })
    return respond(req, ['events'])
  })

  app.put('/api/events/:id/rsvp', async (req) => {
    const me = requirePerm(req, 'event.rsvp')
    const { id } = req.params as { id: string }
    const body = RsvpBody.parse(req.body)
    const memberId = body.memberId ?? me.member.id
    if (memberId !== me.member.id && !can(me.rank, 'event.manage')) throw forbidden('Chỉ Đường Chủ trở lên mới điểm danh hộ người khác.')
    await ctx.db.transaction(async (tx) => {
      const ev = await getEvent(tx, req.orgId, id)
      if (ev.start.getTime() + ev.durationMin * 60_000 < Date.now()) throw badRequest('Sự kiện đã kết thúc.')
      await getMember(tx, req.orgId, memberId)
      if (body.status === null) {
        await tx.delete(s.eventRsvps).where(and(eq(s.eventRsvps.eventId, id), eq(s.eventRsvps.memberId, memberId)))
      } else {
        if (body.status === 'yes') {
          const rows = await tx
            .select({ n: sql<number>`count(*)::int` })
            .from(s.eventRsvps)
            .where(and(eq(s.eventRsvps.eventId, id), eq(s.eventRsvps.status, 'yes'), ne(s.eventRsvps.memberId, memberId)))
          if ((rows[0]?.n ?? 0) >= ev.capacity) throw conflict('Sự kiện đã đủ người.')
        }
        await tx
          .insert(s.eventRsvps)
          .values({ eventId: id, memberId, status: body.status, updatedAt: new Date() })
          .onConflictDoUpdate({ target: [s.eventRsvps.eventId, s.eventRsvps.memberId], set: { status: body.status, updatedAt: new Date() } })
      }
      await audit(tx, req, 'event.rsvp', id, { memberId, status: body.status })
    })
    return respond(req, ['events'])
  })
}

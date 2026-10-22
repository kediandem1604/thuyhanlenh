import { and, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requirePerm } from '../auth/context'
import type { DbOrTx } from '../db/client'
import * as s from '../db/schema'
import { notFound } from '../lib/errors'
import { newId } from '../lib/ids'
import { audit, idempotent, respond } from './shared'

const NewAnnouncement = z.object({
  title: z.string().trim().min(3, 'Tiêu đề cần ít nhất 3 ký tự.').max(120, 'Tiêu đề tối đa 120 ký tự.'),
  body: z.string().trim().min(1, 'Nội dung không được để trống.').max(2000, 'Nội dung tối đa 2000 ký tự.'),
  tag: z.enum(['thong-bao', 'su-kien', 'quy-dinh', 'vinh-danh']),
})

async function getAnnouncement(tx: DbOrTx, guildId: string, id: string) {
  const rows = await tx
    .select()
    .from(s.announcements)
    .where(and(eq(s.announcements.id, id), eq(s.announcements.guildId, guildId)))
  if (!rows[0]) throw notFound('Không tìm thấy cáo thị này.')
  return rows[0]
}

/** Module Bảng cáo thị — Trưởng Lão trở lên đăng / ghim / gỡ. */
export async function announcementRoutes(app: FastifyInstance) {
  const { ctx } = app

  app.post('/api/announcements', async (req, reply) =>
    idempotent(req, reply, async () => {
      const me = requirePerm(req, 'announce.manage')
      const body = NewAnnouncement.parse(req.body)
      const id = await ctx.db.transaction(async (tx) => {
        const id = newId('an')
        await tx.insert(s.announcements).values({ id, guildId: req.orgId, ...body, authorId: me.member.id, date: new Date(), pinned: false })
        await audit(tx, req, 'announcement.create', id, body)
        return id
      })
      reply.code(201)
      return respond(req, ['announcements'], { id })
    }),
  )

  app.patch('/api/announcements/:id/pin', async (req) => {
    requirePerm(req, 'announce.manage')
    const { id } = req.params as { id: string }
    await ctx.db.transaction(async (tx) => {
      const current = await getAnnouncement(tx, req.orgId, id)
      await tx.update(s.announcements).set({ pinned: !current.pinned }).where(eq(s.announcements.id, id))
      await audit(tx, req, 'announcement.pin', id, { pinned: !current.pinned })
    })
    return respond(req, ['announcements'])
  })

  app.delete('/api/announcements/:id', async (req) => {
    requirePerm(req, 'announce.manage')
    const { id } = req.params as { id: string }
    await ctx.db.transaction(async (tx) => {
      const current = await getAnnouncement(tx, req.orgId, id)
      await tx.delete(s.announcements).where(eq(s.announcements.id, id))
      await audit(tx, req, 'announcement.delete', id, { title: current.title })
    })
    return respond(req, ['announcements'])
  })
}

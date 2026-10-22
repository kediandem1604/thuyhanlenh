import type { FastifyInstance } from 'fastify'
import { SLICES } from '@/domain/api'
import type { SeedData } from '@/data/seed'
import { generateAllSeeds } from '@/data/seedOrgs'
import { requireMember, requirePerm } from '../auth/context'
import { importOrgs } from '../db/importer'
import { notFound } from '../lib/errors'
import { buildSnapshot, parseSlices } from '../snapshot'
import { audit } from './shared'

export async function coreRoutes(app: FastifyInstance) {
  const { ctx } = app

  /** Ảnh chụp dữ liệu bang (mặc định mọi slice; `?slices=members,ledger` để lấy một phần). */
  app.get('/api/snapshot', async (req) => {
    requireMember(req)
    const slices = parseSlices((req.query as { slices?: string }).slices)
    return buildSnapshot(ctx.db, req.orgId, slices, { online: ctx.hub.onlineCharacters() })
  })

  /** Xuất toàn bộ dữ liệu bang dạng SeedData (sao lưu / chuyển máy chủ). */
  app.get('/api/export', async (req, reply) => {
    const me = requirePerm(req, 'recruit.review')
    const snap = await buildSnapshot(ctx.db, req.orgId, SLICES, { online: ctx.hub.onlineCharacters() })
    const data: SeedData = { currentUserId: me.member.id, ...(snap as Omit<SeedData, 'currentUserId'>) }
    await audit(ctx.db, req, 'guild.export')
    const stamp = new Date().toISOString().slice(0, 10)
    reply.header('content-disposition', `attachment; filename="thuy-han-lenh-${stamp}.json"`)
    return data
  })

  /** Nạp lại toàn bộ dữ liệu demo — mọi tổ chức (chỉ khi bật đăng nhập thử). Giữ liên kết tài khoản ↔ nhân vật. */
  app.post('/api/dev/reset', async (req) => {
    if (!ctx.config.devLogin) throw notFound('Chức năng chỉ có ở chế độ dev.')
    requireMember(req)
    await importOrgs(ctx.db, generateAllSeeds(), { reset: true })
    const snapshot = await buildSnapshot(ctx.db, req.orgId, SLICES, { online: ctx.hub.onlineCharacters() })
    ctx.hub.invalidateAll([...SLICES])
    return { ok: true, snapshot }
  })
}

import { and, eq, isNull, sql } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { IDEMPOTENCY_HEADER, type ApiOkBody, type Slice } from '@/domain/api'
import type { Activity, LedgerEntry } from '@/domain/types'
import type { DbOrTx } from '../db/client'
import * as s from '../db/schema'
import { notFound } from '../lib/errors'
import { newId } from '../lib/ids'
import { buildSnapshot } from '../snapshot'
import { loadOrg, orgHas } from '../orgs'
import type { MemberRow } from '../auth/context'

/*
 * Bộ công cụ chung cho các module nghiệp vụ.
 *
 * Khuôn một route ghi:
 *   app.post('/api/x', async (req, reply) =>
 *     idempotent(req, reply, async () => {
 *       const me = requirePerm(req, 'x.y')
 *       const body = XBody.parse(req.body)
 *       const result = await app.ctx.db.transaction(async (tx) => { ...; await logActivity(tx, …); await audit(tx, req, 'x.create', id, body) })
 *       return respond(req, ['slice-a', 'slice-b'], result)
 *     }))
 */

/** Ghi một dòng nhật ký bang (hiện ở Tổng quan + chuông thông báo). */
export async function logActivity(tx: DbOrTx, guildId: string, type: Activity['type'], text: string, memberId?: string | null) {
  await tx.insert(s.activities).values({ id: newId('act'), guildId, type, text, memberId: memberId ?? null, date: new Date() })
}

/** Ghi bút toán cống hiến (append-only). delta = 0, hoặc tổ chức không có Quỹ (bang-kho), thì bỏ qua. */
export async function credit(
  tx: DbOrTx,
  e: { guildId: string; memberId: string; delta: number; reason: string; category: LedgerEntry['category']; createdBy?: string | null },
) {
  if (!e.delta) return
  const org = await loadOrg(tx, e.guildId)
  if (org && !orgHas(org, 'bang-kho')) return
  await tx.insert(s.ledgerEntries).values({
    id: newId('l'),
    guildId: e.guildId,
    memberId: e.memberId,
    delta: Math.round(e.delta),
    reason: e.reason,
    category: e.category,
    createdBy: e.createdBy ?? null,
    date: new Date(),
  })
}

/** Số dư cống hiến hiện tại = SUM(delta). */
export async function balanceOf(tx: DbOrTx, memberId: string) {
  const rows = await tx
    .select({ balance: sql<number>`coalesce(sum(${s.ledgerEntries.delta}), 0)::int` })
    .from(s.ledgerEntries)
    .where(eq(s.ledgerEntries.memberId, memberId))
  return rows[0]?.balance ?? 0
}

/** Ghi vết ai đã làm gì (mọi thao tác ghi). */
export async function audit(tx: DbOrTx, req: FastifyRequest, action: string, target?: string | null, payload?: unknown) {
  await tx.insert(s.auditLog).values({
    id: newId('aud'),
    guildId: req.orgId,
    userId: req.auth?.user.id ?? null,
    action,
    target: target ?? null,
    payload: (payload ?? null) as never,
    at: new Date(),
  })
}

/** Lấy thành viên đang ở trong tổ chức (kèm tên / lưu phái / chủ tài khoản của nhân vật) hoặc 404. */
export async function getMember(tx: DbOrTx, guildId: string, id: string): Promise<MemberRow> {
  const rows = await tx
    .select({ m: s.members, c: s.characters })
    .from(s.members)
    .innerJoin(s.characters, eq(s.members.characterId, s.characters.id))
    .where(and(eq(s.members.id, id), eq(s.members.guildId, guildId), isNull(s.members.deletedAt)))
  const r = rows[0]
  if (!r) throw notFound('Không tìm thấy thành viên này trong tổ chức.')
  return { ...r.m, name: r.c.name, classId: r.c.classId, level: r.c.level, power: r.c.power, userId: r.c.userId }
}

export async function memberName(tx: DbOrTx, id: string) {
  const rows = await tx
    .select({ name: s.characters.name })
    .from(s.members)
    .innerJoin(s.characters, eq(s.members.characterId, s.characters.id))
    .where(eq(s.members.id, id))
  return rows[0]?.name ?? '???'
}

/**
 * Phản hồi chuẩn cho route ghi: dựng lại các slice bị ảnh hưởng (SAU khi transaction đã commit),
 * báo các máy khác qua WebSocket, trả `{ ok, result, snapshot }`.
 */
export async function respond<T>(req: FastifyRequest, slices: Slice[], result?: T): Promise<ApiOkBody<T>> {
  const { ctx } = req.server
  const snapshot = await buildSnapshot(ctx.db, req.orgId, slices, { online: ctx.hub.onlineCharacters() })
  ctx.hub.invalidate(req.orgId, slices, req.auth?.member?.id ?? null, req.clientId)
  return { ok: true, result, snapshot }
}

/**
 * Idempotency-Key: gửi lại cùng key → trả lại đúng phản hồi lần đầu, không ghi trùng.
 * Chỉ lưu phản hồi thành công.
 */
export async function idempotent<T>(req: FastifyRequest, reply: FastifyReply, run: () => Promise<T>): Promise<T> {
  const raw = req.headers[IDEMPOTENCY_HEADER]
  const key = typeof raw === 'string' && raw.length <= 100 ? raw : null
  if (!key) return run()
  const { db } = req.server.ctx
  const userId = req.auth?.user.id ?? 'anonymous'
  const found = await db
    .select()
    .from(s.idempotencyKeys)
    .where(and(eq(s.idempotencyKeys.userId, userId), eq(s.idempotencyKeys.key, key)))
  if (found[0]) {
    reply.code(found[0].statusCode).header('idempotent-replay', 'true')
    return found[0].response as T
  }
  const result = await run()
  await db
    .insert(s.idempotencyKeys)
    .values({ userId, key, route: `${req.method} ${req.routeOptions.url ?? req.url}`, statusCode: reply.statusCode || 200, response: result as never })
    .onConflictDoNothing()
  return result
}

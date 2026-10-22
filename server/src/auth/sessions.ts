import { eq } from 'drizzle-orm'
import type { FastifyReply } from 'fastify'
import type { Db } from '../db/client'
import * as s from '../db/schema'
import { newId, randomToken, sha256 } from '../lib/ids'

export const SESSION_COOKIE = 'thl_session'
const TTL_MS = 30 * 86400000
const REFRESH_BELOW_MS = 15 * 86400000

/** Tạo phiên: cookie giữ token thô, CSDL chỉ giữ SHA-256 của token. */
export async function createSession(db: Db, userId: string, userAgent?: string) {
  const token = randomToken(32)
  const expiresAt = new Date(Date.now() + TTL_MS)
  await db.insert(s.sessions).values({ id: newId('ses'), tokenHash: sha256(token), userId, expiresAt, userAgent: userAgent?.slice(0, 300) })
  return { token, expiresAt }
}

/** Tìm phiên còn hạn; tự gia hạn khi còn dưới 15 ngày. */
export async function findSession(db: Db, token: string) {
  const rows = await db
    .select({ session: s.sessions, user: s.users })
    .from(s.sessions)
    .innerJoin(s.users, eq(s.sessions.userId, s.users.id))
    .where(eq(s.sessions.tokenHash, sha256(token)))
  const row = rows[0]
  if (!row) return null
  const now = Date.now()
  if (row.session.expiresAt.getTime() <= now) {
    await db.delete(s.sessions).where(eq(s.sessions.id, row.session.id))
    return null
  }
  let refreshed: Date | null = null
  if (row.session.expiresAt.getTime() - now < REFRESH_BELOW_MS) {
    refreshed = new Date(now + TTL_MS)
    await db.update(s.sessions).set({ expiresAt: refreshed }).where(eq(s.sessions.id, row.session.id))
  }
  return { ...row, refreshed }
}

export async function revokeSession(db: Db, token: string) {
  await db.delete(s.sessions).where(eq(s.sessions.tokenHash, sha256(token)))
}

export function setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date, secure: boolean) {
  reply.setCookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure, path: '/', expires: expiresAt })
}

export function clearSessionCookie(reply: FastifyReply, secure: boolean) {
  reply.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure, path: '/' })
}

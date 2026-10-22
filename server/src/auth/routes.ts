import { and, asc, desc, eq, isNull, ne } from 'drizzle-orm'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import type { AuthProviders, Me, OrgMembership } from '@/domain/api'
import { RANKS } from '@/domain/constants'
import { kimlanHonorific } from '@/domain/orgs'
import type { ClassId, RankId } from '@/domain/types'
import * as s from '../db/schema'
import type { Db } from '../db/client'
import { conflict, notFound } from '../lib/errors'
import { newId, randomToken } from '../lib/ids'
import { memberCount, toOrgInfo } from '../orgs'
import { applicationRowToDomain, buildSnapshot } from '../snapshot'
import { logActivity } from '../modules/shared'
import { createMember } from '../modules/members'
import { requireUser } from './context'
import { authorizeUrl, DiscordAuthError, discordAvatarUrl, fetchDiscordUser, type DiscordUser } from './discord'
import { isSystemAdmin } from '../modules/admin'
import { clearSessionCookie, createSession, revokeSession, setSessionCookie } from './sessions'

const OAUTH_COOKIE = 'thl_oauth'

/** Chỉ cho chuyển về đường dẫn nội bộ (chống open redirect). */
function safeNext(next: unknown) {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

export async function authRoutes(app: FastifyInstance) {
  const { config } = app.ctx
  const db = () => app.ctx.db

  const startSession = async (reply: FastifyReply, userId: string, ua?: string) => {
    const { token, expiresAt } = await createSession(db(), userId, ua)
    setSessionCookie(reply, token, expiresAt, config.secureCookies)
    await db().update(s.users).set({ lastLoginAt: new Date() }).where(eq(s.users.id, userId))
  }

  /* ---------------- Cách đăng nhập đang bật ---------------- */
  app.get('/auth/providers', async (): Promise<AuthProviders> => {
    const out: AuthProviders = { discord: !!config.discord, dev: config.devLogin }
    if (config.devLogin) {
      // đăng nhập thử theo NHÂN VẬT (một nhân vật có thể ở nhiều tổ chức)
      const rows = await db()
        .select({ m: s.members, c: s.characters, isDev: s.users.isDev, orgName: s.guilds.name, orgType: s.guilds.type })
        .from(s.members)
        .innerJoin(s.characters, eq(s.members.characterId, s.characters.id))
        .innerJoin(s.guilds, eq(s.members.guildId, s.guilds.id))
        .leftJoin(s.users, eq(s.characters.userId, s.users.id))
        .where(isNull(s.members.deletedAt))
        .orderBy(asc(s.members.joinedAt))
      const byChar = new Map<string, NonNullable<AuthProviders['devMembers']>[number] & { order: number }>()
      for (const { m, c, isDev, orgName, orgType } of rows) {
        const order = RANKS[m.rank as RankId].order + (orgType === 'guild' ? 0 : 0.5)
        const prev = byChar.get(c.id)
        if (prev) {
          prev.orgs = `${prev.orgs} · ${orgName}`
          if (order < prev.order) Object.assign(prev, { rank: m.rank, order })
          continue
        }
        byChar.set(c.id, {
          id: c.id,
          name: c.name,
          classId: c.classId as ClassId,
          rank: m.rank as RankId,
          look: c.look,
          claimed: !!c.userId && isDev === false,
          orgs: orgName,
          order,
        })
      }
      out.devMembers = [...byChar.values()].sort((a, b) => a.order - b.order).map(({ order: _o, ...rest }) => (void _o, rest))
    }
    return out
  })

  /* ---------------- Đăng nhập thử (chế độ dev) ---------------- */
  const DevLogin = z.union([
    z.object({ characterId: z.string().min(1) }),
    z.object({ memberId: z.string().min(1) }),
    z.object({ guestName: z.string().trim().min(2).max(32) }),
  ])

  app.post('/auth/dev/login', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req, reply) => {
    if (!config.devLogin) throw notFound('Đăng nhập thử đã tắt.')
    const body = DevLogin.parse(req.body)
    if ('guestName' in body) {
      // khách chưa có nhân vật → để thử Sảnh Giang Hồ
      const id = newId('dev_guest')
      await db().insert(s.users).values({ id, username: body.guestName, displayName: body.guestName, isDev: true })
      await startSession(reply, id, req.headers['user-agent'])
      return { ok: true }
    }
    // memberId (tư cách thành viên) → nhân vật của nó
    let characterId = 'characterId' in body ? body.characterId : null
    if ('memberId' in body) {
      const m = await db().select({ characterId: s.members.characterId }).from(s.members).where(eq(s.members.id, body.memberId))
      characterId = m[0]?.characterId ?? null
    }
    const rows = characterId
      ? await db().select({ c: s.characters, u: s.users }).from(s.characters).leftJoin(s.users, eq(s.characters.userId, s.users.id)).where(eq(s.characters.id, characterId))
      : []
    const row = rows[0]
    if (!row) throw notFound('Không tìm thấy nhân vật.')
    if (row.u && !row.u.isDev) throw conflict('Nhân vật này đã gắn với một tài khoản Discord.')
    const userId = row.u?.id ?? `dev_${row.c.id}`
    await db()
      .insert(s.users)
      .values({ id: userId, username: row.c.name, displayName: row.c.name, isDev: true })
      .onConflictDoUpdate({ target: s.users.id, set: { displayName: row.c.name } })
    if (!row.c.userId) await db().update(s.characters).set({ userId }).where(eq(s.characters.id, row.c.id))
    await startSession(reply, userId, req.headers['user-agent'])
    return { ok: true }
  })

  /* ---------------- Discord OAuth2 ---------------- */
  app.get('/auth/discord/login', async (req, reply) => {
    if (!config.discord) throw notFound('Máy chủ chưa cấu hình đăng nhập Discord.')
    const state = randomToken(16)
    const next = safeNext((req.query as { next?: string }).next)
    reply.setCookie(OAUTH_COOKIE, `${state}|${next}`, { httpOnly: true, sameSite: 'lax', secure: config.secureCookies, path: '/auth', maxAge: 600 })
    return reply.redirect(authorizeUrl(config.discord.clientId, config.discord.redirectUri, state))
  })

  app.get('/auth/discord/callback', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req, reply) => {
    if (!config.discord) throw notFound('Máy chủ chưa cấu hình đăng nhập Discord.')
    const q = req.query as { code?: string; state?: string; error?: string }
    const [state, next] = (req.cookies[OAUTH_COOKIE] ?? '').split('|')
    reply.clearCookie(OAUTH_COOKIE, { path: '/auth' })
    const back = (path: string) => reply.redirect(`${config.webOrigin}${path}`)
    if (q.error) return back('/?login_error=denied')
    if (!q.code || !q.state || !state || q.state !== state) return back('/?login_error=state')

    let du: DiscordUser
    try {
      du = await fetchDiscordUser(app.ctx.fetch, config.discord, q.code)
    } catch (err) {
      if (!(err instanceof DiscordAuthError)) throw err
      // ghi rõ Discord trả lời gì (không có bí mật) rồi đưa người dùng về trang đăng nhập với lời nhắn dễ hiểu
      req.log.warn({ reason: err.reason, status: err.status, detail: err.detail, viaProxy: !!config.discord.apiBase }, 'đăng nhập Discord thất bại')
      const kind = err.reason === 'invalid_client' ? 'config' : err.reason === 'invalid_grant' ? 'expired' : 'discord'
      return back(`/?login_error=${kind}`)
    }
    const displayName = du.global_name || du.username
    const existing = await db().select().from(s.users).where(eq(s.users.discordId, du.id))
    let userId = existing[0]?.id
    if (userId) {
      await db().update(s.users).set({ username: du.username, displayName, avatarUrl: discordAvatarUrl(du) }).where(eq(s.users.id, userId))
    } else {
      userId = newId('usr')
      await db().insert(s.users).values({ id: userId, discordId: du.id, username: du.username, displayName, avatarUrl: discordAvatarUrl(du) })
    }
    await bootstrapLeader(db(), app.ctx.guildId, userId, du.id, displayName, config.bootstrapLeaderDiscordId)
    await startSession(reply, userId, req.headers['user-agent'])
    return back(safeNext(next))
  })

  /* ---------------- Đăng xuất ---------------- */
  app.post('/auth/logout', async (req, reply) => {
    if (req.auth) await revokeSession(db(), req.auth.token)
    clearSessionCookie(reply, config.secureCookies)
    return { ok: true }
  })

  /* ---------------- Tôi là ai ---------------- */
  app.get('/api/me', async (req): Promise<Me> => {
    const auth = requireUser(req)
    const c = auth.character

    // mọi tổ chức của nhân vật
    const orgs: OrgMembership[] = []
    if (c) {
      const rows = await db()
        .select({ m: s.members, g: s.guilds })
        .from(s.members)
        .innerJoin(s.guilds, eq(s.members.guildId, s.guilds.id))
        .where(and(eq(s.members.characterId, c.id), isNull(s.members.deletedAt)))
        .orderBy(asc(s.members.joinedAt))
      for (const { m, g } of rows) {
        const count = await memberCount(db(), g.id)
        const title = g.type === 'kimlan' && m.seat ? kimlanHonorific(m.seat, c.look.gender, count).name : RANKS[m.rank as RankId].name
        orgs.push({ org: toOrgInfo(g, count), memberId: m.id, rank: m.rank as RankId, title })
      }
    }

    let member: Me['member'] = null
    if (auth.member) {
      const snap = await buildSnapshot(db(), auth.member.guildId, ['members'], { online: app.ctx.hub.onlineCharacters() })
      member = snap.members?.find((m) => m.id === auth.member!.id) ?? null
    }
    const current = auth.member ? orgs.find((o) => o.org.id === auth.member!.guildId)?.org ?? null : null

    // đơn đang chờ mới nhất (ở bất kỳ tổ chức nào)
    const apps = await db()
      .select({ a: s.applications, orgName: s.guilds.name })
      .from(s.applications)
      .innerJoin(s.guilds, eq(s.applications.guildId, s.guilds.id))
      .where(and(eq(s.applications.userId, auth.user.id), ne(s.applications.stage, 'chap-nhan')))
      .orderBy(desc(s.applications.appliedAt))
      .limit(1)
    const pending = apps[0] && !orgs.some((o) => o.org.id === apps[0].a.guildId) ? { ...applicationRowToDomain(apps[0].a), orgId: apps[0].a.guildId, orgName: apps[0].orgName } : null

    return {
      user: { id: auth.user.id, name: auth.user.displayName, avatarUrl: auth.user.avatarUrl, provider: auth.user.isDev ? 'dev' : 'discord' },
      character: c ? { id: c.id, name: c.name, classId: c.classId as ClassId, level: c.level, power: c.power, title: c.title, bio: c.bio, look: c.look } : null,
      orgs,
      org: current,
      member,
      permissions: auth.permissions,
      application: pending,
      guild: current ? { id: current.id, name: current.name } : { id: app.ctx.guildId, name: '' },
      devLogin: config.devLogin,
      isAdmin: await isSystemAdmin(db(), config, auth.user),
    }
  })

}

/**
 * Khai bang (bang mặc định GUILD_ID): người đăng nhập Discord đầu tiên (hoặc đúng BOOTSTRAP_LEADER_DISCORD_ID)
 * - bang đã có Bang Chủ chưa gắn Discord thật (vd dữ liệu demo) → nhận nhân vật Bang Chủ đó;
 * - bang trống (SEED_DEMO=false) → tạo nhân vật mới làm Bang Chủ, tên lấy từ Discord.
 */
async function bootstrapLeader(db: Db, guildId: string, userId: string, discordId: string, displayName: string, wanted?: string) {
  const mine = await db.select({ id: s.characters.id }).from(s.characters).where(eq(s.characters.userId, userId))
  if (mine.length) return
  if (wanted && wanted !== discordId) return
  const guild = await db.select({ id: s.guilds.id }).from(s.guilds).where(eq(s.guilds.id, guildId))
  if (!guild.length) return
  if (!wanted) {
    // không chỉ định → chỉ người Discord đầu tiên của bang
    const real = await db
      .select({ id: s.users.id })
      .from(s.members)
      .innerJoin(s.characters, eq(s.members.characterId, s.characters.id))
      .innerJoin(s.users, eq(s.characters.userId, s.users.id))
      .where(and(eq(s.members.guildId, guildId), eq(s.users.isDev, false)))
    if (real.length) return
  }
  const leaders = await db
    .select({ m: s.members, c: s.characters, u: s.users })
    .from(s.members)
    .innerJoin(s.characters, eq(s.members.characterId, s.characters.id))
    .leftJoin(s.users, eq(s.characters.userId, s.users.id))
    .where(and(eq(s.members.guildId, guildId), eq(s.members.rank, 'bang-chu'), isNull(s.members.deletedAt)))
  const leader = leaders[0]
  if (leader) {
    if (leader.u && !leader.u.isDev) return
    await db.update(s.characters).set({ userId }).where(eq(s.characters.id, leader.c.id))
    await logActivity(db, guildId, 'event', `${leader.c.name} đã gắn tài khoản Discord — khai bang!`, leader.m.id)
    return
  }
  // bang chưa có Bang Chủ: người này lập bang
  const name = (displayName.trim() || 'Bang Chủ').slice(0, 32).padEnd(2, '·')
  await db.transaction(async (tx) => {
    const id = await createMember(
      tx,
      guildId,
      { name, classId: 'huyet-ha', rank: 'bang-chu', title: 'Khai Bang Tổ Sư', bio: 'Người dựng cờ lập bang.', userId },
      { founding: true },
    )
    await logActivity(tx, guildId, 'event', `${name} dựng cờ khai lập bang hội!`, id)
  })
}


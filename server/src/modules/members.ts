import { and, asc, eq, isNull, ne, or, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { CLASS_IDS, RANKS } from '@/domain/constants'
import { kimlanHonorific, ORG_TYPES } from '@/domain/orgs'
import { can, checkAssignRank, checkExpel, rankAbove } from '@/domain/permissions'
import type { ClassId, OrgType, RankId } from '@/domain/types'
import { lookFromSeed } from '@/data/seed'
import { requireMember, requirePerm, typeOf } from '../auth/context'
import type { DbOrTx } from '../db/client'
import * as s from '../db/schema'
import { assertRule, badRequest, conflict, forbidden, notFound } from '../lib/errors'
import { newId } from '../lib/ids'
import { weekStartKey } from '../lib/time'
import { loadOrg, orgType } from '../orgs'
import { audit, getMember, idempotent, logActivity, respond } from './shared'

/* ---------------- Kiểm tra đầu vào ---------------- */

const Look = z.object({
  gender: z.enum(['nam', 'nu']),
  bangs: z.number().int().min(0).max(3),
  backHair: z.number().int().min(0).max(4),
  hairColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  eyeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  skin: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  expression: z.enum(['smile', 'grin', 'calm', 'smirk', 'wink', 'happy', 'shy', 'sleepy']),
  mood: z.enum(['cute', 'cool', 'romantic']),
  accessory: z.number().int().min(0).max(3),
})

const Name = z.string().trim().min(2, 'Tên cần ít nhất 2 ký tự.').max(32, 'Tên tối đa 32 ký tự.')
const ClassIdZ = z.enum(CLASS_IDS as [ClassId, ...ClassId[]])
const RankZ = z.enum(Object.keys(RANKS) as [RankId, ...RankId[]])

/** Thông tin nhân vật (tạo mới) */
const CharacterInput = z.object({
  name: Name,
  classId: ClassIdZ,
  level: z.number().int().min(1).max(80).optional(),
  power: z.number().int().min(1).max(10_000_000).optional(),
  title: z.string().trim().max(40).optional(),
  bio: z.string().trim().max(300).optional(),
  gender: z.enum(['nam', 'nu']).optional(),
  look: Look.optional(),
})

const NewMember = CharacterInput.extend({ rank: RankZ.optional() })

const PatchMember = z
  .object({
    name: Name,
    classId: ClassIdZ,
    level: z.number().int().min(1).max(80),
    power: z.number().int().min(1).max(10_000_000),
    activity: z.number().int().min(0).max(100),
    title: z.string().trim().max(40),
    bio: z.string().trim().max(300),
    look: Look,
  })
  .partial()

const SELF_FIELDS = new Set(['title', 'bio', 'look'])
const CHARACTER_FIELDS = ['name', 'classId', 'level', 'power', 'title', 'bio', 'look'] as const

/* ---------------- Luật dùng chung ---------------- */

/** Tên nhân vật không trùng với người khác trong tổ chức */
async function assertNameFree(tx: DbOrTx, guildId: string, name: string, exceptCharacterId?: string) {
  const rows = await tx
    .select({ id: s.members.id })
    .from(s.members)
    .innerJoin(s.characters, eq(s.members.characterId, s.characters.id))
    .where(
      and(
        eq(s.members.guildId, guildId),
        isNull(s.members.deletedAt),
        sql`lower(${s.characters.name}) = lower(${name})`,
        exceptCharacterId ? ne(s.characters.id, exceptCharacterId) : undefined,
      ),
    )
  if (rows.length) throw conflict(`Tên "${name}" đã có người dùng trong tổ chức này.`)
}

/** Đổi tên nhân vật: không trùng ở mọi tổ chức nhân vật đang ở */
export async function assertRenameFreeFor(tx: DbOrTx, characterId: string, name: string) {
  const orgs = await tx
    .select({ guildId: s.members.guildId })
    .from(s.members)
    .where(and(eq(s.members.characterId, characterId), isNull(s.members.deletedAt)))
  for (const o of orgs) await assertNameFree(tx, o.guildId, name, characterId)
}

async function assertRankSlot(tx: DbOrTx, guildId: string, rank: RankId, exceptId?: string) {
  const max = RANKS[rank].max
  if (max === undefined) return
  const rows = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(s.members)
    .where(and(eq(s.members.guildId, guildId), isNull(s.members.deletedAt), eq(s.members.rank, rank), exceptId ? ne(s.members.id, exceptId) : undefined))
  if ((rows[0]?.n ?? 0) >= max) throw conflict(`Chức ${RANKS[rank].name} đã đủ ${max} người.`)
}

export async function upsertPowerHistory(tx: DbOrTx, characterId: string, power: number) {
  await tx
    .insert(s.powerHistory)
    .values({ characterId, weekStart: weekStartKey(), power })
    .onConflictDoUpdate({ target: [s.powerHistory.characterId, s.powerHistory.weekStart], set: { power } })
}

export async function activeMembers(tx: DbOrTx, guildId: string) {
  return tx
    .select({ m: s.members, c: s.characters })
    .from(s.members)
    .innerJoin(s.characters, eq(s.members.characterId, s.characters.id))
    .where(and(eq(s.members.guildId, guildId), isNull(s.members.deletedAt)))
    .orderBy(asc(s.members.seat), asc(s.members.joinedAt))
}

/** Kim Lan: đánh lại số ghế 1..N theo thứ tự cho trước; ghế 1 là Đại ca */
async function renumberSeats(tx: DbOrTx, orderedIds: string[]) {
  for (let i = 0; i < orderedIds.length; i++) {
    await tx
      .update(s.members)
      .set({ seat: i + 1, rank: i === 0 ? 'dai-ca' : 'huynh-de' })
      .where(eq(s.members.id, orderedIds[i]))
  }
}

/**
 * Đưa một thành viên lên đứng đầu tổ chức.
 * Kim Lan: lên ghế 1 (Đại ca/tỷ), mọi người lùi một ghế.
 * Bang / team: người đứng đầu cũ lui xuống chức phó (hết chỗ phó thì xuống bậc kế).
 */
export async function makeLeader(tx: DbOrTx, guildId: string, type: OrgType, memberId: string) {
  if (type === 'kimlan') {
    const rows = await activeMembers(tx, guildId)
    await renumberSeats(tx, [memberId, ...rows.map((r) => r.m.id).filter((x) => x !== memberId)])
    return
  }
  const leaderRank = ORG_TYPES[type].leaderRank
  const deputyRank: RankId = type === 'guild' ? 'pho-bang-chu' : 'pho-nhom'
  const olds = await tx
    .select({ id: s.members.id })
    .from(s.members)
    .where(and(eq(s.members.guildId, guildId), isNull(s.members.deletedAt), eq(s.members.rank, leaderRank), ne(s.members.id, memberId)))
  for (const old of olds) {
    const deputies = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(s.members)
      .where(and(eq(s.members.guildId, guildId), isNull(s.members.deletedAt), eq(s.members.rank, deputyRank), ne(s.members.id, memberId)))
    const full = (deputies[0]?.n ?? 0) >= (RANKS[deputyRank].max ?? 2)
    const fallback: RankId = full ? (type === 'guild' ? 'truong-lao' : 'thanh-vien') : deputyRank
    await tx.update(s.members).set({ rank: fallback }).where(eq(s.members.id, old.id))
  }
  await tx.update(s.members).set({ rank: leaderRank }).where(eq(s.members.id, memberId))
}

/** Câu chào mừng theo loại tổ chức */
function welcomeText(type: OrgType, name: string, rank: RankId, honorific?: string) {
  if (type === 'kimlan') return `${name} kết nghĩa Kim Lan${honorific ? `, thành ${honorific}` : ''}!`
  if (type === 'team') return `${name} gia nhập team.`
  return `${name} gia nhập bang, chào mừng ${RANKS[rank].name.toLowerCase()}!`
}

/* ---------------- Tạo nhân vật / thêm vào tổ chức ---------------- */

/** Tạo nhân vật mới (chưa thuộc tổ chức nào). */
export async function createCharacter(tx: DbOrTx, input: z.infer<typeof CharacterInput> & { userId?: string | null }) {
  const id = newId('ch')
  const power = input.power ?? 120000
  await tx.insert(s.characters).values({
    id,
    userId: input.userId ?? null,
    name: input.name,
    classId: input.classId,
    level: input.level ?? 60,
    power,
    title: input.title || 'Tân Thủ Đáng Yêu',
    bio: input.bio || 'Vừa bước chân vào giang hồ.',
    look: input.look ?? lookFromSeed(`${id}-${input.name}`, input.classId, input.gender),
    stats: { pve: 55, pvp: 50, support: 45, survival: 50, teamwork: 60, mobility: 55 },
    achievements: [],
    pvp: { kills: 0, deaths: 0, wins: 0 },
  })
  await upsertPowerHistory(tx, id, power)
  return id
}

/**
 * Đưa một nhân vật vào tổ chức: kiểm tra sức chứa, trùng tên, chức vụ hợp lệ theo loại;
 * Kim Lan tự xếp ghế cuối. Trả về id tư cách thành viên.
 */
export async function addMembership(tx: DbOrTx, guildId: string, characterId: string, opts: { rank?: RankId; founding?: boolean } = {}) {
  const org = await loadOrg(tx, guildId)
  if (!org) throw notFound('Không tìm thấy tổ chức.')
  const type = orgType(org)
  const info = ORG_TYPES[type]
  const chars = await tx.select().from(s.characters).where(eq(s.characters.id, characterId))
  const character = chars[0]
  if (!character) throw notFound('Không tìm thấy nhân vật.')
  const existing = await tx
    .select({ id: s.members.id })
    .from(s.members)
    .where(and(eq(s.members.guildId, guildId), eq(s.members.characterId, characterId), isNull(s.members.deletedAt)))
  if (existing.length) throw conflict(`${character.name} đã ở trong ${org.name} rồi.`)
  await assertNameFree(tx, guildId, character.name, characterId)

  const members = await activeMembers(tx, guildId)
  const cap = type === 'team' ? null : type === 'kimlan' ? 12 : (org.capacity ?? info.capacity)
  if (cap !== null && cap !== undefined && members.length >= cap)
    throw conflict(type === 'kimlan' ? 'Kim Lan đã đủ 12 người.' : `${org.name} đã đủ ${cap} người.`)

  let rank: RankId = opts.rank ?? (members.length === 0 ? info.leaderRank : info.entryRank)
  if (!info.ranks.includes(rank)) throw badRequest(`Chức vụ ${RANKS[rank].name} không có ở ${info.name}.`)
  if (rank === info.leaderRank && members.length > 0 && !opts.founding)
    throw badRequest(`${RANKS[rank].name} chỉ có thể truyền ngôi, không tạo mới.`)
  if (type !== 'kimlan') await assertRankSlot(tx, guildId, rank)

  let seat: number | null = null
  if (type === 'kimlan') {
    seat = members.length + 1
    rank = seat === 1 ? 'dai-ca' : 'huynh-de'
  }
  const id = newId('m')
  const now = new Date()
  await tx.insert(s.members).values({ id, guildId, characterId, rank, seat, activity: 60, status: 'offline', joinedAt: now, lastOnline: now })
  const honorific = seat ? kimlanHonorific(seat, character.look.gender, members.length + 1).name : undefined
  await logActivity(tx, guildId, 'join', welcomeText(type, character.name, rank, honorific), id)
  return id
}

/** Tạo nhân vật mới rồi đưa vào tổ chức (Thêm thành viên, chấp nhận đơn của người chưa có nhân vật, khai bang). */
export async function createMember(
  tx: DbOrTx,
  guildId: string,
  input: z.infer<typeof NewMember> & { userId?: string | null },
  opts: { founding?: boolean } = {},
) {
  const characterId = await createCharacter(tx, input)
  return addMembership(tx, guildId, characterId, { rank: input.rank, founding: opts.founding })
}

/** Rời / bị mời ra: xóa mềm tư cách thành viên + dọn dữ liệu gắn với nó trong tổ chức. */
export async function removeMembership(tx: DbOrTx, guildId: string, memberId: string) {
  await tx.update(s.members).set({ deletedAt: new Date() }).where(eq(s.members.id, memberId))
  await tx.delete(s.mentorships).where(and(eq(s.mentorships.guildId, guildId), or(eq(s.mentorships.masterId, memberId), eq(s.mentorships.discipleId, memberId))))
  await tx.delete(s.bonds).where(and(eq(s.bonds.guildId, guildId), or(eq(s.bonds.aId, memberId), eq(s.bonds.bId, memberId))))
  await tx.delete(s.eventRsvps).where(eq(s.eventRsvps.memberId, memberId))
  const teams = await tx.select().from(s.teams).where(eq(s.teams.guildId, guildId))
  for (const t of teams.filter((x) => x.slots.includes(memberId)))
    await tx.update(s.teams).set({ slots: t.slots.map((x) => (x === memberId ? null : x)) }).where(eq(s.teams.id, t.id))
  const org = await loadOrg(tx, guildId)
  if (org?.type === 'kimlan') {
    const rest = await activeMembers(tx, guildId)
    await renumberSeats(
      tx,
      rest.map((r) => r.m.id),
    )
  }
}

/* ---------------- Routes ---------------- */

export async function memberRoutes(app: FastifyInstance) {
  const { ctx } = app

  app.post('/api/members', async (req, reply) =>
    idempotent(req, reply, async () => {
      requirePerm(req, 'member.edit')
      const body = NewMember.parse(req.body)
      const id = await ctx.db.transaction(async (tx) => {
        const id = await createMember(tx, req.orgId, body)
        await audit(tx, req, 'member.create', id, body)
        return id
      })
      reply.code(201)
      return respond(req, ['members', 'activities'], { id })
    }),
  )

  app.patch('/api/members/:id', async (req) => {
    const me = requireMember(req)
    const type = typeOf(req)
    const { id } = req.params as { id: string }
    const body = PatchMember.parse(req.body)
    const keys = Object.keys(body)
    if (!keys.length) throw badRequest('Không có gì để cập nhật.')
    await ctx.db.transaction(async (tx) => {
      const target = await getMember(tx, req.orgId, id)
      const isSelf = target.characterId === me.member.characterId
      const selfOnly = keys.every((k) => SELF_FIELDS.has(k))
      if (!(isSelf && selfOnly)) {
        if (!can(me.rank, 'member.edit', type)) throw forbidden(isSelf ? 'Bạn chỉ được sửa danh hiệu, giới thiệu và tạo hình của mình.' : undefined)
        if (!isSelf && me.rank !== ORG_TYPES[type].leaderRank && !rankAbove(me.rank, target.rank as RankId))
          throw forbidden('Chỉ được sửa hồ sơ người có chức vụ thấp hơn mình.')
        // nhân vật dùng chung ở nhiều tổ chức: đã có chủ tài khoản thì chỉ chủ nhân vật sửa thông tin nhân vật
        if (!isSelf && target.userId && keys.some((k) => k !== 'activity'))
          throw forbidden('Nhân vật này đã có chủ tài khoản — chỉ người đó tự cập nhật tên, chiến lực, tạo hình… (dùng chung ở mọi tổ chức).')
      }
      if (body.name && body.name.toLowerCase() !== target.name.toLowerCase()) await assertRenameFreeFor(tx, target.characterId, body.name)
      const charPatch = Object.fromEntries(CHARACTER_FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]))
      if (Object.keys(charPatch).length) await tx.update(s.characters).set(charPatch).where(eq(s.characters.id, target.characterId))
      if (body.activity !== undefined) await tx.update(s.members).set({ activity: body.activity }).where(eq(s.members.id, id))
      if (body.power !== undefined && body.power !== target.power) await upsertPowerHistory(tx, target.characterId, body.power)
      await audit(tx, req, 'member.update', id, body)
    })
    return respond(req, ['members'])
  })

  app.put('/api/members/:id/rank', async (req) => {
    const me = requireMember(req)
    const type = typeOf(req)
    const info = ORG_TYPES[type]
    const { id } = req.params as { id: string }
    const { rank: next } = z.object({ rank: RankZ }).parse(req.body)
    await ctx.db.transaction(async (tx) => {
      const target = await getMember(tx, req.orgId, id)
      const current = target.rank as RankId
      if (current === next) throw badRequest('Người này đã giữ chức vụ đó rồi.')
      assertRule(checkAssignRank(me.rank, current, next, target.id === me.member.id, type), 403)
      if (type === 'kimlan') {
        // Kim Lan chỉ có một việc "bổ nhiệm": nhường ghế Đại ca
        if (next !== 'dai-ca') throw badRequest('Kim Lan dùng thứ bậc theo ghế — hãy đổi ghế thay vì đổi chức vụ.')
        await makeLeader(tx, req.orgId, type, id)
        await logActivity(tx, req.orgId, 'promote', `${me.member.name} nhường ghế Đại ca cho ${target.name}`, id)
      } else if (next === info.leaderRank) {
        // truyền ngôi: người đứng đầu cũ lui xuống chức phó (hết chỗ thì xuống bậc kế)
        await makeLeader(tx, req.orgId, type, id)
        await logActivity(tx, req.orgId, 'promote', `${me.member.name} truyền ngôi ${RANKS[next].name} cho ${target.name}`, id)
      } else {
        await assertRankSlot(tx, req.orgId, next, id)
        await tx.update(s.members).set({ rank: next }).where(eq(s.members.id, id))
        await logActivity(tx, req.orgId, 'promote', `${target.name} được bổ nhiệm làm ${RANKS[next].name}`, id)
      }
      await audit(tx, req, 'member.rank', id, { from: current, to: next })
    })
    return respond(req, ['members', 'activities'])
  })

  /** Kim Lan: đổi thứ bậc (ghế). Đưa người khác lên ghế 1 = nhường ngôi Đại ca. */
  app.put('/api/members/:id/seat', async (req) => {
    const me = requirePerm(req, 'rank.assign')
    if (typeOf(req) !== 'kimlan') throw badRequest('Chỉ Kim Lan mới có thứ bậc theo ghế.')
    const { id } = req.params as { id: string }
    const { seat } = z.object({ seat: z.number().int().min(1).max(12) }).parse(req.body)
    await ctx.db.transaction(async (tx) => {
      const target = await getMember(tx, req.orgId, id)
      const rows = await activeMembers(tx, req.orgId)
      if (seat > rows.length) throw badRequest(`Kim Lan hiện có ${rows.length} người — ghế phải từ 1 tới ${rows.length}.`)
      const order = rows.map((r) => r.m.id).filter((x) => x !== id)
      order.splice(seat - 1, 0, id)
      await renumberSeats(tx, order)
      const gender = rows.find((r) => r.m.id === id)!.c.look.gender
      const h = kimlanHonorific(seat, gender, rows.length)
      const text = seat === 1 && target.id !== me.member.id ? `${me.member.name} nhường ghế Đại ca cho ${target.name}` : `${target.name} nay là ${h.name} của Kim Lan`
      await logActivity(tx, req.orgId, 'promote', text, id)
      await audit(tx, req, 'member.seat', id, { seat })
    })
    return respond(req, ['members', 'activities'])
  })

  app.delete('/api/members/:id', async (req) => {
    const me = requireMember(req)
    const type = typeOf(req)
    const { id } = req.params as { id: string }
    await ctx.db.transaction(async (tx) => {
      const target = await getMember(tx, req.orgId, id)
      assertRule(checkExpel(me.rank, target.rank as RankId, target.id === me.member.id, type), 403)
      await removeMembership(tx, req.orgId, id)
      const verb = type === 'kimlan' ? 'đã rời Kim Lan.' : type === 'team' ? 'đã rời team.' : 'đã bị trục xuất khỏi bang.'
      await logActivity(tx, req.orgId, 'event', `${target.name} ${verb}`)
      await audit(tx, req, 'member.expel', id, { name: target.name })
    })
    return respond(req, ['members', 'mentorships', 'bonds', 'teams', 'events', 'activities'])
  })
}

export { CharacterInput as CharacterInputSchema, Look as LookSchema, NewMember as NewMemberSchema }

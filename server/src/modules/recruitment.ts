import { and, eq, isNull, ne, notInArray } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { CLASS_IDS, RANKS } from '@/domain/constants'
import type { UnclaimedMember } from '@/domain/api'
import type { ApplicationStage, ClassId, RankId } from '@/domain/types'
import { lookFromSeed } from '@/data/seed'
import { requirePerm, requireUser } from '../auth/context'
import type { DbOrTx } from '../db/client'
import * as s from '../db/schema'
import { badRequest, conflict, forbidden, notFound } from '../lib/errors'
import { newId } from '../lib/ids'
import { loadOrg, orgHas, type OrgRow } from '../orgs'
import { applicationRowToDomain } from '../snapshot'
import { addMembership, createCharacter, createMember, LookSchema } from './members'
import { audit, getMember, idempotent, logActivity, respond } from './shared'

/* ---------------- Kiểm tra đầu vào ---------------- */

const STAGES = ['moi', 'phong-van', 'thu-thach', 'chap-nhan', 'tu-choi'] as const satisfies readonly ApplicationStage[]
const ClassIdZ = z.enum(CLASS_IDS as [ClassId, ...ClassId[]])
const Name = z.string().trim().min(2, 'Tên cần ít nhất 2 ký tự.').max(32, 'Tên tối đa 32 ký tự.')
const Message = z.string().trim().max(500, 'Lời nhắn tối đa 500 ký tự.')

const NewApplication = z.object({
  name: Name,
  classId: ClassIdZ,
  power: z.number().int().min(1).max(10_000_000),
  level: z.number().int().min(1).max(80),
  message: Message.default(''),
  referrerId: z.string().min(1).optional().nullable(),
  look: LookSchema.optional(),
})

/** Đơn xin vào: người đã có nhân vật chỉ cần lời nhắn; người chưa có thì khai thông tin nhân vật */
const ApplyBody = z.object({
  orgId: z.string().min(1).optional(),
  name: Name.optional(),
  classId: ClassIdZ.optional(),
  power: z.number().int().min(1).max(10_000_000).optional(),
  level: z.number().int().min(1).max(80).optional(),
  message: Message.default(''),
  gender: z.enum(['nam', 'nu']).optional(),
})

const ClaimBody = z.object({ orgId: z.string().min(1).optional(), memberId: z.string().min(1), message: Message.default('') })

const PENDING_EXCLUDED: ApplicationStage[] = ['chap-nhan', 'tu-choi']

/* ---------------- Luật dùng chung ---------------- */

/** Tài khoản đã là thành viên (chưa rời) của tổ chức chưa? */
async function userHasMember(tx: DbOrTx, guildId: string, userId: string) {
  const rows = await tx
    .select({ id: s.members.id })
    .from(s.members)
    .innerJoin(s.characters, eq(s.members.characterId, s.characters.id))
    .where(and(eq(s.characters.userId, userId), eq(s.members.guildId, guildId), isNull(s.members.deletedAt)))
  return rows.length > 0
}

async function characterOfUser(tx: DbOrTx, userId: string) {
  const rows = await tx.select().from(s.characters).where(eq(s.characters.userId, userId))
  return rows[0] ?? null
}

async function pendingApplicationOf(tx: DbOrTx, guildId: string, userId: string, exceptId?: string) {
  const rows = await tx
    .select({ id: s.applications.id })
    .from(s.applications)
    .where(
      and(
        eq(s.applications.guildId, guildId),
        eq(s.applications.userId, userId),
        notInArray(s.applications.stage, PENDING_EXCLUDED),
        exceptId ? ne(s.applications.id, exceptId) : undefined,
      ),
    )
  return rows[0]?.id ?? null
}

/** Nhân vật còn "vô chủ": chưa gắn tài khoản, hoặc chỉ gắn tài khoản đăng nhập thử. */
export async function isCharacterUnclaimed(tx: DbOrTx, characterId: string) {
  const rows = await tx
    .select({ userId: s.characters.userId, isDev: s.users.isDev })
    .from(s.characters)
    .leftJoin(s.users, eq(s.characters.userId, s.users.id))
    .where(eq(s.characters.id, characterId))
  const r = rows[0]
  return !!r && (!r.userId || r.isDev === true)
}

async function getApplication(tx: DbOrTx, guildId: string, id: string) {
  const rows = await tx
    .select()
    .from(s.applications)
    .where(and(eq(s.applications.id, id), eq(s.applications.guildId, guildId)))
  const app = rows[0]
  if (!app) throw notFound('Không tìm thấy đơn này.')
  return app
}

/** Tổ chức nhận đơn từ Sảnh Giang Hồ: có chức năng Chiêu Mộ và công khai (hoặc là bang mặc định). */
async function applyTarget(tx: DbOrTx, req: FastifyRequest, orgId?: string): Promise<OrgRow> {
  const id = orgId ?? req.server.ctx.guildId
  const org = await loadOrg(tx, id)
  if (!org) throw notFound('Không tìm thấy tổ chức.')
  if (!orgHas(org, 'chieu-mo') || (!org.isPublic && id !== req.server.ctx.guildId))
    throw forbidden(`${org.name} chỉ nhận thành viên qua link mời.`, 'invite_only')
  return org
}

/** Được gửi đơn khi: chưa là thành viên tổ chức đó và không có đơn đang chờ ở đó. */
async function assertCanApply(tx: DbOrTx, req: FastifyRequest, guildId: string) {
  const auth = requireUser(req)
  if (await userHasMember(tx, guildId, auth.user.id)) throw conflict('Bạn đã là thành viên của tổ chức này rồi.')
  if (await pendingApplicationOf(tx, guildId, auth.user.id)) throw conflict('Bạn đã có đơn đang chờ duyệt.')
  return auth
}

/* ---------------- Routes ---------------- */

export async function recruitmentRoutes(app: FastifyInstance) {
  const { ctx } = app

  /* ----- Chiêu mộ (ban quản lý) ----- */

  app.post('/api/applications', async (req, reply) =>
    idempotent(req, reply, async () => {
      requirePerm(req, 'recruit.review')
      const body = NewApplication.parse(req.body)
      const id = await ctx.db.transaction(async (tx) => {
        if (body.referrerId) await getMember(tx, req.orgId, body.referrerId)
        const id = newId('app')
        await tx.insert(s.applications).values({
          id,
          guildId: req.orgId,
          kind: 'join',
          name: body.name,
          classId: body.classId,
          power: body.power,
          level: body.level,
          message: body.message,
          stage: 'moi',
          appliedAt: new Date(),
          referrerId: body.referrerId ?? null,
          look: body.look ?? lookFromSeed(`app-${body.name}`, body.classId),
        })
        await audit(tx, req, 'application.create', id, body)
        return id
      })
      reply.code(201)
      return respond(req, ['applications'], { id })
    }),
  )

  app.patch('/api/applications/:id/stage', async (req) => {
    requirePerm(req, 'recruit.review')
    const { id } = req.params as { id: string }
    const { stage } = z.object({ stage: z.enum(STAGES) }).parse(req.body)
    await ctx.db.transaction(async (tx) => {
      const current = await getApplication(tx, req.orgId, id)
      if (current.stage === 'chap-nhan') throw badRequest('Đơn đã được chấp nhận.')
      if (stage === 'chap-nhan') throw badRequest('Hãy dùng nút Chấp nhận.')
      // mở lại đơn bị từ chối của người có tài khoản: không để họ có hai đơn chờ cùng lúc
      if (current.stage === 'tu-choi' && stage !== 'tu-choi' && current.userId) {
        if (await userHasMember(tx, req.orgId, current.userId)) throw conflict('Người này đã là thành viên.')
        if (await pendingApplicationOf(tx, req.orgId, current.userId, id)) throw conflict('Người này đang có một đơn khác chờ duyệt.')
      }
      await tx.update(s.applications).set({ stage }).where(eq(s.applications.id, id))
      await audit(tx, req, 'application.stage', id, { from: current.stage, to: stage })
    })
    return respond(req, ['applications'])
  })

  app.post('/api/applications/:id/accept', async (req) => {
    requirePerm(req, 'recruit.review')
    const { id } = req.params as { id: string }
    const memberId = await ctx.db.transaction(async (tx) => {
      const application = await getApplication(tx, req.orgId, id)
      if (application.stage === 'chap-nhan') throw conflict('Đơn này đã được chấp nhận rồi.')
      if (application.userId && (await userHasMember(tx, req.orgId, application.userId))) throw conflict('Tài khoản này đã là thành viên.')

      let memberId: string
      if (application.kind === 'claim') {
        if (!application.userId) throw badRequest('Đơn nhận danh tính thiếu tài khoản người gửi.')
        if (!application.claimMemberId) throw badRequest('Đơn không chỉ rõ nhân vật cần nhận.')
        const target = await getMember(tx, req.orgId, application.claimMemberId)
        if (!(await isCharacterUnclaimed(tx, target.characterId))) throw conflict('Nhân vật này đã có chủ.')
        const own = await characterOfUser(tx, application.userId)
        if (own && own.id !== target.characterId) throw conflict('Tài khoản này đã có nhân vật khác.')
        await tx.update(s.characters).set({ userId: application.userId }).where(eq(s.characters.id, target.characterId))
        await logActivity(tx, req.orgId, 'join', `${target.name} đã nhận danh tính và nhập môn`, target.id)
        memberId = target.id
      } else if (application.characterId) {
        memberId = await addMembership(tx, req.orgId, application.characterId)
      } else if (application.userId) {
        // người chưa có nhân vật: tạo nhân vật theo đơn rồi gắn vào tài khoản
        const own = await characterOfUser(tx, application.userId)
        const characterId =
          own?.id ??
          (await createCharacter(tx, {
            name: application.name,
            classId: application.classId as ClassId,
            power: application.power,
            level: application.level,
            look: application.look,
            userId: application.userId,
          }))
        memberId = await addMembership(tx, req.orgId, characterId)
      } else {
        memberId = await createMember(tx, req.orgId, {
          name: application.name,
          classId: application.classId as ClassId,
          power: application.power,
          level: application.level,
          look: application.look,
          gender: application.look.gender,
        })
      }
      await tx.update(s.applications).set({ stage: 'chap-nhan', memberId }).where(eq(s.applications.id, id))
      await audit(tx, req, 'application.accept', id, { memberId, kind: application.kind })
      return memberId
    })
    return respond(req, ['applications', 'members', 'activities'], { memberId })
  })

  /* ----- Sảnh Giang Hồ: xin vào / nhận danh tính ----- */

  app.get('/api/onboarding/unclaimed', async (req): Promise<{ members: UnclaimedMember[] }> => {
    requireUser(req)
    const orgId = (req.query as { orgId?: string }).orgId ?? ctx.guildId
    const rows = await ctx.db
      .select({ m: s.members, c: s.characters, isDev: s.users.isDev })
      .from(s.members)
      .innerJoin(s.characters, eq(s.members.characterId, s.characters.id))
      .leftJoin(s.users, eq(s.characters.userId, s.users.id))
      .where(and(eq(s.members.guildId, orgId), isNull(s.members.deletedAt)))
    const members = rows
      .filter(({ c, isDev }) => !c.userId || isDev === true)
      .map(({ m, c }) => ({ id: m.id, name: c.name, classId: c.classId as ClassId, rank: m.rank as RankId, look: c.look }))
      .sort((a, b) => RANKS[a.rank].order - RANKS[b.rank].order || a.name.localeCompare(b.name, 'vi'))
    return { members }
  })

  app.post('/api/onboarding/apply', async (req, reply) =>
    idempotent(req, reply, async () => {
      const body = ApplyBody.parse(req.body)
      const { row, orgId } = await ctx.db.transaction(async (tx) => {
        const org = await applyTarget(tx, req, body.orgId)
        const auth = await assertCanApply(tx, req, org.id)
        const own = await characterOfUser(tx, auth.user.id)
        if (!own && (!body.name || !body.classId || !body.power || !body.level))
          throw badRequest('Bạn chưa có nhân vật — hãy khai tên, lưu phái, cấp và chiến lực.')
        const id = newId('app')
        const [row] = await tx
          .insert(s.applications)
          .values({
            id,
            guildId: org.id,
            kind: 'join',
            userId: auth.user.id,
            characterId: own?.id ?? null,
            name: own?.name ?? body.name!,
            classId: own?.classId ?? body.classId!,
            power: own?.power ?? body.power!,
            level: own?.level ?? body.level!,
            message: body.message,
            stage: 'moi',
            appliedAt: new Date(),
            look: own?.look ?? lookFromSeed(`app-${body.name}`, body.classId!, body.gender),
          })
          .returning()
        await audit(tx, req, 'onboarding.apply', id, body)
        return { row, orgId: org.id }
      })
      ctx.hub.invalidate(orgId, ['applications'], null)
      reply.code(201)
      return { ok: true as const, result: { application: applicationRowToDomain(row) } }
    }),
  )

  app.post('/api/onboarding/claim', async (req, reply) =>
    idempotent(req, reply, async () => {
      const body = ClaimBody.parse(req.body)
      const { row, orgId } = await ctx.db.transaction(async (tx) => {
        const org = await applyTarget(tx, req, body.orgId)
        const auth = await assertCanApply(tx, req, org.id)
        if (await characterOfUser(tx, auth.user.id)) throw conflict('Tài khoản của bạn đã có nhân vật rồi.')
        const target = await getMember(tx, org.id, body.memberId)
        if (!(await isCharacterUnclaimed(tx, target.characterId))) throw conflict('Nhân vật này đã có chủ.')
        const chars = await tx.select().from(s.characters).where(eq(s.characters.id, target.characterId))
        const c = chars[0]!
        const id = newId('app')
        const [row] = await tx
          .insert(s.applications)
          .values({
            id,
            guildId: org.id,
            kind: 'claim',
            userId: auth.user.id,
            claimMemberId: target.id,
            characterId: c.id,
            name: c.name,
            classId: c.classId,
            power: c.power,
            level: c.level,
            message: body.message,
            stage: 'moi',
            appliedAt: new Date(),
            look: c.look,
          })
          .returning()
        await audit(tx, req, 'onboarding.claim', id, body)
        return { row, orgId: org.id }
      })
      ctx.hub.invalidate(orgId, ['applications'], null)
      reply.code(201)
      return { ok: true as const, result: { application: applicationRowToDomain(row) } }
    }),
  )
}

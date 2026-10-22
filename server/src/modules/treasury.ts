import { and, asc, desc, eq, isNull, ne } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { hasPerm, requireMember, requirePerm } from '../auth/context'
import type { DbOrTx } from '../db/client'
import * as s from '../db/schema'
import { badRequest, forbidden, notFound } from '../lib/errors'
import { newId } from '../lib/ids'
import { audit, balanceOf, credit, getMember, idempotent, logActivity, respond } from './shared'

/*
 * Bang khố: sổ cống hiến (append-only) + đấu giá chiến lợi phẩm bằng điểm cống hiến.
 * Mọi thao tác chạm tiền chạy trong transaction có khóa dòng vật phẩm (SELECT … FOR UPDATE).
 */

const vn = (n: number) => n.toLocaleString('vi-VN')

/* ---------------- Kiểm tra đầu vào ---------------- */

const Adjustment = z.object({
  memberId: z.string().min(1),
  delta: z
    .number()
    .int('Số điểm phải là số nguyên.')
    .refine((v) => v !== 0, 'Số điểm điều chỉnh phải khác 0.')
    .refine((v) => Math.abs(v) <= 100_000, 'Mỗi bút toán tối đa ±100.000.'),
  reason: z.string().trim().min(3, 'Hãy ghi rõ lý do điều chỉnh.').max(120, 'Lý do tối đa 120 ký tự.'),
})

const NewLoot = z.object({
  name: z.string().trim().min(2, 'Tên vật phẩm cần ít nhất 2 ký tự.').max(60, 'Tên vật phẩm tối đa 60 ký tự.'),
  rarity: z.enum(['lam', 'tu', 'kim', 'hong']),
  kind: z.enum(['vu-khi', 'trang-bi', 'bi-kip', 'ngoai-trang', 'nguyen-lieu']),
  source: z.string().trim().min(1).max(60),
  startPrice: z.number().int().min(1, 'Giá khởi điểm phải lớn hơn 0.').max(1_000_000, 'Giá khởi điểm tối đa 1.000.000.'),
  endsAt: z.iso.datetime({ offset: true }),
})

const NewBid = z.object({
  amount: z.number().int('Giá trả phải là số nguyên.').min(1).max(10_000_000),
  memberId: z.string().min(1).optional(),
})

/* ---------------- Luật dùng chung (route + job) ---------------- */

async function lockItem(tx: DbOrTx, guildId: string, itemId: string) {
  const rows = await tx
    .select()
    .from(s.lootItems)
    .where(and(eq(s.lootItems.id, itemId), eq(s.lootItems.guildId, guildId)))
    .for('update')
  const item = rows[0]
  if (!item) throw notFound('Không tìm thấy vật phẩm này.')
  return item
}

/** Tổng giá các phiên KHÁC đang mở mà người này đang dẫn đầu (số điểm đã "giữ chỗ"). */
async function committedElsewhere(tx: DbOrTx, guildId: string, memberId: string, exceptItemId: string) {
  const bids = await tx
    .select({ itemId: s.lootBids.itemId, memberId: s.lootBids.memberId, amount: s.lootBids.amount })
    .from(s.lootBids)
    .innerJoin(s.lootItems, eq(s.lootBids.itemId, s.lootItems.id))
    .where(and(eq(s.lootItems.guildId, guildId), eq(s.lootItems.status, 'auction'), ne(s.lootItems.id, exceptItemId)))
    .orderBy(asc(s.lootBids.itemId), desc(s.lootBids.amount), desc(s.lootBids.at))
  const top = new Map<string, { memberId: string; amount: number }>()
  for (const b of bids) if (!top.has(b.itemId)) top.set(b.itemId, b)
  let sum = 0
  for (const t of top.values()) if (t.memberId === memberId) sum += t.amount
  return sum
}

export type CloseOutcome =
  | { status: 'assigned'; winnerId: string; winnerName: string; price: number }
  | { status: 'unsold' }
  | { status: 'skipped' }

/**
 * Chốt một phiên: trao cho người trả cao nhất còn đủ số dư (nếu không đủ thì xét người kế tiếp),
 * ghi bút toán âm và nhật ký.
 * - mode 'manual' (route): lỗi rõ ràng khi chưa có ai trả giá / không ai đủ điểm.
 * - mode 'auto' (job hết giờ): không ai hợp lệ → vật phẩm "không ai nhận".
 */
export async function closeAuctionTx(
  tx: DbOrTx,
  opts: { guildId: string; itemId: string; mode: 'manual' | 'auto'; now?: Date; actorUserId?: string | null },
): Promise<CloseOutcome> {
  const now = opts.now ?? new Date()
  const item = await lockItem(tx, opts.guildId, opts.itemId)
  if (item.status !== 'auction') {
    if (opts.mode === 'auto') return { status: 'skipped' }
    throw badRequest('Phiên đấu giá đã kết thúc.')
  }
  const bids = await tx
    .select()
    .from(s.lootBids)
    .where(eq(s.lootBids.itemId, item.id))
    .orderBy(desc(s.lootBids.amount), asc(s.lootBids.at))
  if (!bids.length && opts.mode === 'manual') throw badRequest('Chưa có ai trả giá.')

  for (const b of bids) {
    const rows = await tx
      .select({ id: s.members.id, name: s.characters.name })
      .from(s.members)
      .innerJoin(s.characters, eq(s.members.characterId, s.characters.id))
      .where(and(eq(s.members.id, b.memberId), eq(s.members.guildId, opts.guildId), isNull(s.members.deletedAt)))
    const bidder = rows[0]
    if (!bidder) continue
    if ((await balanceOf(tx, bidder.id)) < b.amount) continue
    await tx
      .update(s.lootItems)
      .set({ status: 'assigned', assignedTo: bidder.id, price: b.amount, endsAt: opts.mode === 'manual' ? now : item.endsAt })
      .where(eq(s.lootItems.id, item.id))
    await credit(tx, {
      guildId: opts.guildId,
      memberId: bidder.id,
      delta: -b.amount,
      reason: `Đấu giá thắng: ${item.name}`,
      category: 'dau-gia',
      createdBy: opts.actorUserId ?? null,
    })
    await logActivity(tx, opts.guildId, 'loot', `${bidder.name} thắng đấu giá ${item.name} với ${vn(b.amount)} cống hiến`, bidder.id)
    return { status: 'assigned', winnerId: bidder.id, winnerName: bidder.name, price: b.amount }
  }

  if (opts.mode === 'manual') throw badRequest('Không người trả giá nào còn đủ điểm cống hiến.')
  await tx.update(s.lootItems).set({ status: 'assigned', assignedTo: null, price: null }).where(eq(s.lootItems.id, item.id))
  await logActivity(tx, opts.guildId, 'loot', `Phiên đấu giá ${item.name} kết thúc mà không ai nhận`)
  return { status: 'unsold' }
}

/* ---------------- Routes ---------------- */

export async function treasuryRoutes(app: FastifyInstance) {
  const { ctx } = app

  /* Bút toán điều chỉnh (sổ chỉ ghi thêm — sai thì bù bằng bút toán mới) */
  app.post('/api/ledger/adjustments', async (req, reply) =>
    idempotent(req, reply, async () => {
      const me = requirePerm(req, 'ledger.adjust')
      const body = Adjustment.parse(req.body)
      await ctx.db.transaction(async (tx) => {
        const target = await getMember(tx, req.orgId, body.memberId)
        const balance = await balanceOf(tx, target.id)
        if (balance + body.delta < 0) throw badRequest('Số dư cống hiến sẽ bị âm.')
        await credit(tx, {
          guildId: req.orgId,
          memberId: target.id,
          delta: body.delta,
          reason: `${body.reason} (duyệt: ${me.member.name})`,
          category: 'dieu-chinh',
          createdBy: me.user.id,
        })
        await audit(tx, req, 'ledger.adjust', target.id, body)
      })
      reply.code(201)
      return respond(req, ['members', 'ledger'])
    }),
  )

  /* Mở phiên đấu giá */
  app.post('/api/loot', async (req, reply) =>
    idempotent(req, reply, async () => {
      const me = requirePerm(req, 'loot.open')
      const body = NewLoot.parse(req.body)
      const endsAt = new Date(body.endsAt)
      const now = Date.now()
      if (endsAt.getTime() <= now) throw badRequest('Thời điểm kết thúc phải ở tương lai.')
      if (endsAt.getTime() > now + 30 * 86400000) throw badRequest('Phiên đấu giá dài tối đa 30 ngày.')
      const id = newId('loot')
      await ctx.db.transaction(async (tx) => {
        await tx.insert(s.lootItems).values({
          id,
          guildId: req.orgId,
          name: body.name,
          rarity: body.rarity,
          kind: body.kind,
          source: body.source,
          status: 'auction',
          startPrice: body.startPrice,
          endsAt,
          createdBy: me.user.id,
        })
        await audit(tx, req, 'loot.create', id, body)
      })
      reply.code(201)
      return respond(req, ['loot'], { id })
    }),
  )

  /* Ra giá */
  app.post('/api/loot/:id/bids', async (req, reply) =>
    idempotent(req, reply, async () => {
      const me = requireMember(req)
      if (!hasPerm(req, 'loot.bid')) throw forbidden()
      const { id } = req.params as { id: string }
      const body = NewBid.parse(req.body)
      const bidderId = body.memberId ?? me.member.id
      if (bidderId !== me.member.id && !hasPerm(req, 'loot.close')) throw forbidden('Chỉ Phó Bang Chủ trở lên mới được ra giá thay người khác.')

      await ctx.db.transaction(async (tx) => {
        const item = await lockItem(tx, req.orgId, id)
        if (item.status !== 'auction' || item.endsAt.getTime() <= Date.now()) throw badRequest('Phiên đấu giá đã kết thúc.')
        const bidder = await getMember(tx, req.orgId, bidderId)
        const top = await tx
          .select({ amount: s.lootBids.amount })
          .from(s.lootBids)
          .where(eq(s.lootBids.itemId, item.id))
          .orderBy(desc(s.lootBids.amount))
          .limit(1)
        const topAmount = top[0]?.amount
        if (topAmount === undefined && body.amount < item.startPrice) throw badRequest(`Giá khởi điểm là ${vn(item.startPrice)}.`)
        if (topAmount !== undefined && body.amount <= topAmount) throw badRequest(`Giá phải cao hơn ${vn(topAmount)}.`)
        const available = (await balanceOf(tx, bidder.id)) - (await committedElsewhere(tx, req.orgId, bidder.id, item.id))
        if (body.amount > available) throw badRequest('Không đủ điểm cống hiến (tính cả các phiên bạn đang dẫn giá).')
        await tx.insert(s.lootBids).values({ id: newId('bid'), itemId: item.id, memberId: bidder.id, amount: body.amount, at: new Date() })
        await audit(tx, req, 'loot.bid', item.id, { memberId: bidder.id, amount: body.amount })
      })
      reply.code(201)
      return respond(req, ['loot'])
    }),
  )

  /* Chốt phiên */
  app.post('/api/loot/:id/close', async (req) => {
    const me = requirePerm(req, 'loot.close')
    const { id } = req.params as { id: string }
    const outcome = await ctx.db.transaction(async (tx) => {
      const out = await closeAuctionTx(tx, { guildId: req.orgId, itemId: id, mode: 'manual', actorUserId: me.user.id })
      await audit(tx, req, 'loot.close', id, out)
      return out
    })
    return respond(req, ['loot', 'members', 'ledger', 'activities'], outcome)
  })
}

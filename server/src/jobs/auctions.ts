import { and, eq, lt } from 'drizzle-orm'
import type { AppContext } from '../context'
import * as s from '../db/schema'
import { newId } from '../lib/ids'
import { closeAuctionTx } from '../modules/treasury'

/**
 * Chốt các phiên đấu giá đã hết giờ: người trả cao nhất bị trừ cống hiến, vật phẩm chuyển "assigned".
 * Mỗi phiên trong một transaction có khóa dòng → không trừ tiền hai lần.
 * Trả về số phiên đã chốt.
 */
export async function closeExpiredAuctions(ctx: AppContext, now = new Date()): Promise<number> {
  // mọi tổ chức có Quỹ & Đấu Giá
  const expired = await ctx.db
    .select({ id: s.lootItems.id, guildId: s.lootItems.guildId })
    .from(s.lootItems)
    .where(and(eq(s.lootItems.status, 'auction'), lt(s.lootItems.endsAt, now)))
  let closed = 0
  const touched = new Set<string>()
  for (const { id, guildId } of expired) {
    try {
      const outcome = await ctx.db.transaction(async (tx) => {
        const out = await closeAuctionTx(tx, { guildId, itemId: id, mode: 'auto', now })
        if (out.status !== 'skipped')
          await tx.insert(s.auditLog).values({ id: newId('aud'), guildId, userId: null, action: 'loot.auto-close', target: id, payload: out as never, at: new Date() })
        return out
      })
      if (outcome.status !== 'skipped') {
        closed++
        touched.add(guildId)
      }
    } catch {
      // một phiên lỗi không chặn các phiên khác; lần chạy sau sẽ thử lại
    }
  }
  for (const g of touched) ctx.hub.invalidate(g, ['loot', 'members', 'ledger', 'activities'], null)
  return closed
}

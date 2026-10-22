import { eq, isNull } from 'drizzle-orm'
import type { AppContext } from '../context'
import * as s from '../db/schema'
import { isoWeekPeriod, weekStartKey } from '../lib/time'

/**
 * Reset tuần (thứ Hai 05:00): ghi power_snapshots cho tuần mới.
 * Idempotent: khóa bằng job_runs(job='weekly-reset', period=isoWeekPeriod()).
 * Cống hiến tuần là giá trị tính từ sổ cái nên không cần xóa gì.
 * Trả về true nếu lần này thực sự chạy.
 */
export async function runWeeklyReset(ctx: AppContext, now = new Date()): Promise<boolean> {
  return ctx.db.transaction(async (tx) => {
    const claimed = await tx
      .insert(s.jobRuns)
      .values({ job: 'weekly-reset', period: isoWeekPeriod(now), ranAt: new Date() })
      .onConflictDoNothing()
      .returning({ period: s.jobRuns.period })
    if (!claimed.length) return false
    // mọi nhân vật còn ở ít nhất một tổ chức (chiến lực theo nhân vật, dùng chung mọi tổ chức)
    const active = await tx
      .selectDistinct({ id: s.characters.id, power: s.characters.power })
      .from(s.characters)
      .innerJoin(s.members, eq(s.members.characterId, s.characters.id))
      .where(isNull(s.members.deletedAt))
    if (active.length) {
      const weekStart = weekStartKey(now)
      await tx
        .insert(s.powerHistory)
        .values(active.map((c) => ({ characterId: c.id, weekStart, power: c.power })))
        .onConflictDoNothing()
    }
    return true
  })
}

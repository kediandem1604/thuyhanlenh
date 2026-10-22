import type { FastifyBaseLogger } from 'fastify'
import type { AppContext } from '../context'
import { closeExpiredAuctions } from './auctions'
import { runWeeklyReset } from './weeklyReset'

/** Lập lịch trong tiến trình: mỗi phút kiểm tra reset tuần và phiên đấu giá hết giờ. */
export function startScheduler(ctx: AppContext, log: FastifyBaseLogger, intervalMs = 60_000) {
  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try {
      if (await runWeeklyReset(ctx)) {
        log.info('đã chạy reset tuần')
        ctx.hub.invalidateAll(['members'])
      }
      const closed = await closeExpiredAuctions(ctx)
      if (closed > 0) log.info({ closed }, 'đã chốt phiên đấu giá hết giờ')
    } catch (err) {
      log.error({ err }, 'job nền lỗi')
    } finally {
      running = false
    }
  }
  const timer = setInterval(tick, intervalMs)
  void tick()
  return () => clearInterval(timer)
}

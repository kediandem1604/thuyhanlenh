import { and, eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { GuildSnapshot } from '@/domain/api'
import * as s from '../src/db/schema'
import { closeExpiredAuctions } from '../src/jobs/auctions'
import { runWeeklyReset } from '../src/jobs/weeklyReset'
import { weekStartKey } from '../src/lib/time'
import { IDS, loginAs, makeTestApp, type Client, type OkBody, type TestEnv } from './helpers'

describe('job nền', () => {
  let env: TestEnv
  let elder: Client

  beforeAll(async () => {
    env = await makeTestApp()
    elder = await loginAs(env.app, IDS.elder)
  })
  afterAll(async () => env.close())

  // phiên demo kết thúc sau ít nhất 2 giờ → "now" lùi 20 phút sau chỉ chạm phiên tạo trong test
  const soon = () => new Date(Date.now() + 20 * 60000)
  const openItem = async (name: string) => {
    const res = await elder.post<OkBody<{ id: string }>>('/api/loot', {
      name,
      rarity: 'kim',
      kind: 'vu-khi',
      source: 'Thiên Lao Biện Kinh',
      startPrice: 100,
      endsAt: new Date(Date.now() + 10 * 60000).toISOString(),
    })
    return res.body.result!.id
  }

  it('tự chốt phiên hết giờ: trao cho người trả cao nhất và trừ cống hiến (chỉ một lần)', async () => {
    const id = await openItem('Mạch Đao Thử')
    const bidder = await loginAs(env.app, IDS.member)
    await bidder.post(`/api/loot/${id}/bids`, { amount: 300 })
    const before = (await elder.get<GuildSnapshot>('/api/snapshot?slices=members')).body.members.find((m) => m.id === IDS.member)!.contribution

    expect(await closeExpiredAuctions(env.app.ctx, soon())).toBe(1)
    const snap = (await elder.get<GuildSnapshot>('/api/snapshot?slices=loot,members,ledger')).body
    expect(snap.loot.find((l) => l.id === id)).toMatchObject({ status: 'assigned', assignedTo: IDS.member, price: 300 })
    expect(snap.members.find((m) => m.id === IDS.member)!.contribution).toBe(before - 300)
    expect(await closeExpiredAuctions(env.app.ctx, soon())).toBe(0)
    const debits = await env.database.db
      .select({ n: sql<number>`count(*)::int` })
      .from(s.ledgerEntries)
      .where(and(eq(s.ledgerEntries.memberId, IDS.member), eq(s.ledgerEntries.reason, 'Đấu giá thắng: Mạch Đao Thử')))
    expect(debits[0].n).toBe(1)
  })

  it('phiên hết giờ không ai trả giá → không ai nhận', async () => {
    const id = await openItem('Bí Kíp Ế')
    expect(await closeExpiredAuctions(env.app.ctx, soon())).toBe(1)
    const snap = (await elder.get<GuildSnapshot>('/api/snapshot?slices=loot')).body
    const item = snap.loot.find((l) => l.id === id)
    expect(item?.status).toBe('assigned')
    expect(item?.assignedTo).toBeUndefined()
  })

  it('không đụng tới phiên chưa hết giờ', async () => {
    const before = (await elder.get<GuildSnapshot>('/api/snapshot?slices=loot')).body.loot.filter((l) => l.status === 'auction').length
    expect(await closeExpiredAuctions(env.app.ctx, new Date())).toBe(0)
    const after = (await elder.get<GuildSnapshot>('/api/snapshot?slices=loot')).body.loot.filter((l) => l.status === 'auction').length
    expect(after).toBe(before)
  })

  it('reset tuần idempotent: chạy một lần mỗi tuần, ghi chiến lực cho tuần mới', async () => {
    const nextWeek = new Date(Date.now() + 7 * 86400000)
    expect(await runWeeklyReset(env.app.ctx, nextWeek)).toBe(true)
    expect(await runWeeklyReset(env.app.ctx, nextWeek)).toBe(false)
    const rows = await env.database.db
      .select({ n: sql<number>`count(*)::int` })
      .from(s.powerHistory)
      .where(eq(s.powerHistory.weekStart, weekStartKey(nextWeek)))
    // mọi nhân vật đang ở ít nhất một tổ chức: 46 của Kinh Hồng Các + 12 người họ Bạch (3 người ở cả hai nơi đã tính trong 12)
    expect(rows[0].n).toBe(58)
  })

  it('reset tuần hiện tại không ghi đè lịch sử đã có', async () => {
    const leader = (await elder.get<GuildSnapshot>('/api/snapshot?slices=members')).body.members.find((m) => m.id === IDS.leader)!
    expect(await runWeeklyReset(env.app.ctx, new Date())).toBe(true)
    const after = (await elder.get<GuildSnapshot>('/api/snapshot?slices=members')).body.members.find((m) => m.id === IDS.leader)!
    expect(after.powerHistory).toEqual(leader.powerHistory)
  })
})

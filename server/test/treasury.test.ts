import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { GuildSnapshot } from '@/domain/api'
import * as s from '../src/db/schema'
import { errorOf, IDS, loginAs, makeTestApp, type Client, type OkBody, type TestEnv } from './helpers'

describe('module Bang khố', () => {
  let env: TestEnv
  let deputy: Client
  let elder: Client

  beforeAll(async () => {
    env = await makeTestApp()
    deputy = await loginAs(env.app, IDS.deputy)
    elder = await loginAs(env.app, IDS.elder)
  })
  afterAll(async () => env.close())

  const balanceOf = async (id: string) =>
    (await deputy.get<GuildSnapshot>('/api/snapshot?slices=members')).body.members.find((m) => m.id === id)!.contribution

  const openItem = async (startPrice = 100, hours = 2, name = 'Ngọc Bội Thử') => {
    const res = await elder.post<OkBody<{ id: string }>>('/api/loot', {
      name,
      rarity: 'tu',
      kind: 'trang-bi',
      source: 'Liên Vân Trại',
      startPrice,
      endsAt: new Date(Date.now() + hours * 3600000).toISOString(),
    })
    expect(res.status).toBe(201)
    return res.body.result!.id
  }

  describe('điều chỉnh cống hiến', () => {
    it('Trưởng Lão không có quyền (403)', async () => {
      expect((await elder.post('/api/ledger/adjustments', { memberId: IDS.member, delta: 100, reason: 'Bù điểm' })).status).toBe(403)
    })

    it('Phó Bang ghi bút toán: số dư đổi, lý do ghi người duyệt', async () => {
      const before = await balanceOf(IDS.member)
      const res = await deputy.post<OkBody>('/api/ledger/adjustments', { memberId: IDS.member, delta: 250, reason: 'Bù điểm phó bản' })
      expect(res.status).toBe(201)
      expect(res.body.snapshot.members?.find((m) => m.id === IDS.member)?.contribution).toBe(before + 250)
      const entry = res.body.snapshot.ledger?.[0]
      expect(entry?.category).toBe('dieu-chinh')
      expect(entry?.reason).toContain('Bù điểm phó bản')
      expect(entry?.reason).toContain('duyệt:')
    })

    it('không cho số dư âm', async () => {
      const bal = await balanceOf(IDS.member)
      const res = await deputy.post('/api/ledger/adjustments', { memberId: IDS.member, delta: -(bal + 1), reason: 'Trừ quá tay' })
      expect(res.status).toBe(400)
      expect(errorOf(res).message).toBe('Số dư cống hiến sẽ bị âm.')
    })

    it('delta = 0 hoặc lý do quá ngắn → 400', async () => {
      expect((await deputy.post('/api/ledger/adjustments', { memberId: IDS.member, delta: 0, reason: 'Không gì' })).status).toBe(400)
      expect((await deputy.post('/api/ledger/adjustments', { memberId: IDS.member, delta: 5, reason: 'x' })).status).toBe(400)
    })

    it('sổ cái vẫn chỉ ghi thêm', async () => {
      await expect(env.database.db.update(s.ledgerEntries).set({ delta: 1 }).where(eq(s.ledgerEntries.memberId, IDS.member))).rejects.toThrow()
    })
  })

  describe('mở phiên đấu giá', () => {
    it('Đường Chủ không mở được (403), Trưởng Lão mở được', async () => {
      const hall = await loginAs(env.app, IDS.hall)
      const res = await hall.post('/api/loot', { name: 'Thử', rarity: 'lam', kind: 'bi-kip', source: 'x', startPrice: 100, endsAt: new Date(Date.now() + 3600000).toISOString() })
      expect(res.status).toBe(403)
      const id = await openItem()
      const snap = (await elder.get<GuildSnapshot>('/api/snapshot?slices=loot')).body
      expect(snap.loot.find((l) => l.id === id)?.status).toBe('auction')
    })

    it('thời điểm kết thúc phải ở tương lai và không quá 30 ngày', async () => {
      const body = { name: 'Thử', rarity: 'lam', kind: 'bi-kip', source: 'x', startPrice: 100 }
      expect((await elder.post('/api/loot', { ...body, endsAt: new Date(Date.now() - 60000).toISOString() })).status).toBe(400)
      expect((await elder.post('/api/loot', { ...body, endsAt: new Date(Date.now() + 31 * 86400000).toISOString() })).status).toBe(400)
    })
  })

  describe('ra giá', () => {
    it('dưới giá khởi điểm / không cao hơn giá dẫn đầu → 400', async () => {
      const id = await openItem(100)
      const rookie = await loginAs(env.app, IDS.rookie)
      const low = await rookie.post(`/api/loot/${id}/bids`, { amount: 50 })
      expect(low.status).toBe(400)
      expect(errorOf(low).message).toBe('Giá khởi điểm là 100.')
      expect((await rookie.post(`/api/loot/${id}/bids`, { amount: 100 })).status).toBe(201)
      const member = await loginAs(env.app, IDS.member)
      const same = await member.post(`/api/loot/${id}/bids`, { amount: 100 })
      expect(same.status).toBe(400)
      expect(errorOf(same).message).toBe('Giá phải cao hơn 100.')
      const ok = await member.post<OkBody>(`/api/loot/${id}/bids`, { amount: 1200 })
      expect(ok.status).toBe(201)
      expect(ok.body.snapshot.loot?.find((l) => l.id === id)?.bids.at(-1)).toMatchObject({ memberId: IDS.member, amount: 1200 })
      const higher = await rookie.post(`/api/loot/${id}/bids`, { amount: 1200 })
      expect(errorOf(higher).message).toBe('Giá phải cao hơn 1.200.')
    })

    it('phiên hết giờ → không ra giá được', async () => {
      const id = await openItem(100)
      await env.database.db.update(s.lootItems).set({ endsAt: new Date(Date.now() - 1000) }).where(eq(s.lootItems.id, id))
      const res = await (await loginAs(env.app, IDS.rookie)).post(`/api/loot/${id}/bids`, { amount: 500 })
      expect(res.status).toBe(400)
      expect(errorOf(res).message).toBe('Phiên đấu giá đã kết thúc.')
    })

    it('không được dẫn giá vượt số dư khi tính cả các phiên khác', async () => {
      const bidder = 'm042'
      const api = await loginAs(env.app, bidder)
      const bal = await balanceOf(bidder)
      // trừ phần đang "giữ chỗ" ở các phiên demo mà người này đang dẫn giá
      const loot = (await deputy.get<GuildSnapshot>('/api/snapshot?slices=loot')).body.loot
      const committed = loot
        .filter((l) => l.status === 'auction')
        .map((l) => [...l.bids].sort((p, q) => q.amount - p.amount)[0])
        .filter((top) => top?.memberId === bidder)
        .reduce((sum, top) => sum + top!.amount, 0)
      const price = Math.floor((bal - committed) * 0.6)
      const a = await openItem(price, 2, 'Bảo vật A')
      const b = await openItem(price, 2, 'Bảo vật B')
      expect((await api.post(`/api/loot/${a}/bids`, { amount: price })).status).toBe(201)
      const over = await api.post(`/api/loot/${b}/bids`, { amount: price })
      expect(over.status).toBe(400)
      expect(errorOf(over).message).toContain('tính cả các phiên bạn đang dẫn giá')
    })

    it('ra giá thay người khác cần quyền chốt phiên', async () => {
      const id = await openItem(100)
      const rookie = await loginAs(env.app, IDS.rookie)
      expect((await rookie.post(`/api/loot/${id}/bids`, { amount: 300, memberId: IDS.member })).status).toBe(403)
      const res = await deputy.post<OkBody>(`/api/loot/${id}/bids`, { amount: 300, memberId: IDS.member })
      expect(res.status).toBe(201)
      expect(res.body.snapshot.loot?.find((l) => l.id === id)?.bids.at(-1)?.memberId).toBe(IDS.member)
    })
  })

  describe('chốt phiên', () => {
    it('Đường Chủ không chốt được (403)', async () => {
      const id = await openItem(100)
      const hall = await loginAs(env.app, IDS.hall)
      expect((await hall.post(`/api/loot/${id}/close`)).status).toBe(403)
    })

    it('chưa ai trả giá → 400', async () => {
      const id = await openItem(100)
      const res = await deputy.post(`/api/loot/${id}/close`)
      expect(res.status).toBe(400)
      expect(errorOf(res).message).toBe('Chưa có ai trả giá.')
    })

    it('trao cho người trả cao nhất, trừ cống hiến, không chốt lần hai', async () => {
      const id = await openItem(100)
      const winner = 'm022'
      const before = await balanceOf(winner)
      await (await loginAs(env.app, 'm023')).post(`/api/loot/${id}/bids`, { amount: 150 })
      await (await loginAs(env.app, winner)).post(`/api/loot/${id}/bids`, { amount: 400 })
      const res = await deputy.post<OkBody>(`/api/loot/${id}/close`)
      expect(res.status).toBe(200)
      const item = res.body.snapshot.loot?.find((l) => l.id === id)
      expect(item).toMatchObject({ status: 'assigned', assignedTo: winner, price: 400 })
      expect(res.body.snapshot.members?.find((m) => m.id === winner)?.contribution).toBe(before - 400)
      expect(res.body.snapshot.ledger?.[0]).toMatchObject({ memberId: winner, delta: -400, category: 'dau-gia' })
      expect(res.body.snapshot.activities?.[0].text).toContain('thắng đấu giá Ngọc Bội Thử với 400 cống hiến')
      const again = await deputy.post(`/api/loot/${id}/close`)
      expect(again.status).toBe(400)
      expect(errorOf(again).message).toBe('Phiên đấu giá đã kết thúc.')
    })

    it('người dẫn đầu không còn đủ điểm → trao cho người kế tiếp', async () => {
      const id = await openItem(100)
      const x = 'm024'
      const y = 'm025'
      await (await loginAs(env.app, y)).post(`/api/loot/${id}/bids`, { amount: 100 })
      await (await loginAs(env.app, x)).post(`/api/loot/${id}/bids`, { amount: 200 })
      const balX = await balanceOf(x)
      await deputy.post('/api/ledger/adjustments', { memberId: x, delta: -(balX - 150), reason: 'Rút bớt để thử' })
      const res = await deputy.post<OkBody>(`/api/loot/${id}/close`)
      expect(res.status).toBe(200)
      expect(res.body.snapshot.loot?.find((l) => l.id === id)).toMatchObject({ assignedTo: y, price: 100 })
    })
  })

  it('mọi thao tác đều có dấu vết trong audit_log', async () => {
    const rows = await env.database.db.select({ n: sql<number>`count(*)::int` }).from(s.auditLog).where(eq(s.auditLog.action, 'loot.close'))
    expect(rows[0].n).toBeGreaterThan(0)
  })
})

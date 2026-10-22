import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { GuildSnapshot } from '@/domain/api'
import { errorOf, IDS, loginAs, makeTestApp, type Client, type OkBody, type TestEnv } from './helpers'

describe('module Bang chiến', () => {
  let env: TestEnv
  let hall: Client
  beforeAll(async () => {
    env = await makeTestApp()
    hall = await loginAs(env.app, IDS.hall)
  })
  afterAll(async () => env.close())

  const line = (memberId: string, k = 5) => ({ memberId, k, d: 1, a: 3, dmg: 1_200_000, heal: 0 })
  const base = () => ({
    date: new Date(Date.now() - 3600000).toISOString(),
    opponent: 'Thiên Hạ Hội',
    result: 'win' as const,
    score: [4, 1] as [number, number],
    mode: 'bang-chien' as const,
    mvpId: 'm020',
    lines: [line('m020', 9), line('m021', 2)],
  })
  const balances = async (api: Client) =>
    Object.fromEntries((await api.get<GuildSnapshot>('/api/snapshot?slices=members')).body.members.map((m) => [m.id, m.contribution]))

  it('Đường Chủ ghi trận thắng: mỗi người +200 cống hiến, có nhật ký', async () => {
    const before = await balances(hall)
    const res = await hall.post<OkBody<{ id: string }>>('/api/wars', base())
    expect(res.status).toBe(201)
    const war = res.body.snapshot.wars?.find((w) => w.id === res.body.result!.id)
    expect(war?.opponent).toBe('Thiên Hạ Hội')
    expect(war?.lines).toHaveLength(2)
    const after = Object.fromEntries(res.body.snapshot.members!.map((m) => [m.id, m.contribution]))
    expect(after.m020 - before.m020).toBe(200)
    expect(after.m021 - before.m021).toBe(200)
    expect(res.body.snapshot.ledger?.[0].category).toBe('bang-chien')
    expect(res.body.snapshot.activities?.[0].text).toBe('Thắng bang chiến trước Thiên Hạ Hội (4 - 1)')
    expect(res.body.snapshot.activities?.[0].memberId).toBe('m020')
  })

  it('trận thua: mỗi người +120', async () => {
    const before = await balances(hall)
    const res = await hall.post<OkBody>('/api/wars', { ...base(), result: 'lose', score: [1, 3] })
    expect(res.status).toBe(201)
    const after = Object.fromEntries(res.body.snapshot.members!.map((m) => [m.id, m.contribution]))
    expect(after.m021 - before.m021).toBe(120)
    expect(res.body.snapshot.activities?.[0].text).toContain('Thua bang chiến')
  })

  it('Thành Viên không được ghi trận (403)', async () => {
    const api = await loginAs(env.app, IDS.member)
    expect((await api.post('/api/wars', base())).status).toBe(403)
  })

  it('tỉ số phải khớp kết quả', async () => {
    const win = await hall.post('/api/wars', { ...base(), score: [1, 2] })
    expect(win.status).toBe(400)
    expect(errorOf(win).message).toContain('Thắng thì điểm của ta phải cao hơn')
    expect((await hall.post('/api/wars', { ...base(), result: 'draw', score: [2, 1] })).status).toBe(400)
    expect((await hall.post('/api/wars', { ...base(), result: 'draw', score: [2, 2] })).status).toBe(201)
  })

  it('MVP phải nằm trong danh sách tham chiến', async () => {
    const res = await hall.post('/api/wars', { ...base(), mvpId: 'm030' })
    expect(res.status).toBe(400)
    expect(errorOf(res).message).toContain('MVP')
  })

  it('không cho một người hai dòng chiến tích', async () => {
    const res = await hall.post('/api/wars', { ...base(), lines: [line('m020'), line('m020')] })
    expect(res.status).toBe(400)
  })

  it('người tham chiến phải còn trong bang', async () => {
    const res = await hall.post('/api/wars', { ...base(), mvpId: 'khong-co', lines: [line('khong-co')] })
    expect(res.status).toBe(400)
    expect(errorOf(res).message).toContain('không còn trong bang')
  })

  it('không ghi trận ở tương lai', async () => {
    const res = await hall.post('/api/wars', { ...base(), date: new Date(Date.now() + 3 * 3600000).toISOString() })
    expect(res.status).toBe(400)
  })

  it('chỉ số âm bị từ chối', async () => {
    const res = await hall.post('/api/wars', { ...base(), lines: [{ ...line('m020'), k: -1 }, line('m021')] })
    expect(res.status).toBe(400)
  })
})

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { GuildSnapshot } from '@/domain/api'
import { errorOf, IDS, loginAs, makeTestApp, type OkBody, type TestEnv } from './helpers'

describe('module Tình duyên', () => {
  let env: TestEnv
  let snap: GuildSnapshot

  const bond = (body: OkBody, id: string) => body.snapshot.bonds?.find((b) => b.id === id)
  /** môn hạ chưa có bất kỳ mối duyên nào */
  const singles = () => {
    const taken = new Set(snap.bonds.flatMap((b) => [b.aId, b.bId]))
    return snap.members.filter((m) => !taken.has(m.id)).map((m) => m.id)
  }

  beforeAll(async () => {
    env = await makeTestApp()
    const api = await loginAs(env.app, IDS.leader)
    snap = (await api.get<GuildSnapshot>('/api/snapshot')).body
  })
  afterAll(async () => env.close())

  it('tự kết tri kỷ với người khác → 201 + nhật ký', async () => {
    const [a, b] = singles()
    const api = await loginAs(env.app, a)
    const res = await api.post<OkBody<{ id: string }>>('/api/bonds', { aId: a, bId: b, type: 'tri-ky', note: 'Cầm tiêu hợp tấu' })
    expect(res.status).toBe(201)
    const created = bond(res.body, res.body.result!.id)!
    expect(created.type).toBe('tri-ky')
    expect(created.intimacy).toBe(0)
    expect(created.note).toBe('Cầm tiêu hợp tấu')
    expect(res.body.snapshot.activities?.[0].type).toBe('bond')
    expect(res.body.snapshot.activities?.[0].text).toContain('kết thành tri kỷ')
    snap.bonds.push(created)
  })

  it('không se duyên hộ người khác nếu chưa đủ quyền (403)', async () => {
    const [a, b, c] = singles()
    const api = await loginAs(env.app, c)
    const res = await api.post('/api/bonds', { aId: a, bId: b, type: 'ket-nghia', note: '' })
    expect(res.status).toBe(403)
  })

  it('Trưởng Lão se duyên hộ được (bond.manage)', async () => {
    const [a, b] = singles().filter((id) => id !== IDS.elder)
    const api = await loginAs(env.app, IDS.elder)
    const res = await api.post<OkBody<{ id: string }>>('/api/bonds', { aId: a, bId: b, type: 'ket-nghia', note: '' })
    expect(res.status).toBe(201)
    expect(res.body.snapshot.activities?.[0].text).toContain('huynh đệ kết nghĩa')
    snap.bonds.push(bond(res.body, res.body.result!.id)!)
  })

  it('cùng một người → 400', async () => {
    const [a] = singles()
    const api = await loginAs(env.app, a)
    const res = await api.post('/api/bonds', { aId: a, bId: a, type: 'tri-ky', note: '' })
    expect(res.status).toBe(400)
    expect(errorOf(res).message).toBe('Hãy chọn hai người khác nhau.')
  })

  it('đã có quan hệ (đảo thứ tự cũng tính) → 400', async () => {
    const existing = snap.bonds[0]
    const api = await loginAs(env.app, existing.bId)
    const res = await api.post('/api/bonds', { aId: existing.bId, bId: existing.aId, type: 'ket-nghia', note: '' })
    expect(res.status).toBe(400)
    expect(errorOf(res).message).toBe('Hai người này đã có quan hệ rồi.')
  })

  it('người đã thành thân không kết phu thê lần nữa', async () => {
    const married = snap.bonds.find((b) => b.type === 'phu-the')!
    const [single] = singles()
    const api = await loginAs(env.app, single)
    const res = await api.post('/api/bonds', { aId: single, bId: married.aId, type: 'phu-the', note: '' })
    expect(res.status).toBe(400)
    expect(errorOf(res).message).toBe('Một trong hai người đã thành thân.')
  })

  it('lời nhắn quá 200 ký tự → 400', async () => {
    const [a, b] = singles()
    const api = await loginAs(env.app, a)
    const res = await api.post('/api/bonds', { aId: a, bId: b, type: 'tri-ky', note: 'x'.repeat(201) })
    expect(res.status).toBe(400)
  })

  it('kết phu thê hợp lệ', async () => {
    const [a, b] = singles()
    const api = await loginAs(env.app, a)
    const res = await api.post<OkBody<{ id: string }>>('/api/bonds', { aId: a, bId: b, type: 'phu-the', note: 'Bách niên giai lão' })
    expect(res.status).toBe(201)
    expect(res.body.snapshot.activities?.[0].text).toContain('kết thành phu thê')
    snap.bonds.push(bond(res.body, res.body.result!.id)!)
  })

  describe('tặng hoa & giải trừ', () => {
    it('người trong cuộc tặng hoa: thân mật tăng đúng lượng', async () => {
      const b = snap.bonds.find((x) => x.type === 'phu-the')!
      const api = await loginAs(env.app, b.aId)
      const res = await api.post(`/api/bonds/${b.id}/intimacy`, { amount: 99 })
      expect(res.status).toBe(200)
      expect(bond(res.body, b.id)!.intimacy).toBe(b.intimacy + 99)
    })

    it('lượng ngoài khoảng 1…999 → 400', async () => {
      const b = snap.bonds[0]
      const api = await loginAs(env.app, b.aId)
      expect((await api.post(`/api/bonds/${b.id}/intimacy`, { amount: 0 })).status).toBe(400)
      expect((await api.post(`/api/bonds/${b.id}/intimacy`, { amount: 1000 })).status).toBe(400)
    })

    it('người ngoài không tặng hoa được (403)', async () => {
      const b = snap.bonds[0]
      const outsider = snap.members.find((m) => m.id !== b.aId && m.id !== b.bId && m.rank === 'thanh-vien')!
      const api = await loginAs(env.app, outsider.id)
      expect((await api.post(`/api/bonds/${b.id}/intimacy`, { amount: 5 })).status).toBe(403)
      expect((await api.del(`/api/bonds/${b.id}`)).status).toBe(403)
    })

    it('mối duyên không tồn tại → 404', async () => {
      const api = await loginAs(env.app, IDS.leader)
      expect((await api.post('/api/bonds/khong-co/intimacy', { amount: 5 })).status).toBe(404)
    })

    it('người trong cuộc giải trừ được; Trưởng Lão giải trừ hộ được', async () => {
      const [b1, b2] = snap.bonds.filter((b) => b.aId !== IDS.elder && b.bId !== IDS.elder)
      const self = await loginAs(env.app, b1.bId)
      const r1 = await self.del(`/api/bonds/${b1.id}`)
      expect(r1.status).toBe(200)
      expect(bond(r1.body, b1.id)).toBeUndefined()
      const elder = await loginAs(env.app, IDS.elder)
      const r2 = await elder.del(`/api/bonds/${b2.id}`)
      expect(r2.status).toBe(200)
      expect(bond(r2.body, b2.id)).toBeUndefined()
    })
  })
})

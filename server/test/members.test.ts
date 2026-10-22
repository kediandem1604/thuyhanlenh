import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { GuildSnapshot } from '@/domain/api'
import { errorOf, IDS, loginAs, makeTestApp, type OkBody, type TestEnv } from './helpers'

describe('module Thành viên', () => {
  let env: TestEnv
  beforeAll(async () => {
    env = await makeTestApp()
  })
  afterAll(async () => env.close())

  const findMember = (body: OkBody, id: string) => body.snapshot.members?.find((m) => m.id === id)

  it('Trưởng Lão thêm thành viên; snapshot trả về có người mới + nhật ký', async () => {
    const api = await loginAs(env.app, IDS.elder)
    const res = await api.post<OkBody<{ id: string }>>('/api/members', { name: 'Vân Du Tử', classId: 'to-van', power: 150000 })
    expect(res.status).toBe(201)
    const created = findMember(res.body, res.body.result!.id)
    expect(created?.rank).toBe('tan-binh')
    expect(created?.powerHistory[7]).toBe(150000)
    expect(res.body.snapshot.activities?.[0].text).toContain('Vân Du Tử')
  })

  it('Thành Viên không được thêm người (403)', async () => {
    const api = await loginAs(env.app, IDS.member)
    const res = await api.post('/api/members', { name: 'Ai Đó', classId: 'to-van' })
    expect(res.status).toBe(403)
  })

  it('trùng tên (không phân biệt hoa thường) → 409', async () => {
    const api = await loginAs(env.app, IDS.elder)
    const res = await api.post('/api/members', { name: 'dạ lăng phong', classId: 'to-van' })
    expect(res.status).toBe(409)
  })

  it('dữ liệu sai → 400 kèm thông báo', async () => {
    const api = await loginAs(env.app, IDS.elder)
    const res = await api.post('/api/members', { name: 'A', classId: 'khong-co' })
    expect(res.status).toBe(400)
    expect(errorOf(res).code).toBe('invalid')
  })

  it('tự sửa danh hiệu / tạo hình được, tự sửa chiến lực thì không', async () => {
    const api = await loginAs(env.app, IDS.rookie)
    const ok = await api.patch('/api/members/' + IDS.rookie, { title: 'Kiếm Khách Mới' })
    expect(ok.status).toBe(200)
    expect(findMember(ok.body, IDS.rookie)?.title).toBe('Kiếm Khách Mới')
    const denied = await api.patch('/api/members/' + IDS.rookie, { power: 999999 })
    expect(denied.status).toBe(403)
  })

  it('đổi chiến lực (nhân vật chưa có chủ) cập nhật lịch sử tuần này', async () => {
    const api = await loginAs(env.app, IDS.elder)
    const res = await api.patch('/api/members/m027', { power: 260000 })
    expect(res.status).toBe(200)
    expect(findMember(res.body, 'm027')?.powerHistory[7]).toBe(260000)
  })

  it('nhân vật đã có chủ tài khoản: người khác không sửa được chiến lực (nhân vật dùng chung)', async () => {
    await loginAs(env.app, 'm028') // m028 giờ có chủ
    const api = await loginAs(env.app, IDS.elder)
    const res = await api.patch('/api/members/m028', { power: 999999 })
    expect(res.status).toBe(403)
    expect(errorOf(res).message).toContain('đã có chủ')
  })

  it('Trưởng Lão không sửa được hồ sơ Phó Bang (cao hơn mình)', async () => {
    const api = await loginAs(env.app, IDS.elder)
    const res = await api.patch('/api/members/' + IDS.deputy, { bio: 'hack' })
    expect(res.status).toBe(403)
  })

  describe('bổ nhiệm', () => {
    it('Phó Bang bổ nhiệm Đường Chủ xuống Tinh Anh', async () => {
      const api = await loginAs(env.app, IDS.deputy)
      const res = await api.put('/api/members/' + IDS.hall + '/rank', { rank: 'tinh-anh' })
      expect(res.status).toBe(200)
      expect(findMember(res.body, IDS.hall)?.rank).toBe('tinh-anh')
    })

    it('chức đã đủ người → 409', async () => {
      const api = await loginAs(env.app, IDS.deputy)
      const res = await api.put('/api/members/' + IDS.elite + '/rank', { rank: 'truong-lao' })
      expect(res.status).toBe(409)
      expect(errorOf(res).message).toContain('Trưởng Lão')
    })

    it('Phó Bang không được phong Phó Bang', async () => {
      const api = await loginAs(env.app, IDS.deputy)
      const res = await api.put('/api/members/' + IDS.elite + '/rank', { rank: 'pho-bang-chu' })
      expect(res.status).toBe(403)
    })

    it('Tinh Anh không có quyền bổ nhiệm', async () => {
      const api = await loginAs(env.app, IDS.elite)
      const res = await api.put('/api/members/' + IDS.rookie + '/rank', { rank: 'thanh-vien' })
      expect(res.status).toBe(403)
    })

    it('Bang Chủ truyền ngôi: người nhận thành Bang Chủ, mình lui về Phó Bang', async () => {
      const api = await loginAs(env.app, IDS.leader)
      const res = await api.put('/api/members/' + IDS.deputy + '/rank', { rank: 'bang-chu' })
      expect(res.status).toBe(200)
      expect(findMember(res.body, IDS.deputy)?.rank).toBe('bang-chu')
      expect(findMember(res.body, IDS.leader)?.rank).toBe('pho-bang-chu')
      expect(res.body.snapshot.members?.filter((m) => m.rank === 'bang-chu')).toHaveLength(1)
    })
  })

  describe('trục xuất', () => {
    it('không tự trục xuất mình, không trục xuất người cao hơn', async () => {
      const api = await loginAs(env.app, IDS.deputy2)
      expect((await api.del('/api/members/' + IDS.deputy2)).status).toBe(403)
      expect((await api.del('/api/members/' + IDS.deputy)).status).toBe(403)
    })

    it('trục xuất: biến khỏi danh sách, sổ cái vẫn giữ, đăng nhập lại thành khách', async () => {
      const victim = 'm030'
      const victimApi = await loginAs(env.app, victim)
      const api = await loginAs(env.app, IDS.deputy2)
      const res = await api.del('/api/members/' + victim)
      expect(res.status).toBe(200)
      expect(findMember(res.body, victim)).toBeUndefined()
      const snap = (await api.get<GuildSnapshot>('/api/snapshot?slices=ledger')).body
      expect(snap.ledger.some((l) => l.memberId === victim)).toBe(true)
      const me = await victimApi.get<{ member: unknown }>('/api/me')
      expect(me.body.member).toBeNull()
    })
  })
})

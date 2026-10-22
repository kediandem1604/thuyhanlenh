import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { GuildSnapshot } from '@/domain/api'
import { errorOf, IDS, loginAs, makeTestApp, type Client, type OkBody, type TestEnv } from './helpers'

describe('module Chiêu mộ', () => {
  let env: TestEnv
  let elder: Client
  beforeAll(async () => {
    env = await makeTestApp()
    elder = await loginAs(env.app, IDS.elder)
  })
  afterAll(async () => env.close())

  const newApp = (name: string) => ({ name, classId: 'to-van', power: 180000, level: 70, message: 'Mong được gia nhập bang.' })

  it('Trưởng Lão thêm đơn thủ công → cột Đơn mới, có tạo hình', async () => {
    const res = await elder.post<OkBody<{ id: string }>>('/api/applications', newApp('Lạc Hà Cô Vụ'))
    expect(res.status).toBe(201)
    const created = res.body.snapshot.applications?.find((a) => a.id === res.body.result!.id)
    expect(created?.stage).toBe('moi')
    expect(created?.kind).toBe('join')
    expect(created?.hasAccount).toBe(false)
    expect(created?.look.gender).toMatch(/nam|nu/)
  })

  it('người tiến cử không tồn tại → 404', async () => {
    const res = await elder.post('/api/applications', { ...newApp('Tiến Cử Ma'), referrerId: 'khong-co' })
    expect(res.status).toBe(404)
  })

  it('Thành Viên không được thêm / duyệt đơn (403)', async () => {
    const member = await loginAs(env.app, IDS.member)
    expect((await member.post('/api/applications', newApp('Ai Đó Nữa'))).status).toBe(403)
    const snap = (await member.get<GuildSnapshot>('/api/snapshot?slices=applications')).body
    const pending = snap.applications.find((a) => a.stage === 'moi')!
    expect((await member.patch(`/api/applications/${pending.id}/stage`, { stage: 'phong-van' })).status).toBe(403)
    expect((await member.post(`/api/applications/${pending.id}/accept`)).status).toBe(403)
  })

  it('chuyển cột: được đi qua các vòng, không được kéo vào / ra khỏi Chấp nhận', async () => {
    const created = await elder.post<OkBody<{ id: string }>>('/api/applications', newApp('Vân Gian Nguyệt'))
    const id = created.body.result!.id
    const moved = await elder.patch(`/api/applications/${id}/stage`, { stage: 'thu-thach' })
    expect(moved.status).toBe(200)
    expect(moved.body.snapshot.applications?.find((a) => a.id === id)?.stage).toBe('thu-thach')
    const toAccepted = await elder.patch(`/api/applications/${id}/stage`, { stage: 'chap-nhan' })
    expect(toAccepted.status).toBe(400)
    expect(errorOf(toAccepted).message).toContain('Chấp nhận')
    await elder.post(`/api/applications/${id}/accept`)
    const fromAccepted = await elder.patch(`/api/applications/${id}/stage`, { stage: 'moi' })
    expect(fromAccepted.status).toBe(400)
    expect(errorOf(fromAccepted).message).toContain('đã được chấp nhận')
  })

  it('chấp nhận đơn → tạo môn hạ tân binh giữ đúng tạo hình, ghi nhật ký', async () => {
    const created = await elder.post<OkBody<{ id: string }>>('/api/applications', newApp('Thanh Phong Minh Nguyệt'))
    const id = created.body.result!.id
    const look = created.body.snapshot.applications?.find((a) => a.id === id)?.look
    const res = await elder.post<OkBody<{ memberId: string }>>(`/api/applications/${id}/accept`)
    expect(res.status).toBe(200)
    const member = res.body.snapshot.members?.find((m) => m.id === res.body.result!.memberId)
    expect(member?.name).toBe('Thanh Phong Minh Nguyệt')
    expect(member?.rank).toBe('tan-binh')
    expect(member?.look).toEqual(look)
    expect(res.body.snapshot.applications?.find((a) => a.id === id)?.stage).toBe('chap-nhan')
    expect(res.body.snapshot.activities?.[0].text).toContain('Thanh Phong Minh Nguyệt')
    // chấp nhận lần hai bị chặn
    expect((await elder.post(`/api/applications/${id}/accept`)).status).toBe(409)
  })

  it('chấp nhận đơn trùng tên môn hạ đang có → 409', async () => {
    const created = await elder.post<OkBody<{ id: string }>>('/api/applications', newApp('Dạ Lăng Phong'))
    const res = await elder.post(`/api/applications/${created.body.result!.id}/accept`)
    expect(res.status).toBe(409)
  })

  it('đơn không tồn tại → 404', async () => {
    expect((await elder.post('/api/applications/khong-co/accept')).status).toBe(404)
  })
})

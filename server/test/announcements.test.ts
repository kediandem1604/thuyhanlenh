import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { errorOf, IDS, loginAs, makeTestApp, type Client, type OkBody, type TestEnv } from './helpers'

describe('module Bảng cáo thị', () => {
  let env: TestEnv
  let elder: Client
  beforeAll(async () => {
    env = await makeTestApp()
    elder = await loginAs(env.app, IDS.elder)
  })
  afterAll(async () => env.close())

  const body = { title: 'Tập trung bang chiến tối nay', body: 'Tất cả có mặt lúc 19:45 tại Bang Hội Đường.', tag: 'su-kien' }

  it('Trưởng Lão đăng cáo thị → có trong snapshot, tác giả là mình, chưa ghim', async () => {
    const res = await elder.post<OkBody<{ id: string }>>('/api/announcements', body)
    expect(res.status).toBe(201)
    const created = res.body.snapshot.announcements?.find((a) => a.id === res.body.result!.id)
    expect(created?.authorId).toBe(IDS.elder)
    expect(created?.pinned).toBe(false)
    expect(created?.tag).toBe('su-kien')
  })

  it('ghim rồi bỏ ghim', async () => {
    const created = await elder.post<OkBody<{ id: string }>>('/api/announcements', { ...body, title: 'Ghim thử nghiệm' })
    const id = created.body.result!.id
    const pinned = await elder.patch(`/api/announcements/${id}/pin`)
    expect(pinned.body.snapshot.announcements?.find((a) => a.id === id)?.pinned).toBe(true)
    const unpinned = await elder.patch(`/api/announcements/${id}/pin`)
    expect(unpinned.body.snapshot.announcements?.find((a) => a.id === id)?.pinned).toBe(false)
  })

  it('gỡ cáo thị', async () => {
    const created = await elder.post<OkBody<{ id: string }>>('/api/announcements', { ...body, title: 'Sẽ bị gỡ' })
    const id = created.body.result!.id
    const res = await elder.del(`/api/announcements/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.snapshot.announcements?.some((a) => a.id === id)).toBe(false)
    expect((await elder.del(`/api/announcements/${id}`)).status).toBe(404)
  })

  it('Đường Chủ trở xuống không được đăng / ghim / gỡ (403)', async () => {
    const hall = await loginAs(env.app, IDS.hall)
    expect((await hall.post('/api/announcements', body)).status).toBe(403)
    const created = await elder.post<OkBody<{ id: string }>>('/api/announcements', { ...body, title: 'Không ai gỡ được' })
    expect((await hall.patch(`/api/announcements/${created.body.result!.id}/pin`)).status).toBe(403)
    expect((await hall.del(`/api/announcements/${created.body.result!.id}`)).status).toBe(403)
  })

  it('dữ liệu sai → 400', async () => {
    const res = await elder.post('/api/announcements', { title: 'A', body: '', tag: 'linh-tinh' })
    expect(res.status).toBe(400)
    expect(errorOf(res).code).toBe('invalid')
  })
})

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { errorOf, IDS, loginAs, makeTestApp, type Client, type OkBody, type TestEnv } from './helpers'

describe('module Đội hình', () => {
  let env: TestEnv
  let hall: Client
  const slots = ['m008', 'm014', null, 'm026', 'm041', null]

  beforeAll(async () => {
    env = await makeTestApp()
    hall = await loginAs(env.app, IDS.hall)
  })
  afterAll(async () => env.close())

  it('Đường Chủ lưu mẫu mới, rồi cập nhật đúng mẫu đó', async () => {
    const created = await hall.post<OkBody<{ id: string }>>('/api/teams', { name: 'Tổ xung phong', dungeonId: 'trich-tien-kinh-dao', slots })
    expect(created.status).toBe(201)
    const id = created.body.result!.id
    const team = created.body.snapshot.teams?.find((t) => t.id === id)
    expect(team?.slots).toEqual(slots)
    expect(team?.dungeonId).toBe('trich-tien-kinh-dao')

    const updated = await hall.post<OkBody<{ id: string }>>('/api/teams', { id, name: 'Tổ xung phong v2', dungeonId: 'trich-tien-kinh-dao', slots: ['m008', null, null, null, null, null] })
    expect(updated.status).toBe(200)
    expect(updated.body.result!.id).toBe(id)
    const again = updated.body.snapshot.teams?.filter((t) => t.id === id)
    expect(again).toHaveLength(1)
    expect(again?.[0].name).toBe('Tổ xung phong v2')
  })

  it('Tinh Anh không lưu được mẫu (403)', async () => {
    const api = await loginAs(env.app, IDS.elite)
    expect((await api.post('/api/teams', { name: 'Thử', slots })).status).toBe(403)
  })

  it('dữ liệu sai → 400 / 404', async () => {
    expect((await hall.post('/api/teams', { name: '', slots })).status).toBe(400)
    expect((await hall.post('/api/teams', { name: 'Trùng', slots: ['m008', 'm008'] })).status).toBe(400)
    expect((await hall.post('/api/teams', { name: 'Lạ', slots: ['m999'] })).status).toBe(400)
    expect((await hall.post('/api/teams', { name: 'Sai phó bản', dungeonId: 'khong-co', slots })).status).toBe(400)
    // đoàn đông nhất trong game là 12 người
    expect((await hall.post('/api/teams', { name: 'Quá dài', slots: Array(13).fill(null) })).status).toBe(400)
    // tổ 6 người không xếp được 12 vị trí
    const big = await hall.post('/api/teams', { name: 'Lố sĩ số', dungeonId: 'trich-tien-kinh-dao', slots: Array(12).fill(null) })
    expect(big.status).toBe(400)
    expect(errorOf(big).message).toContain('6 người')
    expect((await hall.post('/api/teams', { id: 'khong-co', name: 'Cập nhật', slots })).status).toBe(404)
  })

  it('xóa mẫu đội hình', async () => {
    const id = (await hall.post<OkBody<{ id: string }>>('/api/teams', { name: 'Tạm', slots })).body.result!.id
    const rookie = await loginAs(env.app, IDS.rookie)
    expect((await rookie.del(`/api/teams/${id}`)).status).toBe(403)
    const res = await hall.del<OkBody>(`/api/teams/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.snapshot.teams?.some((t) => t.id === id)).toBe(false)
    expect((await hall.del(`/api/teams/${id}`)).status).toBe(404)
  })
})

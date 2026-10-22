import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { GuildEvent } from '@/domain/types'
import { errorOf, IDS, loginAs, makeTestApp, type Client, type OkBody, type TestEnv } from './helpers'

describe('module Sự kiện + điểm danh', () => {
  let env: TestEnv
  let hall: Client
  const inDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString()
  const newEvent = (over: Record<string, unknown> = {}) => ({
    type: 'raid',
    title: 'Thử nghiệm Thiên Lao',
    start: inDays(2),
    durationMin: 90,
    location: 'Cổng Thiên Lao',
    leaderId: IDS.hall,
    capacity: 3,
    note: 'Mang thuốc',
    ...over,
  })
  const findEvent = (body: OkBody, id: string) => body.snapshot.events?.find((e) => e.id === id) as GuildEvent

  beforeAll(async () => {
    env = await makeTestApp()
    hall = await loginAs(env.app, IDS.hall)
  })
  afterAll(async () => env.close())

  async function create(over: Record<string, unknown> = {}) {
    const res = await hall.post<OkBody<{ id: string }>>('/api/events', newEvent(over))
    expect(res.status).toBe(201)
    return res
  }

  it('Đường Chủ tạo sự kiện: chỉ huy tự điểm danh, có nhật ký', async () => {
    const res = await create()
    const ev = findEvent(res.body, res.body.result!.id)
    expect(ev.title).toBe('Thử nghiệm Thiên Lao')
    expect(ev.rsvp[IDS.hall]).toBe('yes')
    expect(res.body.snapshot.activities?.[0].text).toContain('Sự kiện mới')
  })

  it('Tinh Anh không tạo được sự kiện (403)', async () => {
    const api = await loginAs(env.app, IDS.elite)
    expect((await api.post('/api/events', newEvent())).status).toBe(403)
  })

  it('dữ liệu sai → 400', async () => {
    expect((await hall.post('/api/events', newEvent({ title: 'A' }))).status).toBe(400)
    expect((await hall.post('/api/events', newEvent({ durationMin: 5 }))).status).toBe(400)
    expect((await hall.post('/api/events', newEvent({ capacity: 0 }))).status).toBe(400)
    expect((await hall.post('/api/events', newEvent({ type: 'karaoke' }))).status).toBe(400)
    expect((await hall.post('/api/events', newEvent({ start: 'ngày mai' }))).status).toBe(400)
    expect((await hall.post('/api/events', newEvent({ leaderId: 'm999' }))).status).toBe(404)
  })

  it('điểm danh cho mình, đổi trạng thái, hủy', async () => {
    const id = (await create()).body.result!.id
    const rookie = await loginAs(env.app, IDS.rookie)
    let res = await rookie.put<OkBody>(`/api/events/${id}/rsvp`, { status: 'maybe' })
    expect(res.status).toBe(200)
    expect(findEvent(res.body, id).rsvp[IDS.rookie]).toBe('maybe')
    res = await rookie.put<OkBody>(`/api/events/${id}/rsvp`, { status: 'yes' })
    expect(findEvent(res.body, id).rsvp[IDS.rookie]).toBe('yes')
    res = await rookie.put<OkBody>(`/api/events/${id}/rsvp`, { status: null })
    expect(findEvent(res.body, id).rsvp[IDS.rookie]).toBeUndefined()
  })

  it('đủ người thì từ chối "yes" (409) nhưng vẫn cho "Có thể"', async () => {
    const id = (await create({ capacity: 2 })).body.result!.id
    const a = await loginAs(env.app, 'm030')
    const b = await loginAs(env.app, 'm031')
    expect((await a.put(`/api/events/${id}/rsvp`, { status: 'yes' })).status).toBe(200)
    const full = await b.put(`/api/events/${id}/rsvp`, { status: 'yes' })
    expect(full.status).toBe(409)
    expect(errorOf(full).message).toBe('Sự kiện đã đủ người.')
    expect((await b.put(`/api/events/${id}/rsvp`, { status: 'maybe' })).status).toBe(200)
    // người đã "yes" đổi lại "yes" không bị tính trùng
    expect((await a.put(`/api/events/${id}/rsvp`, { status: 'yes' })).status).toBe(200)
  })

  it('không điểm danh sự kiện đã kết thúc (400)', async () => {
    const id = (await create({ start: inDays(-2), durationMin: 60 })).body.result!.id
    const rookie = await loginAs(env.app, IDS.rookie)
    const res = await rookie.put(`/api/events/${id}/rsvp`, { status: 'yes' })
    expect(res.status).toBe(400)
    expect(errorOf(res).message).toBe('Sự kiện đã kết thúc.')
  })

  it('điểm danh hộ người khác cần quyền Đường Chủ', async () => {
    const id = (await create()).body.result!.id
    const rookie = await loginAs(env.app, IDS.rookie)
    expect((await rookie.put(`/api/events/${id}/rsvp`, { status: 'yes', memberId: 'm042' })).status).toBe(403)
    const res = await hall.put<OkBody>(`/api/events/${id}/rsvp`, { status: 'maybe', memberId: 'm042' })
    expect(res.status).toBe(200)
    expect(findEvent(res.body, id).rsvp['m042']).toBe('maybe')
  })

  it('xóa sự kiện: Tân Binh bị chặn, Đường Chủ xóa được', async () => {
    const id = (await create()).body.result!.id
    const rookie = await loginAs(env.app, IDS.rookie)
    expect((await rookie.del(`/api/events/${id}`)).status).toBe(403)
    const res = await hall.del<OkBody>(`/api/events/${id}`)
    expect(res.status).toBe(200)
    expect(findEvent(res.body, id)).toBeUndefined()
    expect((await hall.del(`/api/events/${id}`)).status).toBe(404)
  })

  it('sự kiện không tồn tại → 404', async () => {
    const rookie = await loginAs(env.app, IDS.rookie)
    expect((await rookie.put('/api/events/khong-co/rsvp', { status: 'yes' })).status).toBe(404)
  })
})

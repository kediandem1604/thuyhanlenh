import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { GuildSnapshot } from '@/domain/api'
import { errorOf, IDS, loginAs, makeTestApp, type Client, type OkBody, type TestEnv } from './helpers'

type ClearResult = { firstKill: boolean; newRecord: boolean }

describe('module Phó bản — ghi nhận lượt clear', () => {
  let env: TestEnv
  let hall: Client
  const team6 = ['m008', 'm014', 'm015', 'm026', 'm041', 'm027']
  const team12 = Array.from({ length: 12 }, (_, i) => `m${String(i + 1).padStart(3, '0')}`)

  beforeAll(async () => {
    env = await makeTestApp()
    hall = await loginAs(env.app, IDS.hall)
  })
  afterAll(async () => env.close())

  const balance = async (api: Client, id: string) => {
    const snap = (await api.get<GuildSnapshot>('/api/snapshot?slices=members')).body
    return snap.members.find((m) => m.id === id)!.contribution
  }

  it('Tinh Anh không có quyền ghi nhận (403)', async () => {
    const api = await loginAs(env.app, IDS.elite)
    const res = await api.post('/api/clears', { dungeonId: 'trich-tien-kinh-dao', mode: 'thuong', bossId: 'tt-1', durationSec: 300, memberIds: team6, mvpId: 'm008', wipes: 0 })
    expect(res.status).toBe(403)
  })

  it('first kill boss chưa ai hạ (Vĩnh Dạ Tinh Đô · Anh Hùng · Ác Dịch Tâm Ma), lần sau không còn là first kill', async () => {
    const body = { dungeonId: 'vinh-da-tinh-do', mode: 'anh-hung', bossId: 'vd-4', durationSec: 900, memberIds: team12, mvpId: 'm001', wipes: 4 }
    const before = await balance(hall, 'm005')
    const first = await hall.post<OkBody<ClearResult>>('/api/clears', body)
    expect(first.status).toBe(201)
    expect(first.body.result).toEqual({ firstKill: true, newRecord: true })
    const prog = first.body.snapshot.progress?.['vinh-da-tinh-do']?.['anh-hung']?.['vd-4']
    expect(prog?.kills).toBe(1)
    expect(prog?.bestTimeSec).toBe(900)
    expect(first.body.snapshot.activities?.[0].type).toBe('first-kill')
    expect(first.body.snapshot.activities?.[0].text).toContain('Ác Dịch Tâm Ma')
    expect(first.body.snapshot.clears?.[0].bossId).toBe('vd-4')
    // đoàn 12 người × 8 (Anh Hùng) = 96 cống hiến mỗi người
    const after = first.body.snapshot.members?.find((m) => m.id === 'm005')!.contribution
    expect(after! - before).toBe(96)
    expect(first.body.snapshot.ledger?.[0].category).toBe('pho-ban')

    const second = await hall.post<OkBody<ClearResult>>('/api/clears', { ...body, durationSec: 1000 })
    expect(second.status).toBe(201)
    expect(second.body.result).toEqual({ firstKill: false, newRecord: false })
    expect(second.body.snapshot.activities?.[0].type).toBe('clear')
    expect(second.body.snapshot.progress?.['vinh-da-tinh-do']?.['anh-hung']?.['vd-4']?.kills).toBe(2)

    const faster = await hall.post<OkBody<ClearResult>>('/api/clears', { ...body, durationSec: 700 })
    expect(faster.body.result).toEqual({ firstKill: false, newRecord: true })
    expect(faster.body.snapshot.progress?.['vinh-da-tinh-do']?.['anh-hung']?.['vd-4']?.bestTimeSec).toBe(700)
  })

  it('tiến độ chỉ có các độ khó phó bản đó mở (Thiên Hoang Dị Văn chỉ có Thường)', async () => {
    const snap = (await hall.get<GuildSnapshot>('/api/snapshot?slices=progress')).body
    expect(Object.keys(snap.progress['thien-hoang-di-van'] ?? {})).toEqual(['thuong'])
    expect(Object.keys(snap.progress['vinh-da-tinh-do'] ?? {}).sort()).toEqual(['anh-hung', 'thuong'])
    // dữ liệu mẫu: đã thông Ảo Vực bản Anh Hùng (3 boss đầu)
    expect(snap.progress['vinh-da-tinh-do']?.['anh-hung']?.['vd-3']?.kills).toBeGreaterThan(0)
  })

  it('Idempotency-Key: bấm hai lần không ghi trùng, không cộng cống hiến hai lần', async () => {
    const body = { dungeonId: 'trich-tien-kinh-dao', mode: 'thuong', bossId: 'tt-2', durationSec: 240, memberIds: team6, mvpId: 'm014', wipes: 0 }
    const before = await balance(hall, 'm015')
    const a = await hall.post<OkBody<ClearResult>>('/api/clears', body, { 'idempotency-key': 'clear-abc' })
    const b = await hall.post<OkBody<ClearResult>>('/api/clears', body, { 'idempotency-key': 'clear-abc' })
    expect(a.status).toBe(201)
    expect(b.status).toBe(201)
    expect(b.headers['idempotent-replay']).toBe('true')
    // tổ 6 người × 5 (Thường) = 30 đúng một lần
    expect((await balance(hall, 'm015')) - before).toBe(30)
  })

  describe('kiểm tra dữ liệu', () => {
    const base = { dungeonId: 'trich-tien-kinh-dao', mode: 'thuong', bossId: 'tt-1', durationSec: 300, memberIds: team6, mvpId: 'm008', wipes: 0 }

    it('boss không thuộc phó bản → 400', async () => {
      const res = await hall.post('/api/clears', { ...base, bossId: 'vd-1' })
      expect(res.status).toBe(400)
      expect(errorOf(res).message).toContain('Trích Tiên Kinh Đào')
    })

    it('độ khó phó bản không có (Thiên Hoang Dị Văn · Anh Hùng) → 400', async () => {
      const res = await hall.post('/api/clears', { ...base, dungeonId: 'thien-hoang-di-van', mode: 'anh-hung', bossId: 'thd-1' })
      expect(res.status).toBe(400)
      expect(errorOf(res).message).toContain('Thiên Hoang Dị Văn')
      expect(errorOf(res).message).toContain('Thường')
    })

    it('phó bản không tồn tại → 400', async () => {
      expect((await hall.post('/api/clears', { ...base, dungeonId: 'khong-co' })).status).toBe(400)
    })

    it('độ khó sai → 400 (kể cả Ác Mộng cũ — game không có)', async () => {
      expect((await hall.post('/api/clears', { ...base, mode: 'sieu-kho' })).status).toBe(400)
      expect((await hall.post('/api/clears', { ...base, mode: 'ac-mong' })).status).toBe(400)
    })

    it('vượt sức chứa phó bản → 400', async () => {
      const res = await hall.post('/api/clears', { ...base, memberIds: [...team6, 'm030'] })
      expect(res.status).toBe(400)
      expect(errorOf(res).message).toContain('6 người')
    })

    it('trùng người trong đội → 400', async () => {
      expect((await hall.post('/api/clears', { ...base, memberIds: ['m008', 'm008'] })).status).toBe(400)
    })

    it('MVP không ở trong đội → 400', async () => {
      const res = await hall.post('/api/clears', { ...base, mvpId: 'm030' })
      expect(res.status).toBe(400)
      expect(errorOf(res).message).toContain('MVP')
    })

    it('người không có trong bang → 400', async () => {
      expect((await hall.post('/api/clears', { ...base, memberIds: ['m008', 'm999'] })).status).toBe(400)
    })

    it('thời gian ngoài khoảng 30–7200 giây → 400', async () => {
      expect((await hall.post('/api/clears', { ...base, durationSec: 10 })).status).toBe(400)
      expect((await hall.post('/api/clears', { ...base, durationSec: 9000 })).status).toBe(400)
    })

    it('ngày ở tương lai → 400', async () => {
      const future = new Date(Date.now() + 86400000).toISOString()
      expect((await hall.post('/api/clears', { ...base, date: future })).status).toBe(400)
    })

    it('đội trống → 400', async () => {
      expect((await hall.post('/api/clears', { ...base, memberIds: [] })).status).toBe(400)
    })
  })
})

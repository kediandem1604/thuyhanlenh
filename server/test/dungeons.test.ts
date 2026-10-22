import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { GuildSnapshot } from '@/domain/api'
import { errorOf, IDS, loginAs, makeTestApp, type Client, type OkBody, type TestEnv } from './helpers'

type ClearResult = { firstKill: boolean; newRecord: boolean }

describe('module Phó bản — ghi nhận lượt clear', () => {
  let env: TestEnv
  let hall: Client
  const team5 = ['m008', 'm014', 'm015', 'm026', 'm041']
  const team25 = Array.from({ length: 25 }, (_, i) => `m${String(i + 1).padStart(3, '0')}`)

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
    const res = await api.post('/api/clears', { dungeonId: 'lien-van-trai', mode: 'thuong', bossId: 'lvt-1', durationSec: 300, memberIds: team5, mvpId: 'm008', wipes: 0 })
    expect(res.status).toBe(403)
  })

  it('first kill boss chưa ai hạ (Cửu Long Uyên · Ác Mộng), lần sau không còn là first kill', async () => {
    const body = { dungeonId: 'cuu-long-uyen', mode: 'ac-mong', bossId: 'clu-1', durationSec: 900, memberIds: team25, mvpId: 'm001', wipes: 4 }
    const before = await balance(hall, 'm005')
    const first = await hall.post<OkBody<ClearResult>>('/api/clears', body)
    expect(first.status).toBe(201)
    expect(first.body.result).toEqual({ firstKill: true, newRecord: true })
    const prog = first.body.snapshot.progress?.['cuu-long-uyen']?.['ac-mong']?.['clu-1']
    expect(prog?.kills).toBe(1)
    expect(prog?.bestTimeSec).toBe(900)
    expect(first.body.snapshot.activities?.[0].type).toBe('first-kill')
    expect(first.body.snapshot.activities?.[0].text).toContain('Thanh Long Thủ Vệ')
    expect(first.body.snapshot.clears?.[0].bossId).toBe('clu-1')
    // 25 người × 12 = 300 cống hiến mỗi người
    const after = first.body.snapshot.members?.find((m) => m.id === 'm005')!.contribution
    expect(after! - before).toBe(300)
    expect(first.body.snapshot.ledger?.[0].category).toBe('pho-ban')

    const second = await hall.post<OkBody<ClearResult>>('/api/clears', { ...body, durationSec: 1000 })
    expect(second.status).toBe(201)
    expect(second.body.result).toEqual({ firstKill: false, newRecord: false })
    expect(second.body.snapshot.activities?.[0].type).toBe('clear')
    expect(second.body.snapshot.progress?.['cuu-long-uyen']?.['ac-mong']?.['clu-1']?.kills).toBe(2)

    const faster = await hall.post<OkBody<ClearResult>>('/api/clears', { ...body, durationSec: 700 })
    expect(faster.body.result).toEqual({ firstKill: false, newRecord: true })
    expect(faster.body.snapshot.progress?.['cuu-long-uyen']?.['ac-mong']?.['clu-1']?.bestTimeSec).toBe(700)
  })

  it('Idempotency-Key: bấm hai lần không ghi trùng, không cộng cống hiến hai lần', async () => {
    const body = { dungeonId: 'lien-van-trai', mode: 'thuong', bossId: 'lvt-2', durationSec: 240, memberIds: team5, mvpId: 'm014', wipes: 0 }
    const before = await balance(hall, 'm015')
    const a = await hall.post<OkBody<ClearResult>>('/api/clears', body, { 'idempotency-key': 'clear-abc' })
    const b = await hall.post<OkBody<ClearResult>>('/api/clears', body, { 'idempotency-key': 'clear-abc' })
    expect(a.status).toBe(201)
    expect(b.status).toBe(201)
    expect(b.headers['idempotent-replay']).toBe('true')
    // 5 người × 5 = 25 đúng một lần
    expect((await balance(hall, 'm015')) - before).toBe(25)
  })

  describe('kiểm tra dữ liệu', () => {
    const base = { dungeonId: 'lien-van-trai', mode: 'thuong', bossId: 'lvt-1', durationSec: 300, memberIds: team5, mvpId: 'm008', wipes: 0 }

    it('boss không thuộc phó bản → 400', async () => {
      const res = await hall.post('/api/clears', { ...base, bossId: 'clu-1' })
      expect(res.status).toBe(400)
      expect(errorOf(res).message).toContain('Liên Vân Trại')
    })

    it('phó bản không tồn tại → 400', async () => {
      expect((await hall.post('/api/clears', { ...base, dungeonId: 'khong-co' })).status).toBe(400)
    })

    it('độ khó sai → 400', async () => {
      expect((await hall.post('/api/clears', { ...base, mode: 'sieu-kho' })).status).toBe(400)
    })

    it('vượt sức chứa phó bản → 400', async () => {
      const res = await hall.post('/api/clears', { ...base, memberIds: [...team5, 'm027'] })
      expect(res.status).toBe(400)
      expect(errorOf(res).message).toContain('5 người')
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

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { GuildSnapshot } from '@/domain/api'
import { generateSeed } from '@/data/seed'
import { IDS, loginAs, makeTestApp, type Client, type TestEnv } from './helpers'

describe('snapshot dữ liệu bang', () => {
  let env: TestEnv
  let api: Client
  let snap: GuildSnapshot
  const seed = generateSeed()

  beforeAll(async () => {
    env = await makeTestApp()
    api = await loginAs(env.app, IDS.member)
    snap = (await api.get<GuildSnapshot>('/api/snapshot')).body
  })
  afterAll(async () => env.close())

  it('trả đủ mọi slice', () => {
    expect(Object.keys(snap).sort()).toEqual(
      ['activities', 'announcements', 'applications', 'bonds', 'clears', 'events', 'ledger', 'loot', 'members', 'mentorships', 'progress', 'teams', 'wars'].sort(),
    )
    // 46 môn hạ gốc + 3 người họ Bạch (nhân vật dùng chung với Kim Lan)
    expect(snap.members).toHaveLength(49)
  })

  it('nén phản hồi khi trình duyệt hỗ trợ (snapshot bang ~240 KB JSON)', async () => {
    const br = await api.get('/api/snapshot', { 'accept-encoding': 'br, gzip' })
    expect(br.status).toBe(200)
    expect(br.headers['content-encoding']).toBe('br')
    const gz = await api.get('/api/snapshot', { 'accept-encoding': 'gzip' })
    expect(gz.headers['content-encoding']).toBe('gzip')
    // không gửi accept-encoding → JSON thường
    const plain = await api.get('/api/snapshot')
    expect(plain.headers['content-encoding']).toBeUndefined()
  })

  it('số dư cống hiến = tổng sổ cái, khớp số liệu bản demo', () => {
    for (const m of seed.members.slice(0, 10)) {
      const got = snap.members.find((x) => x.id === m.id)!
      expect(got.contribution).toBe(m.contribution)
      expect(got.weeklyContribution).toBe(m.weeklyContribution)
    }
  })

  it('lịch sử chiến lực 8 tuần, tuần cuối = chiến lực hiện tại', () => {
    for (const m of snap.members) {
      expect(m.powerHistory).toHaveLength(8)
      expect(m.powerHistory[7]).toBe(m.power)
    }
    const leader = snap.members.find((m) => m.id === IDS.leader)!
    const seedLeader = seed.members.find((m) => m.id === IDS.leader)!
    expect(leader.powerHistory).toEqual(seedLeader.powerHistory)
  })

  it('tiến độ boss tính từ lượt clear, khớp bản demo', () => {
    for (const [dungeonId, modes] of Object.entries(seed.progress)) {
      for (const [mode, bosses] of Object.entries(modes ?? {})) {
        for (const [bossId, p] of Object.entries(bosses ?? {})) {
          const got = snap.progress[dungeonId]?.[mode as 'thuong']?.[bossId]
          expect(got?.kills, `${dungeonId}/${mode}/${bossId}`).toBe(p.kills)
          if (p.kills > 0) expect(got?.bestTimeSec).toBe(p.bestTimeSec)
        }
      }
    }
  })

  it('lấy một phần snapshot theo ?slices=', async () => {
    const part = (await api.get<Partial<GuildSnapshot>>('/api/snapshot?slices=members,teams')).body
    expect(Object.keys(part).sort()).toEqual(['members', 'teams'])
  })

  it('môn hạ demo chưa có chủ giữ trạng thái lưu sẵn; môn hạ có tài khoản là offline khi không mở WebSocket', () => {
    const me = snap.members.find((m) => m.id === IDS.member)!
    expect(me.status).toBe('offline')
  })

  it('sổ cái là append-only: CSDL chặn UPDATE và DELETE', async () => {
    await expect(env.database.db.execute(sql`update ledger_entries set delta = 1`)).rejects.toThrow()
    await expect(env.database.db.execute(sql`delete from ledger_entries`)).rejects.toThrow()
  })
})

describe('idempotency', () => {
  let env: TestEnv
  beforeAll(async () => {
    env = await makeTestApp()
  })
  afterAll(async () => env.close())

  it('gửi lại cùng Idempotency-Key không tạo bản ghi trùng', async () => {
    const api = await loginAs(env.app, IDS.elder)
    const body = { name: 'Nhất Kiếm Độc Hành', classId: 'long-ngam' }
    const first = await api.post('/api/members', body, { 'idempotency-key': 'k-123' })
    const second = await api.post('/api/members', body, { 'idempotency-key': 'k-123' })
    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(second.headers['idempotent-replay']).toBe('true')
    const snap = (await api.get<GuildSnapshot>('/api/snapshot?slices=members')).body
    expect(snap.members.filter((m) => m.name === body.name)).toHaveLength(1)
  })
})

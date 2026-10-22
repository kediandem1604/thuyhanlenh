import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { GuildSnapshot } from '@/domain/api'
import type { Mentorship } from '@/domain/types'
import { errorOf, IDS, loginAs, makeTestApp, type Client, type OkBody, type TestEnv } from './helpers'

/*
 * Ghép cặp mới dùng các môn hạ chưa có sư phụ đang học trong dữ liệu demo.
 * Dữ liệu demo: đồ đệ là 12 người cuối danh sách (m035–m046), nên các Thành Viên m026–m033 đều trống.
 */
describe('module Sư đồ', () => {
  let env: TestEnv
  let snap: GuildSnapshot

  const ms = (body: OkBody, id: string) => body.snapshot.mentorships?.find((m) => m.id === id)
  const findFree = (exclude: string[] = []) => {
    const busy = new Set(snap.mentorships.filter((m) => m.status === 'active').map((m) => m.discipleId))
    const cand = snap.members.find(
      (m) => (m.rank === 'thanh-vien' || m.rank === 'tan-binh') && !busy.has(m.id) && !exclude.includes(m.id),
    )
    if (!cand) throw new Error('không còn môn hạ trống')
    return cand.id
  }

  beforeAll(async () => {
    env = await makeTestApp()
    const api = await loginAs(env.app, IDS.leader)
    snap = (await api.get<GuildSnapshot>('/api/snapshot')).body
  })
  afterAll(async () => env.close())

  describe('bái sư', () => {
    it('Tinh Anh tự nhận đồ đệ → 201, có cặp mới + nhật ký', async () => {
      const api = await loginAs(env.app, IDS.elite)
      const disciple = findFree()
      const res = await api.post<OkBody<{ id: string }>>('/api/mentorships', { masterId: IDS.elite, discipleId: disciple })
      expect(res.status).toBe(201)
      const created = ms(res.body, res.body.result!.id)!
      expect(created.status).toBe('active')
      expect(created.stage).toBe(0)
      expect(created.bond).toBe(0)
      expect(created.tasks).toHaveLength(10)
      expect(created.tasks.every((t) => !t.done)).toBe(true)
      expect(res.body.snapshot.activities?.[0].type).toBe('mentor')
      expect(res.body.snapshot.activities?.[0].text).toContain('làm đồ đệ')
      snap.mentorships.push(created)
    })

    it('Thành Viên không được nhận đồ đệ (403)', async () => {
      const api = await loginAs(env.app, IDS.member)
      const res = await api.post('/api/mentorships', { masterId: IDS.member, discipleId: findFree([IDS.member]) })
      expect(res.status).toBe(403)
    })

    it('Tinh Anh không ghép cặp hộ người khác (403)', async () => {
      const api = await loginAs(env.app, 'm015')
      const res = await api.post('/api/mentorships', { masterId: 'm016', discipleId: findFree() })
      expect(res.status).toBe(403)
    })

    it('Trưởng Lão ghép cặp hộ được (mentor.manage)', async () => {
      const api = await loginAs(env.app, IDS.elder)
      const disciple = findFree()
      const res = await api.post<OkBody<{ id: string }>>('/api/mentorships', { masterId: 'm016', discipleId: disciple })
      expect(res.status).toBe(201)
      snap.mentorships.push(ms(res.body, res.body.result!.id)!)
    })

    it('không tự bái mình', async () => {
      const api = await loginAs(env.app, IDS.elite)
      const res = await api.post('/api/mentorships', { masterId: IDS.elite, discipleId: IDS.elite })
      expect(res.status).toBe(400)
      expect(errorOf(res).message).toBe('Không thể tự bái mình làm sư phụ.')
    })

    it('đồ đệ đã có sư phụ đang học', async () => {
      const api = await loginAs(env.app, 'm017')
      const busy = snap.mentorships.find((m) => m.status === 'active')!.discipleId
      const res = await api.post('/api/mentorships', { masterId: 'm017', discipleId: busy })
      expect(res.status).toBe(400)
      expect(errorOf(res).message).toBe('Người này đang có sư phụ rồi.')
    })

    it('sư phụ tối đa 3 đồ đệ đang học', async () => {
      const api = await loginAs(env.app, 'm018')
      for (let i = 0; i < 3; i++) {
        const r = await api.post<OkBody<{ id: string }>>('/api/mentorships', { masterId: 'm018', discipleId: findFree() })
        expect(r.status).toBe(201)
        snap.mentorships.push(ms(r.body, r.body.result!.id)!)
      }
      const res = await api.post('/api/mentorships', { masterId: 'm018', discipleId: findFree() })
      expect(res.status).toBe(400)
      expect(errorOf(res).message).toBe('Sư phụ đã nhận đủ 3 đồ đệ đang học.')
    })

    it('môn hạ không tồn tại → 404', async () => {
      const api = await loginAs(env.app, IDS.elite)
      const res = await api.post('/api/mentorships', { masterId: IDS.elite, discipleId: 'khong-co' })
      expect(res.status).toBe(404)
    })
  })

  describe('tiến trình học', () => {
    let pair: Mentorship
    let master: Client
    let disciple: Client

    beforeAll(async () => {
      const masterId = 'm019'
      const discipleId = findFree()
      master = await loginAs(env.app, masterId)
      disciple = await loginAs(env.app, discipleId)
      const res = await master.post<OkBody<{ id: string }>>('/api/mentorships', { masterId, discipleId })
      pair = ms(res.body, res.body.result!.id)!
    })

    it('đồ đệ tick nhiệm vụ: bond +120; bỏ tick: −120; tick trùng không đổi bond', async () => {
      const t0 = pair.tasks[0].id
      const r1 = await disciple.patch(`/api/mentorships/${pair.id}/tasks/${t0}`, { done: true })
      expect(r1.status).toBe(200)
      expect(ms(r1.body, pair.id)!.bond).toBe(120)
      const r2 = await disciple.patch(`/api/mentorships/${pair.id}/tasks/${t0}`, { done: true })
      expect(ms(r2.body, pair.id)!.bond).toBe(120)
      const r3 = await master.patch(`/api/mentorships/${pair.id}/tasks/${t0}`, { done: false })
      expect(ms(r3.body, pair.id)!.bond).toBe(0)
      expect(ms(r3.body, pair.id)!.tasks[0].done).toBe(false)
    })

    it('người ngoài không tick được (403)', async () => {
      const outsider = await loginAs(env.app, 'm020')
      const res = await outsider.patch(`/api/mentorships/${pair.id}/tasks/${pair.tasks[0].id}`, { done: true })
      expect(res.status).toBe(403)
    })

    it('chưa xong nhiệm vụ giai đoạn thì không thăng được', async () => {
      const res = await master.post(`/api/mentorships/${pair.id}/advance`)
      expect(res.status).toBe(400)
      expect(errorOf(res).message).toBe('Còn 2 nhiệm vụ chưa xong ở giai đoạn này.')
    })

    it('đồ đệ không tự thăng giai đoạn (403)', async () => {
      const res = await disciple.post(`/api/mentorships/${pair.id}/advance`)
      expect(res.status).toBe(403)
    })

    it('chưa xong hết thì không xuất sư', async () => {
      const res = await master.post(`/api/mentorships/${pair.id}/graduate`)
      expect(res.status).toBe(400)
      expect(errorOf(res).message).toBe('Đồ đệ cần hoàn thành mọi nhiệm vụ trước khi xuất sư.')
    })

    it('hoàn thành 5 giai đoạn → xuất sư, sư phụ +500, đồ đệ +300 cống hiến', async () => {
      let bond = 0
      for (let stage = 0; stage <= 4; stage++) {
        for (const t of pair.tasks.filter((x) => x.stage === stage)) {
          const r = await disciple.patch(`/api/mentorships/${pair.id}/tasks/${t.id}`, { done: true })
          expect(r.status).toBe(200)
          bond += 120
        }
        if (stage < 4) {
          const r = await master.post(`/api/mentorships/${pair.id}/advance`)
          expect(r.status).toBe(200)
          bond += 300
          expect(ms(r.body, pair.id)!.stage).toBe(stage + 1)
          expect(ms(r.body, pair.id)!.bond).toBe(bond)
        }
      }
      const last = await master.post(`/api/mentorships/${pair.id}/advance`)
      expect(errorOf(last).message).toBe('Đã ở giai đoạn cuối, hãy cử hành lễ xuất sư.')

      const before = (await master.get<GuildSnapshot>('/api/snapshot?slices=members')).body.members
      const balance = (id: string, list = before) => list.find((m) => m.id === id)!.contribution
      const res = await master.post(`/api/mentorships/${pair.id}/graduate`)
      expect(res.status).toBe(200)
      const done = ms(res.body, pair.id)!
      expect(done.status).toBe('graduated')
      expect(done.graduatedAt).toBeTruthy()
      expect(done.bond).toBe(bond + 1000)
      const after = res.body.snapshot.members!
      expect(balance(pair.masterId, after) - balance(pair.masterId)).toBe(500)
      expect(balance(pair.discipleId, after) - balance(pair.discipleId)).toBe(300)
      expect(res.body.snapshot.ledger?.some((l) => l.memberId === pair.masterId && l.delta === 500)).toBe(true)
      expect(res.body.snapshot.activities?.[0].type).toBe('graduate')
      expect(res.body.snapshot.activities?.[0].text).toContain('chính thức xuất sư dưới trướng')
    })

    it('cặp đã xuất sư không thể tick / thăng / xuất sư lại', async () => {
      const r1 = await master.patch(`/api/mentorships/${pair.id}/tasks/${pair.tasks[0].id}`, { done: false })
      expect(r1.status).toBe(400)
      const r2 = await master.post(`/api/mentorships/${pair.id}/graduate`)
      expect(r2.status).toBe(400)
    })
  })

  describe('giải tán', () => {
    it('người ngoài không giải tán được; sư phụ thì được', async () => {
      const masterId = 'm021'
      const discipleId = findFree()
      const master = await loginAs(env.app, masterId)
      const created = await master.post<OkBody<{ id: string }>>('/api/mentorships', { masterId, discipleId })
      const id = created.body.result!.id
      const outsider = await loginAs(env.app, IDS.member)
      expect((await outsider.del(`/api/mentorships/${id}`)).status).toBe(403)
      const res = await master.del(`/api/mentorships/${id}`)
      expect(res.status).toBe(200)
      expect(ms(res.body, id)).toBeUndefined()
      expect((await master.del(`/api/mentorships/${id}`)).status).toBe(404)
    })

    it('Trưởng Lão giải tán hộ được (mentor.manage)', async () => {
      const masterId = 'm022'
      const master = await loginAs(env.app, masterId)
      const created = await master.post<OkBody<{ id: string }>>('/api/mentorships', { masterId, discipleId: findFree() })
      const elder = await loginAs(env.app, IDS.elder)
      const res = await elder.del(`/api/mentorships/${created.body.result!.id}`)
      expect(res.status).toBe(200)
    })
  })
})

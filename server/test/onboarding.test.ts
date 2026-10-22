import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { GuildSnapshot, Me, UnclaimedMember } from '@/domain/api'
import type { Application } from '@/domain/types'
import * as s from '../src/db/schema'
import { errorOf, IDS, loginAs, loginGuest, makeTestApp, type Client, type TestEnv } from './helpers'

type AppBody = { ok: true; result: { application: Application } }

describe('Nhập môn (tài khoản chưa có môn hạ)', () => {
  let env: TestEnv
  let elder: Client
  beforeAll(async () => {
    env = await makeTestApp()
    elder = await loginAs(env.app, IDS.elder)
  })
  afterAll(async () => env.close())

  it('khách xem được danh sách môn hạ chưa có chủ (không gồm người đã có tài khoản thật)', async () => {
    const guest = await loginGuest(env.app, 'Khách Xem')
    const res = await guest.get<{ members: UnclaimedMember[] }>('/api/onboarding/unclaimed')
    expect(res.status).toBe(200)
    expect(res.body.members.length).toBeGreaterThan(40)
    expect(res.body.members[0].rank).toBe('bang-chu')
    expect(res.body.members[0]).toHaveProperty('look')
  })

  it('chưa đăng nhập → 401', async () => {
    const res = await env.app.inject({ method: 'GET', url: '/api/onboarding/unclaimed' })
    expect(res.statusCode).toBe(401)
  })

  it('gửi đơn gia nhập mới → đang chờ; gửi lần hai → 409; ban quản lý thấy đơn; chấp nhận → thành môn hạ', async () => {
    const guest = await loginGuest(env.app, 'Lữ Khách')
    const apply = await guest.post<AppBody>('/api/onboarding/apply', { name: 'Bạch Vân Phi', classId: 'long-ngam', power: 200000, level: 72, message: 'Xin vào bang!', gender: 'nu' })
    expect(apply.status).toBe(201)
    const application = apply.body.result.application
    expect(application.kind).toBe('join')
    expect(application.hasAccount).toBe(true)
    expect(application.look.gender).toBe('nu')

    const me = await guest.get<Me>('/api/me')
    expect(me.body.member).toBeNull()
    expect(me.body.application?.id).toBe(application.id)
    expect(me.body.application?.stage).toBe('moi')

    const again = await guest.post('/api/onboarding/apply', { name: 'Bạch Vân Phi 2', classId: 'long-ngam', power: 200000, level: 72 })
    expect(again.status).toBe(409)
    expect(errorOf(again).message).toContain('đang chờ')

    const snap = (await elder.get<GuildSnapshot>('/api/snapshot?slices=applications')).body
    const seen = snap.applications.find((a) => a.id === application.id)
    expect(seen?.hasAccount).toBe(true)
    expect(seen?.kind).toBe('join')

    const accept = await elder.post<{ ok: true; result: { memberId: string } }>(`/api/applications/${application.id}/accept`)
    expect(accept.status).toBe(200)
    const after = await guest.get<Me>('/api/me')
    expect(after.body.member?.id).toBe(accept.body.result.memberId)
    expect(after.body.member?.name).toBe('Bạch Vân Phi')
    expect(after.body.permissions).toContain('event.rsvp')

    // đã là môn hạ thì không gửi đơn được nữa
    const late = await guest.post('/api/onboarding/apply', { name: 'Khác', classId: 'to-van', power: 1000, level: 10 })
    expect(late.status).toBe(409)
    expect(errorOf(late).message).toContain('thành viên')
  })

  it('bị từ chối thì được gửi đơn mới', async () => {
    const guest = await loginGuest(env.app, 'Kẻ Thử Lại')
    const first = await guest.post<AppBody>('/api/onboarding/apply', { name: 'Thử Lại Lần Một', classId: 'to-van', power: 100000, level: 50 })
    await elder.patch(`/api/applications/${first.body.result.application.id}/stage`, { stage: 'tu-choi' })
    const me = await guest.get<Me>('/api/me')
    expect(me.body.application?.stage).toBe('tu-choi')
    const second = await guest.post('/api/onboarding/apply', { name: 'Thử Lại Lần Hai', classId: 'to-van', power: 100000, level: 50 })
    expect(second.status).toBe(201)
    // mở lại đơn cũ khi đang có đơn mới chờ → 409
    const reopen = await elder.patch(`/api/applications/${first.body.result.application.id}/stage`, { stage: 'moi' })
    expect(reopen.status).toBe(409)
  })

  it('xin nhận danh tính m040 → chấp nhận → đăng nhập thành m040', async () => {
    const guest = await loginGuest(env.app, 'Chủ Cũ')
    const claim = await guest.post<AppBody>('/api/onboarding/claim', { memberId: 'm040', message: 'Đây là nhân vật của tôi.' })
    expect(claim.status).toBe(201)
    const application = claim.body.result.application
    expect(application.kind).toBe('claim')
    expect(application.claimMemberId).toBe('m040')

    const snap = (await elder.get<GuildSnapshot>('/api/snapshot?slices=members,applications')).body
    const target = snap.members.find((m) => m.id === 'm040')!
    expect(application.name).toBe(target.name)
    expect(application.look).toEqual(target.look)

    const accept = await elder.post<{ ok: true; result: { memberId: string } }>(`/api/applications/${application.id}/accept`)
    expect(accept.status).toBe(200)
    expect(accept.body.result.memberId).toBe('m040')
    const me = await guest.get<Me>('/api/me')
    expect(me.body.member?.id).toBe('m040')

    // khách ở môi trường test là tài khoản dev → theo spec m040 vẫn tính là "chưa có chủ thật";
    // trường hợp tài khoản thật được kiểm ở test kế tiếp
    expect(me.body.user.provider).toBe('dev')
  })

  it('môn hạ đã có chủ thật → không xin nhận được (409), cả khi gửi đơn lẫn khi duyệt', async () => {
    const db = env.database.db
    // đơn gửi trước, rồi môn hạ bị người khác (tài khoản thật) nhận mất
    const guest = await loginGuest(env.app, 'Chậm Chân')
    const claim = await guest.post<AppBody>('/api/onboarding/claim', { memberId: 'm039' })
    expect(claim.status).toBe(201)
    await db.insert(s.users).values({ id: 'usr_real_1', discordId: '999', username: 'that', displayName: 'Tài khoản thật', isDev: false })
    await db.update(s.characters).set({ userId: 'usr_real_1' }).where(eq(s.characters.id, 'ch-m039'))

    const accept = await elder.post(`/api/applications/${claim.body.result.application.id}/accept`)
    expect(accept.status).toBe(409)
    expect(errorOf(accept).message).toContain('đã có chủ')

    const other = await loginGuest(env.app, 'Người Khác')
    const direct = await other.post('/api/onboarding/claim', { memberId: 'm039' })
    expect(direct.status).toBe(409)
  })

  it('môn hạ chỉ gắn tài khoản đăng nhập thử vẫn xin nhận được', async () => {
    await loginAs(env.app, 'm038') // tạo user dev gắn m038
    const guest = await loginGuest(env.app, 'Chủ Thật m038')
    const claim = await guest.post('/api/onboarding/claim', { memberId: 'm038' })
    expect(claim.status).toBe(201)
  })

  it('đã là môn hạ thì không gọi nhập môn được', async () => {
    const member = await loginAs(env.app, IDS.member)
    const res = await member.post('/api/onboarding/claim', { memberId: 'm037' })
    expect(res.status).toBe(409)
  })

  it('Idempotency-Key: gửi lại không tạo hai đơn', async () => {
    const guest = await loginGuest(env.app, 'Mạng Chậm')
    const body = { name: 'Mạng Chậm Lắm', classId: 'cuu-linh', power: 120000, level: 60 }
    const a = await guest.post('/api/onboarding/apply', body, { 'idempotency-key': 'onb-1' })
    const b = await guest.post('/api/onboarding/apply', body, { 'idempotency-key': 'onb-1' })
    expect(a.status).toBe(201)
    expect(b.status).toBe(201)
    expect(b.headers['idempotent-replay']).toBe('true')
  })

  it('dữ liệu sai → 400', async () => {
    const guest = await loginGuest(env.app, 'Sai Dữ Liệu')
    expect((await guest.post('/api/onboarding/apply', { name: 'X', classId: 'to-van', power: 1, level: 1 })).status).toBe(400)
    expect((await guest.post('/api/onboarding/claim', { memberId: 'khong-co' })).status).toBe(404)
  })
})

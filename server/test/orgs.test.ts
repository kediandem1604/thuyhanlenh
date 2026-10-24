import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { GuildSnapshot, InvitePreview, Me, OrgInfo } from '@/domain/api'
import { CSRF_HEADER, CSRF_VALUE } from '@/domain/api'
import { client, errorOf, loginAs, loginGuest, makeTestApp, type Client, type OkBody, type TestEnv } from './helpers'

/** Bọc client: mọi request gửi kèm x-org-id */
function inOrg(api: Client, orgId: string) {
  const h = { 'x-org-id': orgId }
  return {
    get: <T = unknown>(url: string) => api.get<T>(url, h),
    post: <T = OkBody>(url: string, body?: unknown) => api.post<T>(url, body, h),
    patch: <T = OkBody>(url: string, body?: unknown) => api.patch<T>(url, body, h),
    put: <T = OkBody>(url: string, body?: unknown) => api.put<T>(url, body, h),
    del: <T = OkBody>(url: string) => api.del<T>(url, h),
  }
}

async function loginCharacter(env: TestEnv, characterId: string) {
  const res = await env.app.inject({ method: 'POST', url: '/auth/dev/login', payload: { characterId }, headers: { [CSRF_HEADER]: CSRF_VALUE } })
  expect(res.statusCode).toBe(200)
  const cookie = String(([] as string[]).concat(res.headers['set-cookie'] as string[]).find((c) => c.startsWith('thl_session='))).split(';')[0]
  return client(env.app, cookie)
}

const BACH = 'bach-gia'
const GUILD = 'kinh-hong-cac'
const TEAM = 'that-tinh-doi'

describe('nhiều tổ chức', () => {
  let env: TestEnv
  let daiTy: Client
  beforeAll(async () => {
    env = await makeTestApp()
    daiTy = await loginCharacter(env, 'ch-bg01') // Bạch Lăng Sương: Đại tỷ Kim Lan + Tinh Anh ở Kinh Hồng Các
  })
  afterAll(async () => env.close())

  it('một nhân vật ở nhiều tổ chức: /api/me liệt kê đủ, Kim Lan hiện danh xưng', async () => {
    const me = (await daiTy.get<Me>('/api/me')).body
    expect(me.character?.name).toBe('Bạch Lăng Sương')
    const ids = me.orgs.map((o) => o.org.id).sort()
    expect(ids).toEqual([BACH, GUILD].sort())
    expect(me.orgs.find((o) => o.org.id === BACH)?.title).toBe('Đại tỷ')
    expect(me.orgs.find((o) => o.org.id === GUILD)?.rank).toBe('tinh-anh')
  })

  it('đổi tổ chức bằng header: quyền và dữ liệu theo tổ chức đó', async () => {
    const kl = inOrg(daiTy, BACH)
    const me = (await kl.get<Me>('/api/me')).body
    expect(me.org?.type).toBe('kimlan')
    expect(me.member?.rank).toBe('dai-ca')
    expect(me.permissions).toContain('rank.assign')
    const snap = (await kl.get<GuildSnapshot>('/api/snapshot')).body
    expect(snap.members).toHaveLength(12)
    expect(snap.members.map((m) => m.honorific)).toContain('Tiểu muội')
    // chức năng không có ở Kim Lan → slice rỗng
    expect(snap.wars).toEqual([])
    expect(snap.ledger).toEqual([])
    expect(snap.loot).toEqual([])
    expect(snap.mentorships).toEqual([])
    expect(snap.clears.length).toBeGreaterThan(0)

    const guild = (await inOrg(daiTy, GUILD).get<Me>('/api/me')).body
    expect(guild.member?.rank).toBe('tinh-anh')
    expect(guild.permissions).not.toContain('rank.assign')
  })

  it('chặn route của chức năng đang tắt (Kim Lan không có bang chiến, đấu giá, sư đồ)', async () => {
    const kl = inOrg(daiTy, BACH)
    const war = await kl.post('/api/wars', {})
    expect(war.status).toBe(404)
    expect(errorOf(war).code).toBe('feature_off')
    expect((await kl.post('/api/loot', {})).status).toBe(404)
    expect((await kl.post('/api/mentorships', {})).status).toBe(404)
  })

  it('không thao tác được ở tổ chức mình không thuộc', async () => {
    const rookie = await loginAs(env.app, 'm041')
    const res = await inOrg(rookie, BACH).get('/api/snapshot')
    expect(res.status).toBe(403)
    expect(errorOf(res).code).toBe('not_member')
  })

  it('nhân vật dùng chung: đổi chiến lực ở bang → Kim Lan thấy ngay', async () => {
    const guild = inOrg(daiTy, GUILD)
    const me = (await guild.get<Me>('/api/me')).body
    // tự sửa chiến lực không được (profile.self chỉ cho danh hiệu/tạo hình) → dùng /api/characters/me
    const res = await daiTy.patch('/api/characters/me', { power: 360000 })
    expect(res.status).toBe(200)
    const kl = (await inOrg(daiTy, BACH).get<GuildSnapshot>('/api/snapshot?slices=members')).body
    expect(kl.members.find((m) => m.characterId === 'ch-bg01')?.power).toBe(360000)
    const g = (await guild.get<GuildSnapshot>('/api/snapshot?slices=members')).body
    expect(g.members.find((m) => m.id === me.member?.id)?.power).toBe(360000)
  })

  it('Huynh đệ Kim Lan ghi nhận được lượt clear, nhưng không tạo được link mời', async () => {
    const huynh = inOrg(await loginCharacter(env, 'ch-bg04'), BACH)
    const clear = await huynh.post<OkBody<{ firstKill: boolean }>>('/api/clears', {
      dungeonId: 'trich-tien-kinh-dao',
      mode: 'thuong',
      bossId: 'tt-1',
      durationSec: 200,
      memberIds: ['bg04', 'bg05', 'bg06', 'bg07', 'bg08', 'bg09'],
      mvpId: 'bg04',
      wipes: 0,
    })
    expect(clear.status).toBe(201)
    // Kim Lan không có Quỹ → không ghi cống hiến
    expect(clear.body.snapshot.ledger).toEqual([])
    expect((await huynh.post('/api/invites', { kind: 'join' })).status).toBe(403)
  })

  it('Kim Lan chỉ hẹn lịch phó bản / boss — không có yến tiệc hay bang chiến', async () => {
    const huynh = inOrg(await loginCharacter(env, 'ch-bg04'), BACH)
    const ev = { title: 'Cùng đi Trích Tiên Kinh Đào', start: new Date(Date.now() + 86400_000).toISOString(), durationMin: 60, leaderId: 'bg04', capacity: 10 }
    const war = await huynh.post('/api/events', { ...ev, type: 'guild-war' })
    expect(war.status).toBe(400)
    expect(errorOf(war).message).toMatch(/phó bản hoặc boss/)
    expect((await huynh.post('/api/events', { ...ev, type: 'banquet' })).status).toBe(400)
    expect((await huynh.post('/api/events', { ...ev, type: 'raid' })).status).toBe(201)
  })

  it('đổi thứ bậc: đưa Tiểu muội lên ghế 2, rồi nhường ghế Đại ca', async () => {
    const kl = inOrg(daiTy, BACH)
    const moved = await kl.put('/api/members/bg12/seat', { seat: 2 })
    expect(moved.status).toBe(200)
    const m12 = moved.body.snapshot.members?.find((m) => m.id === 'bg12')
    expect(m12?.seat).toBe(2)
    expect(m12?.honorific).toBe('Nhị tỷ')
    const last = moved.body.snapshot.members?.find((m) => m.seat === 12)
    expect(last?.honorific).toMatch(/Tiểu (đệ|muội)/)

    const transfer = await kl.put('/api/members/bg02/seat', { seat: 1 })
    expect(transfer.status).toBe(200)
    expect(transfer.body.snapshot.members?.find((m) => m.id === 'bg02')?.rank).toBe('dai-ca')
    expect(transfer.body.snapshot.members?.find((m) => m.id === 'bg01')?.rank).toBe('huynh-de')
    // Đại tỷ cũ giờ không đổi ghế được nữa
    expect((await kl.put('/api/members/bg03/seat', { seat: 4 })).status).toBe(403)
  })
})

describe('lời mời, Kim Lan tối đa 12 người, lập team', () => {
  let env: TestEnv
  let daiTy: ReturnType<typeof inOrg>
  beforeAll(async () => {
    env = await makeTestApp()
    daiTy = inOrg(await loginCharacter(env, 'ch-bg01'), BACH)
  })
  afterAll(async () => env.close())

  it('link mời nhận danh tính: khách chưa có nhân vật nhận Bạch Ngọc Lan', async () => {
    const created = await daiTy.post<{ ok: true; result: { code: string } }>('/api/invites', { kind: 'claim', memberId: 'bg07' })
    expect(created.status).toBe(201)
    const code = created.body.result.code
    const guest = await loginGuest(env.app, 'Người Chơi Thật')
    const preview = (await guest.get<InvitePreview>(`/api/invites/${code}`)).body
    expect(preview.valid).toBe(true)
    expect(preview.org.name).toBe('Gia Tộc Họ Bạch')
    expect(preview.character?.name).toBe('Bạch Ngọc Lan')
    const ok = await guest.post(`/api/invites/${code}/accept`)
    expect(ok.status).toBe(200)
    const me = (await guest.get<Me>('/api/me')).body
    expect(me.character?.name).toBe('Bạch Ngọc Lan')
    expect(me.orgs.map((o) => o.org.id)).toContain(BACH)
    // dùng một lần
    const again = await (await loginGuest(env.app, 'Người Khác')).post(`/api/invites/${code}/accept`)
    expect(again.status).toBe(409)
  })

  it('Kim Lan đủ 12 người thì không nhận thêm qua link mời', async () => {
    const created = await daiTy.post<{ ok: true; result: { code: string } }>('/api/invites', { kind: 'join' })
    const code = created.body.result.code
    const guest = await loginGuest(env.app, 'Người Thứ Mười Ba')
    expect((await guest.post('/api/characters', { name: 'Thập Tam Lang', classId: 'huyet-ha', level: 70, power: 200000 })).status).toBe(201)
    const res = await guest.post(`/api/invites/${code}/accept`)
    expect(res.status).toBe(409)
    expect(errorOf(res).message).toContain('12')
  })

  it('người có nhân vật lập team → làm Trưởng nhóm, tự bật/tắt chức năng; mời bạn vào team', async () => {
    const founder = await loginGuest(env.app, 'Chủ Team')
    await founder.post('/api/characters', { name: 'Lãng Tử Phong', classId: 'long-ngam', level: 75, power: 260000 })
    const created = await founder.post<{ ok: true; result: { orgId: string; org: OrgInfo } }>('/api/orgs', { type: 'team', name: 'Đội Đêm Khuya', han: '夜' })
    expect(created.status).toBe(201)
    const orgId = created.body.result.orgId
    expect(created.body.result.org.features).toEqual(['pho-ban', 'bay-tran', 'lich', 'phong-van'])
    const team = inOrg(founder, orgId)
    const me = (await team.get<Me>('/api/me')).body
    expect(me.member?.rank).toBe('truong-nhom')

    const patched = await team.patch<{ ok: true; result: { org: OrgInfo } }>('/api/orgs/current', { features: ['pho-ban', 'lich', 'bang-kho'] })
    expect(patched.status).toBe(200)
    expect(patched.body.result.org.features).toEqual(['pho-ban', 'lich', 'bang-kho'])
    // bay-tran vừa tắt → route bị chặn
    expect((await team.post('/api/teams', { name: 'x', slots: [] })).status).toBe(404)

    const inv = await team.post<{ ok: true; result: { code: string } }>('/api/invites', { kind: 'join' })
    const friend = await loginGuest(env.app, 'Bạn Của Chủ Team')
    await friend.post('/api/characters', { name: 'Tiểu Ngư', classId: 'to-van', level: 70, power: 180000 })
    expect((await friend.post(`/api/invites/${inv.body.result.code}/accept`)).status).toBe(200)
    const roster = (await team.get<GuildSnapshot>('/api/snapshot?slices=members')).body.members
    expect(roster.map((m) => m.name).sort()).toEqual(['Lãng Tử Phong', 'Tiểu Ngư'])
    expect(roster.find((m) => m.name === 'Tiểu Ngư')?.rank).toBe('thanh-vien')
  })

  it('Kim Lan không bật/tắt chức năng được (cố định theo trò chơi)', async () => {
    const res = await daiTy.patch('/api/orgs/current', { features: ['bang-kho'] })
    expect(res.status).toBe(400)
  })

  it('danh bạ công khai chỉ có tổ chức nhận đơn; Thất Tinh Đội là team riêng', async () => {
    const guest = await loginGuest(env.app, 'Khách Xem')
    const list = (await guest.get<{ orgs: OrgInfo[] }>('/api/orgs/public')).body.orgs.map((o) => o.id)
    expect(list).toContain(GUILD)
    expect(list).not.toContain(BACH)
    expect(list).not.toContain(TEAM)
  })

  it('thành viên thường rời tổ chức được; người đứng đầu phải truyền ngôi trước', async () => {
    const leader = inOrg(await loginCharacter(env, 'ch-m001'), TEAM)
    const blocked = await leader.post('/api/orgs/current/leave')
    expect(blocked.status).toBe(400)
    const member = inOrg(await loginCharacter(env, 'ch-m033'), TEAM)
    expect((await member.post('/api/orgs/current/leave')).status).toBe(200)
    const me = (await member.get<Me>('/api/me')).body
    expect(me.orgs.map((o) => o.org.id)).not.toContain(TEAM)
  })
})

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AdminOrgRow, GuildSnapshot, Me } from '@/domain/api'
import { CSRF_HEADER, CSRF_VALUE } from '@/domain/api'
import { client, errorOf, IDS, loginAs, makeTestApp, type Client, type OkBody, type TestEnv } from './helpers'

async function loginCharacter(env: TestEnv, characterId: string) {
  const res = await env.app.inject({ method: 'POST', url: '/auth/dev/login', payload: { characterId }, headers: { [CSRF_HEADER]: CSRF_VALUE } })
  expect(res.statusCode).toBe(200)
  const cookie = String(([] as string[]).concat(res.headers['set-cookie'] as string[]).find((c) => c.startsWith('thl_session='))).split(';')[0]
  return client(env.app, cookie)
}

const BACH = 'bach-gia'

describe('quản trị hệ thống: chủ hệ thống vào tổ chức làm người đứng đầu', () => {
  let env: TestEnv
  let admin: Client
  let normal: Client
  beforeAll(async () => {
    env = await makeTestApp()
    // chủ hệ thống = người giữ ghế Bang Chủ của bang chính (Dạ Lăng Phong)
    admin = await loginAs(env.app, IDS.leader)
    normal = await loginAs(env.app, IDS.member)
  })
  afterAll(async () => env.close())

  it('/api/me cho biết ai là chủ hệ thống', async () => {
    expect((await admin.get<Me>('/api/me')).body.isAdmin).toBe(true)
    expect((await normal.get<Me>('/api/me')).body.isAdmin).toBe(false)
  })

  it('người thường không xem được trang quản trị', async () => {
    const res = await normal.get('/api/admin/orgs')
    expect(res.status).toBe(403)
  })

  it('liệt kê mọi tổ chức, kể cả Kim Lan mình chưa ở, kèm nhân vật chưa có chủ để nhường chỗ', async () => {
    const res = await admin.get<{ orgs: AdminOrgRow[] }>('/api/admin/orgs')
    expect(res.status).toBe(200)
    const bach = res.body.orgs.find((o) => o.org.id === BACH)!
    expect(bach.isMember).toBe(false)
    expect(bach.isFull).toBe(true)
    expect(bach.leader?.name).toBe('Bạch Lăng Sương')
    expect(bach.leader?.claimed).toBe(false)
    expect(bach.replaceable.map((r) => r.memberId)).toContain('bg12')
    expect(res.body.orgs.find((o) => o.org.id === 'kinh-hong-cac')?.isLeader).toBe(true)
  })

  it('Kim Lan đủ 12 người: phải chọn người nhường chỗ', async () => {
    const res = await admin.post(`/api/admin/orgs/${BACH}/lead`, {})
    expect(res.status).toBe(409)
    expect(errorOf(res).message).toMatch(/12/)
  })

  it('không được bắt nhân vật đã có chủ nhường chỗ', async () => {
    await loginCharacter(env, 'ch-bg05') // bg05 giờ có chủ tài khoản
    const res = await admin.post(`/api/admin/orgs/${BACH}/lead`, { replaceMemberId: 'bg05' })
    expect(res.status).toBe(409)
    expect(errorOf(res).message).toMatch(/có chủ/)
  })

  it('nhường chỗ của Tiểu muội → vào ghế Đại ca, Đại tỷ cũ lùi ghế 2, vẫn đủ 12 người', async () => {
    const res = await admin.post<OkBody<{ orgId: string }>>(`/api/admin/orgs/${BACH}/lead`, { replaceMemberId: 'bg12' })
    expect(res.status).toBe(200)
    expect(res.body.result?.orgId).toBe(BACH)

    const snap = (await admin.get<GuildSnapshot>('/api/snapshot', { 'x-org-id': BACH })).body
    expect(snap.members).toHaveLength(12)
    expect(snap.members.some((m) => m.id === 'bg12')).toBe(false)
    const me = snap.members.find((m) => m.characterId === 'ch-m001')!
    expect(me.seat).toBe(1)
    expect(me.rank).toBe('dai-ca')
    const old = snap.members.find((m) => m.id === 'bg01')!
    expect(old.seat).toBe(2)
    expect(old.rank).toBe('huynh-de')

    const meInfo = (await admin.get<Me>('/api/me', { 'x-org-id': BACH })).body
    expect(meInfo.orgs.map((o) => o.org.id)).toContain(BACH)
    expect(meInfo.permissions).toContain('rank.assign')
  })

  it('đang đứng đầu rồi thì báo, không làm gì thêm', async () => {
    const res = await admin.post(`/api/admin/orgs/${BACH}/lead`, {})
    expect(res.status).toBe(409)
    expect(errorOf(res).message).toMatch(/đứng đầu/)
  })

  it('đã là thành viên (chưa đứng đầu) → được đưa lên đứng đầu, người cũ lui xuống chức phó', async () => {
    // dựng tình huống: chủ hệ thống lập team, mời một người vào, nhường ghế trưởng nhóm cho người đó, rồi lấy lại qua quản trị
    const team = await admin.post<OkBody<{ orgId: string }>>('/api/orgs', { type: 'team', name: 'Đội Thử Quyền', han: '试' })
    expect(team.status).toBe(201)
    const orgId = team.body.result!.orgId
    const inv = await admin.post<OkBody<{ code: string }>>('/api/invites', { kind: 'join' }, { 'x-org-id': orgId })
    expect(inv.status).toBe(201)
    const other = await loginAs(env.app, IDS.elite)
    expect((await other.post(`/api/invites/${inv.body.result!.code}/accept`, {})).status).toBe(200)
    const roster = (await admin.get<GuildSnapshot>('/api/snapshot', { 'x-org-id': orgId })).body.members
    const otherId = roster.find((m) => m.id !== roster.find((x) => x.characterId === 'ch-m001')!.id)!.id
    expect((await admin.put(`/api/members/${otherId}/rank`, { rank: 'truong-nhom' }, { 'x-org-id': orgId })).status).toBe(200)

    const res = await admin.post(`/api/admin/orgs/${orgId}/lead`, {})
    expect(res.status).toBe(200)
    const after = (await admin.get<GuildSnapshot>('/api/snapshot', { 'x-org-id': orgId })).body.members
    expect(after.find((m) => m.characterId === 'ch-m001')?.rank).toBe('truong-nhom')
    expect(after.find((m) => m.id === otherId)?.rank).toBe('pho-nhom')
  })
})

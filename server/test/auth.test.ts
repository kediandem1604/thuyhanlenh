import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AuthProviders, Me } from '@/domain/api'
import { client, errorOf, IDS, loginAs, loginGuest, makeTestApp, type TestEnv } from './helpers'

describe('đăng nhập thử + phiên', () => {
  let env: TestEnv
  beforeAll(async () => {
    env = await makeTestApp()
  })
  afterAll(async () => env.close())

  it('liệt kê cách đăng nhập và môn hạ demo', async () => {
    const res = await client(env.app).get<AuthProviders>('/auth/providers')
    expect(res.status).toBe(200)
    expect(res.body.dev).toBe(true)
    expect(res.body.discord).toBe(false)
    // đăng nhập thử theo nhân vật: 46 của Kinh Hồng Các + 12 người họ Bạch
    expect(res.body.devMembers?.length).toBe(58)
    expect(res.body.devMembers?.[0].rank).toBe('bang-chu')
  })

  it('chưa đăng nhập thì /api/me trả 401', async () => {
    const res = await client(env.app).get('/api/me')
    expect(res.status).toBe(401)
    expect(errorOf(res).code).toBe('unauthorized')
  })

  it('đăng nhập Bang Chủ → có môn hạ và đủ quyền', async () => {
    const api = await loginAs(env.app, IDS.leader)
    const res = await api.get<Me>('/api/me')
    expect(res.status).toBe(200)
    expect(res.body.member?.id).toBe(IDS.leader)
    expect(res.body.member?.rank).toBe('bang-chu')
    expect(res.body.permissions).toContain('rank.assign')
    expect(res.body.user.provider).toBe('dev')
  })

  it('Tân Binh chỉ có quyền cơ bản', async () => {
    const api = await loginAs(env.app, IDS.rookie)
    const me = (await api.get<Me>('/api/me')).body
    expect(me.permissions).toContain('event.rsvp')
    expect(me.permissions).not.toContain('clear.record')
  })

  it('chặn request ghi thiếu header CSRF', async () => {
    const res = await env.app.inject({ method: 'POST', url: '/auth/logout' })
    expect(res.statusCode).toBe(403)
    expect(res.json().error.code).toBe('csrf')
  })

  it('chặn request ghi từ origin lạ', async () => {
    const res = await env.app.inject({ method: 'POST', url: '/auth/logout', headers: { 'x-requested-with': 'thuy-han-lenh', origin: 'https://evil.example' } })
    expect(res.statusCode).toBe(403)
  })

  it('đăng xuất thì phiên mất hiệu lực', async () => {
    const api = await loginAs(env.app, IDS.member)
    expect((await api.get('/api/me')).status).toBe(200)
    expect((await api.post('/auth/logout')).status).toBe(200)
    expect((await api.get('/api/me')).status).toBe(401)
  })

  it('khách chưa nhập môn: /api/me không có môn hạ, /api/snapshot bị chặn', async () => {
    const api = await loginGuest(env.app)
    const me = await api.get<Me>('/api/me')
    expect(me.status).toBe(200)
    expect(me.body.member).toBeNull()
    expect(me.body.permissions).toEqual([])
    const snap = await api.get('/api/snapshot')
    expect(snap.status).toBe(403)
    expect(errorOf(snap).code).toBe('not_member')
  })
})

describe('đăng nhập Discord (giả lập API Discord)', () => {
  let env: TestEnv
  let nextUser = { id: '111', username: 'langphong', global_name: 'Lăng Phong', avatar: 'abc' }
  // phản hồi giả của Discord khi đổi code lấy token (null = thành công)
  let tokenError: { status: number; body: unknown } | null = null
  const fakeFetch = (async (url: string | URL) => {
    const u = String(url)
    if (u.endsWith('/oauth2/token') && tokenError) return new Response(JSON.stringify(tokenError.body), { status: tokenError.status })
    if (u.endsWith('/oauth2/token')) return new Response(JSON.stringify({ access_token: 'tok', token_type: 'Bearer' }), { status: 200 })
    if (u.endsWith('/users/@me')) return new Response(JSON.stringify(nextUser), { status: 200 })
    return new Response('not found', { status: 404 })
  }) as typeof fetch

  beforeAll(async () => {
    env = await makeTestApp({ discord: { clientId: 'cid', clientSecret: 'secret', redirectUri: 'http://localhost:5173/auth/discord/callback' } }, fakeFetch)
  })
  afterAll(async () => env.close())

  async function discordLogin(next = '/') {
    const start = await env.app.inject({ method: 'GET', url: `/auth/discord/login?next=${encodeURIComponent(next)}` })
    expect(start.statusCode).toBe(302)
    expect(start.headers.location).toContain('discord.com/oauth2/authorize')
    const state = new URL(String(start.headers.location)).searchParams.get('state')!
    const oauthCookie = String(([] as string[]).concat(start.headers['set-cookie'] as string[]).find((c) => c.startsWith('thl_oauth='))).split(';')[0]
    const cb = await env.app.inject({ method: 'GET', url: `/auth/discord/callback?code=xyz&state=${state}`, headers: { cookie: oauthCookie } })
    expect(cb.statusCode).toBe(302)
    const session = String(([] as string[]).concat(cb.headers['set-cookie'] as string[]).find((c) => c.startsWith('thl_session='))).split(';')[0]
    return { cb, api: client(env.app, session) }
  }

  async function callbackWith(err: { status: number; body: unknown }) {
    tokenError = err
    try {
      const start = await env.app.inject({ method: 'GET', url: '/auth/discord/login' })
      const state = new URL(String(start.headers.location)).searchParams.get('state')!
      const oauthCookie = String(([] as string[]).concat(start.headers['set-cookie'] as string[]).find((c) => c.startsWith('thl_oauth='))).split(';')[0]
      return await env.app.inject({ method: 'GET', url: `/auth/discord/callback?code=xyz&state=${state}`, headers: { cookie: oauthCookie } })
    } finally {
      tokenError = null
    }
  }

  it('Discord báo sai khóa (invalid_client) → quay về trang đăng nhập với lỗi cấu hình, không hiện JSON thô', async () => {
    const cb = await callbackWith({ status: 401, body: { error: 'invalid_client' } })
    expect(cb.statusCode).toBe(302)
    expect(cb.headers.location).toBe('http://localhost:5173/?login_error=config')
  })

  it('mã đăng nhập hết hạn / đã dùng (invalid_grant) → báo đăng nhập lại', async () => {
    const cb = await callbackWith({ status: 400, body: { error: 'invalid_grant', error_description: 'Invalid "code" in request.' } })
    expect(cb.statusCode).toBe(302)
    expect(cb.headers.location).toBe('http://localhost:5173/?login_error=expired')
  })

  it('Discord trục trặc (lỗi khác) → báo thử lại', async () => {
    const cb = await callbackWith({ status: 503, body: 'upstream' })
    expect(cb.headers.location).toBe('http://localhost:5173/?login_error=discord')
  })

  it('từ chối callback sai state', async () => {
    const cb = await env.app.inject({ method: 'GET', url: '/auth/discord/callback?code=x&state=sai', headers: { cookie: 'thl_oauth=dung|/' } })
    expect(cb.statusCode).toBe(302)
    expect(cb.headers.location).toContain('login_error=state')
  })

  it('người Discord đầu tiên được gắn vào Bang Chủ (khai bang) và quay về đúng trang', async () => {
    const { cb, api } = await discordLogin('/pho-ban')
    expect(cb.headers.location).toBe('http://localhost:5173/pho-ban')
    const me = (await api.get<Me>('/api/me')).body
    expect(me.user.provider).toBe('discord')
    expect(me.user.avatarUrl).toContain('cdn.discordapp.com')
    expect(me.member?.id).toBe(IDS.leader)
  })

  it('người Discord thứ hai chưa có môn hạ → phải nhập môn', async () => {
    nextUser = { id: '222', username: 'khachla', global_name: 'Khách Lạ', avatar: '' }
    const { api } = await discordLogin()
    const me = (await api.get<Me>('/api/me')).body
    expect(me.member).toBeNull()
  })

  it('đăng nhập lại cùng tài khoản Discord không tạo trùng người dùng', async () => {
    nextUser = { id: '111', username: 'langphong', global_name: 'Lăng Phong Mới', avatar: 'abc' }
    const { api } = await discordLogin()
    const me = (await api.get<Me>('/api/me')).body
    expect(me.member?.id).toBe(IDS.leader)
    expect(me.user.name).toBe('Lăng Phong Mới')
  })

  it('không cho đăng nhập thử vào môn hạ đã gắn Discord', async () => {
    const res = await client(env.app).post('/auth/dev/login', { memberId: IDS.leader })
    expect(res.status).toBe(409)
  })
})

describe('khai lập bang trống (SEED_DEMO=false) bằng Discord', () => {
  let env: TestEnv
  let nextUser = { id: '900', username: 'tosu', global_name: 'Tổ Sư Khai Bang', avatar: '' }
  const fakeFetch = (async (url: string | URL) => {
    const u = String(url)
    if (u.endsWith('/oauth2/token')) return new Response(JSON.stringify({ access_token: 'tok', token_type: 'Bearer' }), { status: 200 })
    if (u.endsWith('/users/@me')) return new Response(JSON.stringify(nextUser), { status: 200 })
    return new Response('not found', { status: 404 })
  }) as typeof fetch

  beforeAll(async () => {
    env = await makeTestApp(
      { seedDemo: false, devLogin: false, discord: { clientId: 'cid', clientSecret: 'secret', redirectUri: 'http://localhost:5173/auth/discord/callback' } },
      fakeFetch,
    )
  })
  afterAll(async () => env.close())

  async function discordLogin() {
    const start = await env.app.inject({ method: 'GET', url: '/auth/discord/login' })
    const state = new URL(String(start.headers.location)).searchParams.get('state')!
    const oauthCookie = String(([] as string[]).concat(start.headers['set-cookie'] as string[]).find((c) => c.startsWith('thl_oauth='))).split(';')[0]
    const cb = await env.app.inject({ method: 'GET', url: `/auth/discord/callback?code=xyz&state=${state}`, headers: { cookie: oauthCookie } })
    const session = String(([] as string[]).concat(cb.headers['set-cookie'] as string[]).find((c) => c.startsWith('thl_session='))).split(';')[0]
    return client(env.app, session)
  }

  it('người đầu tiên lập bang và trở thành Bang Chủ mang tên Discord', async () => {
    const api = await discordLogin()
    const me = (await api.get<Me>('/api/me')).body
    expect(me.member?.rank).toBe('bang-chu')
    expect(me.member?.name).toBe('Tổ Sư Khai Bang')
    expect(me.permissions).toContain('rank.assign')
    const snap = await api.get<{ members: unknown[]; activities: { text: string }[] }>('/api/snapshot?slices=members,activities')
    expect(snap.body.members).toHaveLength(1)
    expect(snap.body.activities.some((a) => a.text.includes('khai lập bang'))).toBe(true)
  })

  it('người thứ hai phải nhập môn, không thành Bang Chủ thứ hai', async () => {
    nextUser = { id: '901', username: 'nguoimoi', global_name: 'Người Mới', avatar: '' }
    const api = await discordLogin()
    const me = (await api.get<Me>('/api/me')).body
    expect(me.member).toBeNull()
  })
})

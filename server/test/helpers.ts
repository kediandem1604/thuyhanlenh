import type { FastifyInstance } from 'fastify'
import { CSRF_HEADER, CSRF_VALUE, type ApiErrorBody, type ApiOkBody, type GuildSnapshot } from '@/domain/api'
import { buildApp } from '../src/app'
import { loadConfig, type Config } from '../src/config'
import { openDatabase, type Database } from '../src/db/client'
import { ensureGuild } from '../src/db/importer'

/*
 * Môi trường test: PGlite trong RAM + migration + bang demo (46 môn hạ).
 * Id môn hạ demo theo chức vụ:
 *   m001 Bang Chủ · m002–m003 Phó Bang · m004–m007 Trưởng Lão · m008–m013 Đường Chủ
 *   m014–m025 Tinh Anh · m026–m040 Thành Viên · m041–m046 Tân Binh
 */
export const IDS = {
  leader: 'm001',
  deputy: 'm002',
  deputy2: 'm003',
  elder: 'm004',
  hall: 'm008',
  elite: 'm014',
  member: 'm026',
  rookie: 'm041',
} as const

export interface TestEnv {
  app: FastifyInstance
  database: Database
  config: Config
  close: () => Promise<void>
}

export async function makeTestApp(overrides: Partial<Config> = {}, fetchImpl?: typeof fetch): Promise<TestEnv> {
  const config = loadConfig({
    env: 'test',
    pgliteDir: 'memory',
    databaseUrl: undefined,
    devLogin: true,
    seedDemo: true,
    serveWeb: false,
    discord: null,
    webOrigin: 'http://localhost:5173',
    secureCookies: false,
    ...overrides,
  })
  const database = await openDatabase(config)
  await database.migrate()
  await ensureGuild(database.db, config.guildId, config.seedDemo)
  const app = await buildApp({ config, database, logger: false, fetchImpl })
  await app.ready()
  return {
    app,
    database,
    config,
    close: async () => {
      await app.close()
      await database.close()
    },
  }
}

export interface Res<T = unknown> {
  status: number
  body: T
  headers: Record<string, unknown>
}

export type OkBody<R = unknown> = ApiOkBody<R> & { snapshot: Partial<GuildSnapshot> }

/** Client HTTP giả lập (fastify.inject) mang cookie phiên. */
export function client(app: FastifyInstance, cookie?: string) {
  const call = async <T = unknown>(method: string, url: string, body?: unknown, headers: Record<string, string> = {}): Promise<Res<T>> => {
    const res = await app.inject({
      method: method as never,
      url,
      payload: body === undefined ? undefined : (body as never),
      headers: { [CSRF_HEADER]: CSRF_VALUE, ...(cookie ? { cookie } : {}), ...headers },
    })
    let parsed: unknown = res.body
    try {
      parsed = res.json()
    } catch {
      /* không phải JSON */
    }
    return { status: res.statusCode, body: parsed as T, headers: res.headers }
  }
  return {
    get: <T = unknown>(url: string, headers?: Record<string, string>) => call<T>('GET', url, undefined, headers),
    post: <T = OkBody>(url: string, body?: unknown, headers?: Record<string, string>) => call<T>('POST', url, body ?? {}, headers),
    patch: <T = OkBody>(url: string, body?: unknown, headers?: Record<string, string>) => call<T>('PATCH', url, body ?? {}, headers),
    put: <T = OkBody>(url: string, body?: unknown, headers?: Record<string, string>) => call<T>('PUT', url, body ?? {}, headers),
    del: <T = OkBody>(url: string, headers?: Record<string, string>) => call<T>('DELETE', url, undefined, headers),
  }
}

export type Client = ReturnType<typeof client>

function cookieFrom(res: { headers: Record<string, unknown> }) {
  const raw = res.headers['set-cookie']
  const list = Array.isArray(raw) ? raw : raw ? [raw] : []
  const session = list.map(String).find((c) => c.startsWith('thl_session='))
  if (!session) throw new Error('không nhận được cookie phiên')
  return session.split(';')[0]
}

/** Đăng nhập thử với tư cách một môn hạ, trả về client đã có cookie. */
export async function loginAs(app: FastifyInstance, memberId: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/dev/login',
    payload: { memberId },
    headers: { [CSRF_HEADER]: CSRF_VALUE },
  })
  if (res.statusCode !== 200) throw new Error(`đăng nhập ${memberId} thất bại: ${res.statusCode} ${res.body}`)
  return client(app, cookieFrom(res))
}

/** Đăng nhập khách chưa có môn hạ (để thử luồng Nhập môn). */
export async function loginGuest(app: FastifyInstance, guestName = 'Khách Lạ') {
  const res = await app.inject({ method: 'POST', url: '/auth/dev/login', payload: { guestName }, headers: { [CSRF_HEADER]: CSRF_VALUE } })
  if (res.statusCode !== 200) throw new Error(`đăng nhập khách thất bại: ${res.statusCode}`)
  return client(app, cookieFrom(res))
}

export const errorOf = (res: Res) => (res.body as ApiErrorBody).error

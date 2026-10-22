import { existsSync } from 'node:fs'
import { constants as zlib } from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Fastify, { type FastifyError } from 'fastify'
import compress from '@fastify/compress'
import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import websocket from '@fastify/websocket'
import { ZodError, z } from 'zod'
import type { ApiErrorBody } from '@/domain/api'
import type { Config } from './config'
import type { AppContext } from './context'
import type { Database } from './db/client'
import { registerAuthHooks } from './auth/context'
import { authRoutes } from './auth/routes'
import { AppError } from './lib/errors'
import { Hub } from './realtime/hub'
import { wsRoutes } from './realtime/ws'
import { coreRoutes } from './modules/core'
import { memberRoutes } from './modules/members'
import { orgRoutes } from './modules/orgs'
import { adminRoutes } from './modules/admin'
import { mentorshipRoutes } from './modules/mentorships'
import { bondRoutes } from './modules/bonds'
import { dungeonRoutes } from './modules/dungeons'
import { eventRoutes } from './modules/events'
import { teamRoutes } from './modules/teams'
import { warRoutes } from './modules/wars'
import { treasuryRoutes } from './modules/treasury'
import { recruitmentRoutes } from './modules/recruitment'
import { announcementRoutes } from './modules/announcements'

// Thông báo lỗi kiểm tra dữ liệu bằng tiếng Việt
try {
  z.config(z.locales.vi())
} catch {
  /* bản zod không có locale vi — giữ mặc định */
}

export interface BuildAppOptions {
  config: Config
  database: Database
  logger?: boolean
  fetchImpl?: typeof fetch
}

const WEB_DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist')

export async function buildApp(opts: BuildAppOptions) {
  const { config, database } = opts
  const app = Fastify({
    logger: opts.logger === false ? false : { level: config.env === 'production' ? 'info' : 'warn' },
    trustProxy: true,
    bodyLimit: 1_000_000,
  })

  const ctx: AppContext = {
    config,
    database,
    db: database.db,
    hub: new Hub(),
    guildId: config.guildId,
    fetch: opts.fetchImpl ?? fetch,
  }
  app.decorate('ctx', ctx)

  // nén phản hồi (snapshot bang ~240 KB JSON → ~30 KB). Brotli mức 4: nén tốt mà gần như không tốn CPU;
  // file tĩnh trong dist/ đã nén sẵn lúc build (scripts/precompress.mjs) nên không nén lại.
  await app.register(compress, {
    global: true,
    threshold: 1024,
    encodings: ['br', 'gzip'],
    brotliOptions: { params: { [zlib.BROTLI_PARAM_QUALITY]: 4 } },
    zlibOptions: { level: 6 },
  })
  await app.register(cookie)
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://cdn.discordapp.com'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
  await app.register(rateLimit, { global: true, max: 300, timeWindow: '1 minute', allowList: () => config.env === 'test' })
  await app.register(websocket)

  registerAuthHooks(app)

  app.setErrorHandler((err: FastifyError | Error, req, reply) => {
    let status = 500
    let body: ApiErrorBody = { ok: false, error: { code: 'server_error', message: 'Máy chủ gặp sự cố, thử lại sau ít phút.' } }
    if (err instanceof AppError) {
      status = err.status
      body = { ok: false, error: { code: err.code, message: err.message } }
    } else if (err instanceof ZodError) {
      status = 400
      const issue = err.issues[0]
      const where = issue?.path.length ? ` (${issue.path.join('.')})` : ''
      body = { ok: false, error: { code: 'invalid', message: `Dữ liệu không hợp lệ${where}: ${issue?.message ?? ''}`.trim() } }
    } else if ('statusCode' in err && typeof err.statusCode === 'number' && err.statusCode < 500) {
      status = err.statusCode
      body = { ok: false, error: { code: err.code ?? 'bad_request', message: status === 429 ? 'Thao tác quá nhanh, nghỉ tay một chút rồi thử lại.' : err.message } }
    } else {
      req.log.error({ err }, 'lỗi không lường trước')
    }
    reply.code(status).send(body)
  })

  await app.register(authRoutes)
  await app.register(coreRoutes)
  await app.register(memberRoutes)
  await app.register(orgRoutes)
  await app.register(adminRoutes)
  await app.register(mentorshipRoutes)
  await app.register(bondRoutes)
  await app.register(dungeonRoutes)
  await app.register(eventRoutes)
  await app.register(teamRoutes)
  await app.register(warRoutes)
  await app.register(treasuryRoutes)
  await app.register(recruitmentRoutes)
  await app.register(announcementRoutes)
  await app.register(wsRoutes)

  app.get('/api/health', async () => ({ ok: true, db: database.kind, clients: ctx.hub.size, time: new Date().toISOString() }))

  // Production: phục vụ luôn bản build của web (một tiến trình duy nhất)
  if (config.serveWeb && existsSync(WEB_DIST)) {
    await app.register(fastifyStatic, {
      root: WEB_DIST,
      wildcard: false,
      // dùng bản .br / .gz nén sẵn khi trình duyệt hỗ trợ
      preCompressed: true,
      // tự đặt cache-control bên dưới (tắt mặc định của plugin để nó không ghi đè)
      cacheControl: false,
      setHeaders: (res, filePath) => {
        // assets/ có mã băm trong tên → nội dung không bao giờ đổi, giữ 1 năm;
        // index.html luôn hỏi lại máy chủ để bản cập nhật mới có hiệu lực ngay
        // (đường dẫn có thể dùng \ trên Windows; bản nén sẵn có đuôi .br / .gz)
        const cc = /[\\/]assets[\\/]/.test(filePath) ? 'public, max-age=31536000, immutable' : /\.html(\.(br|gz))?$/.test(filePath) ? 'no-cache' : 'public, max-age=3600'
        res.header('cache-control', cc)
      },
    })
    app.setNotFoundHandler((req, reply) => {
      if (req.method === 'GET' && !req.url.startsWith('/api') && !req.url.startsWith('/auth')) return reply.type('text/html').header('cache-control', 'no-cache').sendFile('index.html')
      reply.code(404).send({ ok: false, error: { code: 'not_found', message: 'Không có đường dẫn này.' } })
    })
  } else {
    app.setNotFoundHandler((_req, reply) => {
      reply.code(404).send({ ok: false, error: { code: 'not_found', message: 'Không có đường dẫn này.' } })
    })
  }

  app.addHook('onClose', async () => ctx.hub.close())
  return app
}

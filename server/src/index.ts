import { loadConfig } from './config'
import { openDatabase } from './db/client'
import { ensureGuild } from './db/importer'
import { buildApp } from './app'
import { startScheduler } from './jobs/scheduler'

const config = loadConfig()
const database = await openDatabase(config)
await database.migrate()
const init = await ensureGuild(database.db, config.guildId, config.seedDemo)

const app = await buildApp({ config, database })
const stopScheduler = startScheduler(app.ctx, app.log)

await app.listen({ port: config.port, host: config.host })

const discordState = config.discord ? 'bật' : 'CHƯA cấu hình (điền DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET trong .env)'
console.log(
  [
    '',
    '  令 Thủy Hàn Lệnh — máy chủ đã chạy',
    `  · API:        http://localhost:${config.port}/api/health${config.serveWeb ? '' : `  (web dev: ${config.webOrigin})`}`,
    `  · CSDL:       ${database.kind === 'pglite' ? `PGlite nhúng (${config.pgliteDir})` : 'PostgreSQL'}`,
    `  · Discord:    ${discordState}`,
    `  · Đăng nhập thử: ${config.devLogin ? 'bật' : 'tắt'}`,
    init.created ? `  · Đã tạo bang mới${'seeded' in init && init.seeded ? ` + dữ liệu demo (${init.seeded.members} môn hạ)` : ''}` : '',
    '',
  ]
    .filter(Boolean)
    .join('\n'),
)

const shutdown = async () => {
  stopScheduler()
  await app.close()
  await database.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

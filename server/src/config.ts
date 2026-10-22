import 'dotenv/config'
import { z } from 'zod'

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase())))

/**
 * Địa chỉ trạm chuyển tiếp Discord: bỏ dấu cách, dấu / cuối, tự thêm https:// nếu dán thiếu; để trống = không dùng trạm.
 * Sai hẳn → báo lỗi nêu đúng tên biến và dạng cần điền (máy chủ dừng ngay thay vì chạy sai).
 */
const proxyBase = z.preprocess(
  (v) => {
    if (typeof v !== 'string') return v
    const t = v.trim().replace(/\/+$/, '')
    if (!t) return undefined
    return /^https?:\/\//i.test(t) ? t : `https://${t}`
  },
  z
    .string()
    .refine((u) => {
      try {
        const host = new URL(u).hostname
        return host.includes('.') && !/\s/.test(u)
      } catch {
        return false
      }
    }, 'DISCORD_API_BASE phải là địa chỉ Worker, dạng https://ten-worker.ten-tai-khoan.workers.dev')
    .optional(),
)

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // production: nền tảng (Render, Fly…) cấp PORT; dev: API_PORT (PORT thường bị công cụ dev chiếm cho Vite)
  PORT: z.coerce.number().int().optional(),
  API_PORT: z.coerce.number().int().default(8787),
  HOST: z.string().default('0.0.0.0'),
  // địa chỉ công khai của web; trên Render tự lấy RENDER_EXTERNAL_URL (vd https://thuy-han-lenh.onrender.com)
  WEB_ORIGIN: z.string().url().optional(),
  RENDER_EXTERNAL_URL: z.string().url().optional(),
  DATABASE_URL: z.string().optional(),
  PGLITE_DIR: z.string().default('server/.data/pglite'),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_REDIRECT_URI: z.string().optional(),
  // (tùy chọn) trạm chuyển tiếp API Discord — dùng khi IP máy chủ bị Discord chặn 429 (vd Render dùng chung IP)
  DISCORD_API_BASE: proxyBase,
  DISCORD_PROXY_KEY: z.string().optional(),
  BOOTSTRAP_LEADER_DISCORD_ID: z.string().optional(),
  // (tùy chọn) ID Discord của chủ hệ thống, cách nhau dấu phẩy — ngoài người giữ ghế đứng đầu bang chính
  ADMIN_DISCORD_IDS: z.string().optional(),
  DEV_LOGIN: z.string().optional(),
  SEED_DEMO: z.string().optional(),
  GUILD_ID: z.string().default('kinh-hong-cac'),
  SERVE_WEB: z.string().optional(),
  TZ: z.string().default('Asia/Ho_Chi_Minh'),
})

export interface Config {
  env: 'development' | 'production' | 'test'
  port: number
  host: string
  webOrigin: string
  /** chuỗi kết nối Postgres; không có → dùng PGlite */
  databaseUrl?: string
  /** thư mục PGlite, hoặc 'memory' cho test */
  pgliteDir: string
  discord: {
    clientId: string
    clientSecret: string
    redirectUri: string
    /** gốc API Discord (mặc định https://discord.com/api/v10; hoặc địa chỉ trạm chuyển tiếp) */
    apiBase?: string
    /** khóa gửi kèm header x-proxy-key để trạm chuyển tiếp không thành proxy mở */
    proxyKey?: string
  } | null
  bootstrapLeaderDiscordId?: string
  /** ID Discord được coi là chủ hệ thống */
  adminDiscordIds: string[]
  devLogin: boolean
  seedDemo: boolean
  guildId: string
  serveWeb: boolean
  secureCookies: boolean
}

export function loadConfig(overrides: Partial<Config> = {}, env: NodeJS.ProcessEnv = process.env): Config {
  const e = EnvSchema.parse(env)
  // Giờ reset tuần tính theo giờ Việt Nam
  process.env.TZ = e.TZ
  const prod = e.NODE_ENV === 'production'
  const webOrigin = (e.WEB_ORIGIN ?? e.RENDER_EXTERNAL_URL ?? 'http://localhost:5173').replace(/\/$/, '')
  const discord =
    e.DISCORD_CLIENT_ID && e.DISCORD_CLIENT_SECRET
      ? {
          clientId: e.DISCORD_CLIENT_ID,
          clientSecret: e.DISCORD_CLIENT_SECRET,
          redirectUri: e.DISCORD_REDIRECT_URI || `${webOrigin}/auth/discord/callback`,
          apiBase: e.DISCORD_API_BASE,
          proxyKey: e.DISCORD_PROXY_KEY?.trim() || undefined,
        }
      : null
  const config: Config = {
    env: e.NODE_ENV,
    port: prod ? (e.PORT ?? e.API_PORT) : e.API_PORT,
    host: e.HOST,
    webOrigin,
    databaseUrl: e.DATABASE_URL || undefined,
    pgliteDir: e.PGLITE_DIR,
    discord,
    bootstrapLeaderDiscordId: e.BOOTSTRAP_LEADER_DISCORD_ID || undefined,
    adminDiscordIds: (e.ADMIN_DISCORD_IDS ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
    devLogin: bool(!prod).parse(e.DEV_LOGIN),
    seedDemo: bool(true).parse(e.SEED_DEMO),
    guildId: e.GUILD_ID,
    serveWeb: bool(prod).parse(e.SERVE_WEB),
    secureCookies: prod,
    ...overrides,
  }
  if (prod && config.devLogin) {
    console.warn('[cảnh báo] DEV_LOGIN đang bật ở production — ai cũng đăng nhập thử được. Đặt DEV_LOGIN=false.')
  }
  return config
}

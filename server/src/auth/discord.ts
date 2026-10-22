import { badRequest } from '../lib/errors'

export interface DiscordUser {
  id: string
  username: string
  global_name?: string | null
  avatar?: string | null
}

const API = 'https://discord.com/api/v10'

export function authorizeUrl(clientId: string, redirectUri: string, state: string) {
  const p = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: redirectUri, scope: 'identify', state, prompt: 'none' })
  return `https://discord.com/oauth2/authorize?${p}`
}

/** Đổi `code` lấy access token rồi đọc thông tin người dùng (chỉ scope `identify`). */
export async function fetchDiscordUser(
  fetchImpl: typeof fetch,
  cfg: { clientId: string; clientSecret: string; redirectUri: string },
  code: string,
): Promise<DiscordUser> {
  const tokenRes = await fetchImpl(`${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: cfg.redirectUri,
    }),
  })
  if (!tokenRes.ok) throw badRequest('Discord từ chối mã đăng nhập (hết hạn hoặc sai cấu hình).', 'discord_token')
  const token = (await tokenRes.json()) as { access_token?: string; token_type?: string }
  if (!token.access_token) throw badRequest('Discord không trả về access token.', 'discord_token')
  const meRes = await fetchImpl(`${API}/users/@me`, { headers: { Authorization: `${token.token_type ?? 'Bearer'} ${token.access_token}` } })
  if (!meRes.ok) throw badRequest('Không đọc được thông tin tài khoản Discord.', 'discord_user')
  return (await meRes.json()) as DiscordUser
}

export function discordAvatarUrl(u: DiscordUser) {
  return u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128` : null
}

// Cloudflare Worker — trạm chuyển tiếp API Discord cho bước đăng nhập của Thủy Hàn Lệnh.
//
// Vì sao cần: Render (và nhiều nền tảng miễn phí) dùng chung vài IP ra ngoài cho mọi dịch vụ trong một vùng;
// Discord hay chặn các IP này (HTTP 429). Worker chạy trên IP của Cloudflare nên Discord không chặn.
//
// Chỉ chuyển tiếp đúng 2 lời gọi cần cho đăng nhập:
//   POST /oauth2/token  (đổi code lấy access token)
//   GET  /users/@me     (đọc tên + ảnh đại diện)
// và bắt buộc header `x-proxy-key` khớp biến môi trường PROXY_KEY (đặt trong Worker → Settings → Variables,
// loại "Secret") — không có khóa thì từ chối hết, để Worker không thành proxy mở.
//
// Máy chủ Thủy Hàn Lệnh dùng trạm khi đặt:
//   DISCORD_API_BASE = https://<tên-worker>.<tài-khoản>.workers.dev
//   DISCORD_PROXY_KEY = <cùng giá trị với PROXY_KEY>

const DISCORD_API = 'https://discord.com/api/v10'
const ROUTES = new Set(['POST /oauth2/token', 'GET /users/@me'])

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (!env.PROXY_KEY || request.headers.get('x-proxy-key') !== env.PROXY_KEY) {
      return new Response('forbidden', { status: 403 })
    }
    if (!ROUTES.has(`${request.method} ${url.pathname}`)) {
      return new Response('not found', { status: 404 })
    }

    const headers = new Headers({ 'user-agent': 'DiscordBot (https://github.com/kediandem1604/thuyhanlenh, 1.0)' })
    for (const name of ['content-type', 'authorization']) {
      const value = request.headers.get(name)
      if (value) headers.set(name, value)
    }

    const upstream = await fetch(DISCORD_API + url.pathname, {
      method: request.method,
      headers,
      body: request.method === 'POST' ? await request.text() : undefined,
    })

    const out = new Headers({ 'content-type': upstream.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' })
    const retry = upstream.headers.get('retry-after')
    if (retry) out.set('retry-after', retry)
    return new Response(upstream.body, { status: upstream.status, headers: out })
  },
}

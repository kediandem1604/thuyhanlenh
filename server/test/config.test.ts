import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config'

const base = { NODE_ENV: 'production', DISCORD_CLIENT_ID: 'cid', DISCORD_CLIENT_SECRET: 'sec', RENDER_EXTERNAL_URL: 'https://thuy-han-lenh.onrender.com' }

describe('cấu hình trạm chuyển tiếp Discord (DISCORD_API_BASE)', () => {
  it('chấp nhận địa chỉ đầy đủ, bỏ dấu / cuối', () => {
    const c = loadConfig({}, { ...base, DISCORD_API_BASE: 'https://thl-discord.abc.workers.dev/', DISCORD_PROXY_KEY: 'k' })
    expect(c.discord?.apiBase).toBe('https://thl-discord.abc.workers.dev')
    expect(c.discord?.proxyKey).toBe('k')
  })

  it('tự thêm https:// và bỏ dấu cách khi dán thiếu', () => {
    const c = loadConfig({}, { ...base, DISCORD_API_BASE: '  thl-discord.abc.workers.dev  ' })
    expect(c.discord?.apiBase).toBe('https://thl-discord.abc.workers.dev')
  })

  it('để trống = gọi thẳng Discord', () => {
    expect(loadConfig({}, { ...base, DISCORD_API_BASE: '' }).discord?.apiBase).toBeUndefined()
    expect(loadConfig({}, base).discord?.apiBase).toBeUndefined()
  })

  it('giá trị sai hẳn → báo lỗi nêu đúng tên biến và dạng cần điền', () => {
    expect(() => loadConfig({}, { ...base, DISCORD_API_BASE: 'địa chỉ worker của tôi' })).toThrow(/DISCORD_API_BASE.*workers\.dev/)
  })
})

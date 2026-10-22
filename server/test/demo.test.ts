// Máy chủ giả cho chế độ "Vào xem thử" (chạy trong trình duyệt, dữ liệu mẫu) — phải trả lời giống máy chủ thật.
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/client'
import type { GuildSnapshot, Me, OrgInfo } from '@/domain/api'
import { createDemoBackend } from '@/demo/backend'

const demo = createDemoBackend(Date.UTC(2026, 9, 22, 12))
const me = (org: string | null) => demo('GET', '/api/me', undefined, org) as Promise<Me>
const snap = (org: string, q = '') => demo('GET', `/api/snapshot${q}`, undefined, org) as Promise<Partial<GuildSnapshot>>

describe('máy chủ giả cho chế độ xem thử', () => {
  it('khách xem thử đứng đầu bang mẫu Kinh Hồng Các, thấy đủ 3 tổ chức', async () => {
    const m = await me(null)
    expect(m.user.name).toBe('Khách xem thử')
    expect(m.org?.id).toBe('kinh-hong-cac')
    expect(m.member?.rank).toBe('bang-chu')
    expect(m.orgs.map((o) => o.org.id).sort()).toEqual(['bach-gia', 'kinh-hong-cac', 'that-tinh-doi'])
    expect(m.permissions).toEqual(expect.arrayContaining(['member.edit', 'rank.assign', 'org.manage']))
    expect(m.isAdmin).toBe(false)
    expect(m.devLogin).toBe(false)
    expect(m.application).toBeNull()
    expect(m.org?.memberCount).toBe(49)
  })

  it('đổi sang Kim Lan Bạch Gia: là Đại tỷ Bạch Lăng Sương, giao diện bạch kim', async () => {
    const m = await me('bach-gia')
    expect(m.org?.type).toBe('kimlan')
    expect(m.org?.theme).toBe('bach-gia')
    expect(m.member?.honorific).toBe('Đại tỷ')
    expect(m.character?.name).toBe('Bạch Lăng Sương')
    expect(m.org?.features).toEqual(['pho-ban', 'bay-tran', 'lich'])
  })

  it('tổ chức không tồn tại → quay về bang mẫu', async () => {
    expect((await me('khong-co')).org?.id).toBe('kinh-hong-cac')
  })

  it('snapshot team: đủ 7 người, chức năng đang tắt thì trả rỗng như máy chủ thật', async () => {
    const s = await snap('that-tinh-doi')
    expect(s.members).toHaveLength(7)
    expect(s.wars).toEqual([])
    expect(s.ledger).toEqual([])
    expect(s.mentorships).toEqual([])
    expect((s.clears ?? []).length).toBeGreaterThan(0)
  })

  it('snapshot chỉ trả các slice được hỏi', async () => {
    const s = await snap('kinh-hong-cac', '?slices=members,events')
    expect(Object.keys(s).sort()).toEqual(['events', 'members'])
  })

  it('mọi thao tác ghi bị từ chối nhẹ nhàng', async () => {
    const err = (await demo('POST', '/api/clears', { dungeonId: 'x' }, 'kinh-hong-cac').catch((e: unknown) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(403)
    expect(err.code).toBe('demo')
    expect(err.message).toMatch(/xem thử/)
    await expect(demo('PATCH', '/api/orgs/current', {}, 'bach-gia')).rejects.toMatchObject({ code: 'demo' })
  })

  it('danh bạ công khai chỉ có bang nhận đơn; đường dẫn lạ → 404', async () => {
    const pub = (await demo('GET', '/api/orgs/public', undefined, null)) as { orgs: OrgInfo[] }
    expect(pub.orgs.map((o) => o.id)).toEqual(['kinh-hong-cac'])
    await expect(demo('GET', '/api/khong-co', undefined, null)).rejects.toMatchObject({ status: 404 })
  })
})

import type { BondType } from '@/domain/types'

export const INTIMACY_TIERS = [
  { min: 0, name: 'Sơ Ngộ', han: '遇' },
  { min: 2000, name: 'Tương Tri', han: '知' },
  { min: 5000, name: 'Tri Âm', han: '音' },
  { min: 10000, name: 'Bạch Đầu', han: '白' },
]

export function intimacyTier(v: number) {
  let idx = 0
  INTIMACY_TIERS.forEach((t, i) => {
    if (v >= t.min) idx = i
  })
  const cur = INTIMACY_TIERS[idx]
  const next = INTIMACY_TIERS[idx + 1]
  return { cur, next, pct: next ? (v - cur.min) / (next.min - cur.min) : 1 }
}

/** Ngày kỷ niệm tròn năm tiếp theo (20:00 tối hôm đó) */
export function nextAnniversary(since: string, now = Date.now()) {
  const s = new Date(since)
  const n = new Date(now)
  let d = new Date(n.getFullYear(), s.getMonth(), s.getDate(), 20, 0, 0)
  if (d.getTime() <= now) d = new Date(n.getFullYear() + 1, s.getMonth(), s.getDate(), 20, 0, 0)
  return { date: d, years: d.getFullYear() - s.getFullYear() }
}

export const DEFAULT_NOTES: Record<BondType, string> = {
  'phu-the': 'Nguyện kết tóc se duyên, cùng nhau ngắm trăng Biện Kinh đến bạc đầu.',
  'tri-ky': 'Cao sơn lưu thủy, một khúc đàn hiểu thấu lòng nhau.',
  'ket-nghia': 'Rượu đã cạn chén, từ nay vào sinh ra tử có nhau.',
}

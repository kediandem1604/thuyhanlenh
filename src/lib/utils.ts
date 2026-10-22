import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/* ---------------- Ngẫu nhiên có hạt giống (để dữ liệu demo ổn định) ---------------- */

export function hashString(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Rng = ReturnType<typeof createRng>

export function createRng(seed: number | string) {
  const next = mulberry32(typeof seed === 'string' ? hashString(seed) : seed)
  const api = {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    float: (min: number, max: number) => next() * (max - min) + min,
    pick: <T,>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
    chance: (p: number) => next() < p,
    shuffle: <T,>(arr: readonly T[]): T[] => {
      const a = [...arr]
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    },
    weighted: <T,>(items: readonly [T, number][]): T => {
      const total = items.reduce((s, [, w]) => s + w, 0)
      let r = next() * total
      for (const [item, w] of items) {
        r -= w
        if (r <= 0) return item
      }
      return items[items.length - 1][0]
    },
  }
  return api
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

/* ---------------- Định dạng ---------------- */

const nf = new Intl.NumberFormat('vi-VN')

export function fmt(n: number) {
  return nf.format(Math.round(n))
}

export function fmtCompact(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1).replace('.', ',')}K`
  return fmt(n)
}

export function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
  // vi-VN in "22-10" khi bỏ năm → thống nhất về dạng 22/10
  return new Date(iso).toLocaleDateString('vi-VN', opts).replace(/(\d)-(\d)/g, '$1/$2')
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export function fmtDateTime(iso: string) {
  return `${fmtTime(iso)} · ${fmtDate(iso, { day: '2-digit', month: '2-digit' })}`
}

export function timeAgo(iso: string, now = Date.now()) {
  const diff = (now - new Date(iso).getTime()) / 1000
  if (diff < 0) return timeUntil(iso, now)
  if (diff < 60) return 'vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} ngày trước`
  if (diff < 86400 * 365) return `${Math.floor(diff / (86400 * 30))} tháng trước`
  return `${Math.floor(diff / (86400 * 365))} năm trước`
}

export function timeUntil(iso: string, now = Date.now()) {
  const diff = (new Date(iso).getTime() - now) / 1000
  if (diff <= 0) return 'đang diễn ra'
  if (diff < 3600) return `còn ${Math.ceil(diff / 60)} phút`
  if (diff < 86400) return `còn ${Math.floor(diff / 3600)} giờ`
  return `còn ${Math.floor(diff / 86400)} ngày`
}

export function daysBetween(a: string | number, b: string | number = Date.now()) {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

/** Mốc reset tuần: thứ Hai 05:00 */
export function nextWeeklyReset(now = new Date()) {
  const d = new Date(now)
  d.setHours(5, 0, 0, 0)
  const day = d.getDay() // 0 = CN
  let add = (1 - day + 7) % 7
  if (add === 0 && now.getTime() >= d.getTime()) add = 7
  d.setDate(d.getDate() + add)
  return d
}

export function startOfWeek(now = new Date()) {
  const next = nextWeeklyReset(now)
  return new Date(next.getTime() - 7 * 86400000)
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function sum(arr: number[]) {
  return arr.reduce((s, n) => s + n, 0)
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/** Bỏ dấu tiếng Việt để tìm kiếm */
export function normalize(str: string) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

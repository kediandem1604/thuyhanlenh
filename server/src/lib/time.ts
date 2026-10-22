import { startOfWeek } from '@/lib/utils'

/** Mốc bắt đầu tuần hiện tại (thứ Hai 05:00 giờ địa phương — TZ đặt trong config) */
export function weekStartAt(now = new Date()) {
  return startOfWeek(now)
}

/** Ngày (YYYY-MM-DD, giờ địa phương) của thứ Hai đầu tuần chứa `now` — khóa của power_snapshots */
export function weekStartKey(now = new Date()) {
  return localDateKey(weekStartAt(now))
}

export function localDateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Lùi `weeks` tuần từ khóa tuần (YYYY-MM-DD) */
export function shiftWeekKey(key: string, weeks: number) {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d, 12)
  date.setDate(date.getDate() + weeks * 7)
  return localDateKey(date)
}

/** Mã kỳ theo tuần ISO, ví dụ "2026-W43" — khóa idempotent cho job reset tuần */
export function isoWeekPeriod(now = new Date()) {
  const start = weekStartAt(now)
  const d = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export const iso = (d: Date | null | undefined) => (d ? d.toISOString() : undefined)

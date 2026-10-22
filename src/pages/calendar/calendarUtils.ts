import { EVENT_TYPES } from '@/domain/constants'
import type { EventType, GuildEvent, OrgType } from '@/domain/types'

/** Tên gọi riêng của loại sự kiện theo loại tổ chức (màu + hán tự giữ nguyên) */
const EVENT_RELABEL: Partial<Record<OrgType, Partial<Record<EventType, string>>>> = {
  team: { 'guild-war': 'Thi Đấu', banquet: 'Họp Mặt' },
}

/** Tên · màu · hán tự của loại sự kiện, gọi theo loại tổ chức */
export function eventMeta(type: EventType, orgType: OrgType = 'guild') {
  const base = EVENT_TYPES[type]
  const name = EVENT_RELABEL[orgType]?.[type]
  return name ? { ...base, name } : base
}

export const DAY_MS = 86400000
export const WEEKDAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']
export const WEEKDAYS_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

/** Thứ Hai 00:00 (giờ địa phương) của tuần chứa `date`, dịch thêm `offset` tuần */
export function mondayOf(date: Date, offset = 0) {
  const diff = (date.getDay() + 6) % 7
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - diff + offset * 7)
}

export function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function eventEnd(e: GuildEvent) {
  return new Date(new Date(e.start).getTime() + e.durationMin * 60000)
}

export function isPast(e: GuildEvent, now = Date.now()) {
  return eventEnd(e).getTime() < now
}

export function isLive(e: GuildEvent, now = Date.now()) {
  const s = new Date(e.start).getTime()
  return s <= now && eventEnd(e).getTime() >= now
}

export function rsvpCounts(e: GuildEvent) {
  const c = { yes: 0, maybe: 0, no: 0 }
  Object.values(e.rsvp).forEach((v) => c[v]++)
  return c
}

/** Số tuần chênh giữa tuần chứa `target` và tuần hiện tại */
export function weekOffsetOf(target: Date, now = new Date()) {
  const a = mondayOf(now).getTime()
  const b = mondayOf(target).getTime()
  return Math.round((b - a) / (7 * DAY_MS))
}

export function hhmm(d: Date) {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

/** Ngày/tháng dạng 22/10 (tránh kiểu 22-10 của Intl vi-VN) */
export function dm(d: Date) {
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
}

export function toDateInput(d: Date) {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

import type { WarRecord } from '@/domain/types'

export const RESULT_META: Record<WarRecord['result'], { han: string; name: string; color: string }> = {
  win: { han: '胜', name: 'Thắng', color: 'var(--jade)' },
  lose: { han: '败', name: 'Thua', color: 'var(--cinnabar)' },
  draw: { han: '和', name: 'Hòa', color: 'var(--muted)' },
}

export const MODE_META: Record<WarRecord['mode'], { name: string; han: string }> = {
  'bang-chien': { name: 'Bang chiến', han: '战' },
  'cong-thanh': { name: 'Công thành', han: '城' },
}

/** Hai màu chuỗi (hạ địch / bị hạ) — lấy slot 1 & 2 của bảng categorical đã kiểm định */
export const WAR_SERIES = {
  dark: { kills: '#3987e5', deaths: '#d95926' },
  light: { kills: '#2a78d6', deaths: '#eb6834' },
} as const

export function sortWars(wars: WarRecord[]) {
  return [...wars].sort((a, b) => b.date.localeCompare(a.date))
}

export function warTotals(w: WarRecord) {
  let k = 0
  let d = 0
  let a = 0
  let dmg = 0
  let heal = 0
  for (const l of w.lines) {
    k += l.k
    d += l.d
    a += l.a
    dmg += l.dmg
    heal += l.heal
  }
  return { k, d, a, dmg, heal }
}

export function fmtBig(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace('.', ',')}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

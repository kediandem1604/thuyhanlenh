import { useMemo } from 'react'
import type { OrgInfo } from '@/domain/api'
import { ORG_TYPES, ROUTE_FEATURE } from '@/domain/orgs'
import type { OrgType } from '@/domain/types'
import { useGuild } from '@/store/guild'
import { NAV, type NavGroup, type NavItem } from './nav'

/** Tên gọi riêng theo loại tổ chức (đường dẫn → nhãn/mô tả) */
const RELABEL: Record<OrgType, Record<string, Partial<Pick<NavItem, 'label' | 'han' | 'desc'>>>> = {
  guild: {},
  kimlan: {
    '/': { label: 'Kim Lan Đường', han: '兰', desc: 'Toàn cảnh Kim Lan — thứ bậc, lời thề, phó bản' },
    '/thanh-vien': { label: 'Kim Lan Phổ', han: '谱', desc: 'Thứ bậc kết nghĩa từ Đại ca đến Tiểu muội' },
    '/lich': { label: 'Lịch Phó Bản', desc: 'Hẹn giờ cùng nhau đi phó bản' },
    '/bay-tran': { desc: 'Xếp đội hình cho anh chị em' },
  },
  team: {
    '/': { label: 'Tổng Quan Team', han: '队', desc: 'Toàn cảnh team' },
    '/thanh-vien': { desc: 'Danh sách thành viên team' },
    '/bang-chien': { label: 'Thi Đấu', desc: 'Lịch sử trận, MVP, thống kê' },
    '/bang-kho': { label: 'Quỹ Team', desc: 'Điểm cống hiến và đấu giá chiến lợi phẩm' },
    '/phong-van': { label: 'Bảng Xếp Hạng', desc: 'Xếp hạng trong team' },
    '/tinh-duyen': { label: 'Tình Duyên' },
    '/su-do': { label: 'Sư Đồ' },
  },
}

/** Menu theo tổ chức: ẩn trang của chức năng đang tắt, đổi tên mục theo loại */
export function navFor(org: OrgInfo | null): NavGroup[] {
  const type = org?.type ?? 'guild'
  const on = new Set(org?.features ?? [])
  const relabel = RELABEL[type]
  return NAV.map((g, i) => ({
    title: i === 0 ? ORG_TYPES[type].name : g.title,
    items: g.items
      .filter((it) => !ROUTE_FEATURE[it.path] || on.has(ROUTE_FEATURE[it.path]))
      .map((it) => ({ ...it, ...relabel[it.path] })),
  })).filter((g) => g.items.length)
}

export function useNav() {
  const org = useGuild((s) => s.me?.org ?? null)
  return useMemo(() => navFor(org), [org])
}

export function useNavItems() {
  const nav = useNav()
  return useMemo(() => nav.flatMap((g) => g.items), [nav])
}

/** Chức năng của trang hiện tại (nếu trang thuộc một chức năng tùy chọn) */
export function featureOfPath(pathname: string) {
  const key = Object.keys(ROUTE_FEATURE).find((p) => pathname === p || pathname.startsWith(`${p}/`))
  return key ? ROUTE_FEATURE[key] : undefined
}

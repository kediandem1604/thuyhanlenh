import {
  CalendarDays,
  Castle,
  Coins,
  Flag,
  GraduationCap,
  Heart,
  LayoutGrid,
  Medal,
  Network,
  Palette,
  ScrollText,
  Settings,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  path: string
  label: string
  han: string
  icon: LucideIcon
  desc: string
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  {
    title: 'Bang Hội',
    items: [
      { path: '/', label: 'Tổng Quan', han: '堂', icon: Castle, desc: 'Bang Hội Đường — toàn cảnh bang hội' },
      { path: '/thanh-vien', label: 'Thành Viên', han: '众', icon: Users, desc: 'Danh sách môn hạ, hồ sơ, chức vụ' },
      { path: '/su-do', label: 'Sư Đồ Đường', han: '师', icon: GraduationCap, desc: 'Sư phụ – đồ đệ, lộ trình xuất sư' },
      { path: '/tinh-duyen', label: 'Tình Duyên Các', han: '缘', icon: Heart, desc: 'Phu thê, tri kỷ, kết nghĩa' },
      { path: '/chieu-mo', label: 'Chiêu Mộ', han: '募', icon: ScrollText, desc: 'Duyệt đơn xin gia nhập' },
    ],
  },
  {
    title: 'Chinh Chiến',
    items: [
      { path: '/pho-ban', label: 'Phó Bản', han: '征', icon: Swords, desc: 'Tiến độ boss, kỷ lục, lượt clear' },
      { path: '/bay-tran', label: 'Bày Trận', han: '阵', icon: LayoutGrid, desc: 'Xếp đội hình raid kéo thả' },
      { path: '/bang-chien', label: 'Bang Chiến', han: '战', icon: Flag, desc: 'Lịch sử trận, MVP, thống kê' },
      { path: '/lich', label: 'Lịch Hoạt Động', han: '历', icon: CalendarDays, desc: 'Lịch tuần và điểm danh' },
    ],
  },
  {
    title: 'Vinh Quang',
    items: [
      { path: '/phong-van', label: 'Bảng Phong Vân', han: '榜', icon: Trophy, desc: 'Bảng xếp hạng toàn bang' },
      { path: '/thanh-tuu', label: 'Thành Tựu', han: '勋', icon: Medal, desc: 'Bộ sưu tập huy hiệu' },
      { path: '/bang-kho', label: 'Bang Khố', han: '库', icon: Coins, desc: 'Cống hiến và đấu giá chiến lợi phẩm' },
      { path: '/xuong-chibi', label: 'Xưởng Chibi', han: '绘', icon: Palette, desc: 'Tự tạo hình nhân vật chibi' },
    ],
  },
  {
    title: 'Hệ Thống',
    items: [
      { path: '/kien-truc', label: 'Kiến Trúc', han: '构', icon: Network, desc: 'Sơ đồ kiến trúc hệ thống' },
      { path: '/thiet-lap', label: 'Thiết Lập', han: '设', icon: Settings, desc: 'Giao diện và dữ liệu' },
    ],
  },
]

export const NAV_ITEMS = NAV.flatMap((g) => g.items)

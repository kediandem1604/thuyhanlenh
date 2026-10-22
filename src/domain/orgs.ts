// Loại tổ chức, chức năng, thứ bậc Kim Lan và giao diện theo tổ chức — dùng chung frontend + server.
import type { EventType, Gender, OrgType, RankId } from './types'

/* ------------------------------------------------------------------ */
/* Chức năng                                                           */
/* ------------------------------------------------------------------ */

/** Chức năng tùy chọn (mỗi cái ứng với một trang). Tổng quan, Thành viên, Xưởng Chibi, Thiết lập, Kiến trúc luôn có. */
export const FEATURES = ['su-do', 'tinh-duyen', 'chieu-mo', 'pho-ban', 'bay-tran', 'bang-chien', 'lich', 'phong-van', 'thanh-tuu', 'bang-kho'] as const
export type Feature = (typeof FEATURES)[number]

export const FEATURE_INFO: Record<Feature, { name: string; han: string; desc: string }> = {
  'su-do': { name: 'Sư Đồ', han: '师', desc: 'Sư phụ – đồ đệ, lộ trình xuất sư' },
  'tinh-duyen': { name: 'Tình Duyên', han: '缘', desc: 'Phu thê, tri kỷ, kết nghĩa' },
  'chieu-mo': { name: 'Chiêu Mộ', han: '募', desc: 'Duyệt đơn xin gia nhập' },
  'pho-ban': { name: 'Phó Bản', han: '征', desc: 'Tiến độ boss, lượt clear, kỷ lục' },
  'bay-tran': { name: 'Bày Trận', han: '阵', desc: 'Xếp đội hình kéo thả' },
  'bang-chien': { name: 'Thi Đấu / Bang Chiến', han: '战', desc: 'Lịch sử trận, MVP, K/D/A' },
  lich: { name: 'Lịch Hoạt Động', han: '历', desc: 'Lịch tuần, điểm danh' },
  'phong-van': { name: 'Bảng Xếp Hạng', han: '榜', desc: 'Xếp hạng chiến lực, sôi nổi…' },
  'thanh-tuu': { name: 'Thành Tựu', han: '勋', desc: 'Bộ sưu tập huy hiệu' },
  'bang-kho': { name: 'Quỹ & Đấu Giá', han: '库', desc: 'Điểm cống hiến, đấu giá chiến lợi phẩm' },
}

/** Đường dẫn trang → chức năng (trang không có trong bảng là trang lõi) */
export const ROUTE_FEATURE: Record<string, Feature> = {
  '/su-do': 'su-do',
  '/tinh-duyen': 'tinh-duyen',
  '/chieu-mo': 'chieu-mo',
  '/pho-ban': 'pho-ban',
  '/bay-tran': 'bay-tran',
  '/bang-chien': 'bang-chien',
  '/lich': 'lich',
  '/phong-van': 'phong-van',
  '/thanh-tuu': 'thanh-tuu',
  '/bang-kho': 'bang-kho',
}

/* ------------------------------------------------------------------ */
/* Loại tổ chức                                                        */
/* ------------------------------------------------------------------ */

export interface OrgTypeInfo {
  id: OrgType
  name: string
  han: string
  /** cách gọi một thành viên */
  memberWord: string
  /** cách gọi danh sách thành viên */
  rosterName: string
  /** người đứng đầu */
  leaderRank: RankId
  /** chức vụ mặc định khi mới vào */
  entryRank: RankId
  ranks: RankId[]
  /** sức chứa mặc định; null = không giới hạn */
  capacity: number | null
  /** sức chứa tối đa cho phép chỉnh */
  maxCapacity: number | null
  /** chức năng được phép dùng */
  allowed: readonly Feature[]
  /** chức năng bật sẵn khi tạo mới */
  defaults: readonly Feature[]
  /** chủ tổ chức có tự bật/tắt chức năng được không */
  toggleable: boolean
  /** cho phép nhận đơn xin vào công khai */
  publicApply: boolean
  tagline: string
}

export const ORG_TYPES: Record<OrgType, OrgTypeInfo> = {
  guild: {
    id: 'guild',
    name: 'Bang Hội',
    han: '帮',
    memberWord: 'môn hạ',
    rosterName: 'Danh Sách Môn Hạ',
    leaderRank: 'bang-chu',
    entryRank: 'tan-binh',
    ranks: ['bang-chu', 'pho-bang-chu', 'truong-lao', 'duong-chu', 'tinh-anh', 'thanh-vien', 'tan-binh'],
    capacity: 80,
    maxCapacity: 200,
    allowed: FEATURES,
    defaults: FEATURES,
    toggleable: false,
    publicApply: true,
    tagline: 'Đủ bộ quản lý bang: chức vụ, phó bản, bang chiến, bang khố, chiêu mộ…',
  },
  kimlan: {
    id: 'kimlan',
    name: 'Kim Lan',
    han: '兰',
    memberWord: 'huynh đệ',
    rosterName: 'Kim Lan Phổ',
    leaderRank: 'dai-ca',
    entryRank: 'huynh-de',
    ranks: ['dai-ca', 'huynh-de'],
    capacity: 12,
    maxCapacity: 12,
    // trong game Kim Lan chỉ cùng nhau đi phó bản (kèm lịch) và có thứ bậc kết nghĩa
    allowed: ['pho-ban', 'bay-tran', 'lich'],
    defaults: ['pho-ban', 'bay-tran', 'lich'],
    toggleable: false,
    publicApply: false,
    tagline: 'Nhóm kết nghĩa tối đa 12 người: thứ bậc huynh đệ, cùng nhau chinh phạt phó bản.',
  },
  team: {
    id: 'team',
    name: 'Team',
    han: '队',
    memberWord: 'thành viên',
    rosterName: 'Thành Viên Team',
    leaderRank: 'truong-nhom',
    entryRank: 'thanh-vien',
    ranks: ['truong-nhom', 'pho-nhom', 'thanh-vien'],
    capacity: null,
    maxCapacity: null,
    allowed: FEATURES,
    defaults: ['pho-ban', 'bay-tran', 'lich', 'phong-van'],
    toggleable: true,
    publicApply: false,
    tagline: 'Team tự lập, không giới hạn người — tự chọn chức năng cần dùng.',
  },
}

export const ORG_TYPE_IDS: OrgType[] = ['guild', 'kimlan', 'team']

export const RANK_IDS_BY_TYPE: Record<OrgType, RankId[]> = {
  guild: ORG_TYPES.guild.ranks,
  kimlan: ORG_TYPES.kimlan.ranks,
  team: ORG_TYPES.team.ranks,
}

/** Chức năng đang bật của một tổ chức (team dùng danh sách đã lưu, loại khác cố định theo loại) */
export function featuresOf(type: OrgType, saved?: readonly string[] | null): Feature[] {
  const info = ORG_TYPES[type]
  if (!info.toggleable) return [...info.allowed]
  const list = (saved ?? info.defaults).filter((f): f is Feature => (info.allowed as readonly string[]).includes(f))
  return FEATURES.filter((f) => list.includes(f))
}

export function hasFeature(type: OrgType, saved: readonly string[] | null | undefined, f: Feature) {
  return featuresOf(type, saved).includes(f)
}

/**
 * Loại sự kiện được tạo theo tổ chức — đúng với game:
 * Kim Lan chỉ hẹn đi phó bản / boss; team không có yến tiệc bang, bang chiến chỉ khi bật Thi Đấu.
 */
export function eventTypesFor(type: OrgType, features: readonly Feature[]): EventType[] {
  if (type === 'kimlan') return ['raid', 'boss']
  if (type === 'team') return ['raid', 'boss', 'tournament', 'training', ...(features.includes('bang-chien') ? (['guild-war'] as EventType[]) : [])]
  return ['raid', 'guild-war', 'banquet', 'tournament', 'training', 'boss']
}

/* ------------------------------------------------------------------ */
/* Thứ bậc Kim Lan                                                     */
/* ------------------------------------------------------------------ */

const NUM_VI = ['', 'Đại', 'Nhị', 'Tam', 'Tứ', 'Ngũ', 'Lục', 'Thất', 'Bát', 'Cửu', 'Thập', 'Thập Nhất', 'Thập Nhị']
const NUM_HAN = ['', '大', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
/** chữ số để in lên ấn triện ghế ngồi */
export const SEAT_HAN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']

/**
 * Danh xưng kết nghĩa theo ghế (1 = lớn nhất) và giới tính.
 * Ghế 1: Đại ca / Đại tỷ · ghế giữa: Nhị ca, Tam tỷ… · ghế cuối (khi có ≥ 2 người): Tiểu đệ / Tiểu muội.
 */
export function kimlanHonorific(seat: number, gender: Gender, total: number): { name: string; han: string } {
  const male = gender === 'nam'
  if (seat <= 1) return male ? { name: 'Đại ca', han: '大哥' } : { name: 'Đại tỷ', han: '大姐' }
  if (seat >= total && total >= 2) return male ? { name: 'Tiểu đệ', han: '小弟' } : { name: 'Tiểu muội', han: '小妹' }
  const n = Math.min(seat, NUM_VI.length - 1)
  return male ? { name: `${NUM_VI[n]} ca`, han: `${NUM_HAN[n]}哥` } : { name: `${NUM_VI[n]} tỷ`, han: `${NUM_HAN[n]}姐` }
}

export const KIMLAN_OATH = 'Bất cầu đồng niên đồng nguyệt đồng nhật sinh, đãn nguyện đồng niên đồng nguyệt đồng nhật tử.'

/* ------------------------------------------------------------------ */
/* Giao diện theo tổ chức                                              */
/* ------------------------------------------------------------------ */

export type OrgThemeId = 'kinh-hong' | 'bach-gia' | 'thanh-ngoc' | 'hong-lien' | 'tu-dang'
export type ParticleKind = 'sakura' | 'snow' | 'lotus' | 'leaves' | 'wisteria'

export interface OrgTheme {
  id: OrgThemeId
  name: string
  han: string
  desc: string
  /** màu nhấn chính (thay cho vàng) — dùng cho xem trước */
  accent: string
  particles: ParticleKind
}

export const ORG_THEMES: Record<OrgThemeId, OrgTheme> = {
  'kinh-hong': { id: 'kinh-hong', name: 'Kinh Hồng', han: '鸿', desc: 'Vàng lá, trăng rằm, hoa đào bay', accent: '#d8b46a', particles: 'sakura' },
  'bach-gia': { id: 'bach-gia', name: 'Bạch Gia', han: '白', desc: 'Bạch kim, tuyết rơi, bạch mai, hạc trắng', accent: '#cfdcec', particles: 'snow' },
  'thanh-ngoc': { id: 'thanh-ngoc', name: 'Thanh Ngọc', han: '玉', desc: 'Ngọc bích, lá trúc bay', accent: '#5ec7b0', particles: 'leaves' },
  'hong-lien': { id: 'hong-lien', name: 'Hồng Liên', han: '莲', desc: 'Son đỏ, cánh sen hồng', accent: '#e8796a', particles: 'lotus' },
  'tu-dang': { id: 'tu-dang', name: 'Tử Đằng', han: '藤', desc: 'Tím tử đằng, hoa rủ', accent: '#b49af5', particles: 'wisteria' },
}

export const ORG_THEME_IDS = Object.keys(ORG_THEMES) as OrgThemeId[]

export function themeOf(id: string | null | undefined): OrgTheme {
  return ORG_THEMES[(id as OrgThemeId) ?? 'kinh-hong'] ?? ORG_THEMES['kinh-hong']
}

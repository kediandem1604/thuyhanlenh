import type {
  AchievementDef,
  ApplicationStage,
  BondType,
  ClassId,
  CombatRole,
  Dungeon,
  DungeonMode,
  EventType,
  LedgerEntry,
  MemberStatus,
  MentorshipStage,
  RankId,
  Rarity,
} from './types'

/* ------------------------------------------------------------------ */
/* Lưu phái                                                            */
/* ------------------------------------------------------------------ */

export interface ClassPalette {
  robe: string
  robeDark: string
  trim: string
  sash: string
  accent: string
  inner: string
}

export interface ClassInfo {
  id: ClassId
  name: string
  han: string
  role: CombatRole
  tagline: string
  /** đạo cụ nhân vật chibi cầm */
  prop: string
  palette: ClassPalette
  isNew?: boolean
}

export const CLASSES: Record<ClassId, ClassInfo> = {
  'to-van': {
    id: 'to-van',
    name: 'Tố Vấn',
    han: '素问',
    role: 'healer',
    tagline: 'Dây lụa hồi xuân, trụ cột trị liệu của mọi đội raid',
    prop: 'Dây lụa',
    palette: { robe: '#f7e6ee', robeDark: '#e3b9cb', trim: '#d0688e', sash: '#ec8db0', accent: '#ff9ec4', inner: '#fff7fa' },
  },
  'cuu-linh': {
    id: 'cuu-linh',
    name: 'Cửu Linh',
    han: '九灵',
    role: 'dps',
    tagline: 'Triệu hồi linh thú, phép thuật biến ảo khôn lường',
    prop: 'Linh thú',
    palette: { robe: '#3e2f63', robeDark: '#261c42', trim: '#82dcb0', sash: '#62c193', accent: '#a58bff', inner: '#e9e2ff' },
  },
  'than-tuong': {
    id: 'than-tuong',
    name: 'Thần Tương',
    han: '神相',
    role: 'dps',
    tagline: 'Thanh nhã như mây, phi kiếm định càn khôn',
    prop: 'Phi kiếm',
    palette: { robe: '#eaf0f9', robeDark: '#b7c6e0', trim: '#4a78c2', sash: '#2f5aa8', accent: '#7cc0ff', inner: '#ffffff' },
  },
  'thiet-y': {
    id: 'thiet-y',
    name: 'Thiết Y',
    han: '铁衣',
    role: 'tank',
    tagline: 'Áo sắt thân đồng, lá chắn vững chãi của cả bang',
    prop: 'Mạch đao',
    palette: { robe: '#454d5d', robeDark: '#2a303c', trim: '#cfa64e', sash: '#a12f2f', accent: '#e05a4e', inner: '#d9dde6' },
  },
  'huyet-ha': {
    id: 'huyet-ha',
    name: 'Huyết Hà',
    han: '血河',
    role: 'dps',
    tagline: 'Trường thương nhuốm đỏ, xung phong phá trận',
    prop: 'Trường thương',
    palette: { robe: '#97202f', robeDark: '#5e111d', trim: '#ecc77f', sash: '#1f1d2b', accent: '#ff4f62', inner: '#f8e7d4' },
  },
  'toai-mong': {
    id: 'toai-mong',
    name: 'Toái Mộng',
    han: '碎梦',
    role: 'dps',
    tagline: 'Bóng đêm vô thanh, một đao đoạt mộng',
    prop: 'Trường đao',
    palette: { robe: '#2b2339', robeDark: '#17121f', trim: '#a184dc', sash: '#6c50a9', accent: '#b993ff', inner: '#cfc6e0' },
  },
  'long-ngam': {
    id: 'long-ngam',
    name: 'Long Ngâm',
    han: '龙吟',
    role: 'dps',
    tagline: 'Kiếm khí long ngâm, phiêu dật như rồng giữa mây',
    prop: 'Long kiếm',
    palette: { robe: '#1f6166', robeDark: '#123e41', trim: '#e6c46f', sash: '#e6c46f', accent: '#52d6c8', inner: '#e6f6f2' },
    isNew: true,
  },
}

export const CLASS_IDS = Object.keys(CLASSES) as ClassId[]

/*
 * Màu biểu đồ cho lưu phái (khác màu trang trí ở trên — màu trang trí có cặp đỏ/tím trùng nhau).
 * Bảng 7 màu đã chạy qua bộ kiểm tra mù màu (dataviz validator) ở cả nền tối #131a2c và nền sáng #fbf5e9.
 * Luôn vẽ theo CLASS_CHART_ORDER để các cặp kề nhau giữ được độ tách màu.
 */
export const CLASS_CHART_ORDER: ClassId[] = ['than-tuong', 'huyet-ha', 'long-ngam', 'thiet-y', 'to-van', 'cuu-linh', 'toai-mong']
export const CLASS_CHART_COLOR: Record<'dark' | 'light', Record<ClassId, string>> = {
  dark: {
    'than-tuong': '#3987e5',
    'huyet-ha': '#d95926',
    'long-ngam': '#199e70',
    'thiet-y': '#c98500',
    'to-van': '#d55181',
    'cuu-linh': '#008300',
    'toai-mong': '#9085e9',
  },
  light: {
    'than-tuong': '#2a78d6',
    'huyet-ha': '#eb6834',
    'long-ngam': '#1baf7a',
    'thiet-y': '#eda100',
    'to-van': '#e87ba4',
    'cuu-linh': '#008300',
    'toai-mong': '#6250d6',
  },
}

export const ROLES: Record<CombatRole, { name: string; color: string; short: string }> = {
  tank: { name: 'Hộ Vệ (Tank)', short: 'Tank', color: '#6fa8ff' },
  healer: { name: 'Trị Liệu', short: 'Trị liệu', color: '#5ec7b0' },
  dps: { name: 'Sát Thương', short: 'Sát thương', color: '#e0523f' },
}

/* ------------------------------------------------------------------ */
/* Chức vụ                                                             */
/* ------------------------------------------------------------------ */

export interface RankInfo {
  id: RankId
  name: string
  han: string
  order: number
  color: string
  max?: number
}

export const RANKS: Record<RankId, RankInfo> = {
  'bang-chu': { id: 'bang-chu', name: 'Bang Chủ', han: '主', order: 0, color: '#e0523f', max: 1 },
  'pho-bang-chu': { id: 'pho-bang-chu', name: 'Phó Bang Chủ', han: '副', order: 1, color: '#f08a4b', max: 2 },
  'truong-lao': { id: 'truong-lao', name: 'Trưởng Lão', han: '老', order: 2, color: '#d8b46a', max: 4 },
  'duong-chu': { id: 'duong-chu', name: 'Đường Chủ', han: '堂', order: 3, color: '#a08cf5', max: 6 },
  'tinh-anh': { id: 'tinh-anh', name: 'Tinh Anh', han: '精', order: 4, color: '#5ec7b0' },
  'thanh-vien': { id: 'thanh-vien', name: 'Thành Viên', han: '众', order: 5, color: '#8d93a8' },
  'tan-binh': { id: 'tan-binh', name: 'Tân Binh', han: '新', order: 6, color: '#6fa8ff' },
  // Kim Lan — tên hiển thị thật là danh xưng theo ghế (Đại ca, Nhị tỷ… — xem domain/orgs.ts)
  'dai-ca': { id: 'dai-ca', name: 'Đại Ca', han: '大', order: 0, color: '#e0523f', max: 1 },
  'huynh-de': { id: 'huynh-de', name: 'Huynh Đệ', han: '义', order: 5, color: '#9fc3e8' },
  // Team tự tạo
  'truong-nhom': { id: 'truong-nhom', name: 'Trưởng Nhóm', han: '首', order: 0, color: '#e0523f', max: 1 },
  'pho-nhom': { id: 'pho-nhom', name: 'Phó Nhóm', han: '副', order: 1, color: '#f08a4b', max: 3 },
}

/** Chức vụ của Bang Hội (thứ tự từ cao xuống) — loại tổ chức khác: RANK_IDS_BY_TYPE trong domain/orgs.ts */
export const RANK_IDS: RankId[] = ['bang-chu', 'pho-bang-chu', 'truong-lao', 'duong-chu', 'tinh-anh', 'thanh-vien', 'tan-binh']

export const STATUS: Record<MemberStatus, { name: string; color: string }> = {
  online: { name: 'Trực tuyến', color: '#5ec7b0' },
  'in-raid': { name: 'Đang phó bản', color: '#d8b46a' },
  afk: { name: 'Tạm vắng', color: '#f08a4b' },
  offline: { name: 'Ngoại tuyến', color: '#6b7186' },
}

/* ------------------------------------------------------------------ */
/* Phó bản (tên hư cấu, lấy cảm hứng từ thế giới Ôn Thụy An)           */
/* ------------------------------------------------------------------ */

export const MODES: Record<DungeonMode, { name: string; color: string; han: string }> = {
  thuong: { name: 'Thường', color: '#5ec7b0', han: '常' },
  'anh-hung': { name: 'Anh Hùng', color: '#d8b46a', han: '英' },
  'ac-mong': { name: 'Ác Mộng', color: '#e0523f', han: '魇' },
}
export const MODE_IDS: DungeonMode[] = ['thuong', 'anh-hung', 'ac-mong']

export const DUNGEONS: Dungeon[] = [
  {
    id: 'lien-van-trai',
    name: 'Liên Vân Trại',
    han: '连云寨',
    size: 5,
    color: '#5ec7b0',
    lore: 'Sơn trại hiểm trở giữa mây ngàn, nơi bọn thảo khấu Hắc Phong chiếm cứ.',
    recommendedPower: { thuong: 90000, 'anh-hung': 140000, 'ac-mong': 190000 },
    bosses: [
      { id: 'lvt-1', name: 'Hắc Phong Trại Chủ', title: 'Kẻ cướp núi', color: '#5b6b7f', glyph: '风' },
      { id: 'lvt-2', name: 'Song Đao Quỷ Ảnh', title: 'Thích khách song đao', color: '#7a5aa8', glyph: '影' },
      { id: 'lvt-3', name: 'Thiết Bối Hùng Vương', title: 'Mãnh thú lưng sắt', color: '#8a5a3a', glyph: '熊' },
    ],
  },
  {
    id: 'huy-nac-thanh',
    name: 'Hủy Nặc Thành',
    han: '毁诺城',
    size: 10,
    color: '#7cc0ff',
    lore: 'Thành băng giữa tuyết trắng, nơi lời hứa bị phá bỏ và kiếm khí lạnh thấu xương.',
    recommendedPower: { thuong: 130000, 'anh-hung': 190000, 'ac-mong': 250000 },
    bosses: [
      { id: 'hnt-1', name: 'Băng Phách Thị Vệ', title: 'Vệ binh băng giá', color: '#5f8fbf', glyph: '冰' },
      { id: 'hnt-2', name: 'Tuyết Ảnh Kiếm Cơ', title: 'Kiếm cơ tuyết ảnh', color: '#9fc3e8', glyph: '雪' },
      { id: 'hnt-3', name: 'Thành Chủ Hủy Nặc', title: 'Chủ nhân thành băng', color: '#c9e2ff', glyph: '诺' },
    ],
  },
  {
    id: 'kim-phong-lau',
    name: 'Kim Phong Tế Vũ Lâu',
    han: '金风细雨楼',
    size: 10,
    color: '#d8b46a',
    lore: 'Tòa lầu quyền lực bậc nhất Biện Kinh, gió vàng mưa bụi che giấu muôn vàn ám tiễn.',
    recommendedPower: { thuong: 160000, 'anh-hung': 220000, 'ac-mong': 290000 },
    bosses: [
      { id: 'kpl-1', name: 'Sứ Giả Lục Phân', title: 'Mật thám nửa đường', color: '#b5893e', glyph: '使' },
      { id: 'kpl-2', name: 'Phong Vũ Song Sát', title: 'Song sát gió mưa', color: '#6c8f7c', glyph: '雨' },
      { id: 'kpl-3', name: 'Hồng Lâu Ám Chủ', title: 'Kẻ đứng sau màn', color: '#c0392b', glyph: '楼' },
    ],
  },
  {
    id: 'thien-lao',
    name: 'Thiên Lao Biện Kinh',
    han: '汴京天牢',
    size: 25,
    color: '#e0523f',
    lore: 'Ngục sâu dưới lòng kinh thành, giam giữ những kẻ không bao giờ được thấy ánh mặt trời.',
    recommendedPower: { thuong: 200000, 'anh-hung': 260000, 'ac-mong': 340000 },
    bosses: [
      { id: 'tl-1', name: 'Ngục Tốt Thiết Diện', title: 'Cai ngục mặt sắt', color: '#6b6f7a', glyph: '狱' },
      { id: 'tl-2', name: 'Độc Thủ Dược Vương', title: 'Bậc thầy độc dược', color: '#4f9a5b', glyph: '毒' },
      { id: 'tl-3', name: 'Cửu U Ma Tăng', title: 'Ma tăng chín cõi', color: '#7a4a9a', glyph: '魔' },
      { id: 'tl-4', name: 'Huyết Y Hầu', title: 'Hầu tước áo máu', color: '#a3242f', glyph: '血' },
    ],
  },
  {
    id: 'tay-ha-lang',
    name: 'Tây Hạ Hoàng Lăng',
    han: '西夏皇陵',
    size: 25,
    color: '#f08a4b',
    lore: 'Lăng mộ hoàng gia vùi trong cát vàng, linh hồn đế vương vẫn chưa yên nghỉ.',
    recommendedPower: { thuong: 240000, 'anh-hung': 300000, 'ac-mong': 380000 },
    bosses: [
      { id: 'thl-1', name: 'Thạch Tượng Thủ Lăng', title: 'Tượng đá giữ lăng', color: '#a08a6a', glyph: '石' },
      { id: 'thl-2', name: 'Sa Mạc Lang Vương', title: 'Vua sói sa mạc', color: '#c4823e', glyph: '狼' },
      { id: 'thl-3', name: 'Phi Thiên Huyễn Nữ', title: 'Tiên nữ bích họa', color: '#d9779b', glyph: '飞' },
      { id: 'thl-4', name: 'Hắc Thủy Đế Hồn', title: 'Tàn hồn đế vương', color: '#3a3f6b', glyph: '帝' },
    ],
  },
  {
    id: 'cuu-long-uyen',
    name: 'Cửu Long Uyên',
    han: '九龙渊',
    size: 25,
    color: '#a08cf5',
    lore: 'Vực sâu chín rồng ngủ say — phó bản mới nhất, chưa bang nào chinh phục Ác Mộng.',
    recommendedPower: { thuong: 280000, 'anh-hung': 350000, 'ac-mong': 430000 },
    bosses: [
      { id: 'clu-1', name: 'Thanh Long Thủ Vệ', title: 'Hộ vệ rồng xanh', color: '#3f9f8f', glyph: '青' },
      { id: 'clu-2', name: 'Song Giao Hải Chủ', title: 'Song giao chúa biển', color: '#3f6fbf', glyph: '蛟' },
      { id: 'clu-3', name: 'Lôi Đình Long Tướng', title: 'Long tướng sấm sét', color: '#c9a23f', glyph: '雷' },
      { id: 'clu-4', name: 'Cửu Long Chi Mẫu', title: 'Mẹ của chín rồng', color: '#8a5ad9', glyph: '龙' },
    ],
  },
]

export const DUNGEON_MAP = Object.fromEntries(DUNGEONS.map((d) => [d.id, d])) as Record<string, Dungeon>

/* ------------------------------------------------------------------ */
/* Sư đồ                                                               */
/* ------------------------------------------------------------------ */

export const MENTOR_STAGES: { id: MentorshipStage; name: string; han: string; desc: string }[] = [
  { id: 0, name: 'Bái Sư', han: '拜', desc: 'Hành lễ, chính thức nhận sư phụ' },
  { id: 1, name: 'Nhập Môn', han: '入', desc: 'Làm quen giang hồ, nắm cơ bản' },
  { id: 2, name: 'Luyện Công', han: '练', desc: 'Rèn nội công, học kỹ năng trấn phái' },
  { id: 3, name: 'Thực Chiến', han: '战', desc: 'Cùng sư phụ chinh phạt phó bản' },
  { id: 4, name: 'Xuất Sư', han: '成', desc: 'Đủ lông đủ cánh, tự mình bôn tẩu' },
]

export const MENTOR_TASK_TEMPLATES: { stage: MentorshipStage; label: string }[] = [
  { stage: 0, label: 'Hành lễ bái sư tại Bang Hội Đường' },
  { stage: 0, label: 'Dâng trà và lễ vật cho sư phụ' },
  { stage: 1, label: 'Hoàn thành chuỗi nhiệm vụ Nhập Môn' },
  { stage: 1, label: 'Đạt cấp 60' },
  { stage: 2, label: 'Cùng sư phụ đánh 3 phó bản 5 người' },
  { stage: 2, label: 'Học xong nội công trấn phái' },
  { stage: 3, label: 'Clear 1 phó bản 10 người cùng bang' },
  { stage: 3, label: 'Tham gia 1 trận bang chiến' },
  { stage: 4, label: 'Đạt chiến lực 200.000' },
  { stage: 4, label: 'Cử hành lễ xuất sư' },
]

/* ------------------------------------------------------------------ */
/* Tình duyên                                                          */
/* ------------------------------------------------------------------ */

export const BOND_TYPES: Record<BondType, { name: string; han: string; color: string; desc: string }> = {
  'phu-the': { name: 'Phu Thê', han: '缘', color: '#f2a7bf', desc: 'Kết tóc se duyên, bách niên giai lão' },
  'tri-ky': { name: 'Tri Kỷ', han: '知', color: '#a08cf5', desc: 'Cao sơn lưu thủy, tri âm khó tìm' },
  'ket-nghia': { name: 'Kết Nghĩa', han: '义', color: '#d8b46a', desc: 'Không sinh cùng ngày, nguyện chết cùng giờ' },
}

/* ------------------------------------------------------------------ */
/* Sự kiện                                                             */
/* ------------------------------------------------------------------ */

export const EVENT_TYPES: Record<EventType, { name: string; color: string; han: string }> = {
  raid: { name: 'Phó Bản', color: '#5ec7b0', han: '征' },
  'guild-war': { name: 'Bang Chiến', color: '#e0523f', han: '战' },
  banquet: { name: 'Yến Tiệc Bang', color: '#f08a4b', han: '宴' },
  tournament: { name: 'Đại Hội Tỉ Võ', color: '#d8b46a', han: '武' },
  training: { name: 'Luyện Công', color: '#6fa8ff', han: '练' },
  boss: { name: 'Boss Thế Giới', color: '#a08cf5', han: '妖' },
}

/* ------------------------------------------------------------------ */
/* Bang khố                                                            */
/* ------------------------------------------------------------------ */

export const RARITY: Record<Rarity, { name: string; color: string; glow: string }> = {
  lam: { name: 'Lam', color: '#6fa8ff', glow: 'rgba(111,168,255,.35)' },
  tu: { name: 'Tử', color: '#b18cff', glow: 'rgba(177,140,255,.4)' },
  kim: { name: 'Kim', color: '#f3c969', glow: 'rgba(243,201,105,.45)' },
  hong: { name: 'Hồng', color: '#ff5d5d', glow: 'rgba(255,93,93,.5)' },
}

export const LEDGER_CATEGORIES: Record<LedgerEntry['category'], { name: string; color: string }> = {
  'pho-ban': { name: 'Phó bản', color: '#5ec7b0' },
  'bang-chien': { name: 'Bang chiến', color: '#e0523f' },
  'quyen-gop': { name: 'Quyên góp', color: '#d8b46a' },
  'nhiem-vu': { name: 'Nhiệm vụ', color: '#6fa8ff' },
  'dau-gia': { name: 'Đấu giá', color: '#a08cf5' },
  'dieu-chinh': { name: 'Điều chỉnh', color: '#8d93a8' },
}

/* ------------------------------------------------------------------ */
/* Chiêu mộ                                                            */
/* ------------------------------------------------------------------ */

export const APPLICATION_STAGES: { id: ApplicationStage; name: string; color: string }[] = [
  { id: 'moi', name: 'Đơn mới', color: '#6fa8ff' },
  { id: 'phong-van', name: 'Phỏng vấn', color: '#a08cf5' },
  { id: 'thu-thach', name: 'Thử thách', color: '#d8b46a' },
  { id: 'chap-nhan', name: 'Chấp nhận', color: '#5ec7b0' },
  { id: 'tu-choi', name: 'Từ chối', color: '#e0523f' },
]

/* ------------------------------------------------------------------ */
/* Thành tựu                                                           */
/* ------------------------------------------------------------------ */

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-blood', name: 'Nhất Kiếm Phong Hầu', desc: 'Tham gia first-kill một boss Ác Mộng', icon: '剑', rarity: 'hong', category: 'pve' },
  { id: 'raid-100', name: 'Bách Chiến Bất Đãi', desc: 'Clear 100 lượt phó bản', icon: '百', rarity: 'kim', category: 'pve' },
  { id: 'raid-25', name: 'Hành Tẩu Giang Hồ', desc: 'Clear 25 lượt phó bản', icon: '行', rarity: 'tu', category: 'pve' },
  { id: 'no-death', name: 'Kim Cương Bất Hoại', desc: 'Clear phó bản 25 người không ngã lần nào', icon: '金', rarity: 'kim', category: 'pve' },
  { id: 'speedrun', name: 'Tật Phong Tấn Lôi', desc: 'Phá kỷ lục thời gian của bang', icon: '疾', rarity: 'kim', category: 'pve' },
  { id: 'healer-hero', name: 'Diệu Thủ Hồi Xuân', desc: 'Hồi máu cao nhất trong 10 trận', icon: '春', rarity: 'tu', category: 'pve' },
  { id: 'tank-wall', name: 'Vạn Lý Trường Thành', desc: 'Đỡ đòn chính cho 50 lượt boss', icon: '城', rarity: 'tu', category: 'pve' },
  { id: 'war-mvp', name: 'Vạn Nhân Địch', desc: 'Đạt MVP bang chiến', icon: '帅', rarity: 'kim', category: 'pvp' },
  { id: 'war-10', name: 'Sa Trường Lão Binh', desc: 'Tham gia 10 trận bang chiến', icon: '兵', rarity: 'lam', category: 'pvp' },
  { id: 'kill-streak', name: 'Liên Trảm Thập Nhân', desc: 'Hạ 10 địch liên tiếp không chết', icon: '斩', rarity: 'hong', category: 'pvp' },
  { id: 'arena-top', name: 'Tỉ Võ Đoạt Khôi', desc: 'Vào top 8 Đại Hội Tỉ Võ', icon: '魁', rarity: 'hong', category: 'pvp' },
  { id: 'master-1', name: 'Truyền Đạo Thụ Nghiệp', desc: 'Đưa 1 đồ đệ xuất sư', icon: '师', rarity: 'lam', category: 'su-do' },
  { id: 'master-5', name: 'Đào Lý Mãn Thiên Hạ', desc: 'Đưa 5 đồ đệ xuất sư', icon: '桃', rarity: 'kim', category: 'su-do' },
  { id: 'disciple', name: 'Thanh Xuất Ư Lam', desc: 'Xuất sư với chiến lực vượt sư phụ', icon: '青', rarity: 'tu', category: 'su-do' },
  { id: 'married', name: 'Thiên Tác Chi Hợp', desc: 'Kết thành phu thê', icon: '囍', rarity: 'tu', category: 'xa-giao' },
  { id: 'soulmate', name: 'Cao Sơn Lưu Thủy', desc: 'Độ thân mật tri kỷ đạt 10.000', icon: '琴', rarity: 'kim', category: 'xa-giao' },
  { id: 'sworn', name: 'Đào Viên Kết Nghĩa', desc: 'Kết nghĩa huynh đệ / tỷ muội', icon: '义', rarity: 'lam', category: 'xa-giao' },
  { id: 'social', name: 'Hảo Hữu Mãn Giang Hồ', desc: 'Có 50 hảo hữu trong bang', icon: '友', rarity: 'lam', category: 'xa-giao' },
  { id: 'donor', name: 'Nghĩa Bạc Vân Thiên', desc: 'Quyên góp 50.000 cống hiến cho bang', icon: '义', rarity: 'kim', category: 'bang-hoi' },
  { id: 'veteran', name: 'Nguyên Lão Khai Bang', desc: 'Ở bang hơn 365 ngày', icon: '元', rarity: 'kim', category: 'bang-hoi' },
  { id: 'active-30', name: 'Cần Cù Bất Quyện', desc: 'Điểm danh 30 ngày liên tục', icon: '勤', rarity: 'lam', category: 'bang-hoi' },
  { id: 'recruiter', name: 'Chiêu Hiền Nạp Sĩ', desc: 'Giới thiệu 5 người gia nhập', icon: '贤', rarity: 'tu', category: 'bang-hoi' },
  { id: 'banquet', name: 'Tửu Trung Tiên', desc: 'Tham gia 20 yến tiệc bang', icon: '酒', rarity: 'lam', category: 'bang-hoi' },
  { id: 'collector', name: 'Phong Hoa Tuyệt Đại', desc: 'Sở hữu 30 ngoại trang', icon: '华', rarity: 'tu', category: 'xa-giao' },
]

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<string, AchievementDef>

export const GUILD = {
  name: 'Kinh Hồng Các',
  han: '惊鸿阁',
  server: 'Biện Kinh',
  level: 7,
  motto: 'Kinh hồng nhất miết, vạn cổ lưu danh',
  founded: '2025-04-18',
  capacity: 80,
}

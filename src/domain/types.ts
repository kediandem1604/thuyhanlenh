// Mô hình dữ liệu cốt lõi của Thủy Hàn Lệnh.
// Mọi trang chỉ đọc/ghi qua store (src/store) — khi có backend thật chỉ cần thay lớp store.

export type ClassId = 'to-van' | 'cuu-linh' | 'than-tuong' | 'thiet-y' | 'huyet-ha' | 'toai-mong' | 'long-ngam'

export type CombatRole = 'tank' | 'healer' | 'dps'

/** Loại tổ chức: Bang Hội · Kim Lan (kết nghĩa, ≤ 12 người) · Team tự tạo */
export type OrgType = 'guild' | 'kimlan' | 'team'

/**
 * Chức vụ — gộp chung mọi loại tổ chức (khóa không trùng nhau, riêng 'thanh-vien' dùng chung cho Bang và Team).
 * Bang: bang-chu … tan-binh · Kim Lan: dai-ca, huynh-de · Team: truong-nhom, pho-nhom, thanh-vien
 */
export type RankId =
  | 'bang-chu'
  | 'pho-bang-chu'
  | 'truong-lao'
  | 'duong-chu'
  | 'tinh-anh'
  | 'thanh-vien'
  | 'tan-binh'
  | 'dai-ca'
  | 'huynh-de'
  | 'truong-nhom'
  | 'pho-nhom'

export type MemberStatus = 'online' | 'in-raid' | 'afk' | 'offline'

export type Mood = 'cute' | 'cool' | 'romantic'

export type Expression = 'smile' | 'grin' | 'calm' | 'smirk' | 'wink' | 'happy' | 'shy' | 'sleepy'

export type Gender = 'nam' | 'nu'

export interface ChibiLook {
  gender: Gender
  /** 0-3: kiểu mái */
  bangs: number
  /** 0-4: kiểu tóc sau (búi, đuôi ngựa, xõa dài...) */
  backHair: number
  hairColor: string
  eyeColor: string
  skin: string
  expression: Expression
  mood: Mood
  /** 0-3: phụ kiện (trâm, hoa, ruy băng, ngọc quan) */
  accessory: number
}

export interface MemberStats {
  pve: number
  pvp: number
  support: number
  survival: number
  teamwork: number
  mobility: number
}

export interface Member {
  id: string
  name: string
  classId: ClassId
  rank: RankId
  level: number
  power: number
  /** tổng cống hiến tích lũy (điểm bang khố) */
  contribution: number
  weeklyContribution: number
  /** độ sôi nổi 0-100 */
  activity: number
  status: MemberStatus
  joinedAt: string
  lastOnline: string
  title: string
  bio: string
  look: ChibiLook
  stats: MemberStats
  achievements: string[]
  pvp: { kills: number; deaths: number; wins: number }
  /** lịch sử chiến lực theo tuần (8 tuần gần nhất) */
  powerHistory: number[]
  /** id nhân vật dùng chung giữa các tổ chức (giai đoạn 3) */
  characterId?: string
  /** Kim Lan: ghế thứ bậc 1–12 */
  seat?: number
  /** Kim Lan: danh xưng theo thứ bậc, vd "Nhị tỷ", "Tiểu đệ" */
  honorific?: string
  /** Kim Lan: hán tự của danh xưng, vd 二姐 */
  honorificHan?: string
  /** nhân vật đã có chủ là tài khoản Discord thật */
  claimed?: boolean
}

export type MentorshipStage = 0 | 1 | 2 | 3 | 4

export interface MentorTask {
  id: string
  label: string
  stage: MentorshipStage
  done: boolean
}

export interface Mentorship {
  id: string
  masterId: string
  discipleId: string
  stage: MentorshipStage
  status: 'active' | 'graduated'
  startedAt: string
  graduatedAt?: string
  /** điểm tình sư đồ */
  bond: number
  tasks: MentorTask[]
}

export type BondType = 'phu-the' | 'tri-ky' | 'ket-nghia'

export interface Bond {
  id: string
  aId: string
  bId: string
  type: BondType
  since: string
  intimacy: number
  note: string
}

/** độ khó phó bản trong game (bản 1.3: Thường · Anh Hùng) */
export type DungeonMode = 'thuong' | 'anh-hung'

export interface Boss {
  id: string
  name: string
  title: string
  /** màu chủ đạo cho thẻ boss */
  color: string
  glyph: string
  /** khu vực trong phó bản (vd Vĩnh Dạ Tinh Đô: Ảo Vực / Thần Vực) */
  zone?: string
}

export interface Dungeon {
  id: string
  name: string
  han: string
  /** số người tối đa của một lượt */
  size: 6 | 12
  /** số người tối thiểu để mở phó bản (không ghi = đúng bằng size) */
  minSize?: number
  /** cấp nhân vật yêu cầu */
  level?: number
  lore: string
  color: string
  /** các độ khó game đang mở cho phó bản này */
  modes: DungeonMode[]
  /** lực chiến trung bình gợi ý — ước tính của app để so đội, không phải số chính thức của game */
  recommendedPower: Partial<Record<DungeonMode, number>>
  /** yêu cầu cộng đồng hay dùng (DPS cọc gỗ…) */
  requirement?: string
  bosses: Boss[]
}

export interface BossProgress {
  kills: number
  firstKill?: string
  bestTimeSec?: number
}

/** dungeonId → mode → bossId → tiến độ */
export type ProgressMap = Record<string, Partial<Record<DungeonMode, Record<string, BossProgress>>>>

export interface ClearRecord {
  id: string
  dungeonId: string
  mode: DungeonMode
  bossId: string
  date: string
  durationSec: number
  memberIds: string[]
  mvpId: string
  wipes: number
}

export type EventType = 'raid' | 'guild-war' | 'banquet' | 'tournament' | 'training' | 'boss'

export type RsvpStatus = 'yes' | 'maybe' | 'no'

export interface GuildEvent {
  id: string
  type: EventType
  title: string
  start: string
  durationMin: number
  location: string
  leaderId: string
  capacity: number
  note: string
  rsvp: Record<string, RsvpStatus>
}

export interface WarLine {
  memberId: string
  k: number
  d: number
  a: number
  dmg: number
  heal: number
}

export interface WarRecord {
  id: string
  date: string
  opponent: string
  result: 'win' | 'lose' | 'draw'
  score: [number, number]
  mvpId: string
  mode: 'bang-chien' | 'cong-thanh'
  lines: WarLine[]
}

export interface LedgerEntry {
  id: string
  memberId: string
  delta: number
  reason: string
  date: string
  category: 'pho-ban' | 'bang-chien' | 'quyen-gop' | 'nhiem-vu' | 'dau-gia' | 'dieu-chinh'
}

export type Rarity = 'lam' | 'tu' | 'kim' | 'hong'

export interface Bid {
  memberId: string
  amount: number
  at: string
}

export interface LootItem {
  id: string
  name: string
  rarity: Rarity
  source: string
  kind: 'vu-khi' | 'trang-bi' | 'bi-kip' | 'ngoai-trang' | 'nguyen-lieu'
  status: 'auction' | 'assigned'
  startPrice: number
  endsAt: string
  bids: Bid[]
  assignedTo?: string
  price?: number
}

export type ApplicationStage = 'moi' | 'phong-van' | 'thu-thach' | 'chap-nhan' | 'tu-choi'

export interface Application {
  id: string
  name: string
  classId: ClassId
  power: number
  level: number
  message: string
  stage: ApplicationStage
  appliedAt: string
  referrerId?: string
  look: ChibiLook
  /** 'claim' = người đã có tài khoản xin nhận một môn hạ có sẵn (giai đoạn 2) */
  kind?: 'join' | 'claim'
  claimMemberId?: string
  /** đơn gửi từ tài khoản đã đăng nhập */
  hasAccount?: boolean
}

export interface Announcement {
  id: string
  title: string
  body: string
  authorId: string
  date: string
  pinned: boolean
  tag: 'thong-bao' | 'su-kien' | 'quy-dinh' | 'vinh-danh'
}

export type ActivityType =
  | 'join'
  | 'clear'
  | 'first-kill'
  | 'mentor'
  | 'graduate'
  | 'bond'
  | 'war'
  | 'loot'
  | 'promote'
  | 'achievement'
  | 'donate'
  | 'event'

export interface Activity {
  id: string
  type: ActivityType
  text: string
  date: string
  memberId?: string
}

export interface TeamTemplate {
  id: string
  name: string
  dungeonId?: string
  slots: (string | null)[]
  createdAt: string
}

export interface AchievementDef {
  id: string
  name: string
  desc: string
  icon: string
  rarity: Rarity
  category: 'pve' | 'pvp' | 'xa-giao' | 'bang-hoi' | 'su-do'
}

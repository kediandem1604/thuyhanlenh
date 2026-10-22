import {
  ACHIEVEMENTS,
  CLASSES,
  CLASS_IDS,
  DUNGEONS,
  MENTOR_TASK_TEMPLATES,
  MODE_IDS,
} from '@/domain/constants'
import type {
  Activity,
  Announcement,
  Application,
  ApplicationStage,
  Bond,
  ChibiLook,
  ClassId,
  ClearRecord,
  DungeonMode,
  Expression,
  Gender,
  GuildEvent,
  LedgerEntry,
  LootItem,
  Member,
  MemberStats,
  Mentorship,
  MentorshipStage,
  Mood,
  ProgressMap,
  RankId,
  RsvpStatus,
  TeamTemplate,
  WarRecord,
} from '@/domain/types'
import { createRng, hashString, startOfWeek, type Rng } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Ngoại hình chibi                                                    */
/* ------------------------------------------------------------------ */

export const HAIR_COLORS = {
  black: '#211c30',
  brown: '#3f2b25',
  chestnut: '#6e3f2c',
  silver: '#c9d1e2',
  white: '#f1f3f9',
  ink: '#2c3f6b',
  wine: '#6b2339',
  gold: '#d3ab5e',
  pink: '#eaa7be',
  violet: '#7260ab',
} as const

const EYE_COLORS = ['#3b2a20', '#7a3b2a', '#2f5aa8', '#3d9e8d', '#a03048', '#7b5cc8', '#c9902f', '#1f6f8b', '#c0392b']
const SKINS = ['#fde8d8', '#f9ddc8', '#f4d0b6', '#fbe4d5']

const MOOD_BY_CLASS: Record<ClassId, [Mood, number][]> = {
  'to-van': [['cute', 5], ['romantic', 4], ['cool', 1]],
  'cuu-linh': [['cute', 5], ['cool', 2], ['romantic', 2]],
  'than-tuong': [['romantic', 4], ['cool', 4], ['cute', 2]],
  'thiet-y': [['cool', 6], ['cute', 3], ['romantic', 1]],
  'huyet-ha': [['cool', 6], ['romantic', 2], ['cute', 2]],
  'toai-mong': [['cool', 7], ['romantic', 2], ['cute', 1]],
  'long-ngam': [['romantic', 4], ['cool', 4], ['cute', 2]],
}

const EXPRESSIONS_BY_MOOD: Record<Mood, Expression[]> = {
  cute: ['smile', 'grin', 'happy', 'wink'],
  cool: ['calm', 'smirk', 'calm', 'sleepy'],
  romantic: ['shy', 'smile', 'happy', 'wink'],
}

export function randomLook(rng: Rng, gender: Gender, classId: ClassId): ChibiLook {
  const hairPool: [string, number][] =
    gender === 'nu'
      ? [
          [HAIR_COLORS.black, 26],
          [HAIR_COLORS.brown, 14],
          [HAIR_COLORS.chestnut, 8],
          [HAIR_COLORS.silver, 10],
          [HAIR_COLORS.white, 6],
          [HAIR_COLORS.ink, 8],
          [HAIR_COLORS.wine, 8],
          [HAIR_COLORS.gold, 5],
          [HAIR_COLORS.pink, 9],
          [HAIR_COLORS.violet, 6],
        ]
      : [
          [HAIR_COLORS.black, 34],
          [HAIR_COLORS.brown, 16],
          [HAIR_COLORS.chestnut, 6],
          [HAIR_COLORS.silver, 12],
          [HAIR_COLORS.white, 8],
          [HAIR_COLORS.ink, 10],
          [HAIR_COLORS.wine, 7],
          [HAIR_COLORS.gold, 4],
          [HAIR_COLORS.violet, 3],
        ]
  const mood = rng.weighted(MOOD_BY_CLASS[classId])
  // tóc sau: 0 xõa dài, 1 búi đôi, 2 đuôi ngựa cao, 3 búi nửa đầu, 4 ngắn
  const backHair = gender === 'nu' ? rng.weighted([[0, 4], [1, 2], [2, 3], [3, 3], [4, 1]]) : rng.weighted([[2, 4], [3, 4], [4, 3], [0, 1]])
  return {
    gender,
    bangs: rng.int(0, 3),
    backHair,
    hairColor: rng.weighted(hairPool),
    eyeColor: rng.chance(0.45) ? CLASSES[classId].palette.accent : rng.pick(EYE_COLORS),
    skin: rng.pick(SKINS),
    expression: rng.pick(EXPRESSIONS_BY_MOOD[mood]),
    mood,
    accessory: rng.int(0, 3),
  }
}

/** Sinh ngoại hình cố định từ một chuỗi bất kỳ (tên, id) */
export function lookFromSeed(seed: string, classId: ClassId, gender?: Gender): ChibiLook {
  const rng = createRng(seed)
  const g = gender ?? defaultGender(rng, classId)
  return randomLook(rng, g, classId)
}

function defaultGender(rng: Rng, classId: ClassId): Gender {
  const femaleChance: Record<ClassId, number> = {
    'to-van': 0.78,
    'cuu-linh': 0.62,
    'than-tuong': 0.5,
    'thiet-y': 0.3,
    'huyet-ha': 0.42,
    'toai-mong': 0.38,
    'long-ngam': 0.5,
  }
  return rng.chance(femaleChance[classId]) ? 'nu' : 'nam'
}

/* ------------------------------------------------------------------ */
/* Dữ liệu tên                                                          */
/* ------------------------------------------------------------------ */

const MEMBER_NAMES = [
  'Dạ Lăng Phong', 'Mộ Dung Tuyết', 'Tiêu Dao Khách', 'Lãnh Nguyệt Hàn', 'Thượng Quan Nhi', 'Nam Cung Vũ',
  'Bạch Y Khinh Ca', 'Liễu Như Yên', 'Tô Mộ Già', 'Hàn Sương Ảnh', 'Vân Khinh Tụ', 'Lạc Anh Tàn',
  'Tử Đằng Hoa', 'Thiên Nhai Lãng', 'Nhất Tiếu Khuynh', 'Lăng Ba Tiên', 'Hoa Tư Dẫn', 'Ngưng Sương',
  'Mặc Nhiễm', 'Tịch Dương Hồng', 'Yên Vũ Lâu', 'Tàn Kiếm Ca', 'Cô Hồng Ảnh', 'Ly Ca Vãn',
  'Sơ Kiến Kinh Diễm', 'Thất Dạ Tuyết', 'Vô Ưu Tử', 'Tiểu Hồ Ly', 'Bánh Bao Nhân Đậu', 'Mèo Lười Biện Kinh',
  'Cá Mặn Phiêu Lưu', 'Đường Đường', 'Trà Sữa Trân Châu', 'Phong Hoa Tuyệt Đại', 'Kiếm Tâm Minh', 'Nguyệt Hạ Độc Ẩm',
  'Lạc Thần Phú', 'Họa Mi Điểu', 'Thanh Ca Mạn', 'Vãn Phong Khởi', 'Lam Kiều Nguyệt', 'Đạp Tuyết Tầm Mai',
  'Hồng Trần Khách', 'Thiên Sơn Mộ Tuyết', 'Bắc Minh Hữu Ngư', 'Hoàng Hôn Lữ Khách',
]

const TITLES = [
  'Hiệp Khách Biện Kinh', 'Thần Y Diệu Thủ', 'Lão Đại Bang Chiến', 'Kiếm Tâm Thông Minh', 'Ông Hoàng Phó Bản',
  'Nữ Hiệp Mê Ngoại Trang', 'Tân Thủ Đáng Yêu', 'Kẻ Lạc Đường Chuyên Nghiệp', 'Bàn Tay Vàng Đấu Giá', 'Đệ Nhất Đầu Bếp',
  'Tửu Tiên Đêm Trăng', 'Thợ Săn Boss Thế Giới', 'Người Gác Đêm Bang Hội', 'Cầm Sư Phiêu Lãng', 'Họa Sĩ Ngoại Trang',
  'Vua Câu Cá Biện Kinh', 'Thánh Điểm Danh', 'Chiến Thần Tỉ Võ', 'Bóng Ma Chiến Trường', 'Thiên Hạ Vô Song',
]

const BIOS = [
  'Ban ngày đi làm, tối về hành hiệp trượng nghĩa.',
  'Mục tiêu: clear Ác Mộng Cửu Long Uyên trước Tết.',
  'Ai cần hồi máu cứ gọi, có mặt trong 3 giây.',
  'Chuyên đứng mũi chịu sào, boss đánh đâu đỡ đó.',
  'Thích ngắm cảnh Biện Kinh lúc hoàng hôn.',
  'Sưu tầm ngoại trang là chân ái, chiến lực là phụ.',
  'Đang tìm đồ đệ ngoan, bao dẫn phó bản.',
  'Tân thủ mới vào, mong các tiền bối chỉ giáo.',
  'Bang chiến chưa từng vắng mặt một trận.',
  'Câu cá giỏi nhất bang, đánh boss... cũng tạm.',
  'Đang luyện build Toái Mộng một đao một mạng.',
  'Hay online khung 21h–24h, rủ là đi.',
]

const OPPONENTS = [
  'Thiên Hạ Hội', 'Lục Phân Bán Đường', 'Thanh Long Hội', 'Vô Song Các', 'Phong Vân Điện', 'Nghịch Lân Minh',
  'Tuyết Nguyệt Lâu', 'Bắc Đẩu Môn', 'Hồng Trần Các', 'Kiếm Các Lăng Vân',
]

const APPLICANT_NAMES = [
  'Tiểu Long Nữ Fake', 'Lưu Ly Tâm', 'Phi Tuyết', 'Mộng Hồi Đường', 'Cửu Thiên Huyền Nữ', 'Bạch Lộ',
  'Kiếm Khách Vô Danh', 'Hạ Vũ Thiên', 'Tiểu Mãn', 'Lăng Tiêu Các',
]

const APPLICANT_MESSAGES = [
  'Online mỗi tối, muốn vào bang đánh phó bản 25 người cùng mọi người.',
  'Từng làm đường chủ ở server cũ, PvP ổn, mong được gia nhập.',
  'Tân thủ, rất mê cốt truyện, mong tìm được sư phụ.',
  'Healer chính, có kinh nghiệm Ác Mộng Thiên Lao.',
  'Bạn mình giới thiệu, nghe nói bang vui và đoàn kết lắm.',
  'Muốn tham gia bang chiến tối thứ Bảy, có mic đầy đủ.',
]

const LOOT_NAMES: [string, LootItem['kind'], LootItem['rarity']][] = [
  ['Mạch Đao · Phá Quân', 'vu-khi', 'kim'],
  ['Long Lân Giáp', 'trang-bi', 'kim'],
  ['Bí Kíp · Băng Tâm Quyết', 'bi-kip', 'hong'],
  ['Ngọc Bội Hàn Sương', 'trang-bi', 'tu'],
  ['Hộ Uyển Kim Ti', 'trang-bi', 'tu'],
  ['Ngoại Trang · Kinh Hồng Vũ Y', 'ngoai-trang', 'hong'],
  ['Tuyết Ảnh Kiếm Tuệ', 'trang-bi', 'tu'],
  ['Hắc Thủy Đế Ấn', 'trang-bi', 'hong'],
  ['Dạ Minh Châu', 'nguyen-lieu', 'kim'],
  ['Cửu Long Lệnh Bài', 'nguyen-lieu', 'hong'],
  ['Huyền Thiết Khoáng ×20', 'nguyen-lieu', 'lam'],
  ['Thiên Tàm Ti ×10', 'nguyen-lieu', 'lam'],
  ['Thương · Lạc Nhật Hồng', 'vu-khi', 'kim'],
  ['Dây Lụa · Nghê Thường', 'vu-khi', 'kim'],
  ['Bí Kíp · Long Ngâm Cửu Thiên', 'bi-kip', 'kim'],
  ['Ngoại Trang · Nguyệt Hạ Thanh Y', 'ngoai-trang', 'tu'],
  ['Đai Lưng Phong Vân', 'trang-bi', 'lam'],
  ['Ngọc Như Ý', 'nguyen-lieu', 'tu'],
]

/* ------------------------------------------------------------------ */
/* Sinh dữ liệu                                                        */
/* ------------------------------------------------------------------ */

export interface SeedData {
  currentUserId: string
  members: Member[]
  mentorships: Mentorship[]
  bonds: Bond[]
  progress: ProgressMap
  clears: ClearRecord[]
  events: GuildEvent[]
  wars: WarRecord[]
  ledger: LedgerEntry[]
  loot: LootItem[]
  applications: Application[]
  announcements: Announcement[]
  activities: Activity[]
  teams: TeamTemplate[]
}

const DAY = 86400000

function isoAgo(now: number, ms: number) {
  return new Date(now - ms).toISOString()
}

function classStats(rng: Rng, classId: ClassId): MemberStats {
  const base: Record<ClassId, MemberStats> = {
    'to-van': { pve: 70, pvp: 55, support: 96, survival: 60, teamwork: 90, mobility: 62 },
    'cuu-linh': { pve: 86, pvp: 72, support: 55, survival: 58, teamwork: 70, mobility: 64 },
    'than-tuong': { pve: 88, pvp: 70, support: 50, survival: 55, teamwork: 66, mobility: 74 },
    'thiet-y': { pve: 72, pvp: 68, support: 62, survival: 97, teamwork: 85, mobility: 48 },
    'huyet-ha': { pve: 84, pvp: 86, support: 40, survival: 78, teamwork: 70, mobility: 70 },
    'toai-mong': { pve: 82, pvp: 94, support: 30, survival: 52, teamwork: 58, mobility: 92 },
    'long-ngam': { pve: 90, pvp: 82, support: 46, survival: 60, teamwork: 68, mobility: 84 },
  }
  const b = base[classId]
  const j = () => rng.int(-12, 8)
  return {
    pve: Math.min(100, b.pve + j()),
    pvp: Math.min(100, b.pvp + j()),
    support: Math.min(100, b.support + j()),
    survival: Math.min(100, b.survival + j()),
    teamwork: Math.min(100, b.teamwork + j()),
    mobility: Math.min(100, b.mobility + j()),
  }
}

export function generateSeed(now = Date.now()): SeedData {
  const rng = createRng(20261022)

  /* ---------- Thành viên ---------- */
  const rankPlan: RankId[] = [
    'bang-chu',
    'pho-bang-chu', 'pho-bang-chu',
    'truong-lao', 'truong-lao', 'truong-lao', 'truong-lao',
    'duong-chu', 'duong-chu', 'duong-chu', 'duong-chu', 'duong-chu', 'duong-chu',
    ...Array<RankId>(12).fill('tinh-anh'),
    ...Array<RankId>(15).fill('thanh-vien'),
    ...Array<RankId>(6).fill('tan-binh'),
  ]
  const classPlan: ClassId[] = [
    'huyet-ha', 'to-van', 'thiet-y', 'long-ngam', 'toai-mong', 'than-tuong', 'cuu-linh',
  ]
  const classWeights: [ClassId, number][] = [
    ['to-van', 18], ['cuu-linh', 13], ['than-tuong', 14], ['thiet-y', 14], ['huyet-ha', 14], ['toai-mong', 14], ['long-ngam', 13],
  ]
  const rankPower: Partial<Record<RankId, [number, number]>> = {
    'bang-chu': [372000, 372000],
    'pho-bang-chu': [330000, 360000],
    'truong-lao': [300000, 345000],
    'duong-chu': [270000, 320000],
    'tinh-anh': [235000, 300000],
    'thanh-vien': [170000, 255000],
    'tan-binh': [95000, 160000],
  }

  const members: Member[] = MEMBER_NAMES.map((name, i) => {
    const rank = rankPlan[i] ?? 'thanh-vien'
    const classId = i < classPlan.length ? classPlan[i] : rng.weighted(classWeights)
    const r = createRng(`member-${i}-${name}`)
    const gender: Gender = i === 0 ? 'nam' : i === 1 ? 'nu' : defaultGender(r, classId)
    const look = randomLook(r, gender, classId)
    if (i === 0) {
      look.mood = 'cool'
      look.expression = 'smirk'
      look.hairColor = HAIR_COLORS.silver
      look.backHair = 2
      look.bangs = 2
    }
    if (i === 1) {
      look.mood = 'romantic'
      look.expression = 'shy'
      look.hairColor = HAIR_COLORS.black
      look.backHair = 3
    }
    const [pMin, pMax] = rankPower[rank] ?? [150000, 250000]
    const power = rng.int(pMin, pMax)
    const joinedDays = rank === 'tan-binh' ? rng.int(2, 25) : rank === 'bang-chu' ? 552 : rng.int(40, 540)
    const statusRoll = rng.next()
    const status = statusRoll < 0.3 ? 'online' : statusRoll < 0.42 ? 'in-raid' : statusRoll < 0.5 ? 'afk' : 'offline'
    const lastOnline = status === 'offline' ? isoAgo(now, rng.int(1, 60) * 3600000 + rng.int(0, 3) * DAY) : new Date(now).toISOString()
    const activity = rank === 'tan-binh' ? rng.int(35, 90) : rng.int(40, 100)
    const contribution = Math.round((joinedDays * rng.int(60, 160) + power / 20) / 10) * 10
    const weeklyContribution = Math.round((activity * rng.int(18, 42)) / 10) * 10
    // nhịp tăng chung của cả server theo tuần (tuần ra patch tăng mạnh, tuần thấp điểm gần như đứng yên)
    const WEEKLY_STEP = [4200, 11800, 2600, 7400, 1200, 9600, 5200]
    const history: number[] = [power]
    let p = power
    for (let w = 0; w < 7; w++) {
      p = Math.round(p - WEEKLY_STEP[w] * rng.float(0.55, 1.45) - rng.int(0, 1800))
      history.unshift(p)
    }
    const achPool = ACHIEVEMENTS.filter((a) => {
      const chance = { lam: 0.55, tu: 0.32, kim: 0.16, hong: 0.06 }[a.rarity]
      return r.chance(rank === 'tan-binh' ? chance / 3 : chance)
    }).map((a) => a.id)
    return {
      id: `m${String(i + 1).padStart(3, '0')}`,
      name,
      classId,
      rank,
      level: rank === 'tan-binh' ? rng.int(52, 68) : rng.int(72, 80),
      power,
      contribution,
      weeklyContribution,
      activity,
      status,
      joinedAt: isoAgo(now, joinedDays * DAY),
      lastOnline,
      title: i === 0 ? 'Thiên Hạ Vô Song' : rng.pick(TITLES),
      bio: i === 0 ? 'Bang chủ Kinh Hồng Các. Có việc cứ nhắn, không việc cũng cứ nhắn.' : rng.pick(BIOS),
      look,
      stats: classStats(r, classId),
      achievements: achPool,
      pvp: { kills: rng.int(40, 900), deaths: rng.int(30, 500), wins: rng.int(10, 120) },
      powerHistory: history,
    }
  })

  const byRank = (ranks: RankId[]) => members.filter((m) => ranks.includes(m.rank))
  const id = (i: number) => members[i].id

  /* ---------- Sư đồ ---------- */
  const masters = byRank(['bang-chu', 'pho-bang-chu', 'truong-lao', 'duong-chu', 'tinh-anh'])
  const disciples = byRank(['tan-binh', 'thanh-vien'])
  const mentorships: Mentorship[] = []
  const mentorPlan: { m: number; d: number; stage: MentorshipStage; graduated?: boolean }[] = [
    { m: 0, d: 0, stage: 3 },
    { m: 1, d: 1, stage: 2 },
    { m: 1, d: 2, stage: 4, graduated: true },
    { m: 2, d: 3, stage: 1 },
    { m: 3, d: 4, stage: 0 },
    { m: 4, d: 5, stage: 2 },
    { m: 5, d: 6, stage: 4, graduated: true },
    { m: 6, d: 7, stage: 3 },
    { m: 0, d: 8, stage: 4, graduated: true },
    { m: 8, d: 9, stage: 1 },
    { m: 9, d: 10, stage: 4, graduated: true },
    { m: 12, d: 11, stage: 2 },
  ]
  for (const plan of mentorPlan) {
    const master = masters[plan.m]
    const disciple = disciples[disciples.length - 1 - plan.d]
    if (!master || !disciple) continue
    const startedDays = plan.graduated ? rng.int(60, 200) : rng.int(3, 50)
    const tasks = MENTOR_TASK_TEMPLATES.map((t, ti) => ({
      id: `t${ti}`,
      label: t.label,
      stage: t.stage,
      done: plan.graduated ? true : t.stage < plan.stage || (t.stage === plan.stage && rng.chance(0.5)),
    }))
    mentorships.push({
      id: `ms-${master.id}-${disciple.id}`,
      masterId: master.id,
      discipleId: disciple.id,
      stage: plan.stage,
      status: plan.graduated ? 'graduated' : 'active',
      startedAt: isoAgo(now, startedDays * DAY),
      graduatedAt: plan.graduated ? isoAgo(now, rng.int(3, startedDays - 20) * DAY) : undefined,
      bond: plan.graduated ? rng.int(2400, 6000) : rng.int(200, 2200),
      tasks,
    })
  }

  /* ---------- Tình duyên ---------- */
  const males = members.filter((m) => m.look.gender === 'nam')
  const females = members.filter((m) => m.look.gender === 'nu')
  const bonds: Bond[] = []
  const used = new Set<string>()
  const pairUp = (a: Member | undefined, b: Member | undefined, type: Bond['type'], note: string) => {
    if (!a || !b || used.has(a.id) || used.has(b.id) || a.id === b.id) return
    if (type === 'phu-the') {
      used.add(a.id)
      used.add(b.id)
    }
    bonds.push({
      id: `b-${a.id}-${b.id}`,
      aId: a.id,
      bId: b.id,
      type,
      since: isoAgo(now, rng.int(20, 400) * DAY),
      intimacy: rng.int(1200, 14000),
      note,
    })
  }
  pairUp(members[0], members[1], 'phu-the', 'Gặp nhau ở trận bang chiến đầu tiên, từ đó không rời.')
  pairUp(males[3], females[4], 'phu-the', 'Một người tank, một người hồi máu — trời sinh một cặp.')
  pairUp(males[6], females[7], 'phu-the', 'Cùng câu cá bên hồ Biện Kinh mỗi tối.')
  pairUp(males[9], females[10], 'phu-the', 'Lễ cưới linh đình nhất server mùa thu năm ngoái.')
  pairUp(members[5], members[12], 'tri-ky', 'Cầm tiêu hợp tấu, tri âm khó tìm.')
  pairUp(members[8], members[19], 'tri-ky', 'Cùng nhau leo top Đại Hội Tỉ Võ.')
  pairUp(members[2], members[3], 'ket-nghia', 'Kết nghĩa huynh đệ từ ngày khai bang.')
  pairUp(members[14], members[16], 'ket-nghia', 'Tỷ muội tốt, có đồ ngon chia nhau.')

  /* ---------- Phó bản ---------- */
  // số boss đã hạ theo phó bản / độ khó
  const clearedPlan: Record<string, Record<DungeonMode, number>> = {
    'lien-van-trai': { thuong: 3, 'anh-hung': 3, 'ac-mong': 3 },
    'huy-nac-thanh': { thuong: 3, 'anh-hung': 3, 'ac-mong': 3 },
    'kim-phong-lau': { thuong: 3, 'anh-hung': 3, 'ac-mong': 2 },
    'thien-lao': { thuong: 4, 'anh-hung': 4, 'ac-mong': 3 },
    'tay-ha-lang': { thuong: 4, 'anh-hung': 3, 'ac-mong': 1 },
    'cuu-long-uyen': { thuong: 4, 'anh-hung': 2, 'ac-mong': 0 },
  }
  const progress: ProgressMap = {}
  const clears: ClearRecord[] = []
  DUNGEONS.forEach((d, di) => {
    progress[d.id] = {}
    MODE_IDS.forEach((mode, mi) => {
      const killedCount = clearedPlan[d.id][mode]
      const modeMap: Record<string, { kills: number; firstKill?: string; bestTimeSec?: number }> = {}
      d.bosses.forEach((b, bi) => {
        if (bi < killedCount) {
          const ageDays = Math.max(2, (DUNGEONS.length - di) * 32 - mi * 18 - bi * 3 + rng.int(-4, 4))
          const kills = Math.max(1, Math.round(ageDays / 7) + rng.int(0, 3))
          const baseTime = (d.size === 25 ? 420 : d.size === 10 ? 300 : 180) + mi * 90 + bi * 40
          modeMap[b.id] = { kills, firstKill: isoAgo(now, ageDays * DAY + rng.int(0, 20) * 3600000), bestTimeSec: baseTime - rng.int(0, 60) }
          // ghi lại vài lượt clear gần đây
          const recent = Math.min(kills, 3)
          for (let k = 0; k < recent; k++) {
            const team = rng.shuffle(members).slice(0, d.size)
            const days = k === 0 && kills === 1 ? ageDays : rng.int(0, Math.min(ageDays, 50))
            clears.push({
              id: `c-${d.id}-${mode}-${b.id}-${k}`,
              dungeonId: d.id,
              mode,
              bossId: b.id,
              date: isoAgo(now, days * DAY + rng.int(18, 23) * 3600000 - 18 * 3600000),
              durationSec: baseTime + rng.int(0, 140),
              memberIds: team.map((m) => m.id),
              mvpId: rng.pick(team).id,
              wipes: mode === 'ac-mong' ? rng.int(0, 6) : rng.int(0, 2),
            })
          }
        } else {
          modeMap[b.id] = { kills: 0 }
        }
      })
      progress[d.id]![mode] = modeMap
    })
  })
  clears.sort((a, b) => b.date.localeCompare(a.date))

  /* ---------- Lịch hoạt động (tuần này + tuần sau) ---------- */
  const weekStart = startOfWeek(new Date(now)) // thứ Hai 05:00
  const at = (dayOffset: number, h: number, m = 0) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + dayOffset)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }
  const leaders = byRank(['bang-chu', 'pho-bang-chu', 'truong-lao', 'duong-chu'])
  const eventPlan: Omit<GuildEvent, 'id' | 'rsvp'>[] = []
  for (const w of [0, 7]) {
    eventPlan.push(
      { type: 'raid', title: 'Thiên Lao · Ác Mộng', start: at(w + 0, 20, 30), durationMin: 120, location: 'Cổng Thiên Lao, Biện Kinh', leaderId: leaders[0].id, capacity: 25, note: 'Mang đủ thuốc giải độc cho boss 2.' },
      { type: 'guild-war', title: 'Bang Chiến · Vòng loại', start: at(w + 1, 20, 0), durationMin: 60, location: 'Chiến trường Bang Hội', leaderId: leaders[1].id, capacity: 40, note: 'Tập trung 19:45, chia 3 cánh.' },
      { type: 'training', title: 'Dạy tân thủ: Cơ chế Hủy Nặc Thành', start: at(w + 2, 21, 0), durationMin: 60, location: 'Luyện Võ Trường', leaderId: leaders[3].id, capacity: 15, note: 'Ưu tiên đồ đệ đang ở giai đoạn Thực Chiến.' },
      { type: 'raid', title: 'Cửu Long Uyên · Anh Hùng', start: at(w + 3, 20, 30), durationMin: 150, location: 'Vực Cửu Long', leaderId: leaders[0].id, capacity: 25, note: 'Mục tiêu: hạ Lôi Đình Long Tướng.' },
      { type: 'boss', title: 'Boss Thế Giới · Hắc Thủy Huyền Quy', start: at(w + 4, 12, 0), durationMin: 30, location: 'Bờ sông Biện Hà', leaderId: leaders[4].id, capacity: 40, note: 'Tranh last-hit, Thiết Y giữ aggro.' },
      { type: 'guild-war', title: 'Bang Chiến · Công Thành', start: at(w + 5, 20, 0), durationMin: 90, location: 'Thành Biện Kinh', leaderId: leaders[1].id, capacity: 40, note: 'Trận quan trọng nhất tuần, toàn bang tham gia!' },
      { type: 'tournament', title: 'Đại Hội Tỉ Võ', start: at(w + 5, 15, 0), durationMin: 120, location: 'Lôi Đài Biện Kinh', leaderId: leaders[2].id, capacity: 10, note: 'Đăng ký đại diện bang.' },
      { type: 'banquet', title: 'Yến Tiệc Bang · Ngắm Trăng', start: at(w + 6, 21, 0), durationMin: 45, location: 'Hậu viện Kinh Hồng Các', leaderId: members[1].id, capacity: 80, note: 'Có quay thưởng ngoại trang!' },
    )
  }
  const events: GuildEvent[] = eventPlan.map((e, i) => {
    const rsvp: Record<string, RsvpStatus> = {}
    const isPast = new Date(e.start).getTime() < now
    let yes = 0
    rsvp[e.leaderId] = 'yes'
    members.forEach((m) => {
      if (m.id === e.leaderId) return
      const roll = rng.next()
      const base = isPast ? 0.62 : 0.4
      // không vượt quá sức chứa — người đăng ký sau chuyển sang "có thể"
      if (roll < base) rsvp[m.id] = ++yes < e.capacity ? 'yes' : 'maybe'
      else if (roll < base + 0.15) rsvp[m.id] = 'maybe'
      else if (roll < base + 0.22) rsvp[m.id] = 'no'
    })
    return { ...e, id: `ev${i + 1}`, rsvp }
  })

  /* ---------- Bang chiến ---------- */
  const wars: WarRecord[] = []
  for (let i = 0; i < 14; i++) {
    const days = i * 3.5 + rng.int(1, 2)
    const roll = rng.next()
    const result: WarRecord['result'] = roll < 0.66 ? 'win' : roll < 0.92 ? 'lose' : 'draw'
    const team = rng.shuffle(members).slice(0, rng.int(24, 36))
    const lines = team.map((m) => {
      const role = CLASSES[m.classId].role
      return {
        memberId: m.id,
        k: role === 'healer' ? rng.int(0, 4) : rng.int(2, 22),
        d: rng.int(0, 9),
        a: rng.int(3, 30),
        dmg: role === 'healer' ? rng.int(200000, 900000) : rng.int(900000, 4200000),
        heal: role === 'healer' ? rng.int(1800000, 5200000) : rng.int(0, 300000),
      }
    })
    const mvp = [...lines].sort((a, b) => b.k * 2 + b.a + b.heal / 400000 - (a.k * 2 + a.a + a.heal / 400000))[0]
    const ourScore = result === 'win' ? rng.int(3, 5) : result === 'draw' ? 2 : rng.int(0, 2)
    const theirScore = result === 'win' ? rng.int(0, ourScore - 1) : result === 'draw' ? 2 : rng.int(ourScore + 1, 5)
    wars.push({
      id: `w${i + 1}`,
      date: isoAgo(now, days * DAY),
      opponent: rng.pick(OPPONENTS),
      result,
      score: [ourScore, theirScore],
      mvpId: mvp.memberId,
      mode: i % 2 === 0 ? 'cong-thanh' : 'bang-chien',
      lines,
    })
  }

  /* ---------- Sổ cống hiến ---------- */
  const ledger: LedgerEntry[] = []
  const reasons: [LedgerEntry['category'], string, number, number][] = [
    ['pho-ban', 'Tham gia phó bản bang', 80, 220],
    ['bang-chien', 'Tham gia bang chiến', 120, 300],
    ['quyen-gop', 'Quyên góp ngân lượng xây bang', 200, 800],
    ['nhiem-vu', 'Hoàn thành nhiệm vụ bang hằng ngày', 30, 90],
  ]
  for (let i = 0; i < 160; i++) {
    const m = rng.pick(members)
    const [category, reason, min, max] = rng.pick(reasons)
    ledger.push({
      id: `l${i + 1}`,
      memberId: m.id,
      delta: rng.int(min, max),
      reason,
      category,
      date: isoAgo(now, rng.int(0, 30 * 24) * 3600000),
    })
  }

  /* ---------- Chiến lợi phẩm ---------- */
  const loot: LootItem[] = LOOT_NAMES.map(([name, kind, rarity], i) => {
    const dungeon = rng.pick(DUNGEONS)
    const startPrice = { lam: 100, tu: 400, kim: 1200, hong: 3000 }[rarity]
    const isAuction = i < 8
    const bidders = rng.shuffle(members).slice(0, isAuction ? rng.int(0, 5) : 0)
    let price = startPrice
    const bids = bidders.map((b, bi) => {
      price += rng.int(1, 4) * Math.round(startPrice / 10)
      return { memberId: b.id, amount: price, at: isoAgo(now, (bidders.length - bi) * rng.int(20, 90) * 60000) }
    })
    const winner = rng.pick(members)
    return {
      id: `loot${i + 1}`,
      name,
      kind,
      rarity,
      source: dungeon.name,
      status: isAuction ? 'auction' : 'assigned',
      startPrice,
      endsAt: isAuction ? new Date(now + rng.int(2, 60) * 3600000).toISOString() : isoAgo(now, rng.int(1, 20) * DAY),
      bids,
      assignedTo: isAuction ? undefined : winner.id,
      price: isAuction ? undefined : startPrice + rng.int(2, 12) * Math.round(startPrice / 10),
    }
  })
  loot
    .filter((l) => l.status === 'assigned')
    .forEach((l) => {
      ledger.push({
        id: `l-buy-${l.id}`,
        memberId: l.assignedTo!,
        delta: -(l.price ?? 0),
        reason: `Đấu giá thắng: ${l.name}`,
        category: 'dau-gia',
        date: l.endsAt,
      })
    })
  ledger.sort((a, b) => b.date.localeCompare(a.date))

  /* ---------- Chiêu mộ ---------- */
  const stages: ApplicationStage[] = ['moi', 'moi', 'moi', 'phong-van', 'phong-van', 'thu-thach', 'thu-thach', 'chap-nhan', 'tu-choi', 'moi']
  const applications: Application[] = APPLICANT_NAMES.map((name, i) => {
    const classId = rng.pick(CLASS_IDS)
    return {
      id: `app${i + 1}`,
      name,
      classId,
      power: rng.int(90000, 290000),
      level: rng.int(55, 80),
      message: rng.pick(APPLICANT_MESSAGES),
      stage: stages[i],
      appliedAt: isoAgo(now, rng.int(1, 120) * 3600000),
      referrerId: rng.chance(0.4) ? rng.pick(members).id : undefined,
      look: lookFromSeed(`app-${name}`, classId),
    }
  })

  /* ---------- Bảng tin ---------- */
  const announcements: Announcement[] = [
    {
      id: 'an1',
      title: 'Mục tiêu tuần: hạ Lôi Đình Long Tướng (Anh Hùng)',
      body: 'Tối thứ Năm 20:30 tập trung tại Vực Cửu Long. Thiết Y nhớ mang thuốc kháng lôi, Tố Vấn chia 2 nhóm hồi máu theo sơ đồ đội hình đã lưu.',
      authorId: id(0),
      date: isoAgo(now, 5 * 3600000),
      pinned: true,
      tag: 'su-kien',
    },
    {
      id: 'an2',
      title: 'Quy định phân phát chiến lợi phẩm mùa mới',
      body: 'Từ tuần này, mọi vật phẩm Kim/Hồng đều qua đấu giá bằng điểm cống hiến. Điểm cống hiến không thể chuyển nhượng. Mọi điều chỉnh phải có Phó Bang Chủ xác nhận.',
      authorId: id(1),
      date: isoAgo(now, 2 * DAY),
      pinned: true,
      tag: 'quy-dinh',
    },
    {
      id: 'an3',
      title: 'Chúc mừng 3 đồ đệ xuất sư tháng này!',
      body: 'Cảm ơn các sư phụ đã tận tâm dìu dắt. Phần thưởng 500 cống hiến đã được cộng vào sổ.',
      authorId: id(2),
      date: isoAgo(now, 3 * DAY),
      pinned: false,
      tag: 'vinh-danh',
    },
    {
      id: 'an4',
      title: 'Yến tiệc Ngắm Trăng chủ nhật này',
      body: 'Quay thưởng ngoại trang Kinh Hồng Vũ Y cho người điểm danh đủ 5 ngày trong tuần.',
      authorId: id(1),
      date: isoAgo(now, 4 * DAY),
      pinned: false,
      tag: 'thong-bao',
    },
  ]

  /* ---------- Nhật ký hoạt động ---------- */
  const activities: Activity[] = []
  const pushAct = (type: Activity['type'], text: string, hoursAgo: number, memberId?: string) =>
    activities.push({ id: `a${activities.length + 1}`, type, text, date: isoAgo(now, hoursAgo * 3600000), memberId })
  const fk = clears.find((c) => c.mode === 'ac-mong')
  pushAct('first-kill', `Bang hạ gục lần đầu Huyết Y Hầu (Ác Mộng)!`, 3, fk?.mvpId)
  pushAct('clear', `${members[3].name} dẫn đội clear Hủy Nặc Thành · Anh Hùng trong 5:12`, 6, members[3].id)
  pushAct('graduate', `${disciples[disciples.length - 3].name} chính thức xuất sư dưới trướng ${masters[1].name}`, 9, disciples[disciples.length - 3].id)
  pushAct('war', `Thắng bang chiến trước ${wars[0].opponent} với tỉ số ${wars[0].score.join(' - ')}`, 14, wars[0].mvpId)
  pushAct('join', `${members[members.length - 1].name} gia nhập bang, chào mừng tân binh!`, 20, members[members.length - 1].id)
  pushAct('bond', `${members[0].name} và ${members[1].name} kỷ niệm 1 năm phu thê`, 26, members[0].id)
  pushAct('loot', `${members[7].name} thắng đấu giá Long Lân Giáp với 1.560 cống hiến`, 30, members[7].id)
  pushAct('promote', `${members[9].name} được thăng chức Đường Chủ`, 40, members[9].id)
  pushAct('achievement', `${members[4].name} đạt thành tựu Liên Trảm Thập Nhân`, 52, members[4].id)
  pushAct('donate', `${members[11].name} quyên góp 800 ngân lượng xây Tàng Kinh Các`, 60, members[11].id)
  pushAct('mentor', `${masters[3].name} nhận ${disciples[disciples.length - 5].name} làm đồ đệ`, 75, masters[3].id)
  pushAct('event', `Yến tiệc bang tuần trước có 52 người tham gia — kỷ lục mới!`, 96)

  /* ---------- Mẫu đội hình ---------- */
  const tanks = members.filter((m) => CLASSES[m.classId].role === 'tank').slice(0, 2)
  const healers = members.filter((m) => CLASSES[m.classId].role === 'healer').slice(0, 2)
  const dps = members.filter((m) => CLASSES[m.classId].role === 'dps').slice(0, 6)
  const teams: TeamTemplate[] = [
    {
      id: 'team1',
      name: 'Đội chủ lực · Cửu Long Uyên',
      dungeonId: 'cuu-long-uyen',
      slots: [...tanks, ...healers, ...dps].map((m) => m.id).slice(0, 10),
      createdAt: isoAgo(now, 2 * DAY),
    },
  ]

  return {
    currentUserId: members[0].id,
    members,
    mentorships,
    bonds,
    progress,
    clears,
    events,
    wars,
    ledger,
    loot,
    applications,
    announcements,
    activities,
    teams,
  }
}

export function seedHash() {
  return hashString(MEMBER_NAMES.join('|'))
}

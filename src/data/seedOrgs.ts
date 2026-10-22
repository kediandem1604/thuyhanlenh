// Dữ liệu demo cho nhiều tổ chức (giai đoạn 3): Kinh Hồng Các (bang) · Gia Tộc Họ Bạch (Kim Lan) · Thất Tinh Đội (team).
// Nhân vật dùng chung: vài người họ Bạch cũng là môn hạ Kinh Hồng Các; Thất Tinh Đội lấy người từ Kinh Hồng Các.
import { DUNGEONS, GUILD } from '@/domain/constants'
import { featuresOf, kimlanHonorific, type OrgThemeId } from '@/domain/orgs'
import type {
  Activity,
  Announcement,
  ChibiLook,
  ClassId,
  ClearRecord,
  DungeonMode,
  Gender,
  GuildEvent,
  Member,
  ProgressMap,
  RankId,
  RsvpStatus,
  TeamTemplate,
} from '@/domain/types'
import type { Feature } from '@/domain/orgs'
import type { OrgType } from '@/domain/types'
import { createRng, startOfWeek } from '@/lib/utils'
import { generateSeed, HAIR_COLORS, randomLook, type SeedData } from './seed'


export interface OrgSeedInfo {
  id: string
  type: OrgType
  name: string
  han: string
  server: string
  level: number
  motto: string
  description: string
  capacity: number | null
  theme: OrgThemeId
  features: Feature[] | null
  isPublic: boolean
}

export interface OrgSeed {
  org: OrgSeedInfo
  data: SeedData
}

const DAY = 86400000
const isoAgo = (now: number, ms: number) => new Date(now - ms).toISOString()

function emptyData(): Omit<SeedData, 'currentUserId'> {
  return {
    members: [],
    mentorships: [],
    bonds: [],
    progress: {},
    clears: [],
    events: [],
    wars: [],
    ledger: [],
    loot: [],
    applications: [],
    announcements: [],
    activities: [],
    teams: [],
  }
}

/* ------------------------------------------------------------------ */
/* Gia Tộc Họ Bạch                                                     */
/* ------------------------------------------------------------------ */

const BACH: { name: string; gender: Gender; classId: ClassId; power: number; title: string; bio: string }[] = [
  { name: 'Bạch Lăng Sương', gender: 'nu', classId: 'than-tuong', power: 351200, title: 'Gia Chủ Bạch Thị', bio: 'Đại tỷ của Bạch gia. Một kiếm định sương, lời nói là gia huấn.' },
  { name: 'Bạch Vân Phi', gender: 'nam', classId: 'thiet-y', power: 338900, title: 'Bức Tường Tuyết', bio: 'Đỡ đòn cho cả nhà từ thuở Liên Vân Trại còn là phó bản khó.' },
  { name: 'Bạch Thiên Ngân', gender: 'nu', classId: 'to-van', power: 329400, title: 'Ngân Châm Hồi Xuân', bio: 'Hồi máu chưa bao giờ trễ nhịp, chỉ trễ giờ hẹn.' },
  { name: 'Bạch Tử Mặc', gender: 'nam', classId: 'toai-mong', power: 336800, title: 'Mặc Ảnh Vô Thanh', bio: 'Ít nói, nhiều sát thương.' },
  { name: 'Bạch Nguyệt Hàn', gender: 'nu', classId: 'long-ngam', power: 327600, title: 'Hàn Nguyệt Long Ngâm', bio: 'Thích ngắm trăng ở Bạch Mai Viên sau mỗi lần clear.' },
  { name: 'Bạch Khinh Trần', gender: 'nam', classId: 'huyet-ha', power: 318300, title: 'Khinh Trần Phá Trận', bio: 'Lao lên đầu tiên, về sau cùng.' },
  { name: 'Bạch Ngọc Lan', gender: 'nu', classId: 'to-van', power: 309500, title: 'Ngọc Lan Thanh Hương', bio: 'Người nhớ sinh nhật của cả mười hai huynh đệ.' },
  { name: 'Bạch Hạc Minh', gender: 'nam', classId: 'than-tuong', power: 301700, title: 'Hạc Minh Cửu Cao', bio: 'Phi kiếm như hạc trắng lượn trên tuyết.' },
  { name: 'Bạch Mộ Tuyết', gender: 'nu', classId: 'cuu-linh', power: 296200, title: 'Mộ Tuyết Linh Hồ', bio: 'Con linh hồ của muội cũng là thành viên danh dự.' },
  { name: 'Bạch Phong Tiêu', gender: 'nam', classId: 'thiet-y', power: 287400, title: 'Phong Tiêu Thủ Vệ', bio: 'Tank dự bị, nấu ăn chính.' },
  { name: 'Bạch Lạc Anh', gender: 'nu', classId: 'long-ngam', power: 276900, title: 'Lạc Anh Tân Kiếm', bio: 'Vừa đổi build Long Ngâm, đang tập nhịp xoay kiếm.' },
  { name: 'Bạch Tiểu Hồ', gender: 'nu', classId: 'cuu-linh', power: 241300, title: 'Tiểu Hồ Ly Bạch Gia', bio: 'Tiểu muội nhỏ nhất nhà, được cả nhà cưng chiều.' },
]

const ICE_EYES = ['#7cc0ff', '#9fb4d8', '#8c7ce0', '#6fa8d8']

function bachLook(i: number, gender: Gender, classId: ClassId): ChibiLook {
  const rng = createRng(`bach-${i}`)
  const look = randomLook(rng, gender, classId)
  return {
    ...look,
    // tóc bạch kim / bạc là "chữ ký" của Bạch gia
    hairColor: i % 3 === 1 ? HAIR_COLORS.silver : HAIR_COLORS.white,
    eyeColor: ICE_EYES[i % ICE_EYES.length],
    mood: i === 11 ? 'cute' : i === 0 ? 'cool' : look.mood,
    expression: i === 11 ? 'happy' : i === 0 ? 'calm' : look.expression,
    accessory: i % 2 === 0 ? 2 : 1,
  }
}

/** Nhân vật họ Bạch (dùng cho Kim Lan + vài người ở Kinh Hồng Các) */
export function bachCharacters(now: number) {
  const rng = createRng('bach-family')
  return BACH.map((b, i) => {
    const id = `bg${String(i + 1).padStart(2, '0')}`
    const history: number[] = [b.power]
    let p = b.power
    for (let w = 0; w < 7; w++) {
      p = Math.round(p - rng.int(1500, 7000))
      history.unshift(p)
    }
    const member: Member = {
      id,
      characterId: `ch-${id}`,
      name: b.name,
      classId: b.classId,
      rank: i === 0 ? 'dai-ca' : 'huynh-de',
      seat: i + 1,
      level: 80,
      power: b.power,
      contribution: 0,
      weeklyContribution: 0,
      activity: rng.int(70, 100),
      status: rng.chance(0.4) ? 'online' : 'offline',
      joinedAt: isoAgo(now, (400 - i * 6) * DAY),
      lastOnline: isoAgo(now, rng.int(0, 30) * 3600000),
      title: b.title,
      bio: b.bio,
      look: bachLook(i, b.gender, b.classId),
      stats: { pve: rng.int(78, 96), pvp: rng.int(55, 85), support: rng.int(40, 95), survival: rng.int(55, 92), teamwork: rng.int(85, 100), mobility: rng.int(55, 90) },
      achievements: ['raid-25', 'sworn', 'active-30', ...(i < 4 ? ['raid-100', 'no-death'] : [])],
      pvp: { kills: rng.int(40, 300), deaths: rng.int(20, 200), wins: rng.int(5, 60) },
      powerHistory: history,
    }
    const h = kimlanHonorific(i + 1, b.gender, BACH.length)
    member.honorific = h.name
    member.honorificHan = h.han
    return member
  })
}

function bachSeed(now: number): OrgSeed {
  const rng = createRng('bach-data')
  const members = bachCharacters(now)
  const ids = members.map((m) => m.id)
  const data = emptyData()
  data.members = members

  // Kim Lan 12 người chỉ đủ đi phó bản 5 và 10 người
  const plan: Record<string, Record<DungeonMode, number>> = {
    'lien-van-trai': { thuong: 3, 'anh-hung': 3, 'ac-mong': 3 },
    'huy-nac-thanh': { thuong: 3, 'anh-hung': 3, 'ac-mong': 3 },
    'kim-phong-lau': { thuong: 3, 'anh-hung': 2, 'ac-mong': 0 },
  }
  const progress: ProgressMap = {}
  const clears: ClearRecord[] = []
  for (const d of DUNGEONS) {
    progress[d.id] = {}
    for (const mode of ['thuong', 'anh-hung', 'ac-mong'] as DungeonMode[]) {
      const killed = plan[d.id]?.[mode] ?? 0
      const modeMap: Record<string, { kills: number; firstKill?: string; bestTimeSec?: number }> = {}
      d.bosses.forEach((b, bi) => {
        if (bi >= killed) return void (modeMap[b.id] = { kills: 0 })
        const kills = rng.int(2, 7)
        const age = (d.size === 5 ? 160 : 90) - (mode === 'ac-mong' ? 50 : mode === 'anh-hung' ? 25 : 0) - bi * 4
        const base = (d.size === 10 ? 280 : 170) + (mode === 'ac-mong' ? 80 : mode === 'anh-hung' ? 40 : 0) + bi * 30
        let best = Infinity
        let first = ''
        for (let k = 0; k < kills; k++) {
          const team = rng.shuffle(ids).slice(0, Math.min(d.size, ids.length))
          const duration = base + rng.int(0, 110)
          const date = isoAgo(now, Math.max(1, Math.round(age - (age * k) / kills)) * DAY + rng.int(0, 5) * 3600000)
          best = Math.min(best, duration)
          if (!first || date < first) first = date
          clears.push({
            id: `bc-${d.id}-${mode}-${b.id}-${k}`,
            dungeonId: d.id,
            mode,
            bossId: b.id,
            date,
            durationSec: duration,
            memberIds: team,
            mvpId: rng.pick(team),
            wipes: mode === 'ac-mong' ? rng.int(0, 4) : rng.int(0, 1),
          })
        }
        modeMap[b.id] = { kills, firstKill: first, bestTimeSec: best }
      })
      progress[d.id]![mode] = modeMap
    }
  }
  data.progress = progress
  data.clears = clears.sort((a, b) => b.date.localeCompare(a.date))

  // Lịch đi phó bản của gia tộc
  const weekStart = startOfWeek(new Date(now))
  const at = (day: number, h: number, m = 0) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + day)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }
  const plans: Omit<GuildEvent, 'id' | 'rsvp'>[] = []
  for (const w of [0, 7]) {
    plans.push(
      { type: 'raid', title: 'Hủy Nặc Thành · Ác Mộng (Bạch Gia)', start: at(w + 1, 21, 0), durationMin: 90, location: 'Cổng thành băng', leaderId: 'bg01', capacity: 10, note: 'Tam tỷ và Thất tỷ chia hai nhóm hồi máu.' },
      { type: 'raid', title: 'Kim Phong Tế Vũ Lâu · Anh Hùng', start: at(w + 3, 21, 30), durationMin: 120, location: 'Biện Kinh, Kim Phong lâu', leaderId: 'bg02', capacity: 10, note: 'Mục tiêu: hạ Hồng Lâu Ám Chủ.' },
      { type: 'raid', title: 'Liên Vân Trại · dắt Tiểu muội', start: at(w + 5, 20, 0), durationMin: 45, location: 'Liên Vân Trại', leaderId: 'bg05', capacity: 5, note: 'Cho Tiểu Hồ tập đỡ cơ chế Song Đao Quỷ Ảnh.' },
      { type: 'boss', title: 'Boss Thế Giới · Tuyết Lang Vương', start: at(w + 6, 12, 0), durationMin: 30, location: 'Tuyết nguyên Bắc Cảnh', leaderId: 'bg04', capacity: 12, note: 'Cả nhà cùng đi, ai last-hit được bao trà sữa.' },
    )
  }
  data.events = plans.map((e, i) => {
    const rsvp: Record<string, RsvpStatus> = { [e.leaderId]: 'yes' }
    let yes = 1
    ids.forEach((id) => {
      if (id === e.leaderId) return
      const r = rng.next()
      if (r < 0.72 && yes < e.capacity) {
        rsvp[id] = 'yes'
        yes++
      } else if (r < 0.88) rsvp[id] = 'maybe'
    })
    return { ...e, id: `bev${i + 1}`, rsvp }
  })

  data.teams = [
    {
      id: 'bteam1',
      name: 'Bạch Gia · Hủy Nặc Thành',
      dungeonId: 'huy-nac-thanh',
      slots: ['bg02', 'bg01', 'bg04', 'bg05', 'bg03', 'bg10', 'bg06', 'bg08', 'bg09', 'bg07'],
      createdAt: isoAgo(now, 6 * DAY),
    } satisfies TeamTemplate,
  ]

  const ann = (id: string, title: string, body: string, days: number, pinned: boolean, tag: Announcement['tag']): Announcement => ({
    id,
    title,
    body,
    authorId: 'bg01',
    date: isoAgo(now, days * DAY),
    pinned,
    tag,
  })
  data.announcements = [
    ann('ban1', 'Gia huấn: Nhị nhân đồng tâm, kỳ lợi đoạn kim', 'Hai người cùng lòng thì sắc bén chặt được vàng; lời nói đồng lòng thơm như hoa lan — đó là chữ "Kim Lan". Trong phó bản không ai bị bỏ lại, ngoài phó bản không ai phải ăn tối một mình.', 30, true, 'quy-dinh'),
    ann('ban2', 'Tuần này: Ác Mộng Hủy Nặc Thành', 'Tối thứ Ba 21:00 tập trung ở cổng thành băng. Nhị ca kéo boss, Tứ ca canh ngắt chiêu Tuyết Ảnh Kiếm Cơ.', 1, true, 'su-kien'),
    ann('ban3', 'Mừng Tiểu muội vào nhà', 'Bạch Tiểu Hồ chính thức kết nghĩa, thành Tiểu muội thứ mười hai của Bạch gia. Cả nhà nhớ dắt muội đi Liên Vân Trại cuối tuần!', 12, false, 'vinh-danh'),
  ]

  const act = (id: string, type: Activity['type'], text: string, hours: number, memberId?: string): Activity => ({ id, type, text, date: isoAgo(now, hours * 3600000), memberId })
  data.activities = [
    act('bact1', 'first-kill', 'Bạch gia hạ gục lần đầu Thành Chủ Hủy Nặc (Ác Mộng)!', 20, 'bg01'),
    act('bact2', 'clear', 'Đội của Bạch Tử Mặc hạ Tuyết Ảnh Kiếm Cơ · Hủy Nặc Thành', 44, 'bg04'),
    act('bact3', 'event', 'Bạch Ngọc Lan đặt lịch Kim Phong Tế Vũ Lâu · Anh Hùng', 70, 'bg07'),
    act('bact4', 'join', 'Bạch Tiểu Hồ kết nghĩa, thành Tiểu muội của Bạch gia', 12 * 24, 'bg12'),
    act('bact5', 'event', 'Mười hai huynh đệ họ Bạch kết nghĩa Kim Lan tại Nhạn Môn Quan', 400 * 24, 'bg01'),
  ]

  return {
    org: {
      id: 'bach-gia',
      type: 'kimlan',
      name: 'Gia Tộc Họ Bạch',
      han: '白',
      server: GUILD.server,
      level: 1,
      motto: 'Nhị nhân đồng tâm, kỳ lợi đoạn kim',
      description: 'Mười hai huynh đệ tỷ muội họ Bạch kết nghĩa Kim Lan tại Nhạn Môn Quan — tóc bạc như tuyết, lòng son như mai.',
      capacity: 12,
      theme: 'bach-gia',
      features: null,
      isPublic: false,
    },
    data: { currentUserId: 'bg01', ...data },
  }
}

/* ------------------------------------------------------------------ */
/* Kinh Hồng Các + 3 người họ Bạch                                     */
/* ------------------------------------------------------------------ */

function guildSeed(now: number, bach: Member[]): OrgSeed {
  const data = generateSeed(now)
  const extra: [number, RankId, number, number][] = [
    [0, 'tinh-anh', 9200, 2600],
    [2, 'thanh-vien', 4100, 1800],
    [11, 'tan-binh', 600, 900],
  ]
  extra.forEach(([idx, rank, contribution, weekly], k) => {
    const b = bach[idx]
    data.members.push({
      ...b,
      id: `m${String(data.members.length + 1).padStart(3, '0')}`,
      rank,
      seat: undefined,
      honorific: undefined,
      honorificHan: undefined,
      contribution,
      weeklyContribution: weekly,
      joinedAt: isoAgo(now, (120 - k * 40) * DAY),
    })
  })
  return {
    org: {
      id: 'kinh-hong-cac',
      type: 'guild',
      name: GUILD.name,
      han: GUILD.han,
      server: GUILD.server,
      level: GUILD.level,
      motto: GUILD.motto,
      description: 'Bang hội đứng top 3 server Biện Kinh — đoàn kết, vui vẻ, chinh phạt mọi phó bản.',
      capacity: GUILD.capacity,
      theme: 'kinh-hong',
      features: null,
      isPublic: true,
    },
    data,
  }
}

/* ------------------------------------------------------------------ */
/* Thất Tinh Đội                                                       */
/* ------------------------------------------------------------------ */

function teamSeed(now: number, guild: Member[]): OrgSeed {
  const rng = createRng('that-tinh')
  const pick = ['m001', 'm005', 'm009', 'm014', 'm020', 'm027', 'm033']
  const data = emptyData()
  data.members = pick.map((gid, i) => {
    const g = guild.find((m) => m.id === gid)!
    return {
      ...g,
      id: `t${String(i + 1).padStart(2, '0')}`,
      characterId: `ch-${g.id}`,
      rank: i === 0 ? 'truong-nhom' : i === 1 ? 'pho-nhom' : 'thanh-vien',
      contribution: 0,
      weeklyContribution: 0,
      joinedAt: isoAgo(now, (60 - i * 5) * DAY),
    } as Member
  })
  const ids = data.members.map((m) => m.id)

  // tiến độ riêng của team: nhóm 7 người đi phó bản 5 người
  const progress: ProgressMap = {}
  for (const d of DUNGEONS) {
    progress[d.id] = {}
    for (const mode of ['thuong', 'anh-hung', 'ac-mong'] as DungeonMode[]) {
      const modeMap: Record<string, { kills: number; firstKill?: string; bestTimeSec?: number }> = {}
      d.bosses.forEach((b, bi) => {
        const done = d.id === 'lien-van-trai' && (mode !== 'ac-mong' || bi < 2)
        if (!done) return void (modeMap[b.id] = { kills: 0 })
        const kills = rng.int(1, 4)
        let best = Infinity
        let first = ''
        for (let k = 0; k < kills; k++) {
          const team = rng.shuffle(ids).slice(0, 5)
          const duration = 160 + bi * 25 + (mode === 'ac-mong' ? 90 : mode === 'anh-hung' ? 45 : 0) + rng.int(0, 90)
          const date = isoAgo(now, rng.int(1, 50) * DAY)
          best = Math.min(best, duration)
          if (!first || date < first) first = date
          data.clears.push({ id: `tc-${mode}-${b.id}-${k}`, dungeonId: d.id, mode, bossId: b.id, date, durationSec: duration, memberIds: team, mvpId: rng.pick(team), wipes: rng.int(0, 2) })
        }
        modeMap[b.id] = { kills, firstKill: first, bestTimeSec: best }
      })
      progress[d.id]![mode] = modeMap
    }
  }
  data.progress = progress
  data.clears.sort((a, b) => b.date.localeCompare(a.date))

  const weekStart = startOfWeek(new Date(now))
  const at = (day: number, h: number) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + day)
    d.setHours(h, 0, 0, 0)
    return d.toISOString()
  }
  data.events = [0, 7].flatMap((w, wi) => [
    {
      id: `tev${wi * 2 + 1}`,
      type: 'raid' as const,
      title: 'Liên Vân Trại · Ác Mộng (Thất Tinh)',
      start: at(w + 2, 22),
      durationMin: 60,
      location: 'Liên Vân Trại',
      leaderId: 't01',
      capacity: 5,
      note: 'Nhóm cố định tối thứ Tư — ai bận nhắn sớm để gọi dự bị.',
      rsvp: { t01: 'yes', t02: 'yes', t03: 'yes', t04: 'maybe' } as Record<string, RsvpStatus>,
    },
    {
      id: `tev${wi * 2 + 2}`,
      type: 'training' as const,
      title: 'Luyện cơ chế Thiết Bối Hùng Vương',
      start: at(w + 4, 21),
      durationMin: 45,
      location: 'Luyện Võ Trường',
      leaderId: 't02',
      capacity: 7,
      note: 'Tập né chiêu càn quét.',
      rsvp: { t02: 'yes', t05: 'yes', t06: 'yes' } as Record<string, RsvpStatus>,
    },
  ])
  data.teams = [{ id: 'tteam1', name: 'Thất Tinh · đội hình chính', dungeonId: 'lien-van-trai', slots: ['t04', 't03', 't01', 't02', 't05'], createdAt: isoAgo(now, 3 * DAY) }]
  data.announcements = [
    { id: 'tan1', title: 'Lịch cố định: tối thứ Tư 22:00', body: 'Thất Tinh Đội đi Liên Vân Trại Ác Mộng mỗi tuần. Mục tiêu tháng này: hạ Thiết Bối Hùng Vương.', authorId: 't01', date: isoAgo(now, 2 * DAY), pinned: true, tag: 'su-kien' },
  ]
  data.activities = [
    { id: 'tact1', type: 'clear', text: 'Thất Tinh Đội hạ Song Đao Quỷ Ảnh · Liên Vân Trại (Ác Mộng)', date: isoAgo(now, 30 * 3600000), memberId: 't01' },
    { id: 'tact2', type: 'event', text: 'Dạ Lăng Phong lập Thất Tinh Đội', date: isoAgo(now, 60 * DAY), memberId: 't01' },
  ]

  return {
    org: {
      id: 'that-tinh-doi',
      type: 'team',
      name: 'Thất Tinh Đội',
      han: '星',
      server: GUILD.server,
      level: 1,
      motto: 'Bảy ngôi sao, một đường chinh phạt',
      description: 'Nhóm cố định 7 người tách ra từ Kinh Hồng Các để đi phó bản 5 người mỗi tuần.',
      capacity: null,
      theme: 'thanh-ngoc',
      features: featuresOf('team', null),
      isPublic: false,
    },
    data: { currentUserId: 't01', ...data },
  }
}

/** Toàn bộ dữ liệu demo — thứ tự quan trọng: bang trước (nhân vật gốc), rồi Kim Lan, rồi team */
export function generateAllSeeds(now = Date.now()): OrgSeed[] {
  const bach = bachCharacters(now)
  const guild = guildSeed(now, bach)
  return [guild, bachSeed(now), teamSeed(now, guild.data.members)]
}

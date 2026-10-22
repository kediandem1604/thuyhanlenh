import { and, asc, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm'
import { DUNGEONS, MODE_IDS } from '@/domain/constants'
import { SLICES, SNAPSHOT_LIMITS, type GuildSnapshot, type Slice } from '@/domain/api'
import type {
  Activity,
  Announcement,
  Application,
  Bond,
  BondType,
  ClearRecord,
  DungeonMode,
  EventType,
  GuildEvent,
  LedgerEntry,
  LootItem,
  Member,
  MemberStatus,
  Mentorship,
  MentorshipStage,
  ProgressMap,
  RsvpStatus,
  TeamTemplate,
  WarRecord,
} from '@/domain/types'
import type { DbOrTx } from './db/client'
import * as s from './db/schema'
import { shiftWeekKey, weekStartAt, weekStartKey } from './lib/time'
import { kimlanHonorific, type Feature } from '@/domain/orgs'
import { loadOrg, orgHas, type OrgRow } from './orgs'

/*
 * Dựng ảnh chụp dữ liệu bang theo từng "slice" — cùng hình dạng với store cũ ở frontend.
 * Các giá trị tính ra: số dư & cống hiến tuần (từ sổ cái), lịch sử chiến lực (power_history),
 * tiến độ boss (từ clears), trạng thái trực tuyến (từ kết nối WebSocket).
 */

export interface SnapshotContext {
  /** id NHÂN VẬT đang mở WebSocket (ở bất kỳ tổ chức nào) */
  online: ReadonlySet<string>
  now?: Date
}

const iso = (v: Date | null | undefined) => (v ? v.toISOString() : undefined)

type Loader<K extends Slice> = (db: DbOrTx, guildId: string, ctx: SnapshotContext & { org: OrgRow | null }) => Promise<GuildSnapshot[K]>

type CharacterRow = typeof s.characters.$inferSelect

export const memberRowToDomain = (
  r: typeof s.members.$inferSelect,
  c: CharacterRow,
  extra: { balance: number; weekly: number; history: number[]; online: boolean; claimed: boolean; honorific?: { name: string; han: string } },
): Member => ({
  id: r.id,
  characterId: c.id,
  name: c.name,
  classId: c.classId as Member['classId'],
  rank: r.rank as Member['rank'],
  seat: r.seat ?? undefined,
  honorific: extra.honorific?.name,
  honorificHan: extra.honorific?.han,
  level: c.level,
  power: c.power,
  contribution: extra.balance,
  weeklyContribution: extra.weekly,
  activity: r.activity,
  status: (c.userId ? (extra.online ? 'online' : 'offline') : r.status) as MemberStatus,
  joinedAt: r.joinedAt.toISOString(),
  lastOnline: (extra.online ? new Date() : r.lastOnline).toISOString(),
  title: c.title,
  bio: c.bio,
  look: c.look,
  stats: c.stats,
  achievements: c.achievements,
  pvp: c.pvp,
  powerHistory: extra.history,
  claimed: extra.claimed,
})

const loadMembers: Loader<'members'> = async (db, guildId, ctx) => {
  const now = ctx.now ?? new Date()
  const rows = await db
    .select({ m: s.members, c: s.characters, isDev: s.users.isDev })
    .from(s.members)
    .innerJoin(s.characters, eq(s.members.characterId, s.characters.id))
    .leftJoin(s.users, eq(s.characters.userId, s.users.id))
    .where(and(eq(s.members.guildId, guildId), isNull(s.members.deletedAt)))
    .orderBy(asc(s.members.seat), asc(s.members.joinedAt))
  if (!rows.length) return []
  const weekStart = weekStartAt(now)
  const sums = await db
    .select({
      memberId: s.ledgerEntries.memberId,
      balance: sql<number>`coalesce(sum(${s.ledgerEntries.delta}), 0)::int`,
      weekly: sql<number>`coalesce(sum(case when ${s.ledgerEntries.delta} > 0 and ${s.ledgerEntries.date} >= ${weekStart} then ${s.ledgerEntries.delta} else 0 end), 0)::int`,
    })
    .from(s.ledgerEntries)
    .where(eq(s.ledgerEntries.guildId, guildId))
    .groupBy(s.ledgerEntries.memberId)
  const sumMap = new Map(sums.map((x) => [x.memberId, x]))

  const thisWeek = weekStartKey(now)
  const fromWeek = shiftWeekKey(thisWeek, -7)
  const snaps = await db
    .select()
    .from(s.powerHistory)
    .where(and(inArray(s.powerHistory.characterId, rows.map((r) => r.c.id)), gte(s.powerHistory.weekStart, fromWeek)))
  const snapMap = new Map<string, Map<string, number>>()
  snaps.forEach((p) => {
    const m = snapMap.get(p.characterId) ?? new Map<string, number>()
    m.set(p.weekStart, p.power)
    snapMap.set(p.characterId, m)
  })

  const isKimlan = ctx.org?.type === 'kimlan'
  const total = rows.length
  const weekKeys = Array.from({ length: 8 }, (_, i) => shiftWeekKey(thisWeek, i - 7))
  return rows.map(({ m, c, isDev }) => {
    const weeks = snapMap.get(c.id)
    // lấp tuần thiếu: tiến theo giá trị gần nhất, các tuần trước khi có dữ liệu lấy giá trị sớm nhất
    let last: number | undefined
    const filled = weekKeys.map((k) => {
      const v = weeks?.get(k)
      if (v !== undefined) last = v
      return last
    })
    const earliest = filled.find((v) => v !== undefined) ?? c.power
    const history = filled.map((v) => v ?? earliest)
    history[7] = c.power
    const sum = sumMap.get(m.id)
    return memberRowToDomain(m, c, {
      balance: sum?.balance ?? 0,
      weekly: sum?.weekly ?? 0,
      history,
      online: ctx.online.has(c.id),
      claimed: !!c.userId && isDev === false,
      honorific: isKimlan && m.seat ? kimlanHonorific(m.seat, c.look.gender, total) : undefined,
    })
  })
}

const loadMentorships: Loader<'mentorships'> = async (db, guildId) => {
  const rows = await db.select().from(s.mentorships).where(eq(s.mentorships.guildId, guildId)).orderBy(desc(s.mentorships.startedAt))
  return rows.map(
    (r): Mentorship => ({
      id: r.id,
      masterId: r.masterId,
      discipleId: r.discipleId,
      stage: r.stage as MentorshipStage,
      status: r.status as Mentorship['status'],
      startedAt: r.startedAt.toISOString(),
      graduatedAt: iso(r.graduatedAt),
      bond: r.bond,
      tasks: r.tasks,
    }),
  )
}

const loadBonds: Loader<'bonds'> = async (db, guildId) => {
  const rows = await db.select().from(s.bonds).where(eq(s.bonds.guildId, guildId)).orderBy(desc(s.bonds.intimacy))
  return rows.map((r): Bond => ({ id: r.id, aId: r.aId, bId: r.bId, type: r.type as BondType, since: r.since.toISOString(), intimacy: r.intimacy, note: r.note }))
}

const loadProgress: Loader<'progress'> = async (db, guildId) => {
  const agg = await db
    .select({
      dungeonId: s.clears.dungeonId,
      mode: s.clears.mode,
      bossId: s.clears.bossId,
      kills: sql<number>`count(*)::int`,
      firstKill: sql<Date>`min(${s.clears.date})`,
      best: sql<number>`min(${s.clears.durationSec})::int`,
    })
    .from(s.clears)
    .where(eq(s.clears.guildId, guildId))
    .groupBy(s.clears.dungeonId, s.clears.mode, s.clears.bossId)
  const key = (dg: string, m: string, b: string) => `${dg}|${m}|${b}`
  const map = new Map(agg.map((a) => [key(a.dungeonId, a.mode, a.bossId), a]))
  const progress: ProgressMap = {}
  for (const dg of DUNGEONS) {
    progress[dg.id] = {}
    for (const mode of MODE_IDS) {
      const modeMap: Record<string, { kills: number; firstKill?: string; bestTimeSec?: number }> = {}
      for (const b of dg.bosses) {
        const a = map.get(key(dg.id, mode, b.id))
        modeMap[b.id] = a ? { kills: a.kills, firstKill: new Date(a.firstKill).toISOString(), bestTimeSec: a.best } : { kills: 0 }
      }
      progress[dg.id]![mode as DungeonMode] = modeMap
    }
  }
  return progress
}

const loadClears: Loader<'clears'> = async (db, guildId) => {
  const rows = await db.select().from(s.clears).where(eq(s.clears.guildId, guildId)).orderBy(desc(s.clears.date)).limit(SNAPSHOT_LIMITS.clears)
  return rows.map(
    (r): ClearRecord => ({
      id: r.id,
      dungeonId: r.dungeonId,
      mode: r.mode as DungeonMode,
      bossId: r.bossId,
      date: r.date.toISOString(),
      durationSec: r.durationSec,
      memberIds: r.memberIds,
      mvpId: r.mvpId,
      wipes: r.wipes,
    }),
  )
}

const loadEvents: Loader<'events'> = async (db, guildId) => {
  const rows = await db.select().from(s.events).where(eq(s.events.guildId, guildId)).orderBy(asc(s.events.start))
  if (!rows.length) return []
  const rsvps = await db.select().from(s.eventRsvps).where(inArray(s.eventRsvps.eventId, rows.map((r) => r.id)))
  const byEvent = new Map<string, Record<string, RsvpStatus>>()
  rsvps.forEach((r) => {
    const m = byEvent.get(r.eventId) ?? {}
    m[r.memberId] = r.status as RsvpStatus
    byEvent.set(r.eventId, m)
  })
  return rows.map(
    (r): GuildEvent => ({
      id: r.id,
      type: r.type as EventType,
      title: r.title,
      start: r.start.toISOString(),
      durationMin: r.durationMin,
      location: r.location,
      leaderId: r.leaderId,
      capacity: r.capacity,
      note: r.note,
      rsvp: byEvent.get(r.id) ?? {},
    }),
  )
}

const loadWars: Loader<'wars'> = async (db, guildId) => {
  const rows = await db.select().from(s.wars).where(eq(s.wars.guildId, guildId)).orderBy(desc(s.wars.date))
  return rows.map(
    (r): WarRecord => ({
      id: r.id,
      date: r.date.toISOString(),
      opponent: r.opponent,
      result: r.result as WarRecord['result'],
      score: r.score,
      mvpId: r.mvpId,
      mode: r.mode as WarRecord['mode'],
      lines: r.lines,
    }),
  )
}

const loadLedger: Loader<'ledger'> = async (db, guildId) => {
  const rows = await db
    .select()
    .from(s.ledgerEntries)
    .where(eq(s.ledgerEntries.guildId, guildId))
    .orderBy(desc(s.ledgerEntries.date))
    .limit(SNAPSHOT_LIMITS.ledger)
  return rows.map(
    (r): LedgerEntry => ({
      id: r.id,
      memberId: r.memberId,
      delta: r.delta,
      reason: r.reason,
      date: r.date.toISOString(),
      category: r.category as LedgerEntry['category'],
    }),
  )
}

const loadLoot: Loader<'loot'> = async (db, guildId) => {
  const rows = await db.select().from(s.lootItems).where(eq(s.lootItems.guildId, guildId)).orderBy(asc(s.lootItems.endsAt))
  if (!rows.length) return []
  const bids = await db
    .select()
    .from(s.lootBids)
    .where(inArray(s.lootBids.itemId, rows.map((r) => r.id)))
    .orderBy(asc(s.lootBids.at), asc(s.lootBids.amount))
  const byItem = new Map<string, LootItem['bids']>()
  bids.forEach((b) => {
    const list = byItem.get(b.itemId) ?? []
    list.push({ memberId: b.memberId, amount: b.amount, at: b.at.toISOString() })
    byItem.set(b.itemId, list)
  })
  return rows.map(
    (r): LootItem => ({
      id: r.id,
      name: r.name,
      rarity: r.rarity as LootItem['rarity'],
      source: r.source,
      kind: r.kind as LootItem['kind'],
      status: r.status as LootItem['status'],
      startPrice: r.startPrice,
      endsAt: r.endsAt.toISOString(),
      bids: byItem.get(r.id) ?? [],
      assignedTo: r.assignedTo ?? undefined,
      price: r.price ?? undefined,
    }),
  )
}

export const applicationRowToDomain = (r: typeof s.applications.$inferSelect): Application & { kind: 'join' | 'claim'; claimMemberId?: string; hasAccount: boolean } => ({
  id: r.id,
  name: r.name,
  classId: r.classId as Application['classId'],
  power: r.power,
  level: r.level,
  message: r.message,
  stage: r.stage as Application['stage'],
  appliedAt: r.appliedAt.toISOString(),
  referrerId: r.referrerId ?? undefined,
  look: r.look,
  kind: r.kind as 'join' | 'claim',
  claimMemberId: r.claimMemberId ?? undefined,
  hasAccount: !!r.userId,
})

const loadApplications: Loader<'applications'> = async (db, guildId) => {
  const rows = await db.select().from(s.applications).where(eq(s.applications.guildId, guildId)).orderBy(desc(s.applications.appliedAt))
  return rows.map(applicationRowToDomain)
}

const loadAnnouncements: Loader<'announcements'> = async (db, guildId) => {
  const rows = await db.select().from(s.announcements).where(eq(s.announcements.guildId, guildId)).orderBy(desc(s.announcements.date))
  return rows.map(
    (r): Announcement => ({
      id: r.id,
      title: r.title,
      body: r.body,
      authorId: r.authorId,
      date: r.date.toISOString(),
      pinned: r.pinned,
      tag: r.tag as Announcement['tag'],
    }),
  )
}

const loadActivities: Loader<'activities'> = async (db, guildId) => {
  const rows = await db
    .select()
    .from(s.activities)
    .where(eq(s.activities.guildId, guildId))
    .orderBy(desc(s.activities.date))
    .limit(SNAPSHOT_LIMITS.activities)
  return rows.map(
    (r): Activity => ({ id: r.id, type: r.type as Activity['type'], text: r.text, date: r.date.toISOString(), memberId: r.memberId ?? undefined }),
  )
}

const loadTeams: Loader<'teams'> = async (db, guildId) => {
  const rows = await db.select().from(s.teams).where(eq(s.teams.guildId, guildId)).orderBy(desc(s.teams.createdAt))
  return rows.map(
    (r): TeamTemplate => ({ id: r.id, name: r.name, dungeonId: r.dungeonId ?? undefined, slots: r.slots, createdAt: r.createdAt.toISOString() }),
  )
}

const LOADERS: { [K in Slice]: Loader<K> } = {
  members: loadMembers,
  mentorships: loadMentorships,
  bonds: loadBonds,
  progress: loadProgress,
  clears: loadClears,
  events: loadEvents,
  wars: loadWars,
  ledger: loadLedger,
  loot: loadLoot,
  applications: loadApplications,
  announcements: loadAnnouncements,
  activities: loadActivities,
  teams: loadTeams,
}

/** slice thuộc chức năng nào — chức năng tắt thì slice trả rỗng */
const SLICE_FEATURE: Partial<Record<Slice, Feature>> = {
  mentorships: 'su-do',
  bonds: 'tinh-duyen',
  applications: 'chieu-mo',
  progress: 'pho-ban',
  clears: 'pho-ban',
  teams: 'bay-tran',
  wars: 'bang-chien',
  events: 'lich',
  ledger: 'bang-kho',
  loot: 'bang-kho',
}

const EMPTY_SLICE: { [K in Slice]: GuildSnapshot[K] } = {
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

export async function buildSnapshot(db: DbOrTx, guildId: string, slices: readonly Slice[] = SLICES, ctx: SnapshotContext): Promise<Partial<GuildSnapshot>> {
  const unique = [...new Set(slices)]
  const org = await loadOrg(db, guildId)
  const full = { ...ctx, org }
  const entries = await Promise.all(
    unique.map(async (k) => {
      const f = SLICE_FEATURE[k]
      if (f && org && !orgHas(org, f)) return [k, EMPTY_SLICE[k]] as const
      return [k, await (LOADERS[k] as Loader<typeof k>)(db, guildId, full)] as const
    }),
  )
  return Object.fromEntries(entries) as Partial<GuildSnapshot>
}

export function parseSlices(q: unknown): Slice[] {
  if (typeof q !== 'string' || !q.trim()) return [...SLICES]
  const wanted = q.split(',').map((x) => x.trim())
  return SLICES.filter((k) => wanted.includes(k))
}

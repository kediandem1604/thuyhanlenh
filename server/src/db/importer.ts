import { isNotNull, sql } from 'drizzle-orm'
import { DUNGEONS, GUILD } from '@/domain/constants'
import { featuresOf, hasFeature } from '@/domain/orgs'
import type { ClearRecord, Member } from '@/domain/types'
import type { SeedData } from '@/data/seed'
import { generateAllSeeds, type OrgSeed, type OrgSeedInfo } from '@/data/seedOrgs'
import { createRng, type Rng } from '@/lib/utils'
import { newId } from '../lib/ids'
import { shiftWeekKey, weekStartAt, weekStartKey } from '../lib/time'
import type { Db, Tx } from './client'
import * as s from './schema'

/*
 * Nạp dữ liệu (bộ demo nhiều tổ chức, hoặc file "Xuất JSON" của bản demo cũ) vào PostgreSQL.
 * - Nhân vật dùng chung: Member.characterId (mặc định 'ch-<id>') → một dòng characters, nhiều dòng members.
 * - Server TÍNH số dư cống hiến (SUM ledger) và tiến độ boss (từ clears), nên importer bổ sung bút toán
 *   "số dư đầu kỳ" và lượt clear lịch sử để số liệu khớp bản gốc.
 */

const DATA_TABLES = [
  'audit_log',
  'idempotency_keys',
  'org_invites',
  'activities',
  'announcements',
  'teams',
  'applications',
  'loot_bids',
  'loot_items',
  'ledger_entries',
  'wars',
  'event_rsvps',
  'events',
  'clears',
  'bonds',
  'mentorships',
  'members',
  'power_history',
  'characters',
  'guilds',
]

const d = (iso: string) => new Date(iso)

function chunk<T>(arr: T[], size = 500): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export interface ImportSummary {
  orgs: number
  members: number
  characters: number
  clears: number
  ledger: number
  events: number
}

interface ImportCtx {
  now: Date
  rng: Rng
  /** characterId → userId giữ lại khi nạp lại */
  links: Map<string, string>
  insertedChars: Set<string>
  summary: ImportSummary
}

export const characterIdOf = (m: Pick<Member, 'id' | 'characterId'>) => m.characterId ?? `ch-${m.id}`

/** Nạp một danh sách tổ chức. `reset` xóa sạch dữ liệu cũ (giữ tài khoản + liên kết nhân vật). */
export async function importOrgs(db: Db, seeds: OrgSeed[], opts: { reset?: boolean; now?: Date } = {}): Promise<ImportSummary> {
  return db.transaction(async (tx) => {
    const links = new Map<string, string>()
    if (opts.reset) {
      const rows = await tx.select({ id: s.characters.id, userId: s.characters.userId }).from(s.characters).where(isNotNull(s.characters.userId))
      rows.forEach((r) => r.userId && links.set(r.id, r.userId))
      await tx.execute(sql.raw(`TRUNCATE TABLE ${DATA_TABLES.join(', ')} CASCADE`))
    }
    const ctx: ImportCtx = {
      now: opts.now ?? new Date(),
      rng: createRng('import-orgs'),
      links,
      insertedChars: new Set(),
      summary: { orgs: 0, members: 0, characters: 0, clears: 0, ledger: 0, events: 0 },
    }
    for (const seed of seeds) await importOrgTx(tx, seed, ctx)
    return ctx.summary
  })
}

/** Tương thích: nạp một SeedData (bản demo cũ chỉ có một bang) làm bang mặc định, xóa dữ liệu cũ. */
export async function importSeedData(db: Db, guildId: string, data: SeedData, opts: { reset?: boolean; now?: Date } = {}) {
  return importOrgs(db, [{ org: defaultGuildInfo(guildId), data }], opts)
}

export function defaultGuildInfo(id: string): OrgSeedInfo {
  return {
    id,
    type: 'guild',
    name: GUILD.name,
    han: GUILD.han,
    server: GUILD.server,
    level: GUILD.level,
    motto: GUILD.motto,
    description: '',
    capacity: GUILD.capacity,
    theme: 'kinh-hong',
    features: null,
    isPublic: true,
  }
}

async function importOrgTx(tx: Tx, seed: OrgSeed, ctx: ImportCtx) {
  const { org, data } = seed
  const guildId = org.id
  const { now, rng } = ctx
  const features = org.type === 'team' ? (org.features ?? featuresOf('team', null)) : null

  await tx
    .insert(s.guilds)
    .values({
      id: guildId,
      type: org.type,
      name: org.name,
      han: org.han,
      server: org.server,
      level: org.level,
      motto: org.motto,
      description: org.description,
      capacity: org.capacity,
      theme: org.theme,
      features,
      isPublic: org.isPublic,
    })
    .onConflictDoNothing()
  ctx.summary.orgs++

  /* ---------- Nhân vật (dùng chung) + tư cách thành viên ---------- */
  const thisWeek = weekStartKey(now)
  const newChars = data.members.filter((m) => !ctx.insertedChars.has(characterIdOf(m)))
  const seen = new Set<string>()
  const charRows = newChars
    .filter((m) => {
      const id = characterIdOf(m)
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
    .map((m) => ({
      id: characterIdOf(m),
      userId: ctx.links.get(characterIdOf(m)) ?? null,
      name: m.name,
      classId: m.classId,
      level: m.level,
      power: m.power,
      title: m.title,
      bio: m.bio,
      look: m.look,
      stats: m.stats,
      achievements: m.achievements,
      pvp: m.pvp,
      createdAt: d(m.joinedAt),
    }))
  for (const part of chunk(charRows)) await tx.insert(s.characters).values(part)
  const history = charRows.flatMap((c) => {
    const m = newChars.find((x) => characterIdOf(x) === c.id)!
    const hist = m.powerHistory?.length ? m.powerHistory : [m.power]
    return hist.map((power, i) => ({ characterId: c.id, weekStart: shiftWeekKey(thisWeek, i - (hist.length - 1)), power }))
  })
  for (const part of chunk(history)) await tx.insert(s.powerHistory).values(part)
  charRows.forEach((c) => ctx.insertedChars.add(c.id))
  ctx.summary.characters += charRows.length

  if (data.members.length)
    await tx.insert(s.members).values(
      data.members.map((m) => ({
        id: m.id,
        guildId,
        characterId: characterIdOf(m),
        rank: m.rank,
        seat: org.type === 'kimlan' ? (m.seat ?? null) : null,
        activity: m.activity,
        status: m.status,
        joinedAt: d(m.joinedAt),
        lastOnline: d(m.lastOnline),
      })),
    )
  ctx.summary.members += data.members.length

  /* ---------- Sư đồ, tình duyên ---------- */
  if (data.mentorships.length)
    await tx.insert(s.mentorships).values(
      data.mentorships.map((ms) => ({
        id: ms.id,
        guildId,
        masterId: ms.masterId,
        discipleId: ms.discipleId,
        stage: ms.stage,
        status: ms.status,
        startedAt: d(ms.startedAt),
        graduatedAt: ms.graduatedAt ? d(ms.graduatedAt) : null,
        bond: ms.bond,
        tasks: ms.tasks,
      })),
    )
  if (data.bonds.length)
    await tx.insert(s.bonds).values(
      data.bonds.map((b) => ({ id: b.id, guildId, aId: b.aId, bId: b.bId, type: b.type, since: d(b.since), intimacy: b.intimacy, note: b.note })),
    )

  /* ---------- Phó bản: bổ sung lượt clear lịch sử cho khớp tiến độ ---------- */
  const allClears: ClearRecord[] = [...data.clears]
  const memberIds = data.members.map((m) => m.id)
  for (const dg of DUNGEONS) {
    for (const mode of dg.modes) {
      for (const boss of dg.bosses) {
        const p = data.progress[dg.id]?.[mode]?.[boss.id]
        if (!p || p.kills <= 0 || !memberIds.length) continue
        const existing = allClears.filter((c) => c.dungeonId === dg.id && c.mode === mode && c.bossId === boss.id)
        const missing = p.kills - existing.length
        const first = p.firstKill ? d(p.firstKill) : new Date(now.getTime() - 30 * 86400000)
        const best = p.bestTimeSec ?? 300
        if (missing <= 0) {
          // đủ số lượt: chỉnh bản ghi sớm nhất = first kill, nhanh nhất = kỷ lục
          const sorted = [...existing].sort((a, b) => a.date.localeCompare(b.date))
          if (sorted[0]) sorted[0].date = first.toISOString()
          const fastest = [...existing].sort((a, b) => a.durationSec - b.durationSec)[0]
          if (fastest) fastest.durationSec = best
          continue
        }
        const oldest = existing.length ? Math.min(...existing.map((c) => d(c.date).getTime())) : now.getTime()
        const span = Math.max(oldest - first.getTime(), 3600000)
        const bestIdx = rng.int(0, missing - 1)
        for (let i = 0; i < missing; i++) {
          const team = rng.shuffle(memberIds).slice(0, Math.min(dg.size, memberIds.length))
          allClears.push({
            id: `c-hist-${guildId}-${dg.id}-${mode}-${boss.id}-${i}`,
            dungeonId: dg.id,
            mode,
            bossId: boss.id,
            date: new Date(first.getTime() + (span * i) / missing).toISOString(),
            durationSec: i === bestIdx ? best : best + rng.int(5, 170),
            memberIds: team,
            mvpId: rng.pick(team),
            wipes: mode === 'anh-hung' ? rng.int(0, 5) : rng.int(0, 2),
          })
        }
      }
    }
  }
  for (const part of chunk(allClears, 400))
    await tx.insert(s.clears).values(
      part.map((c) => ({
        id: c.id,
        guildId,
        dungeonId: c.dungeonId,
        mode: c.mode,
        bossId: c.bossId,
        date: d(c.date),
        durationSec: c.durationSec,
        memberIds: c.memberIds,
        mvpId: c.mvpId,
        wipes: c.wipes,
      })),
    )
  ctx.summary.clears += allClears.length

  /* ---------- Sự kiện + điểm danh ---------- */
  if (data.events.length) {
    await tx.insert(s.events).values(
      data.events.map((e) => ({
        id: e.id,
        guildId,
        type: e.type,
        title: e.title,
        start: d(e.start),
        durationMin: e.durationMin,
        location: e.location,
        leaderId: e.leaderId,
        capacity: e.capacity,
        note: e.note,
      })),
    )
    const known = new Set(memberIds)
    const rsvps = data.events.flatMap((e) =>
      Object.entries(e.rsvp)
        .filter(([mid]) => known.has(mid))
        .map(([memberId, status]) => ({ eventId: e.id, memberId, status })),
    )
    for (const part of chunk(rsvps)) await tx.insert(s.eventRsvps).values(part)
    ctx.summary.events += data.events.length
  }

  /* ---------- Bang chiến ---------- */
  if (data.wars.length)
    await tx.insert(s.wars).values(
      data.wars.map((w) => ({ id: w.id, guildId, date: d(w.date), opponent: w.opponent, result: w.result, score: w.score, mvpId: w.mvpId, mode: w.mode, lines: w.lines })),
    )

  /* ---------- Sổ cống hiến (chỉ tổ chức có quỹ): bút toán gốc + số dư đầu kỳ + cống hiến tuần ---------- */
  if (hasFeature(org.type, features, 'bang-kho')) {
    const weekStart = weekStartAt(now)
    const ledgerRows = data.ledger
      .filter((l) => l.delta !== 0)
      .map((l) => ({ id: l.id, guildId, memberId: l.memberId, delta: l.delta, reason: l.reason, category: l.category, date: d(l.date) }))
    const byMember = new Map<string, { sum: number; weekly: number }>()
    for (const l of ledgerRows) {
      const agg = byMember.get(l.memberId) ?? { sum: 0, weekly: 0 }
      agg.sum += l.delta
      if (l.delta > 0 && l.date >= weekStart) agg.weekly += l.delta
      byMember.set(l.memberId, agg)
    }
    const sinceWeek = Math.max(now.getTime() - weekStart.getTime(), 120000)
    data.members.forEach((m: Member) => {
      const agg = byMember.get(m.id) ?? { sum: 0, weekly: 0 }
      const weeklyExtra = Math.max(0, (m.weeklyContribution ?? 0) - agg.weekly)
      if (weeklyExtra > 0)
        ledgerRows.push({
          id: newId('l'),
          guildId,
          memberId: m.id,
          delta: weeklyExtra,
          reason: 'Hoạt động bang trong tuần',
          category: 'nhiem-vu',
          date: new Date(weekStart.getTime() + rng.float(0.05, 0.95) * sinceWeek),
        })
      const opening = (m.contribution ?? 0) - agg.sum - weeklyExtra
      if (opening !== 0)
        ledgerRows.push({
          id: newId('l'),
          guildId,
          memberId: m.id,
          delta: opening,
          reason: 'Số dư đầu kỳ (chuyển từ bản demo)',
          category: 'dieu-chinh',
          date: d(m.joinedAt),
        })
    })
    for (const part of chunk(ledgerRows)) await tx.insert(s.ledgerEntries).values(part)
    ctx.summary.ledger += ledgerRows.length
  }

  /* ---------- Bang khố ---------- */
  if (data.loot.length) {
    await tx.insert(s.lootItems).values(
      data.loot.map((l) => ({
        id: l.id,
        guildId,
        name: l.name,
        rarity: l.rarity,
        source: l.source,
        kind: l.kind,
        status: l.status,
        startPrice: l.startPrice,
        endsAt: d(l.endsAt),
        assignedTo: l.assignedTo ?? null,
        price: l.price ?? null,
      })),
    )
    const bids = data.loot.flatMap((l) => l.bids.map((b) => ({ id: newId('bid'), itemId: l.id, memberId: b.memberId, amount: b.amount, at: d(b.at) })))
    if (bids.length) await tx.insert(s.lootBids).values(bids)
  }

  /* ---------- Chiêu mộ, bảng tin, nhật ký, đội hình ---------- */
  if (data.applications.length)
    await tx.insert(s.applications).values(
      data.applications.map((a) => ({
        id: a.id,
        guildId,
        kind: 'join',
        name: a.name,
        classId: a.classId,
        power: a.power,
        level: a.level,
        message: a.message,
        stage: a.stage,
        appliedAt: d(a.appliedAt),
        referrerId: a.referrerId ?? null,
        look: a.look,
      })),
    )
  if (data.announcements.length)
    await tx.insert(s.announcements).values(
      data.announcements.map((a) => ({ id: a.id, guildId, title: a.title, body: a.body, authorId: a.authorId, date: d(a.date), pinned: a.pinned, tag: a.tag })),
    )
  if (data.activities.length)
    await tx.insert(s.activities).values(
      data.activities.map((a) => ({ id: a.id, guildId, type: a.type, text: a.text, date: d(a.date), memberId: a.memberId ?? null })),
    )
  if (data.teams.length)
    await tx.insert(s.teams).values(
      data.teams.map((t) => ({ id: t.id, guildId, name: t.name, dungeonId: t.dungeonId ?? null, slots: t.slots, createdAt: d(t.createdAt) })),
    )
}

/**
 * Lần chạy đầu: CSDL chưa có tổ chức nào →
 * - SEED_DEMO: nạp bộ demo (Kinh Hồng Các · Gia Tộc Họ Bạch · Thất Tinh Đội)
 * - ngược lại: tạo bang mặc định trống (người Discord đầu tiên sẽ khai bang)
 */
export async function ensureGuild(db: Db, guildId: string, seedDemo: boolean) {
  const existing = await db.select({ id: s.guilds.id }).from(s.guilds).limit(1)
  if (existing.length) return { created: false as const }
  if (seedDemo) {
    const summary = await importOrgs(db, generateAllSeeds())
    return { created: true as const, seeded: summary }
  }
  const info = defaultGuildInfo(guildId)
  await db.insert(s.guilds).values({ ...info, features: null })
  return { created: true as const }
}

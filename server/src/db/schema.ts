import { sql } from 'drizzle-orm'
import { boolean, check, date, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import type { ChibiLook, Member, MemberStats, MentorTask, TeamTemplate, WarLine } from '@/domain/types'

/*
 * Lược đồ PostgreSQL của Thủy Hàn Lệnh (giai đoạn 2–3).
 * - "guilds" = tổ chức (bang hội / Kim Lan / team); cột guild_id ở mọi bảng = id tổ chức.
 * - characters = nhân vật dùng chung; members = tư cách thành viên của nhân vật trong một tổ chức.
 * - Thời gian: timestamptz, đọc ra Date → snapshot đổi sang ISO string cho frontend.
 * - Số dư cống hiến KHÔNG lưu cứng: = SUM(ledger_entries.delta). Sổ cái chỉ ghi thêm (trigger trong migration).
 * - Tiến độ boss KHÔNG lưu cứng: tính từ bảng clears.
 */

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })

const RANKS = `'bang-chu','pho-bang-chu','truong-lao','duong-chu','tinh-anh','thanh-vien','tan-binh','dai-ca','huynh-de','truong-nhom','pho-nhom'`
const CLASSES = `'to-van','cuu-linh','than-tuong','thiet-y','huyet-ha','toai-mong','long-ngam'`

/** Tổ chức: Bang Hội ('guild') · Kim Lan ('kimlan', ≤ 12 người) · Team tự tạo ('team'). Tên bảng giữ "guilds". */
export const guilds = pgTable(
  'guilds',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull().default('guild'),
    name: text('name').notNull(),
    han: text('han').notNull(),
    server: text('server').notNull(),
    level: integer('level').notNull().default(1),
    motto: text('motto').notNull().default(''),
    description: text('description').notNull().default(''),
    /** null = không giới hạn (team) */
    capacity: integer('capacity').default(80),
    theme: text('theme').notNull().default('kinh-hong'),
    /** chức năng bật (chỉ team dùng; loại khác cố định theo loại) */
    features: jsonb('features').$type<string[]>(),
    isPublic: boolean('is_public').notNull().default(false),
    createdBy: text('created_by'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [check('guilds_type_ck', sql`${t.type} in ('guild','kimlan','team')`)],
)

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  discordId: text('discord_id').unique(),
  username: text('username').notNull(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  isDev: boolean('is_dev').notNull().default(false),
  createdAt: ts('created_at').notNull().defaultNow(),
  lastLoginAt: ts('last_login_at'),
})

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    tokenHash: text('token_hash').notNull().unique(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: ts('created_at').notNull().defaultNow(),
    expiresAt: ts('expires_at').notNull(),
    userAgent: text('user_agent'),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
)

/** Nhân vật trong game — dùng chung ở mọi tổ chức (giai đoạn 3) */
export const characters = pgTable(
  'characters',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    classId: text('class_id').notNull(),
    level: integer('level').notNull(),
    power: integer('power').notNull(),
    title: text('title').notNull().default(''),
    bio: text('bio').notNull().default(''),
    look: jsonb('look').$type<ChibiLook>().notNull(),
    stats: jsonb('stats').$type<MemberStats>().notNull(),
    achievements: jsonb('achievements').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    pvp: jsonb('pvp').$type<Member['pvp']>().notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('characters_user_uq').on(t.userId),
    check('characters_class_ck', sql.raw(`class_id in (${CLASSES})`)),
    check('characters_level_ck', sql`${t.level} between 1 and 100`),
    check('characters_power_ck', sql`${t.power} >= 0`),
  ],
)

/** Tư cách thành viên của một nhân vật trong một tổ chức (chức vụ, ghế Kim Lan, ngày vào…) */
export const members = pgTable(
  'members',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id),
    characterId: text('character_id')
      .notNull()
      .references(() => characters.id),
    rank: text('rank').notNull(),
    /** Kim Lan: ghế thứ bậc 1–12 */
    seat: integer('seat'),
    activity: integer('activity').notNull().default(50),
    status: text('status').notNull().default('offline'),
    joinedAt: ts('joined_at').notNull(),
    lastOnline: ts('last_online').notNull(),
    deletedAt: ts('deleted_at'),
  },
  (t) => [
    uniqueIndex('members_org_character_uq').on(t.guildId, t.characterId).where(sql`${t.deletedAt} is null`),
    index('members_guild_idx').on(t.guildId),
    index('members_character_idx').on(t.characterId),
    check('members_rank_ck', sql.raw(`rank in (${RANKS})`)),
    check('members_seat_ck', sql`${t.seat} is null or ${t.seat} between 1 and 12`),
  ],
)

/** Chiến lực theo tuần của nhân vật (thay power_snapshots) */
export const powerHistory = pgTable(
  'power_history',
  {
    characterId: text('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    weekStart: date('week_start', { mode: 'string' }).notNull(),
    power: integer('power').notNull(),
  },
  (t) => [primaryKey({ columns: [t.characterId, t.weekStart] })],
)

/** Link mời vào tổ chức: 'join' (vào làm thành viên) hoặc 'claim' (nhận một nhân vật chưa có chủ) */
export const orgInvites = pgTable(
  'org_invites',
  {
    code: text('code').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull().default('join'),
    memberId: text('member_id'),
    createdBy: text('created_by'),
    createdAt: ts('created_at').notNull().defaultNow(),
    expiresAt: ts('expires_at'),
    maxUses: integer('max_uses'),
    uses: integer('uses').notNull().default(0),
    revokedAt: ts('revoked_at'),
  },
  (t) => [index('invites_guild_idx').on(t.guildId), check('invites_kind_ck', sql`${t.kind} in ('join','claim')`)],
)

export const mentorships = pgTable(
  'mentorships',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id),
    masterId: text('master_id')
      .notNull()
      .references(() => members.id),
    discipleId: text('disciple_id')
      .notNull()
      .references(() => members.id),
    stage: integer('stage').notNull().default(0),
    status: text('status').notNull().default('active'),
    startedAt: ts('started_at').notNull(),
    graduatedAt: ts('graduated_at'),
    bond: integer('bond').notNull().default(0),
    tasks: jsonb('tasks').$type<MentorTask[]>().notNull(),
  },
  (t) => [
    uniqueIndex('mentorships_active_disciple_uq').on(t.discipleId).where(sql`${t.status} = 'active'`),
    index('mentorships_guild_idx').on(t.guildId),
    check('mentorships_stage_ck', sql`${t.stage} between 0 and 4`),
    check('mentorships_self_ck', sql`${t.masterId} <> ${t.discipleId}`),
  ],
)

export const bonds = pgTable(
  'bonds',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id),
    aId: text('a_id')
      .notNull()
      .references(() => members.id),
    bId: text('b_id')
      .notNull()
      .references(() => members.id),
    type: text('type').notNull(),
    since: ts('since').notNull(),
    intimacy: integer('intimacy').notNull().default(0),
    note: text('note').notNull().default(''),
  },
  (t) => [index('bonds_guild_idx').on(t.guildId), check('bonds_self_ck', sql`${t.aId} <> ${t.bId}`)],
)

export const clears = pgTable(
  'clears',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id),
    dungeonId: text('dungeon_id').notNull(),
    mode: text('mode').notNull(),
    bossId: text('boss_id').notNull(),
    date: ts('date').notNull(),
    durationSec: integer('duration_sec').notNull(),
    memberIds: jsonb('member_ids').$type<string[]>().notNull(),
    mvpId: text('mvp_id').notNull(),
    wipes: integer('wipes').notNull().default(0),
    createdBy: text('created_by'),
  },
  (t) => [
    index('clears_boss_idx').on(t.guildId, t.dungeonId, t.mode, t.bossId),
    index('clears_date_idx').on(t.guildId, t.date),
    check('clears_duration_ck', sql`${t.durationSec} > 0`),
  ],
)

export const events = pgTable(
  'events',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id),
    type: text('type').notNull(),
    title: text('title').notNull(),
    start: ts('start').notNull(),
    durationMin: integer('duration_min').notNull(),
    location: text('location').notNull().default(''),
    leaderId: text('leader_id').notNull(),
    capacity: integer('capacity').notNull(),
    note: text('note').notNull().default(''),
    createdBy: text('created_by'),
  },
  (t) => [index('events_start_idx').on(t.guildId, t.start)],
)

export const eventRsvps = pgTable(
  'event_rsvps',
  {
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    memberId: text('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.memberId] }), check('rsvp_status_ck', sql`${t.status} in ('yes','maybe','no')`)],
)

export const wars = pgTable(
  'wars',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id),
    date: ts('date').notNull(),
    opponent: text('opponent').notNull(),
    result: text('result').notNull(),
    score: jsonb('score').$type<[number, number]>().notNull(),
    mvpId: text('mvp_id').notNull(),
    mode: text('mode').notNull(),
    lines: jsonb('lines').$type<WarLine[]>().notNull(),
    createdBy: text('created_by'),
  },
  (t) => [index('wars_date_idx').on(t.guildId, t.date)],
)

export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id),
    memberId: text('member_id')
      .notNull()
      .references(() => members.id),
    delta: integer('delta').notNull(),
    reason: text('reason').notNull(),
    category: text('category').notNull(),
    date: ts('date').notNull().defaultNow(),
    createdBy: text('created_by'),
  },
  (t) => [
    index('ledger_member_idx').on(t.memberId),
    index('ledger_date_idx').on(t.guildId, t.date),
    check('ledger_category_ck', sql`${t.category} in ('pho-ban','bang-chien','quyen-gop','nhiem-vu','dau-gia','dieu-chinh')`),
    check('ledger_delta_ck', sql`${t.delta} <> 0`),
  ],
)

export const lootItems = pgTable(
  'loot_items',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id),
    name: text('name').notNull(),
    rarity: text('rarity').notNull(),
    source: text('source').notNull(),
    kind: text('kind').notNull(),
    status: text('status').notNull().default('auction'),
    startPrice: integer('start_price').notNull(),
    endsAt: ts('ends_at').notNull(),
    assignedTo: text('assigned_to'),
    price: integer('price'),
    createdBy: text('created_by'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('loot_guild_idx').on(t.guildId, t.status), check('loot_price_ck', sql`${t.startPrice} > 0`)],
)

export const lootBids = pgTable(
  'loot_bids',
  {
    id: text('id').primaryKey(),
    itemId: text('item_id')
      .notNull()
      .references(() => lootItems.id, { onDelete: 'cascade' }),
    memberId: text('member_id')
      .notNull()
      .references(() => members.id),
    amount: integer('amount').notNull(),
    at: ts('at').notNull().defaultNow(),
  },
  (t) => [index('bids_item_idx').on(t.itemId)],
)

export const applications = pgTable(
  'applications',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id),
    kind: text('kind').notNull().default('join'),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    characterId: text('character_id'),
    claimMemberId: text('claim_member_id'),
    name: text('name').notNull(),
    classId: text('class_id').notNull(),
    power: integer('power').notNull(),
    level: integer('level').notNull(),
    message: text('message').notNull().default(''),
    stage: text('stage').notNull().default('moi'),
    appliedAt: ts('applied_at').notNull().defaultNow(),
    referrerId: text('referrer_id'),
    look: jsonb('look').$type<ChibiLook>().notNull(),
    memberId: text('member_id'),
  },
  (t) => [
    index('applications_guild_idx').on(t.guildId, t.stage),
    check('applications_kind_ck', sql`${t.kind} in ('join','claim')`),
    check('applications_stage_ck', sql`${t.stage} in ('moi','phong-van','thu-thach','chap-nhan','tu-choi')`),
  ],
)

export const announcements = pgTable('announcements', {
  id: text('id').primaryKey(),
  guildId: text('guild_id')
    .notNull()
    .references(() => guilds.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  authorId: text('author_id').notNull(),
  date: ts('date').notNull().defaultNow(),
  pinned: boolean('pinned').notNull().default(false),
  tag: text('tag').notNull(),
})

export const activities = pgTable(
  'activities',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id),
    type: text('type').notNull(),
    text: text('text').notNull(),
    date: ts('date').notNull().defaultNow(),
    memberId: text('member_id'),
  },
  (t) => [index('activities_date_idx').on(t.guildId, t.date)],
)

export const teams = pgTable('teams', {
  id: text('id').primaryKey(),
  guildId: text('guild_id')
    .notNull()
    .references(() => guilds.id),
  name: text('name').notNull(),
  dungeonId: text('dungeon_id'),
  slots: jsonb('slots').$type<TeamTemplate['slots']>().notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
  createdBy: text('created_by'),
})

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    userId: text('user_id').notNull(),
    key: text('key').notNull(),
    route: text('route').notNull(),
    statusCode: integer('status_code').notNull(),
    response: jsonb('response').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
)

export const jobRuns = pgTable(
  'job_runs',
  {
    job: text('job').notNull(),
    period: text('period').notNull(),
    ranAt: ts('ran_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.job, t.period] })],
)

export const auditLog = pgTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id').notNull(),
    userId: text('user_id'),
    action: text('action').notNull(),
    target: text('target'),
    payload: jsonb('payload'),
    at: ts('at').notNull().defaultNow(),
  },
  (t) => [index('audit_guild_idx').on(t.guildId, t.at)],
)

// Migration 0005: dữ liệu đang chạy (phó bản hư cấu cũ) phải được chuyển sang phó bản thật mà không mất lịch sử.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DUNGEON_MAP } from '@/domain/constants'
import { openDatabase, type Database } from '../src/db/client'
import { ensureGuild } from '../src/db/importer'
import * as s from '../src/db/schema'

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../drizzle/0005_pho_ban_that.sql')
const G = 'kinh-hong-cac'

describe('migration 0005 — chuyển phó bản cũ sang phó bản trong game', () => {
  let database: Database
  let msId = ''

  beforeAll(async () => {
    database = await openDatabase({ pgliteDir: 'memory' })
    await database.migrate()
    // bộ dữ liệu mẫu đầy đủ (đã theo phó bản mới) + chèn thêm vài dòng kiểu cũ
    await ensureGuild(database.db, G, true)
    const { db } = database
    const at = new Date('2026-10-01T13:00:00Z')
    const clear = (id: string, dungeonId: string, mode: string, bossId: string) => ({
      id, guildId: G, dungeonId, mode, bossId, date: at, durationSec: 300, memberIds: ['m001'], mvpId: 'm001', wipes: 0,
    })
    await db.insert(s.clears).values([
      clear('c1', 'lien-van-trai', 'ac-mong', 'lvt-2'),
      clear('c2', 'kim-phong-lau', 'anh-hung', 'kpl-3'),
      clear('c3', 'cuu-long-uyen', 'thuong', 'clu-4'),
      clear('c4', 'thien-lao', 'ac-mong', 'tl-1'),
      // đã là phó bản mới → giữ nguyên
      clear('c5', 'vinh-da-tinh-do', 'anh-hung', 'vd-2'),
    ])
    await db.insert(s.teams).values([
      { id: 't1', guildId: G, name: 'Đoàn 25', dungeonId: 'tay-ha-lang', slots: Array.from({ length: 25 }, (_, i) => `m${String(i + 1).padStart(3, '0')}`) },
      { id: 't2', guildId: G, name: 'Tổ nhỏ', dungeonId: 'lien-van-trai', slots: ['m001', null, 'm003', 'm004', 'm005'] },
      { id: 't3', guildId: G, name: 'Đội chủ lực · Cửu Long Uyên', dungeonId: 'cuu-long-uyen', slots: ['t1', 't2', 'h1', 'h2', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6'] },
    ])
    await db.insert(s.events).values([
      { id: 'e1', guildId: G, type: 'raid', title: 'Thiên Lao · Ác Mộng', start: at, durationMin: 120, location: 'Cổng Thiên Lao, Biện Kinh', leaderId: 'm001', capacity: 25, note: 'Mang đủ thuốc giải độc cho boss 2.' },
      // người dùng tự đặt tên — không đụng tới
      { id: 'e2', guildId: G, type: 'raid', title: 'Tối nay đi Thiên Lao nha', start: at, durationMin: 60, leaderId: 'm001', capacity: 10 },
    ])
    await db.insert(s.activities).values([{ id: 'old-a1', guildId: G, type: 'first-kill', text: 'Bang hạ gục lần đầu Huyết Y Hầu (Ác Mộng)!' }])
    const [ms] = await db.select().from(s.mentorships).limit(1)
    msId = ms.id
    await db
      .update(s.mentorships)
      .set({ tasks: [{ ...ms.tasks[0], label: 'Cùng sư phụ đánh 3 phó bản 5 người' }, ...ms.tasks.slice(1)] })
      .where(eq(s.mentorships.id, ms.id))

    // chạy lại đúng file migration trên dữ liệu kiểu cũ
    for (const stmt of readFileSync(MIGRATION, 'utf8').split('--> statement-breakpoint')) {
      if (stmt.replace(/--.*$/gm, '').trim()) await db.execute(sql.raw(stmt))
    }
  })
  afterAll(async () => database.close())

  it('lượt clear trỏ sang boss của phó bản mới; Ác Mộng → Anh Hùng; Thiên Hoang chỉ còn Thường', async () => {
    const rows = await database.db.select().from(s.clears)
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]))
    expect(byId.c1).toMatchObject({ dungeonId: 'trich-tien-kinh-dao', bossId: 'tt-2', mode: 'anh-hung' })
    expect(byId.c2).toMatchObject({ dungeonId: 'thien-hoang-di-van', bossId: 'thd-4', mode: 'thuong' })
    expect(byId.c3).toMatchObject({ dungeonId: 'vinh-da-tinh-do', bossId: 'vd-6', mode: 'thuong' })
    expect(byId.c4).toMatchObject({ dungeonId: 'vinh-da-tinh-do', bossId: 'vd-1', mode: 'anh-hung' })
    expect(byId.c5).toMatchObject({ dungeonId: 'vinh-da-tinh-do', bossId: 'vd-2', mode: 'anh-hung' })
    // không còn bản ghi nào trỏ vào boss / độ khó không tồn tại
    for (const r of rows) {
      const d = DUNGEON_MAP[r.dungeonId]
      expect(d, r.id).toBeTruthy()
      expect(d.bosses.some((b) => b.id === r.bossId), r.id).toBe(true)
      expect(d.modes as string[]).toContain(r.mode)
    }
  })

  it('đội hình: đổi phó bản, cắt về sĩ số tối đa, mẫu dữ liệu mẫu xếp lại theo tổ 6 người', async () => {
    const rows = await database.db.select().from(s.teams)
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]))
    expect(byId.t1.dungeonId).toBe('vinh-da-tinh-do')
    expect(byId.t1.slots).toHaveLength(12)
    expect(byId.t1.slots[11]).toBe('m012')
    expect(byId.t2).toMatchObject({ dungeonId: 'trich-tien-kinh-dao', slots: ['m001', null, 'm003', 'm004', 'm005'] })
    expect(byId.t3.name).toBe('Đoàn chủ lực · Vĩnh Dạ Tinh Đô')
    expect(byId.t3.slots).toEqual(['t1', 'h1', 'd1', 'd2', 'd3', 'd4', 't2', 'h2', 'd5', 'd6'])
  })

  it('câu chữ dữ liệu mẫu được đổi, câu người dùng tự viết giữ nguyên', async () => {
    const events = Object.fromEntries((await database.db.select().from(s.events)).map((r) => [r.id, r]))
    expect(events.e1).toMatchObject({ title: 'Vĩnh Dạ Tinh Đô · Anh Hùng', location: 'Cổng Vĩnh Dạ Tinh Đô', capacity: 24 })
    expect(events.e2.title).toBe('Tối nay đi Thiên Lao nha')
    const [act] = await database.db.select().from(s.activities).where(eq(s.activities.id, 'old-a1'))
    expect(act.text).toBe('Bang hạ gục lần đầu Ác Dịch Tâm Ma (Vĩnh Dạ Tinh Đô · Anh Hùng)!')
    const [ms] = await database.db.select().from(s.mentorships).where(eq(s.mentorships.id, msId))
    expect(ms.tasks[0].label).toBe('Cùng sư phụ đánh 3 lượt phó bản 6 người')
  })
})

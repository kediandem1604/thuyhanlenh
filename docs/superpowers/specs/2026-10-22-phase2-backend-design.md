# Giai đoạn 2 — Backend thật, đăng nhập Discord, lưu dữ liệu trên server

> Ngày 22/10/2026 · Dựa trên `docs/ARCHITECTURE.md`. Tài liệu này là **hợp đồng** giữa frontend, backend và các agent dựng song song — sửa ở đây trước khi sửa code.

## 1. Mục tiêu

- Dữ liệu bang lưu trên server (PostgreSQL), mọi thành viên thấy cùng một dữ liệu.
- Đăng nhập bằng Discord; mỗi tài khoản gắn với đúng một môn hạ.
- Phân quyền theo chức vụ đúng bảng §8 của ARCHITECTURE.md, **kiểm tra ở server**.
- Thay đổi của người này hiện ngay ở máy người khác (WebSocket).
- Giữ nguyên giao diện 15 trang; chỉ thay tầng dữ liệu.

## 2. Quyết định kỹ thuật

| Chủ đề | Chọn | Lý do |
|---|---|---|
| Framework | **Fastify 5** (không NestJS) | Doc cho phép cả hai. Nest cần `emitDecoratorMetadata`, mà `tsx`/esbuild không sinh → hỏng DI khi chạy dev. Fastify nhẹ, nhanh, plugin rõ. |
| CSDL | **PostgreSQL** qua Drizzle ORM | Nguồn sự thật duy nhất như doc. |
| CSDL khi dev/test | **PGlite** (Postgres chạy nhúng trong Node, lưu ở `server/.data/`) | Máy dev không cần cài Postgres/Docker. Đặt `DATABASE_URL` là chuyển sang Postgres thật. |
| Realtime | WebSocket (`@fastify/websocket`) + hub trong tiến trình | Đúng doc. Redis pub/sub chỉ cần khi chạy nhiều instance → để giai đoạn 3. |
| Bảng xếp hạng | Tính bằng SQL/aggregate | Bang ≤ 80 người, không cần Redis sorted set lúc này. |
| Job nền | Bộ lập lịch trong tiến trình + bảng `job_runs` khóa theo mã kỳ | Idempotent kể cả khi chạy nhiều instance (unique constraint). BullMQ để giai đoạn 3 (thông báo, OCR). |
| Chạy TS | `tsx` (dev và prod) | Không cần bước biên dịch server. |
| Test | Vitest + PGlite trong RAM + `app.inject()` | Test tích hợp thật, nhanh, không cần mạng. |

## 3. Cấu trúc thư mục

```
server/
  tsconfig.json  drizzle.config.ts  vitest.config.ts
  drizzle/                 migration SQL (sinh bằng drizzle-kit + file tay cho trigger)
  src/
    index.ts               khởi động server + lịch job
    app.ts                 buildApp(): đăng ký plugin, route, xử lý lỗi
    config.ts              đọc biến môi trường (zod)
    db/ schema.ts client.ts migrate.ts importer.ts cli.ts
    auth/ sessions.ts discord.ts dev.ts plugin.ts
    realtime/ hub.ts ws.ts
    lib/ errors.ts ids.ts http.ts (idempotency, guard)
    snapshot.ts            dựng ảnh chụp dữ liệu bang theo "slice"
    modules/ members.ts mentorships.ts bonds.ts dungeons.ts events.ts teams.ts
             wars.ts treasury.ts recruitment.ts announcements.ts activity.ts
    jobs/ scheduler.ts weeklyReset.ts auctions.ts
  test/ helpers.ts *.test.ts
src/ (frontend)
  api/ client.ts realtime.ts
  domain/ api.ts permissions.ts      ← dùng chung frontend + server
  auth/ AuthGate.tsx LoginPage.tsx OnboardingPage.tsx
```

Server import code dùng chung qua alias `@/…` → `src/…` (chỉ `domain/`, `data/seed.ts`, `lib/utils.ts` — không import gì có React).

## 4. Mô hình dữ liệu (PostgreSQL)

Mọi bảng nghiệp vụ có `guild_id`. Id là text (giữ định dạng id cũ `m001`, `ms-…`).

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `guilds` | id, name, han, server, level, motto, capacity | 1 bang/deploy ở giai đoạn này |
| `users` | id, discord_id (unique, null), username, display_name, avatar_url, is_dev, created_at, last_login_at | |
| `sessions` | id, token_hash (unique), user_id, expires_at, created_at, user_agent | cookie chứa token thô, DB chỉ giữ SHA-256 |
| `members` | id, guild_id, user_id (unique, null), name (unique theo bang, không phân biệt hoa thường), class_id, rank, level, power, activity, status, joined_at, last_online, title, bio, look jsonb, stats jsonb, achievements jsonb, pvp jsonb, deleted_at | trục xuất = đặt `deleted_at` (giữ lịch sử sổ cái) |
| `power_snapshots` | member_id, week_start (date), power | PK (member_id, week_start) → `powerHistory` 8 tuần |
| `mentorships` | id, guild_id, master_id, disciple_id, stage, status, started_at, graduated_at, bond, tasks jsonb | unique một sư phụ `active` cho mỗi đồ đệ |
| `bonds` | id, guild_id, a_id, b_id, type, since, intimacy, note | |
| `clears` | id, guild_id, dungeon_id, mode, boss_id, date, duration_sec, member_ids jsonb, mvp_id, wipes, created_by | **tiến độ boss tính từ bảng này** (count, min(date), min(duration)) |
| `events` | id, guild_id, type, title, start, duration_min, location, leader_id, capacity, note, created_by | |
| `event_rsvps` | event_id, member_id, status, updated_at | PK (event_id, member_id) |
| `wars` | id, guild_id, date, opponent, result, score jsonb, mvp_id, mode, lines jsonb, created_by | |
| `ledger_entries` | id, guild_id, member_id, delta, reason, category, date, created_by | **append-only**: trigger chặn UPDATE/DELETE. Số dư = SUM(delta). Cống hiến tuần = SUM(delta > 0) từ thứ Hai 05:00. |
| `loot_items` | id, guild_id, name, rarity, source, kind, status, start_price, ends_at, assigned_to, price, created_by | |
| `loot_bids` | id, item_id, member_id, amount, at | |
| `applications` | id, guild_id, kind ('join' \| 'claim'), user_id, claim_member_id, name, class_id, power, level, message, stage, applied_at, referrer_id, look jsonb, member_id (sau khi chấp nhận) | |
| `announcements` | id, guild_id, title, body, author_id, date, pinned, tag | |
| `activities` | id, guild_id, type, text, date, member_id | |
| `teams` | id, guild_id, name, dungeon_id, slots jsonb, created_at, created_by | |
| `idempotency_keys` | key, user_id, route, status_code, response jsonb, created_at | PK (user_id, key) |
| `job_runs` | job, period, ran_at | PK (job, period) — khóa idempotent cho job |
| `audit_log` | id, guild_id, user_id, action, target, payload jsonb, at | ai đã làm gì (mọi mutation) |

Nạp dữ liệu demo (`npm run db:seed`, tự chạy khi CSDL trống và `SEED_DEMO=true`): dùng `generateSeed()` cũ, rồi
- thêm bút toán **"Số dư đầu kỳ"** để SUM(delta) = `contribution` cũ, và bút toán tuần này để cống hiến tuần khớp số cũ;
- sinh các lượt clear lịch sử còn thiếu để số lượt hạ boss khớp `progress` cũ;
- `powerHistory` → 8 dòng `power_snapshots`.

`npm run db:import -- <file.json>` nạp file "Xuất JSON" của bản demo (cùng định dạng `SeedData`).

## 5. Xác thực

- `GET /auth/providers` (công khai) → `{ discord: boolean, dev: boolean, devMembers?: {id,name,classId,rank,look}[] }`
- `GET /auth/discord/login?next=/duong-dan` → cookie `thl_oauth` (state ngẫu nhiên, 10 phút) → chuyển sang Discord (scope `identify`).
- `GET /auth/discord/callback` → kiểm state, đổi code lấy token, gọi `/users/@me`, upsert `users`, tạo phiên, chuyển về `next`.
- `POST /auth/dev/login { memberId }` — chỉ khi `DEV_LOGIN` bật (mặc định bật khi không phải production). Tạo user `dev:<memberId>` gắn với môn hạ đó.
- `POST /auth/logout`
- Cookie phiên `thl_session`: httpOnly, SameSite=Lax, Secure khi production, 30 ngày, tự gia hạn khi còn < 15 ngày.
- Chống CSRF: mọi request không phải GET phải có header `X-Requested-With: thuy-han-lenh`; nếu có header `Origin` thì phải khớp `WEB_ORIGIN`.

**Gắn tài khoản ↔ môn hạ**
- Lần đăng nhập Discord đầu tiên: nếu Bang Chủ chưa có tài khoản và (`BOOTSTRAP_LEADER_DISCORD_ID` trống hoặc trùng) → tự gắn vào Bang Chủ ("khai bang").
- Người khác chưa có môn hạ → màn **Nhập môn**: gửi *đơn gia nhập mới* hoặc *xin nhận danh tính* một môn hạ chưa có chủ. Đơn vào trang Chiêu Mộ; Trưởng Lão trở lên chấp nhận thì tài khoản được gắn.

`GET /api/me` → 200 `Me` hoặc 401.

```ts
interface Me {
  user: { id: string; name: string; avatarUrl: string | null; provider: 'discord' | 'dev' }
  member: Member | null          // null = chưa nhập môn
  permissions: Permission[]      // theo chức vụ
  application: Application | null // đơn đang chờ (nếu chưa có môn hạ)
  guild: { id: string; name: string }
  devLogin: boolean
}
```

## 6. Phân quyền (`src/domain/permissions.ts`, dùng chung)

| Permission | Chức vụ tối thiểu | Dùng cho |
|---|---|---|
| `event.rsvp`, `loot.bid`, `bond.self`, `profile.self` | Tân Binh | điểm danh, ra giá (cho chính mình), kết duyên có mình, sửa hồ sơ/tạo hình của mình |
| `mentor.take` | Tinh Anh | nhận đồ đệ (mình làm sư phụ), quản lý cặp của mình |
| `clear.record`, `war.record`, `event.manage`, `team.manage` | Đường Chủ | ghi clear / bang chiến, tạo-xóa sự kiện, lưu-xóa đội hình |
| `recruit.review`, `loot.open`, `member.edit`, `announce.manage`, `mentor.manage`, `bond.manage` | Trưởng Lão | duyệt đơn, thêm thành viên, sửa hồ sơ người khác, mở đấu giá, bảng tin, quản lý mọi cặp sư đồ / tình duyên |
| `ledger.adjust`, `loot.close`, `rank.assign`, `member.expel` | Phó Bang Chủ | điều chỉnh cống hiến, chốt phiên, bổ nhiệm, trục xuất |

Luật thêm: Phó Bang chỉ bổ nhiệm/trục xuất người **dưới** mình và chỉ bổ nhiệm tới Trưởng Lão. Bổ nhiệm người khác làm Bang Chủ = **truyền ngôi** (chỉ Bang Chủ; Bang Chủ cũ thành Phó Bang Chủ). Không ai tự trục xuất mình. Ra giá thay người khác cần `loot.close`.

## 7. API

Quy ước:
- Mọi route dưới `/api` cần đăng nhập + đã có môn hạ (trừ `/api/me`, `/api/onboarding/*`).
- Body JSON, kiểm tra bằng zod. Lỗi: HTTP 4xx `{ ok: false, error: { code, message } }` — `message` tiếng Việt, hiện thẳng lên toast.
- Mutation thành công: `{ ok: true, result?: …, snapshot: Partial<GuildSnapshot> }` — chứa **trọn các slice bị ảnh hưởng** để frontend ghép vào store. Server đồng thời phát WS `{ type: 'invalidate', slices, by }`.
- Route tạo bản ghi nhận header `Idempotency-Key` (frontend luôn gửi UUID): gửi lại cùng key → trả lại đúng phản hồi cũ, không tạo trùng.
- Mỗi mutation ghi `audit_log`; các mutation có ý nghĩa ghi `activities` (giữ đúng câu chữ store cũ).

`GuildSnapshot` = `{ members, mentorships, bonds, progress, clears, events, wars, ledger, loot, applications, announcements, activities, teams }` (đúng kiểu trong `src/domain/types.ts`). Danh sách được cắt: `clears` 300, `ledger` 500, `activities` 120 bản ghi mới nhất. `members` không gồm người đã trục xuất. `Member.contribution`, `weeklyContribution`, `powerHistory`, `status` là **giá trị tính ra**.

| Method · Path | Quyền | Slice trả về | Kết quả / ghi chú |
|---|---|---|---|
| `GET /api/snapshot?slices=a,b` | đăng nhập | các slice yêu cầu (mặc định tất cả) | |
| `POST /api/members` | member.edit | members, activities | thêm thành viên; body `NewMemberInput` + `look?` |
| `PATCH /api/members/:id` | profile.self (chính mình: title, bio, look) · member.edit (mọi trường trừ rank) | members | |
| `PUT /api/members/:id/rank` | rank.assign + luật §6 | members, activities | |
| `DELETE /api/members/:id` | member.expel | members, mentorships, bonds, teams, activities | xóa mềm |
| `POST /api/mentorships` | mentor.take (mình là sư phụ) · mentor.manage | mentorships, activities | luật: không tự bái, đồ đệ chưa có sư phụ active, sư phụ ≤ 3 đồ đệ active |
| `PATCH /api/mentorships/:id/tasks/:taskId` `{done}` | sư phụ/đồ đệ của cặp · mentor.manage | mentorships | bond ±120 |
| `POST /api/mentorships/:id/advance` | sư phụ · mentor.manage | mentorships | cần xong nhiệm vụ giai đoạn hiện tại; bond +300 |
| `POST /api/mentorships/:id/graduate` | sư phụ · mentor.manage | mentorships, members, ledger, activities | cần stage 4 + xong hết; sư phụ +500, đồ đệ +300 cống hiến |
| `DELETE /api/mentorships/:id` | sư phụ · mentor.manage | mentorships | |
| `POST /api/bonds` | bond.self (mình là a hoặc b) · bond.manage | bonds, activities | luật như store cũ |
| `POST /api/bonds/:id/intimacy` `{amount}` | người trong cặp · bond.manage | bonds | amount 1…999 |
| `DELETE /api/bonds/:id` | người trong cặp · bond.manage | bonds | |
| `POST /api/clears` | clear.record | progress, clears, members, ledger, activities | `{firstKill, newRecord}`; mỗi người trong đội + `size × (5/8/12)` cống hiến |
| `POST /api/events` | event.manage | events, activities | leader tự điểm danh "yes" |
| `DELETE /api/events/:id` | người tạo · event.manage | events | |
| `PUT /api/events/:id/rsvp` `{status: yes\|maybe\|no\|null, memberId?}` | event.rsvp cho mình · event.manage để điểm danh hộ người khác | events | từ chối "yes" khi đủ chỗ; không điểm danh sự kiện đã kết thúc |
| `POST /api/wars` | war.record | wars, members, ledger, activities | +200 (thắng) / +120 cống hiến mỗi người |
| `POST /api/ledger/adjustments` `{memberId, delta, reason}` | ledger.adjust | members, ledger | category `dieu-chinh` |
| `POST /api/loot` | loot.open | loot | |
| `POST /api/loot/:id/bids` `{amount, memberId?}` | loot.bid (mình) · loot.close (thay người khác) | loot | khóa dòng (`FOR UPDATE`); giá > giá cao nhất; số dư đủ; phiên còn mở & chưa hết giờ |
| `POST /api/loot/:id/close` | loot.close | loot, members, ledger, activities | người trả cao nhất bị trừ cống hiến |
| `POST /api/applications` | recruit.review | applications | thêm đơn thủ công |
| `PATCH /api/applications/:id/stage` `{stage}` | recruit.review | applications | không đổi từ/đến `chap-nhan` qua route này |
| `POST /api/applications/:id/accept` | recruit.review | applications, members, activities | `result: { memberId }`. `join` → `createMember()` (gắn user nếu có, giữ tạo hình của đơn); `claim` → gắn user vào môn hạ đó (môn hạ phải còn chưa có chủ thật, user chưa có môn hạ) |
| `GET /api/onboarding/unclaimed` | đăng nhập | — | `{ members: UnclaimedMember[] }` — môn hạ chưa có chủ (user_id null hoặc chỉ gắn user dev) |
| `POST /api/onboarding/apply` `{name, classId, power, level, message, gender?}` | đăng nhập, chưa có môn hạ | — | tạo đơn `join` gắn user; 409 nếu đã có đơn đang chờ (khác `chap-nhan`/`tu-choi`) |
| `POST /api/onboarding/claim` `{memberId, message}` | như trên | — | tạo đơn `claim` (tên/lưu phái/chiến lực/tạo hình lấy từ môn hạ đó); môn hạ phải chưa có chủ |
| `POST /api/announcements` | announce.manage | announcements | |
| `PATCH /api/announcements/:id/pin` | announce.manage | announcements | đảo ghim |
| `DELETE /api/announcements/:id` | announce.manage | announcements | |
| `POST /api/teams` `{id?, name, dungeonId?, slots}` | team.manage | teams | tạo mới hoặc cập nhật; `result: { id }` |
| (các route tạo `events`, `members`) | | | `result: { id }` để frontend tìm bản ghi mới trong snapshot |
| `DELETE /api/teams/:id` | team.manage | teams | |
| `GET /api/export` | recruit.review | — | JSON `SeedData` đầy đủ |
| `POST /api/dev/reset` | chỉ khi DEV_LOGIN | tất cả | nạp lại dữ liệu demo |
| `GET /api/ws` (WebSocket) | đăng nhập | — | server → client: `{type:'invalidate', slices, by}`, `{type:'presence', online: string[]}` |

**Trạng thái trực tuyến thật**: môn hạ có tài khoản → `online` khi đang mở WebSocket, ngược lại `offline` (cập nhật `last_online` khi ngắt). Môn hạ demo chưa có chủ giữ trạng thái lưu sẵn.

## 8. Job nền

- **Reset tuần** (thứ Hai 05:00, giờ Việt Nam): ghi `power_snapshots` cho tuần mới. Khóa `job_runs(job='weekly-reset', period='2026-W44')`. Cống hiến tuần là giá trị tính nên không cần xóa.
- **Đóng phiên đấu giá hết giờ**: mỗi phút, phiên `auction` có `ends_at < now` → chốt cho người trả cao nhất (hoặc để `assigned` không người nhận nếu không ai trả). Mỗi phiên chốt trong một transaction có khóa dòng nên không trừ tiền hai lần.

## 9. Frontend

- `src/api/client.ts`: `fetch` + credentials, header CSRF, `Idempotency-Key`, ném `ApiError(status, code, message)`.
- Store `useGuild`: bỏ localStorage; giữ nguyên tên action nhưng **async**, trả `Promise<Result>` (hoặc kết quả riêng); tự ghép `snapshot` trả về; lỗi → toast. Cập nhật lạc quan (optimistic) cho: điểm danh, tick nhiệm vụ sư đồ, tặng hoa, kéo thẻ chiêu mộ.
- `useGuild.me`, `currentUserId = me.member.id`; hook `useCan(permission)` để ẩn/khóa nút không đủ quyền.
- `AuthGate`: chờ `/api/me` → 401: **trang Đăng nhập** · chưa có môn hạ: **trang Nhập môn** · có: nạp snapshot rồi vào app + mở WebSocket.
- Thiết Lập: bỏ "Xuất/Nhập JSON trong trình duyệt" → "Xuất JSON từ server"; "Đóng vai" chỉ còn ở chế độ dev (đăng nhập dev nhanh); thêm thông tin tài khoản + đăng xuất.
- Vite dev proxy `/api` (kèm ws) và `/auth` → `http://localhost:8787`. Production: server phục vụ luôn `dist/`.

## 10. Biến môi trường (`.env`)

```
PORT=8787
WEB_ORIGIN=http://localhost:5173
DATABASE_URL=                 # trống = PGlite tại server/.data/pglite
SESSION_SECRET=…              # bắt buộc ở production
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=http://localhost:5173/auth/discord/callback
BOOTSTRAP_LEADER_DISCORD_ID=  # tùy chọn
DEV_LOGIN=true                # false ở production
SEED_DEMO=true
TZ=Asia/Ho_Chi_Minh
```

## 11. Kiểm thử

- Vitest tích hợp: mỗi module có test cho đường đi đúng, từ chối thiếu quyền (403), dữ liệu sai (400), luật nghiệp vụ, idempotency, trigger append-only.
- `npm run typecheck` sạch cho cả web và server; `npm run build` thành công.
- Chạy thật: đăng nhập dev → thao tác mỗi trang → mở tab thứ hai thấy cập nhật realtime.

## 12. Ngoài phạm vi (giai đoạn 3)

Discord bot, Zalo OA, OCR, BullMQ, Redis (pub/sub nhiều instance, cache), Web Push, nhiều bang.

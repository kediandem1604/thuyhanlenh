# Giai đoạn 3a — Nhiều tổ chức: Bang hội · Kim Lan · Team tự tạo

> 22/10/2026 · Hợp đồng cho phần "mở rộng hệ thống" — sửa ở đây trước khi sửa code.

## 1. Mục tiêu & điều người dùng đã chốt

- Một hệ thống quản lý **nhiều tổ chức**, mỗi tổ chức thuộc một loại:
  - **Bang Hội** (帮) — như hiện tại, đủ 15 phân hệ.
  - **Kim Lan** (金兰) — nhóm kết nghĩa **tối đa 12 người**. Trong game chỉ có: **phó bản & bày trận** (kèm lịch đi phó bản) và **thứ bậc kết nghĩa** (Đại ca/Đại tỷ → … → Tiểu đệ/Tiểu muội). Không có quỹ chung / đấu giá, không có PvP nhóm → ẩn hết phần còn lại.
  - **Team tự tạo** (队) — không giới hạn người; **chủ team tự bật/tắt chức năng**. Mặc định: thành viên, phó bản, bày trận, lịch, bảng xếp hạng.
- **Nhân vật dùng chung**: một tài khoản có một nhân vật (tên, lưu phái, cấp, chiến lực, chibi…) dùng ở mọi tổ chức; **chức vụ / thứ bậc, ngày gia nhập, cống hiến** thì riêng từng tổ chức.
- Bộ dữ liệu sẵn cho Kim Lan: **Gia Tộc Họ Bạch** (白氏) — 12 huynh đệ tỷ muội họ Bạch, tóc bạch kim, giao diện riêng: tuyết rơi, bạch mai, hạc trắng, trăng bạc, núi phủ tuyết.

## 2. Mô hình

```
users 1──0..1 characters 1──* members (membership) *──1 guilds (= tổ chức, có cột type)
```

| Bảng | Thay đổi |
|---|---|
| `guilds` | giữ tên bảng (= *tổ chức*). Thêm `type` ('guild'\|'kimlan'\|'team'), `features` jsonb (chỉ team dùng), `theme`, `description`, `is_public`, `created_by`. |
| `characters` (mới) | `id, user_id (unique, null), name, class_id, level, power, title, bio, look, stats, achievements, pvp, created_at` — chuyển từ `members`. |
| `members` | thành **tư cách thành viên**: `id, guild_id, character_id, rank, seat (Kim Lan 1–12), activity, status, joined_at, last_online, deleted_at`. Bỏ các cột đã chuyển sang `characters` và `user_id`. Unique `(guild_id, character_id)` khi chưa rời. |
| `power_snapshots` | khóa theo `character_id`. |
| `org_invites` (mới) | `code, guild_id, kind ('join'\|'claim'), member_id (claim), created_by, created_at, expires_at, max_uses, uses, revoked_at`. |
| `applications` | thêm `character_id` (đơn của người đã có nhân vật). |

Code server giữ tên `guildId` / `guild_id` nhưng nghĩa là **id tổ chức**. Frontend vẫn nhận `Member` như cũ (= membership + character), thêm `characterId`, `seat?`, `honorific?`, `honorificHan?`.

Migration: (1) thêm bảng/cột → (2) SQL chép dữ liệu `members` → `characters` → (3) bỏ cột cũ. Dữ liệu dev hiện có (kể cả liên kết Discord) được giữ.

## 3. Loại tổ chức, chức vụ, quyền

| | Bang Hội | Kim Lan | Team |
|---|---|---|---|
| Sức chứa | 80 (sửa được, tối đa 200) | **12 (cố định)** | không giới hạn |
| Chức vụ | Bang Chủ … Tân Binh (như cũ) | `dai-ca` (ghế 1) · `huynh-de` (ghế 2–12) | `truong-nhom` (1) · `pho-nhom` (≤3) · `thanh-vien` |
| Chức năng | tất cả, cố định | `pho-ban`, `bay-tran`, `lich` (cố định) | chủ team bật/tắt trong mọi chức năng tùy chọn |
| Vào tổ chức | đơn chiêu mộ (công khai) hoặc link mời | **chỉ link mời** | link mời (+ chiêu mộ nếu bật) |

Chức năng lõi luôn có: Tổng quan, Thành viên, Xưởng Chibi, Thiết lập, Kiến trúc. Chức năng tùy chọn: `su-do, tinh-duyen, chieu-mo, pho-ban, bay-tran, bang-chien, lich, phong-van, thanh-tuu, bang-kho`.

Quyền tối thiểu theo loại (`src/domain/permissions.ts`, server kiểm tra):
- **Bang Hội**: như giai đoạn 2. Thêm `org.manage` = Phó Bang Chủ.
- **Kim Lan**: Đại ca có mọi quyền; Huynh đệ: `event.rsvp, profile.self, clear.record, event.manage, team.manage`.
- **Team**: Trưởng nhóm mọi quyền; Phó nhóm: mọi quyền trừ `org.manage, rank.assign, member.expel, ledger.adjust, loot.close`; Thành viên: `event.rsvp, loot.bid, bond.self, profile.self, mentor.take`.

**Thứ bậc Kim Lan**: ghế 1 = Đại ca/Đại tỷ; ghế 2…N−1 = Nhị/Tam/Tứ/Ngũ/Lục/Thất/Bát/Cửu/Thập/Thập Nhất + ca/tỷ; ghế cuối (N ≥ 2) = Tiểu đệ/Tiểu muội (theo giới tính nhân vật). Ấn triện hiện số ghế (一…十二). Đại ca đổi ghế được; đưa người khác lên ghế 1 = nhường ngôi Đại ca.

## 4. API

Tổ chức hiện tại gửi qua header **`x-org-id`** (WebSocket: `?org=`). Thiếu header → tổ chức đầu tiên của người dùng, rồi tới `GUILD_ID` mặc định (test cũ vẫn chạy).

| Route | Quyền | Ghi chú |
|---|---|---|
| `GET /api/me` | đăng nhập | `Me` thêm `character`, `orgs: OrgSummary[]`, `org: OrgInfo \| null` |
| `POST /api/characters` | đăng nhập, chưa có nhân vật | tạo nhân vật của mình |
| `PATCH /api/characters/me` | đăng nhập | sửa nhân vật khi chưa ở tổ chức nào |
| `GET /api/orgs/public` | đăng nhập | danh bạ bang hội nhận đơn (`is_public`) |
| `POST /api/orgs` | có nhân vật | tạo tổ chức → mình là chủ (Bang Chủ / Đại ca / Trưởng nhóm) |
| `PATCH /api/orgs/current` | `org.manage` | tên, hán tự, khẩu hiệu, server, giao diện, sức chứa (bang), công khai (bang), chức năng (team) |
| `POST /api/orgs/current/leave` | thành viên (không phải chủ) | rời tổ chức |
| `GET /api/invites` · `POST /api/invites` · `DELETE /api/invites/:code` | `recruit.review` (Kim Lan: Đại ca) | link mời `join` hoặc `claim` (nhận một nhân vật chưa có chủ) |
| `GET /api/invites/:code` | đăng nhập | xem trước lời mời |
| `POST /api/invites/:code/accept` | đăng nhập | `join`: cần có nhân vật, còn chỗ; `claim`: chưa có nhân vật, nhân vật chưa có chủ |
| `PUT /api/members/:id/seat` `{seat}` | Kim Lan, `rank.assign` | đổi thứ bậc; ghế 1 = nhường ngôi |
| `POST /api/onboarding/apply` `{orgId, message}` | có nhân vật | xin vào bang công khai (đơn gắn nhân vật) |

Route của chức năng không bật cho tổ chức → **404 `feature_off`** "Chức năng này không có ở {tổ chức}". Snapshot trả mảng rỗng cho slice thuộc chức năng tắt. Cống hiến (`credit`) chỉ ghi khi tổ chức có `bang-kho`.

## 5. Frontend

- `api/client` tự gắn `x-org-id` = tổ chức đang chọn (lưu `localStorage`).
- **Cổng vào**: Đăng nhập → **Sảnh Giang Hồ** (chưa có nhân vật / chưa ở tổ chức nào: tạo nhân vật, nhận nhân vật, nhập mã mời, xin vào bang, lập tổ chức) → app. Đường dẫn `/moi/:code` mở trang Lời mời (cả khi chưa đăng nhập).
- **Đổi tổ chức** ở đầu sidebar; menu, nhãn, bảng điều khiển đổi theo loại. Vào trang của chức năng đã tắt → màn "Không có ở tổ chức này".
- **Giao diện theo tổ chức** (`data-org-theme`): `kinh-hong` (vàng, hoa đào), `bach-gia` (bạc, tuyết + bạch mai, hạc trắng, núi tuyết), `thanh-ngoc`, `hong-lien`, `tu-dang` cho team tự chọn.
- Tổng quan riêng cho Kim Lan (Kim Lan Phổ — sơ đồ thứ bậc, lời thề kết nghĩa, tiến độ, lịch) và Team.
- Thiết lập: phần **Tổ chức** (thông tin, giao diện, chức năng của team, link mời, rời tổ chức).

## 6. Dữ liệu demo

- **Kinh Hồng Các** (Bang Hội, công khai) — 46 môn hạ cũ + 3 người họ Bạch.
- **Gia Tộc Họ Bạch** (Kim Lan, giao diện `bach-gia`) — 12 người, lịch đi phó bản tuần, tiến độ boss, đội hình 12 người, gia huấn trên bảng tin.
- **Thất Tinh Đội** (Team, 7 người lấy từ Kinh Hồng Các, gồm Dạ Lăng Phong làm Trưởng nhóm) — chức năng mặc định.

Đăng nhập thử với Dạ Lăng Phong → thấy Kinh Hồng Các + Thất Tinh Đội; với Bạch Lăng Sương → Gia Tộc Họ Bạch + Kinh Hồng Các.

## 7. Kiểm thử

Test cũ chạy nguyên (tổ chức mặc định). Test mới: tạo tổ chức, đổi tổ chức qua header, chặn chức năng tắt, link mời join/claim, sức chứa Kim Lan 12, đổi ghế / nhường ngôi, quyền theo loại, nhân vật dùng chung (đổi chiến lực ở bang → thấy ở Kim Lan).

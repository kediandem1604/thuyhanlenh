# Thủy Hàn Lệnh — Thiết kế hệ thống quản lý bang hội Nghịch Thủy Hàn

> Ngày: 22/10/2026 · Trạng thái: bản thiết kế do Claude tự quyết theo yêu cầu "nghĩ ra dùm tôi, càng xịn càng tốt".

## 1. Mục tiêu

Một web app cao cấp cho **bang hội Nghịch Thủy Hàn Mobile (bản VN)**, giúp bang chủ và ban quản lý:

- Quản lý thành viên (chức vụ, lưu phái, chiến lực, độ sôi nổi, cống hiến).
- Quản lý **sư đồ** (sư phụ – đồ đệ, lộ trình xuất sư).
- Theo dõi **tiến độ phó bản** theo boss / độ khó, lịch sử clear, kỷ lục.
- Xếp đội hình raid, lên lịch hoạt động, điểm danh.
- Ghi nhận bang chiến, sổ cống hiến, đấu giá chiến lợi phẩm.
- Tạo cảm giác "muốn mở web mỗi ngày": nhân vật chibi riêng cho từng người, bảng vinh danh, thành tựu, tình duyên.

**Thành công khi:** mở web lên là thấy "đẹp như game", mỗi thành viên có chibi riêng, mọi trang thao tác được thật (thêm / sửa / ghi nhận) và dữ liệu được lưu lại.

## 2. Giả định (Claude tự chọn)

| Hạng mục | Lựa chọn | Lý do |
|---|---|---|
| Phiên bản game | Nghịch Thủy Hàn Mobile (VNG) | Bản đang chạy ở VN |
| Lưu phái | 7 lưu phái bản VN: Tố Vấn, Cửu Linh, Thần Tương, Thiết Y, Huyết Hà, Toái Mộng, Long Ngâm | Theo wiki cộng đồng (patch 1.3.3) |
| Ngôn ngữ giao diện | Tiếng Việt | Người dùng VN |
| Bang demo | **Kinh Hồng Các**, server Biện Kinh | Tên hư cấu |
| Phó bản | Tên hư cấu lấy cảm hứng thế giới Ôn Thụy An (Liên Vân Trại, Hủy Nặc Thành, Kim Phong Tế Vũ Lâu…) | Tránh khẳng định sai tên phó bản thật |
| Lưu trữ | Bản demo lưu trong trình duyệt (localStorage), tách lớp dữ liệu để thay bằng API thật | Chạy ngay không cần server |

## 3. Các phân hệ (14 trang)

**Bang Hội**
1. **Tổng quan (Bang Hội Đường)** — banner thủy mặc + chibi, chỉ số chính, biểu đồ sôi nổi, sự kiện sắp tới, bảng tin, vinh danh tuần, nhật ký hoạt động.
2. **Thành viên (Danh Sách Môn Hạ)** — lưới thẻ chibi / bảng, lọc theo lưu phái – chức vụ – trạng thái, hồ sơ chi tiết (radar năng lực, sư đồ, tình duyên, thành tựu), thêm / sửa / trục xuất.
3. **Sư Đồ Đường** — cây truyền thừa, cặp sư đồ với lộ trình 5 giai đoạn (Bái sư → Nhập môn → Luyện công → Thực chiến → Xuất sư), nhiệm vụ, lễ xuất sư, gợi ý ghép sư phụ theo độ tương hợp.
4. **Tình Duyên Các** — phu thê / tri kỷ / kết nghĩa, độ thân mật, kỷ niệm, chibi đôi lãng mạn.
5. **Chiêu Mộ** — đơn xin gia nhập dạng kanban (Mới → Phỏng vấn → Thử thách → Chấp nhận / Từ chối); chấp nhận tự tạo thành viên.

**Chinh Chiến**
6. **Phó Bản** — tiến độ từng phó bản theo độ khó (Thường / Anh Hùng / Ác Mộng), thẻ boss, first-kill, thời gian tốt nhất, ghi nhận lượt clear, đếm ngược reset tuần.
7. **Bày Trận (Đội hình)** — kéo thả thành viên vào đội 10 người, cân bằng Tank / Trị liệu / Sát thương, tự xếp đội, lưu mẫu.
8. **Bang Chiến** — lịch sử trận, tỉ lệ thắng, MVP, thống kê K/D/A.
9. **Lịch Hoạt Động** — lịch tuần, điểm danh (Tham gia / Có thể / Vắng), đếm ngược.

**Vinh Quang**
10. **Bảng Phong Vân** — bục vinh danh top 3 với chibi, xếp hạng chiến lực / cống hiến / sôi nổi / PvP.
11. **Thành Tựu** — bộ sưu tập huy hiệu theo độ hiếm, tỉ lệ đạt trong bang.
12. **Bang Khố** — sổ cống hiến (điểm DKP), đấu giá chiến lợi phẩm, lịch sử phân phát.

**Hệ Thống**
13. **Kiến Trúc** — sơ đồ kiến trúc hệ thống vẽ trực tiếp trong app.
14. **Thiết lập** — giao diện Dạ / Nhật, đặt lại dữ liệu demo.

Toàn cục: thanh lệnh **Ctrl+K**, chuông thông báo, đổi giao diện, đếm ngược reset tuần, responsive mobile.

## 4. Mô hình dữ liệu (rút gọn)

```
Member        id, name, classId, rank, level, power, contribution, weeklyContribution,
              activity, status, joinedAt, lastOnline, title, bio, look(ChibiLook),
              stats{pve,pvp,support,survival,teamwork,mobility}, achievements[], pvp{kills,deaths}
Mentorship    id, masterId, discipleId, stage(0-4), tasks[], status, startedAt, graduatedAt, bond
Bond          id, aId, bId, type(phu-the|tri-ky|ket-nghia), since, intimacy, note
Dungeon       id, name, size(5|10|25), lore, bosses[] ; Boss: id, name, title, element
Progress      dungeonId → mode → bossId → {kills, firstKill, bestTimeSec}
ClearRecord   id, dungeonId, mode, bossId, date, durationSec, memberIds[], mvpId, wipes
GuildEvent    id, type, title, start, durationMin, location, leaderId, capacity, rsvp{memberId: yes|maybe|no}
WarRecord     id, date, opponent, result, score, mvpId, lines[{memberId,k,d,a,dmg,heal}]
LedgerEntry   id, memberId, delta, reason, date
LootItem      id, name, rarity, source, status(auction|assigned), bids[], assignedTo, price
Application   id, name, classId, power, message, stage, appliedAt, look
Announcement  id, title, body, authorId, date, pinned, tag
Activity      id, type, text, date, memberId
TeamTemplate  id, name, slots[(memberId|null) x10]
```

`ChibiLook` (gender, hairStyle, hairColor, eyeColor, expression, accessory, skin) sinh ngẫu nhiên có định hướng từ id → mỗi người một chibi cố định.

## 5. Kiến trúc

**Bản demo (đã dựng):** SPA React chạy hoàn toàn ở trình duyệt.

```
UI (pages) → hooks/store (Zustand) → domain (types, luật nghiệp vụ) → persist (localStorage)
```

**Bản production (đề xuất):** *modular monolith* — một backend chia module rõ ràng, chưa cần microservices.

```
Web SPA / PWA ─┐
Discord Bot  ──┼─► API (NestJS/Fastify, REST + WebSocket) ─► PostgreSQL
Zalo OA      ──┘        │  module: auth, guild, member, mentorship,      Redis (cache, bảng xếp hạng, pub/sub)
                        │  dungeon, event, war, treasury, recruitment    Object storage (ảnh chụp, avatar)
                        └► Hàng đợi (BullMQ) → worker: thông báo, OCR ảnh chụp chỉ số, tổng hợp tuần
```

- Đăng nhập Discord OAuth; phân quyền theo chức vụ (Bang chủ > Phó bang > Trưởng lão > Đường chủ > Tinh anh > Thành viên > Tân binh).
- Sổ cống hiến là **append-only** (không sửa, chỉ ghi bút toán điều chỉnh) để chống gian lận.
- Bảng xếp hạng dùng Redis sorted set, tính lại theo sự kiện.
- Điểm danh / đội hình realtime qua WebSocket.

Chi tiết hơn: `docs/ARCHITECTURE.md` và trang **Kiến Trúc** trong app.

## 6. Định hướng thẩm mỹ

- Chủ đề **"Dạ Thủy Mặc"**: nền mực đêm, núi thủy mặc nhiều lớp chuyển động, trăng, sương, cánh hoa rơi; viền vàng mảnh, ấn triện đỏ, họa tiết mây (tường vân).
- Màu: mực đêm `#0a0d16`, vàng lá `#d8b46a`, ngọc bích `#5ec7b0`, chu sa `#e0523f`, anh đào `#f2a7bf`.
- Chữ: Be Vietnam Pro (nội dung), Cormorant Garamond (tiêu đề), Ma Shan Zheng (chữ Hán trang trí).
- Giao diện sáng "Tuyên Chỉ" (giấy dó) có thể bật.
- **Chibi SVG tự vẽ**: đầu to, mắt long lanh, 3 khí chất — *dễ thương* (lấp lánh), *ngầu* (mắt sắc, gió), *lãng mạn* (tim, cánh hoa). Mỗi lưu phái có màu áo, vũ khí / đạo cụ riêng (dây lụa Tố Vấn, linh thú Cửu Linh, phi kiếm Thần Tương, mạch đao Thiết Y, trường thương Huyết Hà, đao Toái Mộng, long khí Long Ngâm). Có chớp mắt và nhún nhẹ.

## 7. Công nghệ

Vite + React 19 + TypeScript, Tailwind CSS v4, Motion (framer-motion), React Router, Zustand (persist), Recharts, dnd-kit, lucide-react.

## 8. Lỗi & kiểm thử

- Dữ liệu persist có `version`; nếu dữ liệu cũ hỏng → tự sinh lại dữ liệu demo.
- Form có kiểm tra đầu vào (tên trống, chiến lực âm…), thông báo toast.
- Kiểm thử: `tsc` không lỗi, `vite build` thành công, chụp màn hình từng trang ở desktop và mobile.

## 9. Ngoài phạm vi bản này

Backend thật, đăng nhập thật, OCR ảnh chụp — đã thiết kế trong kiến trúc, chưa cài đặt.

# Thủy Hàn Lệnh 令

**Hệ thống quản lý bang hội, Kim Lan và team cho Nghịch Thủy Hàn Mobile** — có máy chủ thật, đăng nhập Discord, phân quyền theo chức vụ và đồng bộ trực tiếp — thành viên, sư đồ, phó bản, bang chiến, bang khố, tình duyên… gói trong giao diện thủy mặc cao cấp với nhân vật chibi vẽ tay bằng SVG cho từng môn hạ.

> Dữ liệu mẫu có 3 tổ chức hư cấu (server Biện Kinh), nhân vật thuộc 7 lưu phái của bản VN (Tố Vấn, Cửu Linh, Thần Tương, Thiết Y, Huyết Hà, Toái Mộng, Long Ngâm):
> - **Kinh Hồng Các** 鸿 — bang hội 49 môn hạ, đủ mọi chức năng.
> - **Gia Tộc Họ Bạch** 白 — Kim Lan 12 người tóc bạch kim, thứ bậc từ Đại tỷ đến Tiểu muội; giao diện bạch kim với tuyết rơi, bạch mai và hạc trắng.
> - **Thất Tinh Đội** 星 — team 7 người lấy từ Kinh Hồng Các, chỉ bật phó bản, bày trận, lịch, xếp hạng.

---

## Tính năng

### Nhiều tổ chức
| | Bang Hội 帮 | Kim Lan 金兰 | Team 队 |
|---|---|---|---|
| Số người | 80 (chỉnh tới 200) | tối đa 12 | không giới hạn |
| Thứ bậc | Bang Chủ → Tân Binh | **Theo ghế kết nghĩa**: Đại ca/tỷ, Nhị ca… Tiểu đệ/muội | Trưởng nhóm · Phó nhóm · Thành viên |
| Chức năng | Đủ bộ | Như trong game: Phó Bản, Bày Trận, Lịch phó bản | Trưởng nhóm tự bật/tắt |
| Vào bằng | Đơn chiêu mộ công khai hoặc link mời | Link mời | Link mời |

- **Một nhân vật dùng chung** cho mọi tổ chức (tên, lưu phái, chiến lực, chibi); chức vụ, ghế, cống hiến tính riêng từng nơi.
- **Đổi tổ chức** ở thẻ trên thanh bên; menu chỉ hiện chức năng tổ chức đó có. Người chưa ở đâu vào **Sảnh Giang Hồ** để tạo nhân vật, nhập mã mời, xin vào bang hoặc tự lập tổ chức.
- **Link mời** `/moi/<mã>`: mời gia nhập, hoặc mời nhận lại một nhân vật đã có tên sẵn.
- **Giao diện theo tổ chức**: Kinh Hồng, Bạch Gia, Thanh Ngọc, Hồng Liên, Tử Đằng.
- **Trang giới thiệu + Vào xem thử**: khách chưa đăng nhập thấy landing page (ba con đường, tính năng, hỏi đáp); nút *Vào xem thử* mở đúng giao diện app với 3 tổ chức mẫu, chạy hoàn toàn trong trình duyệt (`src/demo/`), mọi thao tác ghi bị chặn nhẹ nhàng.
- **Quản trị hệ thống** (Thiết Lập, chỉ người giữ ghế đứng đầu bang chính): vào bất kỳ tổ chức nào làm người đứng đầu — dùng khi tổ chức không còn ai quản lý.

### Bang Hội
| Trang | Đường dẫn | Nội dung |
|---|---|---|
| **Tổng Quan** | `/` | Banner bang với chibi Bang Chủ, chỉ số chính, biểu đồ chiến lực, sự kiện sắp tới, vinh danh tuần, bảng cáo thị, nhật ký hoạt động |
| **Thành Viên** | `/thanh-vien` | Lưới thẻ chibi / bảng, lọc theo lưu phái – chức vụ – trạng thái, thêm / sửa thành viên |
| **Hồ sơ** | `/thanh-vien/:id` | Chibi lớn, radar năng lực, lịch sử chiến lực, sư đồ, tình duyên, thành tựu, bổ nhiệm chức vụ |
| **Sư Đồ Đường** | `/su-do` | Cây truyền thừa, lộ trình 5 giai đoạn (Bái Sư → Xuất Sư), nhiệm vụ, lễ xuất sư, gợi ý ghép sư phụ |
| **Tình Duyên Các** | `/tinh-duyen` | Phu thê, tri kỷ, kết nghĩa; độ thân mật, kỷ niệm, chibi đôi lãng mạn |
| **Chiêu Mộ** | `/chieu-mo` | Kanban duyệt đơn gia nhập; chấp nhận là tự tạo thành viên mới |

### Chinh Chiến
| Trang | Đường dẫn | Nội dung |
|---|---|---|
| **Phó Bản** | `/pho-ban` | Tiến độ 6 phó bản × 3 độ khó, thẻ boss, first kill, kỷ lục thời gian, ghi nhận lượt clear, đếm ngược reset tuần |
| **Bày Trận** | `/bay-tran` | Kéo thả xếp đội hình raid, cân bằng Tank / Trị liệu / Sát thương, tự xếp đội, lưu mẫu |
| **Bang Chiến** | `/bang-chien` | Tỉ lệ thắng, chuỗi thắng, biểu đồ hạ địch / bị hạ, sử sách từng trận (K/D/A, sát thương, trị liệu), Chiến thần, ghi nhận trận |
| **Lịch Hoạt Động** | `/lich` | Lịch tuần, điểm danh tham gia / có thể / vắng, tạo sự kiện |

### Vinh Quang
| Trang | Đường dẫn | Nội dung |
|---|---|---|
| **Bảng Phong Vân** | `/phong-van` | Bục vinh danh top 3, xếp hạng chiến lực / cống hiến / sôi nổi / PvP |
| **Thành Tựu** | `/thanh-tuu` | Bộ sưu tập 24 huy hiệu theo độ hiếm, tỉ lệ đạt trong bang |
| **Bang Khố** | `/bang-kho` | Sổ cống hiến chỉ ghi thêm, đấu giá chiến lợi phẩm bằng điểm cống hiến, lịch sử phân phát |
| **Xưởng Chibi** | `/xuong-chibi` | Tự tạo hình nhân vật chibi: tóc, mắt, biểu cảm, khí chất, phụ kiện |

### Hệ Thống
| Trang | Đường dẫn | Nội dung |
|---|---|---|
| **Kiến Trúc** | `/kien-truc` | Sơ đồ kiến trúc bản chính thức, module, mô hình dữ liệu, quyết định thiết kế, lộ trình |
| **Thiết Lập** | `/thiet-lap` | Thông tin & giao diện tổ chức, bật/tắt chức năng (team), quản lý link mời, nhân vật của tôi, rời tổ chức, giao diện Dạ / Nhật, xuất JSON, đặt lại dữ liệu demo |

**Toàn cục:** thanh lệnh `Ctrl + K` (hoặc `/`), chuông thông báo, đổi giao diện sáng / tối, cánh hoa đào rơi, màn ăn mừng khi first kill / xuất sư / đại thắng, chạy tốt trên điện thoại.

---

## Chạy trên máy (dev)

Yêu cầu: **Node.js 20+** (đã thử với Node 24). Không cần cài PostgreSQL hay Docker — khi dev, máy chủ dùng **PGlite** (PostgreSQL thật chạy nhúng, lưu ở `server/.data/`).

```bash
npm install
```

```bash
npm run dev
```

Lệnh trên chạy cùng lúc **web** (Vite, cổng 5173) và **API** (Fastify, cổng 8787 — Vite chuyển tiếp `/api`, `/auth` sang). Mở http://localhost:5173 → màn **Đăng nhập**:

- **Đăng nhập thử**: bấm vào một môn hạ demo để vào ngay với chức vụ đó (thử phân quyền: Bang Chủ làm được mọi thứ, Tân Binh chỉ điểm danh / ra giá…). Nút **Khách mới** để thử luồng Nhập môn.
- **Đăng nhập Discord**: cần cấu hình như mục dưới.

Lần chạy đầu máy chủ tự tạo CSDL, chạy migration và nạp bang demo **Kinh Hồng Các** (46 môn hạ).

### Bật đăng nhập Discord

1. Vào https://discord.com/developers/applications → **New Application**.
2. Mục **OAuth2** → **Redirects** → thêm `http://localhost:5173/auth/discord/callback` (production: `https://ten-mien-cua-ban/auth/discord/callback`).
3. Sao chép `.env.example` thành `.env`, điền `DISCORD_CLIENT_ID` và `DISCORD_CLIENT_SECRET` (trang OAuth2 → Reset Secret).
4. Chạy lại `npm run dev`. Người đăng nhập Discord **đầu tiên** được gắn vào Bang Chủ (hoặc đặt `BOOTSTRAP_LEADER_DISCORD_ID` là Discord ID của bạn để chỉ định).
5. Người khác đăng nhập → màn **Nhập môn**: gửi đơn gia nhập mới, hoặc xin nhận danh tính một môn hạ có sẵn. Trưởng Lão trở lên duyệt ở trang **Chiêu Mộ**.

App chỉ xin quyền `identify` (tên + ảnh đại diện), không đọc tin nhắn hay máy chủ Discord. Hướng dẫn đầy đủ kèm cách xử lý lỗi: [docs/DISCORD_SETUP.md](docs/DISCORD_SETUP.md).

### Lệnh hữu ích

| Lệnh | Việc |
|---|---|
| `npm test` | Test tích hợp server (Vitest + PGlite trong RAM) |
| `npm run typecheck` | Kiểm tra kiểu cả web lẫn server |
| `npm run build` | Typecheck + build web vào `dist/` |
| `npm start` | Chạy máy chủ (production phục vụ luôn `dist/`) |
| `npm run db:seed` | Xóa dữ liệu bang, nạp lại bang demo (giữ liên kết tài khoản) |
| `npm run db:import -- file.json` | Nạp file "Xuất JSON" (cả file từ bản demo cũ chỉ chạy trên trình duyệt) |
| `npm run db:migrate` | Áp dụng migration |
| `npm run db:generate` | Sinh migration mới sau khi sửa `server/src/db/schema.ts` |

---

## Triển khai (production)

> **Render (đang dùng):** xem [docs/DEPLOY_RENDER.md](docs/DEPLOY_RENDER.md) — `render.yaml` dựng sẵn web + Postgres ở Singapore.

Một tiến trình Node chạy cả API lẫn web. Cần PostgreSQL.

```bash
docker compose up -d --build
```

`docker-compose.yml` dựng Postgres 17 + app ở cổng 8787. Trước khi chạy, tạo `.env` với: `WEB_ORIGIN` (địa chỉ công khai, ví dụ `https://bang.example.com`), `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI` và `POSTGRES_PASSWORD`. Production luôn tắt đăng nhập thử (`DEV_LOGIN=false`). Đặt sau một reverse proxy có HTTPS (Caddy / Nginx) — cookie phiên bật `Secure` ở production.

Không dùng Docker: đặt `DATABASE_URL`, `NODE_ENV=production`, rồi `npm ci && npm run build && npm start`. Nền tảng như Render / Fly.io cấp biến `PORT` — máy chủ tự dùng.

---

## Dữ liệu & bảo mật

- Nguồn sự thật duy nhất là **PostgreSQL**; trình duyệt chỉ giữ bản sao và nhận cập nhật realtime qua WebSocket.
- **Sổ cống hiến chỉ ghi thêm**: trigger trong CSDL chặn sửa/xóa bút toán. Số dư = tổng bút toán; tiến độ boss tính từ các lượt clear.
- **Phân quyền ở máy chủ** theo chức vụ (bảng trong `src/domain/permissions.ts`); giao diện chỉ ẩn/khóa nút cho dễ dùng.
- Phiên đăng nhập lưu trong CSDL, cookie `httpOnly` + `SameSite=Lax`, CSDL chỉ giữ SHA-256 của token. Mọi request ghi cần header chống CSRF và đúng origin. Có giới hạn tần suất, `Idempotency-Key` chống ghi trùng, và nhật ký kiểm tra (`audit_log`) cho mọi thao tác ghi.
- Tên phó bản, boss và bang hội trong dữ liệu mẫu là hư cấu, lấy cảm hứng từ thế giới truyện của Ôn Thụy An.

---

## Cấu trúc thư mục

```
├─ docs/
│  ├─ ARCHITECTURE.md              # kiến trúc chi tiết, sơ đồ mermaid
│  └─ superpowers/specs/           # thiết kế giai đoạn 1 và 2 (hợp đồng API)
├─ server/
│  ├─ drizzle/                     # migration SQL (kèm trigger sổ cái append-only)
│  ├─ src/
│  │  ├─ app.ts · index.ts         # dựng Fastify, khởi động, lịch job
│  │  ├─ auth/                     # Discord OAuth, đăng nhập thử, phiên, phân quyền
│  │  ├─ db/                       # schema Drizzle, kết nối (Postgres / PGlite), importer, CLI
│  │  ├─ modules/                  # thành viên, sư đồ, tình duyên, phó bản, sự kiện, đội hình,
│  │  │                            # bang chiến, bang khố, chiêu mộ, bảng tin
│  │  ├─ realtime/                 # WebSocket + trạm phát
│  │  ├─ jobs/                     # reset tuần, tự chốt đấu giá
│  │  └─ snapshot.ts               # dựng dữ liệu bang theo từng phần (slice)
│  └─ test/                        # test tích hợp
├─ public/
└─ src/
   ├─ api/                         # fetch client, kết nối realtime
   ├─ auth/                        # cổng đăng nhập, màn Đăng nhập / Nhập môn
   ├─ components/                  # chibi, layout, ui, charts, feed
   ├─ data/seed.ts                 # sinh bang demo ổn định theo hạt giống
   ├─ domain/                      # kiểu dữ liệu, hằng số, hợp đồng API, phân quyền (dùng chung với server)
   ├─ pages/                       # mỗi phân hệ một thư mục
   ├─ store/                       # Zustand: guild (bản sao dữ liệu server) + ui
   └─ styles/index.css             # design system
```

---

## Công nghệ

**Web:** React 19 · TypeScript · Vite · Tailwind CSS v4 · Motion · Zustand · Recharts · dnd-kit · React Router · lucide-react.
**Máy chủ:** Fastify 5 · Drizzle ORM · PostgreSQL (PGlite khi dev) · WebSocket · Zod · Vitest.
Font: Be Vietnam Pro, Cormorant Garamond, Ma Shan Zheng (Google Fonts).

---

## Kiến trúc

**Modular monolith**: một máy chủ Fastify chia module rõ ràng, PostgreSQL là nguồn sự thật, realtime qua WebSocket, job nền chạy trong tiến trình (khóa idempotent theo tuần). Redis, BullMQ, Discord bot, Zalo và OCR thuộc giai đoạn 3.

👉 Chi tiết: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · trang **Kiến Trúc** trong app · thiết kế giai đoạn 2: [docs/superpowers/specs/2026-10-22-phase2-backend-design.md](docs/superpowers/specs/2026-10-22-phase2-backend-design.md)

---

*Dự án cộng đồng, không liên kết với NetEase hay VNG. Nhân vật chibi vẽ hoàn toàn bằng SVG.*

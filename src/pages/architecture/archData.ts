export interface ModuleSpec {
  han: string
  name: string
  color: string
  does: string
  entities: string[]
  endpoints: string[]
}

export const MODULE_SPECS: ModuleSpec[] = [
  {
    han: '权',
    name: 'Auth & RBAC',
    color: 'var(--cinnabar)',
    does: 'Đăng nhập Discord, phiên cookie lưu trong CSDL, kiểm tra quyền theo chức vụ và loại tổ chức (bang / Kim Lan / team) cho từng thao tác.',
    entities: ['User', 'Session', 'RankPermission'],
    endpoints: ['GET /auth/discord/callback', 'GET /me', 'POST /auth/logout'],
  },
  {
    han: '众',
    name: 'Thành viên',
    color: 'var(--azure)',
    does: 'Hồ sơ môn hạ, chức vụ, chiến lực theo tuần, ngoại hình chibi.',
    entities: ['Member', 'PowerSnapshot', 'ChibiLook'],
    endpoints: ['GET /guilds/:id/members', 'PATCH /members/:id', 'PUT /members/:id/rank'],
  },
  {
    han: '师',
    name: 'Sư đồ',
    color: 'var(--violet)',
    does: 'Ghép sư phụ – đồ đệ, lộ trình 5 giai đoạn, nhiệm vụ, lễ xuất sư và thưởng.',
    entities: ['Mentorship', 'MentorTask'],
    endpoints: ['POST /mentorships', 'PATCH /mentorships/:id/tasks/:taskId', 'POST /mentorships/:id/graduate'],
  },
  {
    han: '征',
    name: 'Phó bản',
    color: 'var(--jade)',
    does: 'Ghi nhận lượt clear, tiến độ boss theo độ khó, first kill, kỷ lục thời gian.',
    entities: ['Dungeon', 'Boss', 'BossProgress', 'ClearRecord'],
    endpoints: ['POST /guilds/:id/clears', 'GET /guilds/:id/progress', 'GET /guilds/:id/clears?boss='],
  },
  {
    han: '历',
    name: 'Sự kiện',
    color: 'var(--ember)',
    does: 'Lịch tuần, điểm danh tham gia; thay đổi được phát realtime cho mọi người đang xem.',
    entities: ['GuildEvent', 'Rsvp'],
    endpoints: ['POST /guilds/:id/events', 'PUT /events/:id/rsvp', 'WS events:rsvp'],
  },
  {
    han: '战',
    name: 'Bang chiến',
    color: 'var(--cinnabar)',
    does: 'Kết quả trận, chiến tích từng người, MVP; tự cộng cống hiến cho người tham chiến.',
    entities: ['WarRecord', 'WarLine'],
    endpoints: ['POST /guilds/:id/wars', 'GET /guilds/:id/wars', 'GET /wars/:id'],
  },
  {
    han: '库',
    name: 'Bang khố',
    color: 'var(--gold)',
    does: 'Sổ cống hiến chỉ ghi thêm, đấu giá chiến lợi phẩm, chốt phiên trong một transaction.',
    entities: ['LedgerEntry', 'LootItem', 'Bid'],
    endpoints: ['POST /loot/:id/bids', 'POST /loot/:id/close', 'POST /ledger/adjustments'],
  },
  {
    han: '募',
    name: 'Chiêu mộ',
    color: 'var(--sakura)',
    does: 'Form ứng tuyển công khai, kanban duyệt đơn, chấp nhận thì tạo thành viên.',
    entities: ['Application'],
    endpoints: ['POST /guilds/:id/applications', 'PATCH /applications/:id/stage', 'POST /applications/:id/accept'],
  },
  {
    han: '告',
    name: 'Thông báo',
    color: 'var(--muted)',
    does: 'Bảng cáo thị, nhật ký hoạt động, đẩy tin qua Discord / Zalo / Web Push.',
    entities: ['Announcement', 'Activity', 'NotificationJob'],
    endpoints: ['POST /guilds/:id/announcements', 'GET /guilds/:id/activities', 'POST /notify (nội bộ)'],
  },
]

export interface EntityGroup {
  title: string
  han: string
  color: string
  entities: { name: string; fields: string }[]
  relations: string[]
}

export const ENTITY_GROUPS: EntityGroup[] = [
  {
    title: 'Con người',
    han: '人',
    color: 'var(--azure)',
    entities: [
      { name: 'Member', fields: 'id, name, classId, rank, power, contribution, look' },
      { name: 'Mentorship', fields: 'masterId, discipleId, stage 0–4, tasks[]' },
      { name: 'Bond', fields: 'aId, bId, type, intimacy, since' },
      { name: 'Application', fields: 'name, classId, power, stage' },
    ],
    relations: ['Member 1—n Mentorship (vai sư phụ hoặc đồ đệ)', 'Member n—n Member qua Bond', 'Application → Member khi được chấp nhận'],
  },
  {
    title: 'Chinh chiến',
    han: '征',
    color: 'var(--jade)',
    entities: [
      { name: 'Dungeon / Boss', fields: 'size, minSize, modes[], bosses[]' },
      { name: 'ClearRecord', fields: 'dungeonId, mode, bossId, memberIds[], mvpId' },
      { name: 'WarRecord', fields: 'opponent, result, score, lines[]' },
      { name: 'GuildEvent', fields: 'type, start, capacity, rsvp{}' },
    ],
    relations: ['Dungeon 1—n Boss 1—n ClearRecord', 'ClearRecord n—n Member', 'WarRecord 1—n WarLine n—1 Member', 'GuildEvent 1—n Rsvp n—1 Member'],
  },
  {
    title: 'Kinh tế',
    han: '财',
    color: 'var(--gold)',
    entities: [
      { name: 'LedgerEntry', fields: 'memberId, delta, reason, category, date' },
      { name: 'LootItem', fields: 'name, rarity, status, startPrice, endsAt' },
      { name: 'Bid', fields: 'memberId, amount, at' },
    ],
    relations: ['Member 1—n LedgerEntry (số dư = tổng delta)', 'LootItem 1—n Bid n—1 Member', 'Chốt phiên → 1 LedgerEntry âm cho người thắng'],
  },
]

export const DECISIONS: { title: string; han: string; why: string }[] = [
  {
    han: '一',
    title: 'Modular monolith, chưa tách microservices',
    why: 'Một bang vài trăm người không cần hạ tầng phân tán. Một backend chia module rõ ràng dễ triển khai, dễ debug; khi cần có thể tách module nóng (thông báo, OCR) ra sau.',
  },
  {
    han: '账',
    title: 'Sổ cống hiến chỉ ghi thêm (append-only)',
    why: 'Không bao giờ UPDATE/DELETE bút toán. Sai thì thêm bút toán điều chỉnh có người duyệt. Số dư luôn tính lại được, chống gian lận và tranh cãi khi chia đồ.',
  },
  {
    han: '权',
    title: 'Phân quyền theo chức vụ (RBAC)',
    why: 'Quyền gắn với chức vụ trong bang: Tân Binh chỉ điểm danh, Đường Chủ ghi nhận clear, Phó Bang duyệt điều chỉnh cống hiến, Bang Chủ bổ nhiệm.',
  },
  {
    han: '榜',
    title: 'Bảng xếp hạng: SQL trước, Redis khi cần',
    why: 'Bang ≤ 80 người thì một câu SQL tổng hợp là đủ nhanh. Redis sorted set chỉ thêm vào khi nhiều bang / nhiều instance (giai đoạn 3–4) — tránh thêm hạ tầng sớm.',
  },
  {
    han: '速',
    title: 'Realtime qua WebSocket',
    why: 'Ai điểm danh, ra giá hay ghi clear thì máy khác nhận tín hiệu ngay và chỉ tải lại phần dữ liệu đã đổi. Trạm phát hiện chạy trong tiến trình; nhiều instance thì thay bằng Redis pub/sub.',
  },
  {
    han: '轻',
    title: 'Fastify + PGlite khi phát triển',
    why: 'Fastify nhẹ, chạy TypeScript trực tiếp (tsx). PGlite là PostgreSQL thật chạy nhúng: máy dev không cần cài Docker hay Postgres, test tích hợp chạy trong vài giây.',
  },
  {
    han: '时',
    title: 'Job reset tuần idempotent',
    why: 'Cron thứ Hai 05:00 dùng khóa theo mã tuần (VD 2026-W43): chạy lại lần hai cũng không cộng/xóa trùng.',
  },
  {
    han: '识',
    title: 'OCR ảnh chụp là job bất đồng bộ',
    why: 'Thành viên tải ảnh màn hình chỉ số, worker đọc chiến lực và gửi lại để xác nhận — API không bị chặn bởi xử lý ảnh nặng.',
  },
]

export const ROADMAP: { phase: string; title: string; items: string[]; done?: boolean }[] = [
  {
    phase: 'Giai đoạn 1',
    title: 'Bản demo frontend',
    items: ['15 phân hệ đầy đủ thao tác', 'Chibi SVG theo lưu phái', 'Lưu trong trình duyệt'],
    done: true,
  },
  {
    phase: 'Giai đoạn 2',
    title: 'Backend & đăng nhập',
    items: ['Fastify + PostgreSQL (PGlite khi dev)', 'Đăng nhập Discord, phân quyền theo chức vụ', 'Realtime WebSocket, job reset tuần'],
    done: true,
  },
  {
    phase: 'Giai đoạn 3',
    title: 'Nhiều tổ chức',
    items: ['Bang hội · Kim Lan 12 người · team tự lập', 'Nhân vật dùng chung, link mời', 'Chỉ bật chức năng có trong game', 'Giao diện theo tổ chức (Bạch Gia…)'],
    done: true,
  },
  { phase: 'Giai đoạn 4', title: 'Bot & tự động hóa', items: ['Discord bot điểm danh', 'Thông báo Zalo', 'OCR ảnh chụp chỉ số'] },
  { phase: 'Giai đoạn 5', title: 'Mở rộng', items: ['PWA cài lên điện thoại', 'Liên minh giữa các bang', 'Thống kê theo mùa'] },
]

export const STACK: { group: string; items: string[] }[] = [
  { group: 'Giao diện', items: ['React 19', 'TypeScript', 'Vite', 'Tailwind v4', 'Motion', 'Recharts', 'dnd-kit'] },
  { group: 'Máy chủ', items: ['Fastify 5', 'Zod', 'WebSocket', 'Drizzle ORM'] },
  { group: 'Dữ liệu', items: ['PostgreSQL 17', 'PGlite (dev)', 'Redis 7 (sau)'] },
  { group: 'Vận hành', items: ['Docker', 'GitHub Actions', 'OpenTelemetry', 'Sentry'] },
]

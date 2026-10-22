import { Arrow, ArchDefs, Box, C, Label, Zone } from './svgParts'

const ID = 'sys'

const MODULES: { han: string; title: string; sub: string; sub2: string; color: string }[] = [
  { han: '众', title: 'Thành viên', sub: 'Member · chức vụ', sub2: 'chiến lực theo tuần', color: C.azure },
  { han: '师', title: 'Sư đồ', sub: 'Mentorship · Task', sub2: '5 giai đoạn xuất sư', color: C.violet },
  { han: '征', title: 'Phó bản', sub: 'Clear · Progress', sub2: 'first kill, kỷ lục', color: C.jade },
  { han: '历', title: 'Sự kiện', sub: 'Event · RSVP', sub2: 'điểm danh realtime', color: C.ember },
  { han: '战', title: 'Bang chiến', sub: 'War · WarLine', sub2: 'K/D/A, MVP', color: C.cinnabar },
  { han: '库', title: 'Bang khố', sub: 'Ledger · Loot · Bid', sub2: 'sổ chỉ ghi thêm', color: C.gold },
  { han: '募', title: 'Chiêu mộ', sub: 'Application', sub2: 'duyệt → thành viên', color: C.sakura },
  { han: '告', title: 'Thông báo', sub: 'Announcement', sub2: 'Activity feed', color: C.muted },
]

const WORKERS: { han: string; title: string; sub: string; color: string }[] = [
  { han: '信', title: 'Gửi thông báo', sub: 'Discord · Zalo · Web Push', color: C.violet },
  { han: '识', title: 'OCR ảnh chụp', sub: 'Đọc chiến lực từ ảnh', color: C.jade },
  { han: '汇', title: 'Tổng hợp tuần', sub: 'Xếp hạng · báo cáo', color: C.gold },
  { han: '时', title: 'Cron reset', sub: 'Thứ Hai 05:00 · idempotent', color: C.cinnabar },
]

/** Sơ đồ kiến trúc bản production — modular monolith */
export function SystemDiagram() {
  const workerY = (i: number) => 296 + i * 68
  return (
    <svg viewBox="0 0 1200 800" className="block h-auto w-full min-w-[920px]" role="img" aria-label="Sơ đồ kiến trúc hệ thống Thủy Hàn Lệnh">
      <ArchDefs id={ID} />

      {/* ---------- Kênh truy cập ---------- */}
      <Zone x={30} y={18} w={1140} h={122} label="KÊNH TRUY CẬP" color={C.azure} />
      <Box id={ID} x={80} y={50} w={300} h={64} han="网" title="Web SPA · PWA" sub="React · cài như app trên điện thoại" color={C.azure} />
      <Box id={ID} x={450} y={50} w={300} h={64} han="机" title="Discord Bot" sub="/diemdanh · nhắc lịch · báo first kill" color={C.violet} />
      <Box id={ID} x={820} y={50} w={300} h={64} han="讯" title="Zalo OA" sub="Thông báo cho người không dùng Discord" color={C.jade} />

      {/* ---------- API ---------- */}
      <Zone x={30} y={178} w={780} h={404} label="API · MODULAR MONOLITH (NestJS / Fastify)" color={C.gold} />
      <Box id={ID} x={60} y={212} w={720} h={56} han="门" title="Cổng API · REST + WebSocket" sub="Xác thực JWT · giới hạn tần suất · kiểm tra dữ liệu đầu vào" color={C.gold} />
      <Box id={ID} x={60} y={282} w={720} h={50} han="权" title="Auth & RBAC" sub="Đăng nhập Discord OAuth · quyền theo chức vụ (Bang Chủ → Tân Binh)" color={C.cinnabar} />
      {MODULES.map((m, i) => {
        const col = i % 4
        const row = Math.floor(i / 4)
        return <Box key={m.title} id={ID} x={60 + col * 185} y={348 + row * 112} w={165} h={96} han={m.han} title={m.title} sub={m.sub} sub2={m.sub2} color={m.color} />
      })}

      {/* ---------- Xử lý nền ---------- */}
      <Zone x={840} y={178} w={330} h={404} label="XỬ LÝ NỀN" color={C.ember} />
      <Box id={ID} x={870} y={212} w={270} h={56} han="队" title="Hàng đợi BullMQ" sub="Job bền vững · tự thử lại" color={C.ember} />
      {WORKERS.map((w, i) => (
        <Box key={w.title} id={ID} x={895} y={workerY(i)} w={245} h={54} han={w.han} title={w.title} sub={w.sub} color={w.color} />
      ))}

      {/* ---------- Lưu trữ ---------- */}
      <Zone x={30} y={620} w={1140} h={160} label="LƯU TRỮ" color={C.jade} />
      <Box id={ID} x={70} y={662} w={320} h={84} han="数" title="PostgreSQL" sub="Dữ liệu chính, ràng buộc chặt" sub2="Sổ cống hiến append-only" color={C.azure} />
      <Box id={ID} x={440} y={662} w={320} h={84} han="速" title="Redis" sub="Cache · bảng xếp hạng (sorted set)" sub2="Pub/sub cho WebSocket" color={C.cinnabar} />
      <Box id={ID} x={810} y={662} w={320} h={84} han="藏" title="Object Storage (S3 / R2)" sub="Ảnh chụp chỉ số, avatar" sub2="File xuất báo cáo" color={C.jade} />

      {/* ---------- Mũi tên ---------- */}
      {/* client → API */}
      <Arrow id={ID} d="M230,116 L230,210" />
      <Label x={230} y={160}>
        HTTPS · WSS
      </Label>
      <Arrow id={ID} d="M600,116 L600,210" />
      <Label x={600} y={160}>
        lệnh bot → REST
      </Label>
      <Arrow id={ID} d="M940,116 L940,150 L740,150 L740,210" />
      <Label x={850} y={150}>
        webhook
      </Label>

      {/* API → hàng đợi */}
      <Arrow id={ID} d="M782,240 L868,240" />
      <Label x={825} y={226}>
        enqueue
      </Label>

      {/* hàng đợi → worker */}
      <path d={`M880,270 L880,${workerY(3) + 27}`} fill="none" style={{ stroke: C.gold }} strokeWidth={1.6} opacity={0.6} />
      {WORKERS.map((w, i) => (
        <Arrow key={w.title} id={ID} d={`M880,${workerY(i) + 27} L893,${workerY(i) + 27}`} animated={false} />
      ))}

      {/* worker thông báo → Discord / Zalo */}
      <Arrow id={ID} d={`M1142,${workerY(0) + 27} L1160,${workerY(0) + 27} L1160,82 L1122,82`} muted />
      <text
        x={1176}
        y={200}
        transform="rotate(90 1176 200)"
        textAnchor="middle"
        style={{ fill: 'var(--muted)', fontFamily: 'var(--font-sans)' }}
        fontSize={10.5}
        fontWeight={600}
      >
        đẩy thông báo
      </text>
      <Arrow id={ID} d="M1160,82 L1160,34 L600,34 L600,48" muted />

      {/* API → lưu trữ */}
      <Arrow id={ID} d="M230,584 L230,660" />
      <Label x={230} y={622}>
        SQL · transaction
      </Label>
      <Arrow id={ID} d="M560,584 L560,660" />
      <Arrow id={ID} d="M640,660 L640,584" muted />
      <Label x={600} y={622}>
        cache · pub/sub
      </Label>
      <Arrow id={ID} d="M1000,584 L1000,660" />
      <Label x={1000} y={622}>
        đọc ảnh · ghi file
      </Label>
      <Arrow id={ID} d="M900,584 L900,604 L330,604 L330,660" muted />
    </svg>
  )
}

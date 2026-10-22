import { Arrow, ArchDefs, Box, C, Label, Zone } from './svgParts'

const ID = 'live'

/** Sơ đồ hệ thống đang chạy (giai đoạn 2): trình duyệt ↔ máy chủ Fastify ↔ PostgreSQL, đăng nhập qua Discord */
export function DemoDiagram() {
  return (
    <svg viewBox="0 0 1000 320" className="mx-auto block h-auto w-full min-w-[760px] max-w-[1000px]" role="img" aria-label="Sơ đồ hệ thống đang chạy">
      <ArchDefs id={ID} />
      <Zone x={10} y={14} w={270} h={250} label="TRÌNH DUYỆT" color={C.azure} />
      <Zone x={300} y={14} w={490} h={250} label="MÁY CHỦ · FASTIFY" color={C.gold} />
      <Zone x={810} y={14} w={180} h={250} label="BÊN NGOÀI" color={C.jade} />

      <Box id={ID} x={30} y={56} w={230} h={66} han="页" title="Trang React" sub="15 phân hệ · chibi SVG" color={C.azure} />
      <Box id={ID} x={30} y={168} w={230} h={66} han="仓" title="Store · Zustand" sub="bản sao snapshot" sub2="cập nhật lạc quan" color={C.azure} />

      <Box id={ID} x={320} y={56} w={210} h={66} han="门" title="Cổng API" sub="REST + WebSocket" sub2="zod · CSRF · rate limit" color={C.gold} />
      <Box id={ID} x={560} y={56} w={210} h={66} han="权" title="Auth & RBAC" sub="phiên cookie (SHA-256)" sub2="quyền theo chức vụ" color={C.cinnabar} />
      <Box id={ID} x={320} y={168} w={210} h={66} han="块" title="Module nghiệp vụ" sub="11 module · transaction" sub2="idempotency · audit" color={C.gold} />
      <Box id={ID} x={560} y={168} w={210} h={66} han="时" title="Job nền" sub="reset tuần (khóa theo tuần)" sub2="tự chốt đấu giá" color={C.violet} />

      <Box id={ID} x={826} y={56} w={150} h={66} han="龙" title="Discord" sub="OAuth2 · identify" color={C.violet} />
      <Box id={ID} x={826} y={168} w={150} h={66} han="数" title="PostgreSQL" sub="Drizzle ORM" sub2="PGlite khi dev" color={C.jade} />

      {/* trình duyệt */}
      <Arrow id={ID} d="M145,124 L145,166" both />
      <Label x={182} y={150}>
        action / dữ liệu
      </Label>
      <Arrow id={ID} d="M262,201 C292,201 290,89 318,89" both />
      <Label x={290} y={252}>
        HTTPS · WS
      </Label>

      {/* máy chủ */}
      <Arrow id={ID} d="M532,89 L558,89" animated={false} />
      <Arrow id={ID} d="M425,124 L425,166" />
      <Arrow id={ID} d="M772,89 L824,89" muted />
      <Label x={798} y={78}>
        OAuth2
      </Label>
      <Arrow id={ID} d="M772,201 L824,201" muted />

      {/* module → CSDL (vòng xuống dưới Job nền) */}
      <Arrow id={ID} d="M425,236 C425,300 901,306 901,238" />
      <Label x={663} y={296}>
        SQL trong transaction · sổ cái append-only (trigger)
      </Label>
    </svg>
  )
}

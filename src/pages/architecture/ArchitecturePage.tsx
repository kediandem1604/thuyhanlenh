import { motion } from 'motion/react'
import { Check, Hand, Layers, Server } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, SectionTitle } from '@/components/ui/Panel'
import { cn } from '@/lib/utils'
import { SystemDiagram } from './SystemDiagram'
import { DemoDiagram } from './DemoDiagram'
import { DECISIONS, ENTITY_GROUPS, MODULE_SPECS, ROADMAP, STACK } from './archData'

function ScrollHint() {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-[11.5px] text-muted lg:hidden">
      <Hand size={13} /> Vuốt ngang để xem toàn bộ sơ đồ
    </p>
  )
}

export default function ArchitecturePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Hệ Thống · Bản vẽ"
        title="Kiến Trúc Hệ Thống"
        han="构"
        description="Thủy Hàn Lệnh được thiết kế để chạy ngay trong trình duyệt hôm nay, và lớn lên thành một hệ thống có backend, bot Discord và thông báo Zalo khi bang cần."
        actions={
          <span className="chip !h-8 text-gold">
            <Layers size={13} /> Modular monolith · 4 lớp
          </span>
        }
      />

      {/* Sơ đồ chính */}
      <Panel corners className="overflow-hidden">
        <SectionTitle han="图" title="Kiến trúc bản chính thức" subtitle="Kênh truy cập → API một khối chia module → xử lý nền → lưu trữ" right={<Server size={18} className="text-gold" />} />
        <ScrollHint />
        <div className="scroll-x -mx-2 px-2 pb-2">
          <SystemDiagram />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[11.5px] text-muted">
          <span className="inline-flex items-center gap-2">
            <svg width="28" height="6" aria-hidden>
              <path d="M0,3 L28,3" style={{ stroke: 'var(--gold)' }} strokeWidth={2} strokeDasharray="7 7" />
            </svg>
            Luồng yêu cầu chính
          </span>
          <span className="inline-flex items-center gap-2">
            <svg width="28" height="6" aria-hidden>
              <path d="M0,3 L28,3" style={{ stroke: 'var(--muted)' }} strokeWidth={1.6} strokeDasharray="4 6" />
            </svg>
            Luồng phụ: thông báo, pub/sub, ghi nền
          </span>
        </div>
      </Panel>

      {/* Bản demo */}
      <Panel corners className="overflow-hidden">
        <SectionTitle han="今" title="Hệ thống đang chạy" subtitle="Giai đoạn 2–3: trình duyệt ↔ máy chủ Fastify ↔ PostgreSQL, đăng nhập Discord, nhiều tổ chức (bang · Kim Lan · team)" />
        <ScrollHint />
        <div className="space-y-5">
          <div className="scroll-x -mx-2 px-2">
            <DemoDiagram />
          </div>
          <ul className="grid gap-x-6 gap-y-2.5 text-[13px] text-ink-2 md:grid-cols-2">
            {[
              ['Trang', 'đọc store, gọi action; nút nào không đủ quyền thì ẩn hoặc khóa.'],
              ['Store', 'bản sao dữ liệu server: gọi API, ghép phần dữ liệu đổi, hoàn tác nếu server từ chối.'],
              ['Máy chủ', 'nơi duy nhất kiểm tra quyền và luật nghiệp vụ; mọi thao tác ghi đều có nhật ký kiểm tra (audit).'],
              ['Realtime', 'ai sửa gì, máy khác nhận tín hiệu qua WebSocket và tải lại đúng phần đã đổi.'],
              ['Dùng chung', 'src/domain là hợp đồng giữa web và server: kiểu dữ liệu, hằng số, bảng phân quyền.'],
              ['Kiểm thử', 'hơn trăm test tích hợp chạy trên PostgreSQL nhúng (PGlite) — không cần cài gì.'],
            ].map(([k, v]) => (
              <li key={k} className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <span>
                  <b className="text-ink">{k}</b> {v}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      {/* Module */}
      <div>
        <SectionTitle han="块" title="Các module" subtitle="Mỗi module sở hữu dữ liệu và endpoint của riêng nó" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {MODULE_SPECS.map((m, i) => (
            <motion.div key={m.name} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: (i % 3) * 0.05 }}>
              <Panel hover className="h-full">
                <div className="flex items-center gap-3">
                  <span className="han grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[20px] text-white" style={{ background: `color-mix(in oklab, ${m.color} 85%, black 10%)` }}>
                    {m.han}
                  </span>
                  <h4 className="title-display text-[21px] text-ink">{m.name}</h4>
                </div>
                <p className="mt-3 text-[13px] text-ink-2">{m.does}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.entities.map((e) => (
                    <span key={e} className="chip !h-6 font-mono !text-[11px]">
                      {e}
                    </span>
                  ))}
                </div>
                <div className="mt-3 space-y-1 rounded-xl border border-line bg-black/15 p-2.5">
                  {m.endpoints.map((ep) => {
                    const [verb, ...rest] = ep.split(' ')
                    return (
                      <div key={ep} className="flex min-w-0 items-center gap-2 font-mono text-[11.5px]">
                        <span
                          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
                          style={{
                            color: verb === 'GET' ? 'var(--azure)' : verb === 'WS' ? 'var(--violet)' : 'var(--jade)',
                            background: 'color-mix(in oklab, currentColor 14%, transparent)',
                          }}
                        >
                          {verb}
                        </span>
                        <span className="truncate text-ink-2">{rest.join(' ')}</span>
                      </div>
                    )
                  })}
                </div>
              </Panel>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Dữ liệu */}
      <Panel corners>
        <SectionTitle han="数" title="Mô hình dữ liệu" subtitle="Thực thể chính và quan hệ (xem src/domain/types.ts)" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {ENTITY_GROUPS.map((g) => (
            <div key={g.title} className="rounded-2xl border border-line bg-black/10 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="han text-[20px]" style={{ color: g.color }}>
                  {g.han}
                </span>
                <span className="text-[14px] font-bold text-ink">{g.title}</span>
              </div>
              <div className="space-y-2">
                {g.entities.map((e) => (
                  <div key={e.name} className="rounded-xl border border-line px-3 py-2" style={{ background: `color-mix(in oklab, ${g.color} 6%, transparent)` }}>
                    <div className="font-mono text-[12.5px] font-bold text-ink">{e.name}</div>
                    <div className="font-mono text-[11px] text-muted">{e.fields}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1">
                {g.relations.map((r) => (
                  <div key={r} className="flex gap-2 text-[12px] text-ink-2">
                    <span style={{ color: g.color }}>↳</span>
                    {r}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Quyết định */}
      <div>
        <SectionTitle han="策" title="Những quyết định quan trọng" subtitle="Và vì sao chọn như vậy" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {DECISIONS.map((d) => (
            <Panel key={d.title} hover className="relative overflow-hidden">
              <span aria-hidden className="han pointer-events-none absolute -right-2 -top-4 text-[80px] leading-none text-gold opacity-[0.07]">
                {d.han}
              </span>
              <h4 className="relative text-[14.5px] font-bold text-ink">{d.title}</h4>
              <p className="relative mt-2 text-[12.5px] leading-relaxed text-ink-2">{d.why}</p>
            </Panel>
          ))}
        </div>
      </div>

      {/* Lộ trình + công nghệ */}
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.6fr_1fr]">
        <Panel corners>
          <SectionTitle han="路" title="Lộ trình" subtitle="Từ bản demo đến hệ thống hoàn chỉnh" />
          <ol className="relative grid gap-4 md:grid-cols-4">
            <span aria-hidden className="absolute left-[19px] top-4 bottom-4 w-px bg-line md:left-4 md:right-4 md:top-[19px] md:bottom-auto md:h-px md:w-auto" />
            {ROADMAP.map((r, i) => (
              <li key={r.phase} className="relative flex gap-3 md:flex-col">
                <span
                  className={cn('relative z-[1] grid h-10 w-10 shrink-0 place-items-center rounded-full border text-[14px] font-bold', r.done ? 'bg-gold-grad text-on-gold border-transparent' : 'border-line-strong bg-[var(--surface-solid)] text-gold')}
                >
                  {r.done ? <Check size={18} strokeWidth={3} /> : i + 1}
                </span>
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted">{r.phase}</div>
                  <div className="text-[14px] font-bold text-ink">
                    {r.title}
                    {r.done && <span className="ml-2 text-[11px] font-semibold text-jade">Đã xong</span>}
                  </div>
                  <ul className="mt-1.5 space-y-0.5 text-[12px] text-ink-2">
                    {r.items.map((it) => (
                      <li key={it}>· {it}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel corners>
          <SectionTitle han="器" title="Công nghệ" subtitle="Ưu tiên công cụ phổ biến, dễ tìm người hỗ trợ" />
          <div className="space-y-3">
            {STACK.map((s) => (
              <div key={s.group}>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{s.group}</div>
                <div className="flex flex-wrap gap-1.5">
                  {s.items.map((it) => (
                    <span key={it} className="chip">
                      {it}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}

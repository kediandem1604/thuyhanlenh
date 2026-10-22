// Minh họa: lịch 7 ngày tới + thẻ sự kiện có điểm danh (bấm thử được, chỉ đổi trên trang này).
import { useMemo, useState } from 'react'
import { Check, CircleHelp, Clock, MapPin, X } from 'lucide-react'
import { EVENT_TYPES } from '@/domain/constants'
import type { EventType, RsvpStatus } from '@/domain/types'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { Countdown } from '@/components/ui/Countdown'
import { cn } from '@/lib/utils'
import { MockPanel } from './MockPanel'
import { CAST, type SampleHero } from './sample'

const WD_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const WD_LONG = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']

interface SampleEvent {
  /** số ngày kể từ hôm nay */
  day: number
  hour: number
  minute: number
  type: EventType
  title: string
  place: string
  capacity: number
  base: Record<RsvpStatus, number>
  who: SampleHero[]
}

const EVENTS: SampleEvent[] = [
  { day: 1, hour: 20, minute: 0, type: 'raid', title: 'Hủy Nặc Thành · Anh Hùng', place: 'Tập trung cổng thành', capacity: 10, base: { yes: 7, maybe: 2, no: 1 }, who: [CAST.hanPhong, CAST.thanhY, CAST.huyetAnh, CAST.vanKhe] },
  { day: 2, hour: 20, minute: 30, type: 'guild-war', title: 'Bang chiến tuần', place: 'Chiến trường Biện Kinh', capacity: 30, base: { yes: 22, maybe: 4, no: 2 }, who: [CAST.huyetAnh, CAST.daVu, CAST.kiemTam, CAST.thietCot] },
  { day: 4, hour: 21, minute: 0, type: 'banquet', title: 'Yến tiệc bang', place: 'Bang Hội Đường', capacity: 80, base: { yes: 31, maybe: 9, no: 3 }, who: [CAST.linhNhi, CAST.toMac, CAST.hoaRu, CAST.tieuDao] },
  { day: 5, hour: 19, minute: 30, type: 'boss', title: 'Săn Boss Thế Giới', place: 'Theo hiệu lệnh trên kênh bang', capacity: 20, base: { yes: 12, maybe: 3, no: 0 }, who: [CAST.vanTieu, CAST.kiemTam, CAST.thanhY] },
  { day: 6, hour: 20, minute: 0, type: 'training', title: 'Luyện công cùng tân thủ', place: 'Diễn võ trường', capacity: 15, base: { yes: 6, maybe: 4, no: 1 }, who: [CAST.hanPhong, CAST.linhNhi] },
]

const RSVP: { id: RsvpStatus; label: string; color: string; icon: typeof Check }[] = [
  { id: 'yes', label: 'Đi', color: 'var(--jade)', icon: Check },
  { id: 'maybe', label: 'Có thể', color: 'var(--gold)', icon: CircleHelp },
  { id: 'no', label: 'Vắng', color: 'var(--cinnabar)', icon: X },
]

/** màu loại sự kiện pha với màu chữ — đọc được ở cả nền tối lẫn sáng */
const ink = (c: string) => `color-mix(in oklab, ${c} 62%, var(--text))`

function startOf(day: number, h = 0, m = 0) {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  d.setDate(d.getDate() + day)
  return d
}

export function CalendarMock() {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => startOf(i)), [])
  const [selected, setSelected] = useState(1)
  const [mine, setMine] = useState<Record<number, RsvpStatus | undefined>>({})

  const ev = EVENTS.find((e) => e.day === selected)
  const start = ev ? startOf(ev.day, ev.hour, ev.minute) : null
  const meta = ev ? EVENT_TYPES[ev.type] : null
  const myChoice = ev ? mine[ev.day] : undefined
  const count = (st: RsvpStatus) => (ev ? ev.base[st] + (myChoice === st ? 1 : 0) : 0)

  return (
    <MockPanel
      han="历"
      title="Lịch hoạt động"
      sub="7 ngày tới · bấm vào ngày để xem"
      right={<span className="chip hidden sm:inline-flex">{EVENTS.length} hẹn</span>}
    >
      {/* dải ngày */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5" role="group" aria-label="Chọn ngày">
        {days.map((d, i) => {
          const e = EVENTS.find((x) => x.day === i)
          const on = selected === i
          return (
            <button
              key={i}
              type="button"
              aria-pressed={on}
              aria-label={`${WD_LONG[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}${e ? ` — ${EVENT_TYPES[e.type].name}` : ''}`}
              onClick={() => setSelected(i)}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl border px-0.5 pb-1.5 pt-1.5 transition',
                on ? 'border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--gold)_16%,transparent)] shadow-[var(--glow-gold)]' : 'border-line hover:border-line-strong',
              )}
            >
              <span className={cn('text-[10.5px] font-semibold uppercase', on ? 'text-gold' : 'text-muted')}>{i === 0 ? 'Nay' : WD_SHORT[d.getDay()]}</span>
              <span className={cn('text-[15px] font-bold tabular-nums', on ? 'text-ink' : 'text-ink-2')}>{d.getDate()}</span>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: e ? EVENT_TYPES[e.type].color : 'transparent' }} />
            </button>
          )
        })}
      </div>

      {/* thẻ sự kiện của ngày đang chọn */}
      <div className="mt-4 grid min-h-[190px]">
        {!ev || !meta || !start ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-line text-center">
            <div>
              <span className="han text-[34px] text-gold opacity-60" aria-hidden>
                静
              </span>
              <p className="mt-1 text-[13px] text-muted">Ngày rảnh — chưa có hẹn nào.</p>
            </div>
          </div>
        ) : (
          <div
            key={ev.day}
            className="lp-pop relative overflow-hidden rounded-2xl border p-4"
            style={{
              borderColor: `color-mix(in oklab, ${meta.color} 45%, transparent)`,
              background: `linear-gradient(135deg, color-mix(in oklab, ${meta.color} 16%, transparent), transparent 70%)`,
            }}
          >
            <span className="han pointer-events-none absolute -right-2 -top-5 text-[92px] leading-none opacity-10" style={{ color: meta.color }} aria-hidden>
              {meta.han}
            </span>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: ink(meta.color) }}>
              {meta.name} · {WD_LONG[start.getDay()]}
            </div>
            <div className="mt-1 text-[16px] font-bold text-ink">{ev.title}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
              <span className="inline-flex items-center gap-1">
                <Clock size={12} /> {String(ev.hour).padStart(2, '0')}:{String(ev.minute).padStart(2, '0')}
              </span>
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin size={12} className="shrink-0" /> <span className="truncate">{ev.place}</span>
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex -space-x-2">
                  {ev.who.map((h) => (
                    <ChibiAvatar key={h.id} look={h.look} classId={h.classId} size={26} className="rounded-full ring-2 ring-[var(--surface-solid)]" />
                  ))}
                </span>
                <span className="text-[12.5px] text-ink-2">
                  <b className="tabular-nums text-ink">{count('yes')}</b>/{ev.capacity} sẽ đi
                </span>
              </div>
              <span className="text-[12px] text-muted">
                Bắt đầu sau{' '}
                <b className="text-ink">
                  <Countdown to={start} compact />
                </b>
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Điểm danh của bạn">
              {RSVP.map((r) => {
                const on = myChoice === r.id
                const Icon = r.icon
                return (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setMine((s) => ({ ...s, [ev.day]: on ? undefined : r.id }))}
                    className={cn('btn btn-sm w-full gap-1.5 px-2', on && 'shadow-[0_6px_18px_-8px_currentColor]')}
                    style={on ? { color: r.color, borderColor: `color-mix(in oklab, ${r.color} 60%, transparent)`, background: `color-mix(in oklab, ${r.color} 14%, var(--surface-2))` } : undefined}
                  >
                    <Icon size={14} style={{ color: r.color }} aria-hidden />
                    {r.label}
                    <span className="tabular-nums text-muted">{count(r.id)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* các hẹn khác */}
      <div className="mt-4">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Sắp tới</div>
        <ul className="space-y-1.5">
          {EVENTS.filter((e) => e.day !== selected)
            .slice(0, 3)
            .map((e) => {
              const m = EVENT_TYPES[e.type]
              const d = days[e.day]
              return (
                <li key={e.day}>
                  <button
                    type="button"
                    onClick={() => setSelected(e.day)}
                    className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2 text-left transition hover:border-line-strong"
                  >
                    <span
                      className="han grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[14px]"
                      style={{ color: ink(m.color), background: `color-mix(in oklab, ${m.color} 14%, transparent)` }}
                      aria-hidden
                    >
                      {m.han}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink">{e.title}</span>
                      <span className="block text-[11.5px] text-muted">
                        {WD_LONG[d.getDay()]} · {String(e.hour).padStart(2, '0')}:{String(e.minute).padStart(2, '0')}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11.5px] tabular-nums text-muted">
                      {e.base.yes + (mine[e.day] === 'yes' ? 1 : 0)}/{e.capacity} đi
                    </span>
                  </button>
                </li>
              )
            })}
        </ul>
      </div>
    </MockPanel>
  )
}

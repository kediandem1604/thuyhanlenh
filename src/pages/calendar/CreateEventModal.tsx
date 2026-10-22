import { useEffect, useMemo, useState } from 'react'
import { CalendarPlus, Loader2 } from 'lucide-react'
import { RANKS } from '@/domain/constants'
import { eventTypesFor } from '@/domain/orgs'
import type { EventType, GuildEvent, OrgType } from '@/domain/types'
import { rankLabel, useCurrentUser, useGuild, useOrg, useOrgType } from '@/store/guild'
import { toast } from '@/store/ui'
import { cn } from '@/lib/utils'
import { Field, Modal } from '@/components/ui/Modal'
import { eventMeta, toDateInput } from './calendarUtils'

interface EventDefaults {
  title: string
  duration: number
  capacity: number
  location: string
}

const BASE_DEFAULTS: Record<EventType, EventDefaults> = {
  raid: { title: 'Phó bản bang', duration: 120, capacity: 25, location: 'Cổng phó bản' },
  'guild-war': { title: 'Bang Chiến', duration: 60, capacity: 40, location: 'Chiến trường Bang Hội' },
  banquet: { title: 'Yến Tiệc Bang', duration: 45, capacity: 80, location: 'Hậu viện bang hội' },
  tournament: { title: 'Đại Hội Tỉ Võ', duration: 120, capacity: 10, location: 'Lôi Đài Biện Kinh' },
  training: { title: 'Luyện công cùng tân thủ', duration: 60, capacity: 15, location: 'Luyện Võ Trường' },
  boss: { title: 'Boss Thế Giới', duration: 30, capacity: 40, location: 'Bản đồ thế giới' },
}

const TYPE_TITLES: Partial<Record<OrgType, Partial<Record<EventType, string>>>> = {
  kimlan: { raid: 'Cùng nhau đi phó bản', boss: 'Cả nhà săn Boss Thế Giới' },
  team: { raid: 'Phó bản team', 'guild-war': 'Thi đấu', training: 'Luyện cơ chế boss' },
}

/** Giá trị gợi ý khi chọn loại sự kiện — theo loại tổ chức (Kim Lan tối đa 12 người) */
function defaultsFor(type: EventType, orgType: OrgType, orgName: string | undefined, maxCapacity: number | null): EventDefaults {
  const base = BASE_DEFAULTS[type]
  const title = TYPE_TITLES[orgType]?.[type] ?? base.title
  const location = type === 'banquet' && orgName ? `Hậu viện ${orgName}` : base.location
  const capacity = maxCapacity ? Math.min(base.capacity, maxCapacity) : base.capacity
  return { ...base, title, location, capacity }
}

export function CreateEventModal({
  open,
  onClose,
  defaultDate,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  defaultDate: Date
  onCreated: (ev: GuildEvent) => void
}) {
  const members = useGuild((s) => s.members)
  const addEvent = useGuild((s) => s.addEvent)
  const me = useCurrentUser()
  const org = useOrg()
  const orgType = useOrgType()
  const features = org?.features
  // loại sự kiện được phép theo tổ chức (Kim Lan: chỉ phó bản / boss; team: theo chức năng đang bật)
  const allowed = useMemo(() => eventTypesFor(orgType, features ?? []), [orgType, features])
  const firstType = allowed[0] ?? 'raid'
  const defaults = (t: EventType) => defaultsFor(t, orgType, org?.name, org?.capacity ?? null)
  const init = defaults(firstType)

  const [type, setType] = useState<EventType>(firstType)
  const [title, setTitle] = useState(init.title)
  const [date, setDate] = useState(toDateInput(defaultDate))
  const [time, setTime] = useState('20:30')
  const [duration, setDuration] = useState(init.duration)
  const [location, setLocation] = useState(init.location)
  const [leaderId, setLeaderId] = useState(me?.id ?? '')
  const [capacity, setCapacity] = useState(init.capacity)
  const [note, setNote] = useState('')
  const [titleTouched, setTitleTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    const d = defaults(firstType)
    setType(firstType)
    setTitle(d.title)
    setDate(toDateInput(defaultDate))
    setTime('20:30')
    setDuration(d.duration)
    setLocation(d.location)
    setLeaderId(me?.id ?? '')
    setCapacity(d.capacity)
    setNote('')
    setTitleTouched(false)
    // chỉ nạp lại mặc định mỗi lần mở hộp thoại
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const pickType = (t: EventType) => {
    setType(t)
    const d = defaults(t)
    if (!titleTouched) setTitle(d.title)
    setDuration(d.duration)
    setCapacity(d.capacity)
    setLocation(d.location)
  }

  // người chỉ huy: Kim Lan theo thứ bậc (ghế), loại khác theo chức vụ rồi chiến lực
  const leaders = useMemo(
    () =>
      [...members].sort((a, b) =>
        orgType === 'kimlan' ? (a.seat ?? 99) - (b.seat ?? 99) || b.power - a.power : RANKS[a.rank].order - RANKS[b.rank].order || b.power - a.power,
      ),
    [members, orgType],
  )
  // Kim Lan tối đa 12 người nên sĩ số sự kiện không vượt quá sức chứa
  const maxCapacity = orgType === 'kimlan' && org?.capacity ? org.capacity : 200

  const submit = async () => {
    if (busy) return
    const name = title.trim()
    if (name.length < 2) return toast({ tone: 'error', title: 'Hãy nhập tên sự kiện', desc: 'Ít nhất 2 ký tự.' })
    if (name.length > 80) return toast({ tone: 'error', title: 'Tên sự kiện quá dài' })
    if (location.trim().length > 80) return toast({ tone: 'error', title: 'Địa điểm quá dài', desc: 'Tối đa 80 ký tự.' })
    if (note.trim().length > 300) return toast({ tone: 'error', title: 'Ghi chú quá dài', desc: 'Tối đa 300 ký tự.' })
    const [y, mo, d] = date.split('-').map(Number)
    const [h, mi] = time.split(':').map(Number)
    const start = new Date(y, (mo || 1) - 1, d || 1, h || 0, mi || 0)
    if (!date || !time || Number.isNaN(start.getTime())) return toast({ tone: 'error', title: 'Ngày giờ không hợp lệ' })
    if (!Number.isFinite(duration) || duration < 15 || duration > 600) return toast({ tone: 'error', title: 'Thời lượng từ 15 đến 600 phút' })
    if (!allowed.includes(type)) return toast({ tone: 'error', title: 'Loại sự kiện này không dùng được ở đây' })
    if (!Number.isFinite(capacity) || capacity < 1 || capacity > maxCapacity) return toast({ tone: 'error', title: `Sức chứa từ 1 đến ${maxCapacity} người` })
    if (!leaderId || !members.some((m) => m.id === leaderId)) return toast({ tone: 'error', title: 'Hãy chọn người chỉ huy' })
    if (start.getTime() < Date.now() - 3600000) return toast({ tone: 'error', title: 'Không thể tạo sự kiện trong quá khứ' })

    setBusy(true)
    const r = await addEvent({
      type,
      title: name,
      start: start.toISOString(),
      durationMin: Math.round(duration),
      location: location.trim() || defaults(type).location,
      leaderId,
      capacity: Math.round(capacity),
      note: note.trim(),
    })
    setBusy(false)
    if (!r.ok) return toast({ tone: 'error', title: 'Chưa tạo được sự kiện', desc: r.error })
    toast({ tone: 'success', title: 'Đã thêm vào lịch', desc: `${name} · ${time} ${start.toLocaleDateString('vi-VN')}` })
    onCreated(r.data)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo sự kiện"
      han="历"
      subtitle="Chỉ huy sẽ tự động được điểm danh tham gia"
      size="lg"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Hủy
          </button>
          <button className="btn btn-gold" onClick={submit} disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <CalendarPlus size={16} />} {busy ? 'Đang tạo…' : 'Tạo sự kiện'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <span className="label">Loại hoạt động</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {allowed.map((t) => {
              const meta = eventMeta(t, orgType)
              const active = t === type
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => pickType(t)}
                  className={cn('flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-[13px] font-semibold transition', active ? 'text-ink' : 'border-line text-ink-2 hover:border-line-strong')}
                  style={active ? { borderColor: meta.color, background: `color-mix(in oklab, ${meta.color} 14%, transparent)` } : undefined}
                >
                  <span className="han grid h-7 w-7 place-items-center rounded-lg text-[15px]" style={{ background: `color-mix(in oklab, ${meta.color} 20%, transparent)`, color: meta.color }}>
                    {meta.han}
                  </span>
                  {meta.name}
                </button>
              )
            })}
          </div>
        </div>

        <Field label="Tên sự kiện">
          <input
            className="field"
            value={title}
            maxLength={80}
            onChange={(e) => {
              setTitle(e.target.value)
              setTitleTouched(true)
            }}
            placeholder="Ví dụ: Thiên Lao · Ác Mộng"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Ngày" className="col-span-2 sm:col-span-1">
            <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Giờ bắt đầu">
            <input className="field" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Thời lượng (phút)">
            <input className="field tabular-nums" type="number" min={15} max={600} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </Field>
          <Field label="Sức chứa">
            <input className="field tabular-nums" type="number" min={1} max={maxCapacity} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Địa điểm">
            <input className="field" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} />
          </Field>
          <Field label="Chỉ huy">
            <select className="field" value={leaderId} onChange={(e) => setLeaderId(e.target.value)}>
              {leaders.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {rankLabel(m)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Ghi chú" hint="Chiến thuật, đồ cần mang, giờ tập trung…">
          <textarea className="field" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </Field>
      </div>
    </Modal>
  )
}

import { useMemo, useRef, useState } from 'react'
import { Check, CircleHelp, Clock, Loader2, Lock, MapPin, Trash, UserCheck, Users, X } from 'lucide-react'
import type { GuildEvent, RsvpStatus } from '@/domain/types'
import { useCan, useCurrentUser, useGuild, useMemberMap, useOrgType } from '@/store/guild'
import { permHint } from '@/domain/permissions'
import { toast } from '@/store/ui'
import { cn, timeUntil } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { ProgressBar } from '@/components/ui/Progress'
import { ChibiAvatar, MemberChip } from '@/components/chibi/ChibiAvatar'
import { WEEKDAYS, dm, eventEnd, eventMeta, hhmm, isLive, isPast, rsvpCounts } from './calendarUtils'
import { useOrgWords } from '@/pages/dashboard/orgWords'

const RSVP_META: Record<RsvpStatus, { label: string; color: string; icon: typeof Check }> = {
  yes: { label: 'Tham gia', color: 'var(--jade)', icon: Check },
  maybe: { label: 'Có thể', color: 'var(--gold)', icon: CircleHelp },
  no: { label: 'Vắng', color: 'var(--cinnabar)', icon: X },
}

export function EventDetailModal({ eventId, onClose }: { eventId: string | null; onClose: () => void }) {
  const events = useGuild((s) => s.events)
  const setRsvp = useGuild((s) => s.setRsvp)
  const removeEvent = useGuild((s) => s.removeEvent)
  const me = useCurrentUser()
  const members = useMemberMap()
  const allMembers = useGuild((s) => s.members)
  const canManage = useCan('event.manage')
  const orgType = useOrgType()
  const w = useOrgWords()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [proxyId, setProxyId] = useState('')
  const proxyOptions = useMemo(() => [...allMembers].filter((m) => m.id !== me?.id).sort((a, b) => a.name.localeCompare(b.name, 'vi')), [allMembers, me?.id])

  const found = useMemo(() => events.find((e) => e.id === eventId) ?? null, [events, eventId])
  // giữ sự kiện cuối cùng để hộp thoại đóng mượt (kể cả khi vừa bị xóa)
  const lastRef = useRef<GuildEvent | null>(null)
  if (found) lastRef.current = found
  const ev = found ?? lastRef.current
  const groups = useMemo(() => {
    const g: Record<RsvpStatus, string[]> = { yes: [], maybe: [], no: [] }
    if (ev) Object.entries(ev.rsvp).forEach(([id, st]) => members[id] && g[st].push(id))
    return g
  }, [ev, members])

  const close = () => {
    setConfirmDelete(false)
    setProxyId('')
    onClose()
  }

  if (!ev) return null

  const t = eventMeta(ev.type, orgType)
  const start = new Date(ev.start)
  const end = eventEnd(ev)
  const counts = rsvpCounts(ev)
  const leader = members[ev.leaderId]
  const mine = me ? ev.rsvp[me.id] : undefined
  const past = isPast(ev)
  const live = isLive(ev)

  const choose = async (st: RsvpStatus) => {
    if (!me) return
    if (mine === st) {
      const r = await setRsvp(ev.id, me.id, null)
      if (r.ok) toast({ tone: 'info', title: 'Đã hủy phản hồi', desc: ev.title })
      return
    }
    if (st === 'yes' && mine !== 'yes' && counts.yes >= ev.capacity) {
      toast({ tone: 'error', title: 'Đã đủ người', desc: `Sự kiện chỉ nhận ${ev.capacity} người. Hãy chọn "Có thể" để vào danh sách chờ.` })
      return
    }
    // store tự hoàn tác + báo lỗi nếu server từ chối
    const r = await setRsvp(ev.id, me.id, st)
    if (r.ok) toast({ tone: st === 'yes' ? 'success' : st === 'maybe' ? 'gold' : 'info', title: `Đã điểm danh: ${RSVP_META[st].label}`, desc: ev.title })
  }

  const proxyChoose = async (st: RsvpStatus | null) => {
    if (!proxyId) return
    const target = members[proxyId]
    if (st === 'yes' && ev.rsvp[proxyId] !== 'yes' && counts.yes >= ev.capacity) {
      toast({ tone: 'error', title: 'Đã đủ người', desc: `Sự kiện chỉ nhận ${ev.capacity} người.` })
      return
    }
    const r = await setRsvp(ev.id, proxyId, st)
    if (r.ok) toast({ tone: 'info', title: st ? `Đã điểm danh hộ: ${RSVP_META[st].label}` : 'Đã xóa điểm danh', desc: target?.name })
  }

  const remove = async () => {
    setDeleting(true)
    const r = await removeEvent(ev.id)
    setDeleting(false)
    if (!r.ok) return
    toast({ tone: 'info', title: 'Đã xóa sự kiện', desc: ev.title })
    close()
  }

  return (
    <Modal
      open={!!eventId && !!found}
      onClose={close}
      title={ev.title}
      han={t.han}
      subtitle={`${t.name} · ${WEEKDAYS[(start.getDay() + 6) % 7]}, ${dm(start)}`}
      size="lg"
      footer={
        <>
          {confirmDelete ? (
            <>
              <span className="mr-auto self-center text-[12.5px] text-cinnabar">Xóa sự kiện này khỏi lịch?</span>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
                Giữ lại
              </button>
              <button className="btn btn-cinnabar" onClick={remove} disabled={deleting}>
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash size={15} />} Xóa
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-ghost mr-auto text-cinnabar"
                onClick={() => setConfirmDelete(true)}
                disabled={!canManage}
                title={canManage ? undefined : permHint('event.manage', orgType)}
              >
                {canManage ? <Trash size={15} /> : <Lock size={14} />} Xóa sự kiện
              </button>
              <button className="btn" onClick={close}>
                Đóng
              </button>
            </>
          )}
        </>
      }
    >
      <div
        className="relative mb-5 overflow-hidden rounded-2xl border p-4"
        style={{
          borderColor: `color-mix(in oklab, ${t.color} 40%, transparent)`,
          background: `linear-gradient(135deg, color-mix(in oklab, ${t.color} 14%, transparent), transparent 70%)`,
        }}
      >
        <span className="han pointer-events-none absolute -right-1 -top-6 text-[96px] leading-none opacity-10" style={{ color: t.color }}>
          {t.han}
        </span>
        <div className="relative grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-[13px] text-ink-2">
            <Clock size={15} style={{ color: t.color }} />
            <span>
              <b className="text-ink">
                {hhmm(start)} – {hhmm(end)}
              </b>{' '}
              · {ev.durationMin} phút
            </span>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-ink-2">
            <MapPin size={15} style={{ color: t.color }} />
            <span className="truncate">{ev.location}</span>
          </div>
          <div className="text-[12.5px]">
            {live ? (
              <span className="chip text-jade">
                <span className="relative h-1.5 w-1.5 rounded-full bg-jade pulse-online" /> Đang diễn ra
              </span>
            ) : past ? (
              <span className="chip text-muted">Đã kết thúc</span>
            ) : (
              <span className="chip text-gold">Bắt đầu {timeUntil(ev.start)}</span>
            )}
          </div>
          {leader && (
            <div className="flex items-center gap-2 text-[12px] text-muted">
              Chỉ huy <MemberChip member={leader} size={26} />
            </div>
          )}
        </div>
        {ev.note && <p className="relative mt-3 border-t border-line pt-3 text-[13px] italic text-ink-2">“{ev.note}”</p>}
      </div>

      {/* sức chứa */}
      <div className="mb-5">
        <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
          <span className="flex items-center gap-1.5 font-semibold text-ink-2">
            <Users size={14} className="text-gold" /> Sĩ số
          </span>
          <span className="tabular-nums text-muted">
            <b className="text-ink">{counts.yes}</b> / {ev.capacity} · {counts.maybe} có thể · {counts.no} vắng
          </span>
        </div>
        <ProgressBar value={counts.yes} max={ev.capacity} color={t.color} />
      </div>

      {/* điểm danh của tôi */}
      {me && (
        <div className="mb-5">
          <div className="label">Điểm danh của bạn ({me.name})</div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(RSVP_META) as RsvpStatus[]).map((st) => {
              const m = RSVP_META[st]
              const active = mine === st
              return (
                <button
                  key={st}
                  disabled={past}
                  onClick={() => choose(st)}
                  className={cn('btn h-11', active && 'text-[#1b1406]')}
                  style={active ? { background: m.color, borderColor: 'transparent' } : { color: m.color }}
                >
                  <m.icon size={16} /> {m.label}
                </button>
              )
            })}
          </div>
          {past && <p className="mt-1.5 text-[11.5px] text-muted">Sự kiện đã qua, không thể đổi điểm danh.</p>}
        </div>
      )}

      {/* điểm danh hộ — chỉ Đường Chủ trở lên */}
      {canManage && !past && (
        <div className="mb-5 rounded-2xl border border-line bg-black/10 p-3">
          <div className="label flex items-center gap-1.5">
            <UserCheck size={13} className="text-gold" /> Điểm danh hộ {w.member}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select className="field !h-9 min-w-[180px] flex-1 !text-[13px]" value={proxyId} onChange={(e) => setProxyId(e.target.value)}>
              <option value="">— Chọn {w.member} —</option>
              {proxyOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {ev.rsvp[m.id] ? ` · ${RSVP_META[ev.rsvp[m.id]].label}` : ''}
                </option>
              ))}
            </select>
            {(Object.keys(RSVP_META) as RsvpStatus[]).map((st) => (
              <button key={st} className="btn btn-sm" style={{ color: RSVP_META[st].color }} disabled={!proxyId} onClick={() => proxyChoose(st)}>
                {RSVP_META[st].label}
              </button>
            ))}
            {proxyId && ev.rsvp[proxyId] && (
              <button className="btn btn-sm btn-ghost" onClick={() => proxyChoose(null)} title="Xóa điểm danh">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* danh sách */}
      <div className="space-y-4">
        {(Object.keys(RSVP_META) as RsvpStatus[]).map((st) => (
          <div key={st}>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold" style={{ color: RSVP_META[st].color }}>
              {RSVP_META[st].label}
              <span className="text-muted">({groups[st].length})</span>
            </div>
            {groups[st].length === 0 ? (
              <p className="text-[12px] text-muted">Chưa có ai.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {groups[st].map((id) => {
                  const m = members[id]
                  return (
                    <span key={id} title={m.name} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-black/10 py-0.5 pl-0.5 pr-2.5">
                      <ChibiAvatar look={m.look} classId={m.classId} rank={m.rank} size={24} />
                      <span className="max-w-[110px] truncate text-[11.5px] text-ink-2">{m.name}</span>
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </Modal>
  )
}

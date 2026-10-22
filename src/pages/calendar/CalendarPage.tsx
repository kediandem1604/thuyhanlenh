import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { CalendarPlus, Check, ChevronLeft, ChevronRight, CircleHelp, Clock, Coffee, Lock, MapPin, Users, X } from 'lucide-react'
import { eventTypesFor } from '@/domain/orgs'
import type { EventType, GuildEvent } from '@/domain/types'
import { useCan, useCurrentUser, useGuild, useOrg, useOrgType } from '@/store/guild'
import { permHint } from '@/domain/permissions'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, SectionTitle } from '@/components/ui/Panel'
import { Countdown, useNow } from '@/components/ui/Countdown'
import { EmptyState } from '@/components/ui/EmptyState'
import { EventDetailModal } from './EventDetailModal'
import { CreateEventModal } from './CreateEventModal'
import { WEEKDAYS, WEEKDAYS_SHORT, addDays, dayKey, dm, eventEnd, eventMeta, hhmm, isLive, isPast, mondayOf, rsvpCounts, sameDay, weekOffsetOf } from './calendarUtils'
import { useOrgWords } from '@/pages/dashboard/orgWords'

/* ------------------------------------------------------------------ */

function MyRsvpMark({ ev, meId }: { ev: GuildEvent; meId?: string }) {
  const st = meId ? ev.rsvp[meId] : undefined
  if (st === 'yes') return <Check size={13} className="text-jade" aria-label="Bạn tham gia" />
  if (st === 'maybe') return <CircleHelp size={13} className="text-gold" aria-label="Bạn có thể tham gia" />
  if (st === 'no') return <X size={13} className="text-cinnabar" aria-label="Bạn vắng" />
  return null
}

function EventBlock({ ev, now, meId, onOpen, compact = false }: { ev: GuildEvent; now: number; meId?: string; onOpen: (id: string) => void; compact?: boolean }) {
  const orgType = useOrgType()
  const t = eventMeta(ev.type, orgType)
  const start = new Date(ev.start)
  const counts = rsvpCounts(ev)
  const past = isPast(ev, now)
  const live = isLive(ev, now)
  return (
    <motion.button
      layout
      type="button"
      onClick={() => onOpen(ev.id)}
      whileHover={{ y: -2 }}
      className={cn(
        'group relative w-full overflow-hidden rounded-xl border p-2.5 text-left transition',
        past && 'opacity-55 hover:opacity-90',
        live && 'ring-1 ring-[var(--jade)]',
      )}
      style={{
        borderColor: `color-mix(in oklab, ${t.color} 38%, transparent)`,
        background: `linear-gradient(160deg, color-mix(in oklab, ${t.color} 18%, var(--surface-solid)), color-mix(in oklab, ${t.color} 5%, var(--surface-solid)))`,
      }}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: t.color }} />
      <span className="han pointer-events-none absolute -bottom-3 -right-1 text-[44px] leading-none opacity-10" style={{ color: t.color }}>
        {t.han}
      </span>
      <div className="relative flex items-center gap-1.5 text-[11px] font-semibold tabular-nums" style={{ color: t.color }}>
        {live && <span className="relative h-1.5 w-1.5 rounded-full bg-jade pulse-online" />}
        {hhmm(start)}
        {!compact && <span className="font-normal text-muted">– {hhmm(eventEnd(ev))}</span>}
        <span className="ml-auto">
          <MyRsvpMark ev={ev} meId={meId} />
        </span>
      </div>
      <div className="relative mt-0.5 line-clamp-2 text-[12.5px] font-semibold leading-snug text-ink">{ev.title}</div>
      <div className="relative mt-1.5 flex items-center gap-1 text-[10.5px] text-muted">
        <Users size={10} />
        <span className="tabular-nums">
          {counts.yes}/{ev.capacity}
        </span>
        <span className="ml-auto truncate">{t.name}</span>
      </div>
    </motion.button>
  )
}

/* ------------------------------------------------------------------ */

export default function CalendarPage() {
  const events = useGuild((s) => s.events)
  const me = useCurrentUser()
  const now = useNow(30000)
  const [offset, setOffset] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const canManage = useCan('event.manage')
  const org = useOrg()
  const orgType = useOrgType()
  const w = useOrgWords()
  const features = org?.features
  const allowedTypes = useMemo(() => eventTypesFor(orgType, features ?? []), [orgType, features])

  const description =
    orgType === 'kimlan'
      ? `Hẹn giờ cùng huynh đệ tỷ muội đi phó bản, săn boss — lịch của ${w.name}. Bấm vào buổi hẹn để điểm danh.`
      : `${allowedTypes
          .slice(0, 3)
          .map((t, i) => {
            const name = eventMeta(t, orgType).name
            return i === 0 ? name : name.toLowerCase()
          })
          .join(', ')}… mọi hẹn ước của ${w.name} trong tuần. Bấm vào sự kiện để điểm danh.`
  const scheduler = orgType === 'guild' ? 'ban quản lý' : orgType === 'kimlan' ? 'huynh đệ' : 'trưởng nhóm'

  const today = new Date(now)
  const monday = mondayOf(today, offset)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const weekEnd = addDays(monday, 7)

  const byDay = useMemo(() => {
    const map: Record<string, GuildEvent[]> = {}
    events.forEach((e) => {
      const d = new Date(e.start)
      if (d >= monday && d < weekEnd) (map[dayKey(d)] ??= []).push(e)
    })
    Object.values(map).forEach((list) => list.sort((a, b) => a.start.localeCompare(b.start)))
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, monday.getTime()])

  const weekEvents = useMemo(() => Object.values(byDay).flat(), [byDay])
  const weekStats = useMemo(() => {
    let yes = 0
    let mine = 0
    weekEvents.forEach((e) => {
      yes += rsvpCounts(e).yes
      if (me && e.rsvp[me.id] === 'yes') mine++
    })
    return { yes, mine }
  }, [weekEvents, me])

  const todayEvents = useMemo(
    () => events.filter((e) => sameDay(new Date(e.start), today)).sort((a, b) => a.start.localeCompare(b.start)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, dayKey(today)],
  )
  const nextEvent = useMemo(
    () => [...events].filter((e) => new Date(e.start).getTime() > now).sort((a, b) => a.start.localeCompare(b.start))[0],
    [events, now],
  )

  const usedTypes = useMemo(() => Array.from(new Set(weekEvents.map((e) => e.type))) as EventType[], [weekEvents])
  const sunday = addDays(monday, 6)
  const rangeLabel = `${dm(monday)} – ${dm(sunday)}/${sunday.getFullYear()}`

  const defaultCreateDate = offset === 0 ? today : monday

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={orgType === 'kimlan' ? 'Kim Lan · Lịch' : 'Chinh Chiến · Lịch'}
        title={orgType === 'kimlan' ? 'Lịch Phó Bản' : 'Lịch Hoạt Động'}
        han="历"
        description={description}
        actions={
          <button
            className="btn btn-gold"
            onClick={() => setCreateOpen(true)}
            disabled={!canManage}
            title={canManage ? undefined : permHint('event.manage', orgType)}
          >
            {canManage ? <CalendarPlus size={16} /> : <Lock size={15} />} Tạo sự kiện
          </button>
        }
      />

      {/* tóm tắt */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Panel corners className="relative overflow-hidden">
          <span className="han pointer-events-none absolute -right-2 -top-6 text-[110px] leading-none text-gold opacity-[0.07]">今</span>
          <div className="eyebrow">Hôm nay</div>
          <div className="title-display mt-1 text-[26px] text-ink">
            {WEEKDAYS[(today.getDay() + 6) % 7]}, {dm(today)}
          </div>
          <div className="mt-3 space-y-2">
            {todayEvents.length === 0 ? (
              <p className="flex items-center gap-2 text-[13px] text-muted">
                <Coffee size={15} /> Hôm nay {w.all} nghỉ ngơi, pha ấm trà ngắm trăng.
              </p>
            ) : (
              todayEvents.map((e) => {
                const t = eventMeta(e.type, orgType)
                return (
                  <button key={e.id} onClick={() => setOpenId(e.id)} className={cn('flex w-full items-center gap-2.5 rounded-lg px-1 py-1 text-left transition hover:bg-white/[0.03]', isPast(e, now) && 'opacity-55')}>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: t.color }} />
                    <span className="w-11 shrink-0 text-[12px] font-semibold tabular-nums text-ink-2">{hhmm(new Date(e.start))}</span>
                    <span className="truncate text-[13px] text-ink">{e.title}</span>
                    {isLive(e, now) && <span className="chip !h-5 shrink-0 text-jade">Đang diễn ra</span>}
                  </button>
                )
              })
            )}
          </div>
        </Panel>

        <Panel corners className="relative overflow-hidden">
          {nextEvent ? (
            <>
              <span className="han pointer-events-none absolute -right-2 -top-6 text-[110px] leading-none opacity-[0.08]" style={{ color: eventMeta(nextEvent.type, orgType).color }}>
                {eventMeta(nextEvent.type, orgType).han}
              </span>
              <div className="eyebrow" style={{ color: eventMeta(nextEvent.type, orgType).color }}>
                Sự kiện kế tiếp
              </div>
              <div className="mt-1 truncate text-[17px] font-bold text-ink">{nextEvent.title}</div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} /> {hhmm(new Date(nextEvent.start))} · {WEEKDAYS_SHORT[(new Date(nextEvent.start).getDay() + 6) % 7]}, {dm(new Date(nextEvent.start))}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} /> {nextEvent.location}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-[18px]">
                  <Countdown to={nextEvent.start} />
                </div>
                <button className="btn btn-sm" onClick={() => setOpenId(nextEvent.id)}>
                  Điểm danh
                </button>
              </div>
            </>
          ) : (
            <EmptyState han="静" title="Chưa có sự kiện sắp tới" desc="Tạo một sự kiện mới để triệu tập anh em." />
          )}
        </Panel>

        <Panel corners>
          <div className="eyebrow">Tuần đang xem</div>
          <div className="mt-1 text-[13px] text-muted">{rangeLabel}</div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-line bg-black/10 px-2 py-2.5">
              <div className="title-display text-[26px] text-ink">{weekEvents.length}</div>
              <div className="text-[10.5px] text-muted">sự kiện</div>
            </div>
            <div className="rounded-xl border border-line bg-black/10 px-2 py-2.5">
              <div className="title-display text-[26px] text-jade">{weekStats.yes}</div>
              <div className="text-[10.5px] text-muted">lượt tham gia</div>
            </div>
            <div className="rounded-xl border border-line bg-black/10 px-2 py-2.5">
              <div className="title-display text-[26px] text-gold">{weekStats.mine}</div>
              <div className="text-[10.5px] text-muted">bạn tham gia</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* điều hướng tuần */}
      <Panel className="!p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-sm btn-icon" onClick={() => setOffset((o) => o - 1)} aria-label="Tuần trước">
            <ChevronLeft size={16} />
          </button>
          <button className={cn('btn btn-sm', offset === 0 && 'btn-gold')} onClick={() => setOffset(0)}>
            Tuần này
          </button>
          <button className="btn btn-sm btn-icon" onClick={() => setOffset((o) => o + 1)} aria-label="Tuần sau">
            <ChevronRight size={16} />
          </button>
          <div className="ml-1 text-[14px] font-semibold text-ink">
            {rangeLabel}
            {offset !== 0 && <span className="ml-2 text-[12px] font-normal text-muted">({offset > 0 ? `+${offset}` : offset} tuần)</span>}
          </div>
          <div className="flex w-full flex-wrap gap-1.5 sm:ml-auto sm:w-auto">
            {usedTypes.map((t) => (
              <span key={t} className="chip !h-6 !text-[11px]">
                <span className="h-2 w-2 rounded-full" style={{ background: eventMeta(t, orgType).color }} />
                {eventMeta(t, orgType).name}
              </span>
            ))}
          </div>
        </div>
      </Panel>

      {/* lưới tuần — màn hình rộng */}
      <motion.div key={`grid-${offset}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="hidden gap-2.5 xl:grid xl:grid-cols-7">
        {days.map((d, i) => {
          const list = byDay[dayKey(d)] ?? []
          const isToday = sameDay(d, today)
          return (
            <div
              key={dayKey(d)}
              className={cn('panel flex min-h-[340px] flex-col !rounded-2xl p-2.5', isToday && 'corners')}
              style={isToday ? { borderColor: 'var(--line-strong)', boxShadow: 'var(--shadow), var(--glow-gold)' } : undefined}
            >
              <div className="mb-2.5 flex items-baseline justify-between px-1">
                <span className={cn('text-[11px] font-semibold uppercase tracking-[0.16em]', isToday ? 'text-gold' : 'text-muted')}>{WEEKDAYS_SHORT[i]}</span>
                <span className={cn('title-display text-[24px] leading-none', isToday ? 'text-gold' : 'text-ink')}>{d.getDate()}</span>
              </div>
              {isToday && <div className="mb-2 rounded-md bg-[color-mix(in_oklab,var(--gold)_16%,transparent)] py-0.5 text-center text-[10.5px] font-semibold text-gold">Hôm nay</div>}
              <div className="flex flex-1 flex-col gap-2">
                {list.length === 0 ? (
                  <div className="grid flex-1 place-items-center text-[11px] text-muted/60">
                    <span className="han text-[26px] opacity-30">闲</span>
                  </div>
                ) : (
                  list.map((e) => <EventBlock key={e.id} ev={e} now={now} meId={me?.id} onOpen={setOpenId} />)
                )}
              </div>
            </div>
          )
        })}
      </motion.div>

      {/* dạng danh sách — mobile & tablet */}
      <motion.div key={`agenda-${offset}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-3 md:grid-cols-2 xl:hidden">
        {days.map((d, i) => {
          const list = byDay[dayKey(d)] ?? []
          const isToday = sameDay(d, today)
          return (
            <Panel key={dayKey(d)} className={cn('!p-3.5', isToday && 'corners')} style={isToday ? { borderColor: 'var(--line-strong)' } : undefined}>
              <div className="mb-2 flex items-center gap-3">
                <span
                  className={cn('title-display grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-[22px]', isToday ? 'bg-gold-grad text-on-gold border-transparent' : 'border-line text-ink')}
                >
                  {d.getDate()}
                </span>
                <div>
                  <div className={cn('text-[13.5px] font-semibold', isToday ? 'text-gold' : 'text-ink')}>
                    {WEEKDAYS[i]}
                    {isToday && ' · Hôm nay'}
                  </div>
                  <div className="text-[11.5px] text-muted">{list.length ? `${list.length} sự kiện` : 'Không có sự kiện'}</div>
                </div>
              </div>
              {list.length > 0 && (
                <div className="grid gap-2">
                  {list.map((e) => (
                    <EventBlock key={e.id} ev={e} now={now} meId={me?.id} onOpen={setOpenId} />
                  ))}
                </div>
              )}
            </Panel>
          )
        })}
      </motion.div>

      {weekEvents.length === 0 && (
        <Panel corners>
          <SectionTitle han="空" title="Tuần này còn trống" subtitle="Chưa có hoạt động nào được lên lịch" />
          <EmptyState
            han="历"
            title="Lịch còn trống trơn"
            desc={canManage ? 'Hãy tạo sự kiện để anh em cùng điểm danh.' : `Khi ${scheduler} lên lịch, sự kiện sẽ hiện ở đây.`}
            action={
              canManage ? (
                <button className="btn btn-gold" onClick={() => setCreateOpen(true)}>
                  <CalendarPlus size={16} /> Tạo sự kiện
                </button>
              ) : undefined
            }
          />
        </Panel>
      )}

      <EventDetailModal eventId={openId} onClose={() => setOpenId(null)} />
      <CreateEventModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultDate={defaultCreateDate}
        onCreated={(ev) => setOffset(weekOffsetOf(new Date(ev.start)))}
      />
    </div>
  )
}

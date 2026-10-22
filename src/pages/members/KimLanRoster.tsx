import { Link } from 'react-router'
import { motion } from 'motion/react'
import { ChevronDown, ChevronUp, Crown, Flame, Link2, UserPlus } from 'lucide-react'
import { Chibi } from '@/components/chibi/Chibi'
import { ClassBadge, RoleIcon, StatusDot } from '@/components/ui/Badges'
import { Panel } from '@/components/ui/Panel'
import { CLASSES, STATUS } from '@/domain/constants'
import { KIMLAN_OATH, SEAT_HAN } from '@/domain/orgs'
import type { Member } from '@/domain/types'
import { useCan } from '@/store/guild'
import { alpha } from '@/lib/color'
import { cn, fmt } from '@/lib/utils'
import { KIMLAN_SEATS, SeatSeal, honorificAt, seatOf, useSeatMove } from './orgRoster'

const SILVER = '#cfdcec'
const LEADER = '#e0523f'

/** Lời thề + sĩ số x/12 */
function OathBanner({ count }: { count: number }) {
  return (
    <Panel corners className="relative mb-6 overflow-hidden !p-0">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(520px 220px at 12% 50%, ${alpha(SILVER, 0.16)}, transparent 70%), radial-gradient(420px 200px at 92% 40%, ${alpha(LEADER, 0.1)}, transparent 70%)`,
        }}
      />
      <span aria-hidden className="han pointer-events-none absolute -bottom-8 right-[22%] select-none text-[130px] leading-none opacity-[0.05]" style={{ color: SILVER }}>
        义
      </span>
      <div className="relative grid gap-5 p-5 sm:p-6 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-7">
        <span className="seal h-16 w-16 self-start text-[22px] leading-[1.05] md:self-center" aria-hidden style={{ writingMode: 'vertical-rl' }}>
          金兰
        </span>
        <div className="min-w-0">
          <div className="eyebrow mb-1.5 flex items-center gap-2">
            <span className="inline-block h-px w-6 bg-gold/60" />
            Lời thề kết nghĩa
          </div>
          <p className="title-display text-[18px] leading-snug text-ink sm:text-[21px]">“{KIMLAN_OATH}”</p>
          <p className="mt-1.5 text-[12.5px] italic text-muted">Không cầu cùng năm cùng tháng cùng ngày sinh, chỉ nguyện cùng năm cùng tháng cùng ngày chết.</p>
        </div>
        <div className="flex items-center gap-4 md:flex-col md:items-end md:gap-1.5">
          <div className="title-display text-[36px] leading-none tabular-nums">
            <span className="text-gold-grad">{count}</span>
            <span className="text-[20px] text-muted">/{KIMLAN_SEATS}</span>
          </div>
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted">huynh đệ tỷ muội</div>
            <div className="mt-1.5 flex gap-1" aria-label={`${count} trên ${KIMLAN_SEATS} ghế đã có người`}>
              {Array.from({ length: KIMLAN_SEATS }, (_, i) => (
                <span
                  key={i}
                  className="h-2 w-2 rotate-45 rounded-[2px]"
                  style={
                    i < count
                      ? { background: i === 0 ? LEADER : SILVER, boxShadow: `0 0 6px ${alpha(i === 0 ? LEADER : SILVER, 0.7)}` }
                      : { boxShadow: `inset 0 0 0 1px ${alpha(SILVER, 0.35)}` }
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}

/** Một ghế trong Kim Lan Phổ — ghế 1 to gấp đôi */
function SeatCard({
  member,
  seat,
  total,
  index,
  canReorder,
  busy,
  onMove,
}: {
  member: Member
  seat: number
  total: number
  index: number
  canReorder: boolean
  busy: boolean
  onMove: (seat: number) => void
}) {
  const cls = CLASSES[member.classId]
  const leader = seat === 1
  const fallback = honorificAt(member, seat, total)
  const honorific = member.honorific ?? fallback.name
  const honorificHan = member.honorificHan ?? fallback.han
  const glow = leader ? LEADER : cls.palette.accent

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4), layout: { type: 'spring', damping: 24, stiffness: 260 } }}
      className={cn('panel panel-hover relative flex flex-col overflow-hidden !p-0', leader && 'corners sm:col-span-2')}
      style={leader ? { boxShadow: `0 0 0 1px ${alpha(LEADER, 0.35)}, 0 18px 50px -24px ${alpha(LEADER, 0.6)}` } : undefined}
    >
      <Link to={`/thanh-vien/${member.id}`} className={cn('group relative block flex-1', leader && 'sm:grid sm:grid-cols-[minmax(180px,42%)_1fr]')} aria-label={`Hồ sơ ${member.name} — ${honorific}`}>
        {/* sân khấu chibi */}
        <div
          className={cn('relative overflow-hidden', leader ? 'h-[200px] sm:h-full sm:min-h-[230px]' : 'h-[160px]')}
          style={{ background: `radial-gradient(circle at 50% 72%, ${alpha(glow, leader ? 0.38 : 0.26)}, ${alpha(cls.palette.robeDark, 0.16)} 58%, transparent 84%)` }}
        >
          <span aria-hidden className="han pointer-events-none absolute -right-1 -top-3 select-none text-[92px] leading-none opacity-[0.1]" style={{ color: leader ? LEADER : SILVER }}>
            {honorificHan.slice(0, 1)}
          </span>
          <div className="absolute left-3 top-3 z-[1]">
            <SeatSeal seat={seat} size={leader ? 'lg' : 'md'} />
          </div>
          <div className="absolute right-3 top-3 z-[1]" title={STATUS[member.status].name}>
            <StatusDot status={member.status} />
          </div>
          <div className="absolute inset-x-0 -bottom-2 flex justify-center">
            <Chibi
              look={member.look}
              classId={member.classId}
              size={leader ? 178 : 136}
              effects={leader}
              title={member.name}
              className="drop-shadow-[0_12px_16px_rgba(0,0,0,.4)] transition-transform duration-300 group-hover:-translate-y-1"
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--surface-solid)] to-transparent opacity-70" />
        </div>

        {/* danh xưng + thông tin */}
        <div className={cn('relative px-4 pb-3.5 pt-2.5', leader && 'sm:flex sm:flex-col sm:justify-center sm:py-5 sm:pr-5')}>
          {leader && (
            <span className="chip mb-2 w-fit !h-6 !text-[11px]" style={{ color: LEADER, borderColor: alpha(LEADER, 0.4) }}>
              <Crown size={11} /> Đứng đầu Kim Lan
            </span>
          )}
          <div className="flex items-baseline gap-2">
            <span className={cn('title-display text-gold-grad leading-tight', leader ? 'text-[32px]' : 'text-[23px]')}>{honorific}</span>
            <span className={cn('han text-muted', leader ? 'text-[22px]' : 'text-[16px]')}>{honorificHan}</span>
          </div>
          <div className={cn('truncate font-bold text-ink group-hover:text-gold', leader ? 'text-[17px]' : 'text-[14.5px]')}>{member.name}</div>
          {member.title && <div className="truncate text-[11.5px] italic text-muted">{member.title}</div>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <ClassBadge classId={member.classId} className="!h-[22px] !px-2 !text-[11px]" />
            <RoleIcon role={cls.role} size={13} />
            <span className="ml-auto inline-flex items-center gap-1 text-[12px]">
              <Flame size={12} className="text-gold" />
              <b className="tabular-nums text-ink">{fmt(member.power)}</b>
            </span>
          </div>
          {leader && member.bio && <p className="mt-3 line-clamp-2 hidden text-[12.5px] italic text-ink-2 sm:block">“{member.bio}”</p>}
        </div>
      </Link>

      {/* xếp lại thứ bậc (chỉ Đại ca) */}
      {canReorder && total > 1 && (
        <div className="flex items-center gap-1.5 border-t border-line px-2.5 py-2">
          <button
            className="btn btn-ghost btn-icon btn-sm"
            disabled={busy || seat <= 1}
            onClick={() => onMove(seat - 1)}
            aria-label={`Đưa ${member.name} lên ghế ${seat - 1}`}
            title={seat > 1 ? `Lên ghế ${SEAT_HAN[seat - 1]} — thành ${honorificAt(member, seat - 1, total).name}` : undefined}
          >
            <ChevronUp size={16} />
          </button>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            disabled={busy || seat >= total}
            onClick={() => onMove(seat + 1)}
            aria-label={`Đưa ${member.name} xuống ghế ${seat + 1}`}
            title={seat < total ? `Xuống ghế ${SEAT_HAN[seat + 1]} — thành ${honorificAt(member, seat + 1, total).name}` : undefined}
          >
            <ChevronDown size={16} />
          </button>
          <select
            className="field ml-auto !h-8 !w-auto min-w-0 !py-0 !pl-2.5 !text-[12px]"
            value={seat}
            disabled={busy}
            onChange={(e) => onMove(Number(e.target.value))}
            aria-label={`Đổi ghế của ${member.name}`}
          >
            {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
              <option key={s} value={s}>
                Ghế {SEAT_HAN[s]} · {honorificAt(member, s, total).name}
              </option>
            ))}
          </select>
        </div>
      )}
    </motion.article>
  )
}

/** Kim Lan Phổ: huynh đệ tỷ muội xếp theo ghế, ấn triện số ghế, lời thề; Đại ca xếp lại được thứ bậc */
export function KimLanRoster({ orgName, canAdd, onAdd }: { orgName: string; canAdd: boolean; onAdd: () => void }) {
  const { roster, request, busy, dialog } = useSeatMove(orgName)
  const canReorder = useCan('rank.assign')
  const canInvite = useCan('recruit.review')
  const total = roster.length
  const free = Math.max(0, KIMLAN_SEATS - total)

  return (
    <>
      <OathBanner count={total} />

      {canReorder && total > 1 && (
        <p className="mb-3 text-[12.5px] text-muted">
          Dùng mũi tên hoặc ô <b className="text-ink-2">Ghế</b> để xếp lại thứ bậc — đưa người khác lên ghế <span className="han text-gold">一</span> là nhường ghế Đại ca.
        </p>
      )}

      <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {roster.map((m, i) => {
          const seat = seatOf(roster, m)
          return <SeatCard key={m.id} member={m} seat={seat} total={total} index={i} canReorder={canReorder} busy={busy} onMove={(s) => request(m, s)} />
        })}

        {free > 0 && (
          <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed p-5 text-center"
            style={{ borderColor: 'var(--line-strong)' }}
          >
            <div className="flex max-w-[240px] flex-wrap justify-center gap-1.5">
              {Array.from({ length: free }, (_, i) => total + i + 1).map((s) => (
                <SeatSeal key={s} seat={s} size="sm" faded />
              ))}
            </div>
            <div>
              <div className="text-[14px] font-semibold text-ink-2">Còn {free} ghế trống</div>
              <p className="mt-1 text-[12px] text-muted">Kim Lan nhận người qua link mời — chờ người hữu duyên cùng nâng chén thề.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {canAdd && (
                <button className="btn btn-sm" onClick={onAdd}>
                  <UserPlus size={14} /> Ghi danh
                </button>
              )}
              {canInvite && (
                <Link to="/thiet-lap" className="btn btn-ghost btn-sm text-gold">
                  <Link2 size={14} /> Tạo link mời
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>

      {dialog}
    </>
  )
}

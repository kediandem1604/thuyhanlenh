// Tiện ích danh sách thành viên theo loại tổ chức (Bang Hội · Kim Lan · Team):
// nhãn chức vụ, báo kết quả bổ nhiệm, thứ bậc ghế Kim Lan (đổi ghế / nhường ghế Đại ca).
import { useMemo, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { RANKS } from '@/domain/constants'
import { ORG_TYPES, SEAT_HAN, kimlanHonorific } from '@/domain/orgs'
import type { Member, OrgType, RankId } from '@/domain/types'
import { useGuild } from '@/store/guild'
import { celebrate, toast } from '@/store/ui'
import { alpha } from '@/lib/color'
import { cn } from '@/lib/utils'

/** Viết hoa chữ cái đầu: "môn hạ" → "Môn hạ" */
export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Nhãn một chức vụ trong ô chọn — chức đứng đầu (khi chưa giữ) ghi rõ là truyền ngôi / nhường */
export function rankOptionLabel(r: RankId, type: OrgType, current?: RankId) {
  const name = RANKS[r].name
  if (r !== ORG_TYPES[type].leaderRank || r === current) return name
  return type === 'team' ? `${name} (nhường)` : `${name} (truyền ngôi)`
}

/** Gợi ý cho ô chức vụ bị khóa */
export function rankLockHint(type: OrgType) {
  if (type === 'team') return 'Chỉ Trưởng Nhóm được bổ nhiệm chức vụ'
  if (type === 'kimlan') return 'Chỉ Đại ca / Đại tỷ được xếp lại thứ bậc'
  return 'Bổ nhiệm cần chức vụ Phó Bang Chủ trở lên, với người thấp hơn mình'
}

/** Báo kết quả đổi chức vụ (Bang / Team). Trả true nếu là truyền ngôi — người gọi nên tải lại quyền. */
export function announceRankChange(name: string, prev: RankId, next: RankId, type: OrgType, orgName: string) {
  const leader = ORG_TYPES[type].leaderRank
  if (next === leader) {
    celebrate(
      type === 'team'
        ? { title: 'Nhường vị trí Trưởng Nhóm', subtitle: `${name} nay dẫn dắt ${orgName}`, han: RANKS[leader].han }
        : { title: 'Truyền ngôi!', subtitle: `${name} trở thành ${RANKS[leader].name} ${orgName}`, han: RANKS[leader].han },
    )
    return true
  }
  const promoted = RANKS[next].order < RANKS[prev].order
  if (promoted && RANKS[next].order <= 3) celebrate({ title: 'Thăng chức!', subtitle: `${name} trở thành ${RANKS[next].name}`, han: '升' })
  else toast({ tone: promoted ? 'gold' : 'info', title: promoted ? 'Đã thăng chức' : 'Đã đổi chức vụ', desc: `${name} · ${RANKS[next].name}` })
  return false
}

/* ------------------------------------------------------------------ */
/* Kim Lan — thứ bậc theo ghế                                          */
/* ------------------------------------------------------------------ */

export const KIMLAN_SEATS = 12
const LEADER_COLOR = '#e0523f'
const SEAT_COLOR = '#9fc3e8'

/** Danh sách huynh đệ theo ghế 1 → N */
export function useKimlanRoster() {
  const members = useGuild((s) => s.members)
  return useMemo(() => [...members].sort((a, b) => (a.seat ?? 99) - (b.seat ?? 99) || a.joinedAt.localeCompare(b.joinedAt)), [members])
}

/** Ghế hiện tại (server luôn gửi `seat`; phòng hờ thì lấy theo thứ tự) */
export function seatOf(roster: Member[], m: Member) {
  return m.seat ?? roster.findIndex((x) => x.id === m.id) + 1
}

/** Người ngồi ghế 1 sau khi đưa `memberId` tới ghế `seat` (server chèn vào vị trí rồi đánh số lại) */
export function leaderAfterMove(roster: Member[], memberId: string, seat: number) {
  const moving = roster.find((m) => m.id === memberId)
  if (!moving) return roster[0]
  const order = roster.filter((m) => m.id !== memberId)
  order.splice(seat - 1, 0, moving)
  return order[0]
}

/** Danh xưng khi ngồi ghế `seat` trong Kim Lan `total` người */
export function honorificAt(m: Pick<Member, 'look'>, seat: number, total: number) {
  return kimlanHonorific(seat, m.look.gender, total)
}

/** Ấn triện số ghế (一 … 十二) — ghế 1 đỏ son, còn lại bạc */
export function SeatSeal({ seat, size = 'md', faded = false, className }: { seat: number; size?: 'sm' | 'md' | 'lg' | 'xl'; faded?: boolean; className?: string }) {
  const color = seat === 1 ? LEADER_COLOR : SEAT_COLOR
  const glyph = SEAT_HAN[seat] ?? String(seat)
  const two = glyph.length > 1
  const dim =
    size === 'sm'
      ? cn('h-7 w-7 rounded-[8px]', two ? 'text-[11px]' : 'text-[15px]')
      : size === 'lg'
        ? cn('h-12 w-12', two ? 'text-[18px]' : 'text-[25px]')
        : size === 'xl'
          ? cn('h-16 w-16 rounded-[14px]', two ? 'text-[23px]' : 'text-[33px]')
          : cn('h-10 w-10', two ? 'text-[15px]' : 'text-[21px]')
  return (
    <span
      className={cn('seal shrink-0 leading-none', dim, className)}
      title={`Ghế ${seat}`}
      style={
        faded
          ? { background: 'transparent', color: 'var(--muted)', boxShadow: `inset 0 0 0 1.5px ${alpha(SEAT_COLOR, 0.35)}` }
          : {
              background: `radial-gradient(circle at 30% 25%, ${alpha(color, 0.98)}, ${alpha(color, 0.62)} 78%)`,
              color: seat === 1 ? '#fff1e6' : '#0f1a2a',
              boxShadow: `inset 0 0 0 1.5px rgba(255,245,235,.55), 0 6px 16px -6px ${alpha(color, 0.85)}`,
            }
      }
    >
      {glyph}
    </span>
  )
}

/**
 * Đổi ghế Kim Lan, có hộp xác nhận khi việc đổi làm thay người ngồi ghế 1 (nhường ghế Đại ca).
 * Trả về `request(member, seat)` + `dialog` (đặt vào cây giao diện) + `busy`.
 */
export function useSeatMove(orgName: string) {
  const roster = useKimlanRoster()
  const setSeat = useGuild((s) => s.setSeat)
  const refreshMe = useGuild((s) => s.refreshMe)
  const [pending, setPending] = useState<{ member: Member; seat: number; leader: Member } | null>(null)
  const [busy, setBusy] = useState(false)

  const apply = async (member: Member, seat: number) => {
    const before = roster[0]
    const after = leaderAfterMove(roster, member.id, seat)
    const total = roster.length
    setBusy(true)
    const r = await setSeat(member.id, seat)
    setBusy(false)
    if (!r.ok) {
      toast({ tone: 'error', title: 'Không đổi được thứ bậc', desc: r.error })
      return false
    }
    if (after && before && after.id !== before.id) {
      const h = honorificAt(after, 1, total)
      celebrate({ title: `Nhường ghế ${h.name}`, subtitle: `${after.name} nay là ${h.name} của ${orgName}`, han: '让' })
      // người nhường mất quyền xếp ghế — tải lại quyền
      void refreshMe()
    } else {
      const h = honorificAt(member, seat, total)
      toast({ tone: 'gold', title: 'Đã đổi thứ bậc', desc: `${member.name} nay là ${h.name} (${h.han})` })
    }
    return true
  }

  /** Yêu cầu đưa `member` tới ghế `seat` — tự hỏi xác nhận nếu là nhường ghế Đại ca */
  const request = (member: Member, seat: number) => {
    if (busy || seat < 1 || seat > roster.length || seat === seatOf(roster, member)) return
    const leader = leaderAfterMove(roster, member.id, seat)
    if (leader && roster[0] && leader.id !== roster[0].id) setPending({ member, seat, leader })
    else void apply(member, seat)
  }

  const h = pending ? honorificAt(pending.leader, 1, roster.length) : null
  const dialog = (
    <ConfirmDialog
      open={!!pending}
      onClose={() => setPending(null)}
      onConfirm={() => {
        if (pending) void apply(pending.member, pending.seat)
      }}
      title={`Nhường ghế ${h?.name ?? 'Đại ca'}?`}
      han="让"
      confirmLabel="Nhường ghế"
    >
      {pending && h && (
        <>
          <b className="text-ink">{pending.leader.name}</b> sẽ ngồi ghế <span className="han text-[16px] text-gold">一</span> và trở thành{' '}
          <b className="text-ink">
            {h.name} <span className="han">{h.han}</span>
          </b>{' '}
          của {orgName}. Thứ bậc mọi người được tính lại theo ghế; bạn sẽ không còn quyền xếp ghế, thêm hay mời người ra nữa.
        </>
      )}
    </ConfirmDialog>
  )

  return { roster, request, busy, dialog }
}

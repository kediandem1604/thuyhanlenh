import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { motion } from 'motion/react'
import { ArrowLeft, ArrowUpRight, BadgeCheck, CalendarDays, Coins, Crown, Flame, Lock, Palette, Shield, SquarePen, Star, Swords, TrendingUp, UserMinus } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, SectionTitle } from '@/components/ui/Panel'
import { StatCard } from '@/components/ui/StatCard'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/Progress'
import { ClassBadge, ModeTag, RankSeal, RoleBadge, StatusText } from '@/components/ui/Badges'
import { Chibi } from '@/components/chibi/Chibi'
import { ChibiAvatar, MemberChip } from '@/components/chibi/ChibiAvatar'
import { useClassChartColors } from '@/components/charts/chartTheme'
import {
  ACHIEVEMENTS,
  BOND_TYPES,
  CLASSES,
  DUNGEON_MAP,
  LEDGER_CATEGORIES,
  MENTOR_STAGES,
  RANKS,
  RARITY,
} from '@/domain/constants'
import { ORG_TYPES, RANK_IDS_BY_TYPE, SEAT_HAN } from '@/domain/orgs'
import type { OrgType, RankId } from '@/domain/types'
import { bondsOf, useCan, useCurrentUser, useFeature, useGuild, useMember, useMemberMap, useOrg, useOrgType } from '@/store/guild'
import { checkAssignRank, checkExpel } from '@/domain/permissions'
import { toast } from '@/store/ui'
import { alpha } from '@/lib/color'
import { cn, daysBetween, fmt, fmtDate, fmtDuration, timeAgo } from '@/lib/utils'
import { MemberFormModal } from './MemberFormModal'
import { ClaimInvite } from './ClaimInvite'
import { SeatSeal, announceRankChange, honorificAt, leaderAfterMove, rankLockHint, rankOptionLabel, seatOf, useSeatMove } from './orgRoster'
import { PowerHistoryChart, StatsRadar } from './ProfileCharts'

/** Chữ cho nút / hộp thoại mời ra theo loại tổ chức */
const EXPEL_TEXT: Record<OrgType, { button: string; title: string; done: string }> = {
  guild: { button: 'Trục xuất', title: 'Trục xuất khỏi bang?', done: 'Đã trục xuất khỏi bang' },
  kimlan: { button: 'Mời rời Kim Lan', title: 'Mời rời Kim Lan?', done: 'Đã mời rời Kim Lan' },
  team: { button: 'Mời khỏi team', title: 'Mời khỏi team?', done: 'Đã mời khỏi team' },
}

/** Lưới thẻ chỉ số tùy số thẻ đang hiện */
const STAT_GRID: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 xl:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5',
}

export default function MemberProfilePage() {
  const { id } = useParams()
  const member = useMember(id)
  const navigate = useNavigate()
  const currentUserId = useGuild((s) => s.currentUserId)
  const mentorships = useGuild((s) => s.mentorships)
  const bonds = useGuild((s) => s.bonds)
  const clears = useGuild((s) => s.clears)
  const ledger = useGuild((s) => s.ledger)
  const allMembers = useGuild((s) => s.members)
  const setRank = useGuild((s) => s.setRank)
  const removeMember = useGuild((s) => s.removeMember)
  const refreshMe = useGuild((s) => s.refreshMe)
  const members = useMemberMap()
  const chartColors = useClassChartColors()
  const [editOpen, setEditOpen] = useState(false)
  const [expelOpen, setExpelOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const me = useCurrentUser()
  const canEditMembers = useCan('member.edit')
  const canInvite = useCan('recruit.review')
  const canAssignRank = useCan('rank.assign')
  const org = useOrg()
  const type = useOrgType()
  const info = ORG_TYPES[type]
  const orgName = org?.name ?? info.name
  const kimlan = type === 'kimlan'
  const seatMove = useSeatMove(orgName)
  const feat = {
    suDo: useFeature('su-do'),
    duyen: useFeature('tinh-duyen'),
    thanhTuu: useFeature('thanh-tuu'),
    phoBan: useFeature('pho-ban'),
    kho: useFeature('bang-kho'),
    chien: useFeature('bang-chien'),
    bayTran: useFeature('bay-tran'),
    lich: useFeature('lich'),
  }

  const data = useMemo(() => {
    if (!member) return null
    const asDisciple = mentorships.filter((m) => m.discipleId === member.id).sort((a, b) => (a.status === 'active' ? -1 : 1) - (b.status === 'active' ? -1 : 1))
    const asMaster = mentorships.filter((m) => m.masterId === member.id).sort((a, b) => (a.status === b.status ? b.stage - a.stage : a.status === 'active' ? -1 : 1))
    const myBonds = bondsOf(bonds, member.id)
    const myClears = clears.filter((c) => c.memberIds.includes(member.id)).slice(0, 6)
    const myLedger = ledger.filter((l) => l.memberId === member.id).slice(0, 8)
    const powerRank = [...allMembers].sort((a, b) => b.power - a.power).findIndex((m) => m.id === member.id) + 1
    return { asDisciple, asMaster, myBonds, myClears, myLedger, powerRank }
  }, [member, mentorships, bonds, clears, ledger, allMembers])

  if (!member || !data) {
    return (
      <div>
        <PageHeader eyebrow={`Hồ sơ ${info.memberWord}`} title="Không tìm thấy" han="寻" />
        <Panel corners>
          <EmptyState
            han="无"
            title="Hiệp khách này không có trong danh sách"
            desc={`Có thể người đã rời ${orgName}, hoặc đường dẫn bị sai.`}
            action={
              <Link to="/thanh-vien" className="btn btn-gold">
                <ArrowLeft size={15} /> Về {info.rosterName}
              </Link>
            }
          />
        </Panel>
      </div>
    )
  }

  const cls = CLASSES[member.classId]
  const chartColor = chartColors[member.classId]
  const isMe = member.id === currentUserId
  const joinedDays = daysBetween(member.joinedAt)
  const unlocked = new Set(member.achievements)

  // quyền với hồ sơ đang xem (server vẫn kiểm tra lại)
  const rankOptions = me && !kimlan ? RANK_IDS_BY_TYPE[type].filter((r) => r === member.rank || checkAssignRank(me.rank, member.rank, r, isMe, type).ok) : [member.rank]
  const canAssign = rankOptions.length > 1
  const canExpel = !!me && checkExpel(me.rank, member.rank, isMe, type).ok
  const canEdit = isMe || (canEditMembers && !!me && (me.rank === info.leaderRank || RANKS[me.rank].order < RANKS[member.rank].order))
  // nhân vật dùng chung đã có chủ (không phải mình) → chỉ chủ tài khoản sửa được thông tin nhân vật
  const charLocked = !!member.claimed && !isMe
  const canEditChar = canEdit && !charLocked

  // Kim Lan: thứ bậc theo ghế
  const roster = seatMove.roster
  const total = roster.length
  const seat = seatOf(roster, member)
  const fallbackHonorific = honorificAt(member, seat, total)
  const honorific = member.honorific ?? fallbackHonorific.name
  const honorificHan = member.honorificHan ?? fallbackHonorific.han
  const canSeat = kimlan && canAssignRank && total > 1
  const expelText = EXPEL_TEXT[type]

  const changeRank = async (rank: RankId) => {
    if (rank === member.rank || busy) return
    const prev = member.rank
    setBusy(true)
    const r = await setRank(member.id, rank)
    setBusy(false)
    if (!r.ok) {
      toast({ tone: 'error', title: 'Không thể đổi chức vụ', desc: r.error })
      return
    }
    // truyền ngôi → mình không còn đứng đầu, tải lại quyền
    if (announceRankChange(member.name, prev, rank, type, orgName)) void refreshMe()
  }

  const expel = async () => {
    const name = member.name
    setBusy(true)
    const r = await removeMember(member.id)
    setBusy(false)
    if (!r.ok) return toast({ tone: 'error', title: 'Không thực hiện được', desc: r.error })
    setExpelOpen(false)
    toast({ tone: 'info', title: expelText.done, desc: name })
    navigate('/thanh-vien')
  }

  // những gì bị gỡ khi mời ra — chỉ kể các chức năng tổ chức đang dùng
  const expelLoses = [feat.suDo && 'sư đồ', feat.duyen && 'tình duyên', feat.bayTran && 'vị trí trong đội hình', feat.lich && 'điểm danh sự kiện'].filter(
    (x): x is string => !!x,
  )

  const statCards = [
    <StatCard key="power" index={0} icon={Flame} label="Chiến lực" value={member.power} color="#d8b46a" hint={`hạng #${data.powerRank}`} />,
    feat.kho && <StatCard key="contrib" index={1} icon={Coins} label="Tổng cống hiến" value={member.contribution} color="#5ec7b0" hint="điểm quỹ" />,
    feat.kho && <StatCard key="weekly" index={2} icon={TrendingUp} label="Cống hiến tuần" value={member.weeklyContribution} color="#6fa8ff" hint="từ đầu tuần" />,
    !feat.kho && (
      <StatCard key="joined" index={1} icon={CalendarDays} label={kimlan ? 'Ngày kết nghĩa' : 'Ngày gia nhập'} value={joinedDays} color="#5ec7b0" hint={`từ ${fmtDate(member.joinedAt)}`} />
    ),
    <StatCard key="level" index={3} icon={Star} label="Cấp độ" value={member.level} color="#a08cf5" hint="tối đa 80" />,
    feat.chien && (
      <StatCard
        key="pvp"
        index={4}
        icon={Swords}
        label="PvP K/D"
        value={member.pvp.kills / Math.max(1, member.pvp.deaths)}
        format={(n) => n.toFixed(2).replace('.', ',')}
        color="#e0523f"
        hint={`${fmt(member.pvp.kills)} hạ · ${fmt(member.pvp.deaths)} ngã`}
      />
    ),
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={kimlan ? `${orgName} · ${honorific} · ${cls.name}` : `Hồ sơ ${info.memberWord} · ${cls.name}`}
        title={member.name}
        han={kimlan ? honorificHan.slice(0, 1) : cls.han[0]}
        description={
          <>
            <span className="italic text-gold">{member.title}</span> — {cls.tagline}
          </>
        }
        actions={
          <Link to="/thanh-vien" className="btn btn-ghost">
            <ArrowLeft size={15} /> Danh sách
          </Link>
        }
      />

      {/* hero */}
      <Panel corners className="relative overflow-hidden !p-0">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(600px 340px at 18% 60%, ${alpha(cls.palette.accent, 0.22)}, transparent 70%)` }}
        />
        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[300px_1fr] lg:gap-8">
          {/* sân khấu chibi */}
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', damping: 16 }} className="relative flex flex-col items-center justify-end">
            <div className="absolute left-1/2 top-1/2 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed animate-spin-slow" style={{ borderColor: alpha(cls.palette.accent, 0.3) }} />
            <span className="han pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[190px] leading-none opacity-[0.08]" style={{ color: cls.palette.accent }}>
              {cls.han[0]}
            </span>
            <Chibi look={member.look} classId={member.classId} size={220} title={member.name} className="relative drop-shadow-[0_20px_26px_rgba(0,0,0,.45)]" />
            <div className="-mt-5 h-5 w-[70%] rounded-[50%]" style={{ background: `radial-gradient(ellipse at center, ${alpha(cls.palette.accent, 0.4)}, transparent 70%)` }} />
          </motion.div>

          {/* thông tin */}
          <div className="flex min-w-0 flex-col justify-center">
            {/* Kim Lan: danh xưng theo ghế là điều nổi bật nhất */}
            {kimlan && (
              <div className="mb-4 flex items-center gap-4">
                <SeatSeal seat={seat} size="xl" />
                <div className="min-w-0">
                  <div className="eyebrow mb-1">
                    Kim Lan · Ghế {SEAT_HAN[seat]} / {total}
                    {seat === 1 && ' · Đứng đầu'}
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="title-display text-gold-grad text-[38px] leading-none sm:text-[44px]">{honorific}</span>
                    <span className="han text-[26px] text-muted sm:text-[30px]">{honorificHan}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {!kimlan && (
                <>
                  <RankSeal rank={member.rank} member={member} size="lg" />
                  <span className="mx-1 h-6 w-px bg-line" />
                </>
              )}
              <ClassBadge classId={member.classId} showHan />
              <RoleBadge role={cls.role} />
              <span className="chip">
                <Star size={11} className="text-gold" /> Cấp {member.level}
              </span>
              {member.claimed ? (
                <span className="chip text-jade" title="Nhân vật đã có chủ tài khoản — dùng chung ở mọi tổ chức">
                  <BadgeCheck size={12} /> Đã có chủ
                </span>
              ) : (
                <span className="chip text-muted" title="Chưa có tài khoản nào nhận nhân vật này">
                  Chưa có chủ
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-muted">
              <StatusText status={member.status} />
              {member.status === 'offline' && <span>Lần cuối {timeAgo(member.lastOnline)}</span>}
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={13} /> {kimlan ? 'Kết nghĩa' : 'Gia nhập'} {joinedDays} ngày trước · {fmtDate(member.joinedAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Crown size={13} className="text-gold" /> Chiến lực hạng #{data.powerRank} trong {orgName}
              </span>
            </div>
            <blockquote className="mt-4 rounded-2xl border border-line bg-black/10 px-4 py-3 text-[14px] italic text-ink-2">“{member.bio}”</blockquote>

            {/* quản lý */}
            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-line p-3.5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                <Shield size={13} className="text-gold" /> Quản lý
              </div>
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {kimlan ? (
                  <select
                    className="field !h-9 !w-auto min-w-[190px] !text-[13px]"
                    value={seat}
                    disabled={!canSeat || seatMove.busy}
                    title={canSeat ? 'Đưa người khác lên ghế 一 là nhường ghế Đại ca' : rankLockHint('kimlan')}
                    onChange={(e) => seatMove.request(member, Number(e.target.value))}
                    aria-label="Đổi thứ bậc (ghế)"
                  >
                    {(canSeat ? Array.from({ length: total }, (_, i) => i + 1) : [seat]).map((s) => {
                      const transfer = s !== seat && leaderAfterMove(roster, member.id, s)?.id !== roster[0]?.id
                      return (
                        <option key={s} value={s}>
                          Ghế {SEAT_HAN[s]} · {s === seat ? honorific : honorificAt(member, s, total).name}
                          {transfer ? ' (nhường ghế Đại ca)' : ''}
                        </option>
                      )
                    })}
                  </select>
                ) : (
                  <select
                    className="field !h-9 !w-auto min-w-[160px] !text-[13px]"
                    value={member.rank}
                    disabled={!canAssign || busy}
                    title={canAssign ? undefined : rankLockHint(type)}
                    onChange={(e) => void changeRank(e.target.value as RankId)}
                    aria-label="Đổi chức vụ"
                  >
                    {(canAssign ? rankOptions : [member.rank]).map((r) => (
                      <option key={r} value={r}>
                        {rankOptionLabel(r, type, member.rank)}
                      </option>
                    ))}
                  </select>
                )}
                {canEditChar && (
                  <button className="btn btn-sm" onClick={() => setEditOpen(true)}>
                    <SquarePen size={14} /> Sửa hồ sơ
                  </button>
                )}
                {canEdit && charLocked && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-muted" title="Nhân vật dùng chung ở mọi tổ chức của người đó">
                    <Lock size={12} className="text-gold" /> Nhân vật đã có chủ — chỉ chủ tài khoản mới sửa được
                  </span>
                )}
                {isMe ? (
                  <Link to="/xuong-chibi" className="btn btn-gold btn-sm">
                    <Palette size={14} /> Chỉnh tạo hình
                  </Link>
                ) : (
                  canExpel && (
                    <button className="btn btn-sm btn-ghost !text-cinnabar sm:ml-auto" onClick={() => setExpelOpen(true)}>
                      <UserMinus size={14} /> {expelText.button}
                    </button>
                  )
                )}
                {!canEdit && !canAssign && !canSeat && !isMe && <span className="text-[12px] text-muted">Chỉ xem — quản lý cần chức vụ cao hơn người này.</span>}
              </div>
            </div>

            {/* nhân vật chưa có chủ → tạo link nhận danh tính */}
            {!member.claimed && canInvite && <ClaimInvite key={member.id} member={member} className="mt-3" />}
          </div>
        </div>
      </Panel>

      {/* chỉ số nhanh */}
      <div className={cn('grid gap-3 sm:gap-4', STAT_GRID[statCards.length] ?? STAT_GRID[5])}>{statCards}</div>

      {/* biểu đồ */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel corners>
          <SectionTitle han="能" title="Năng lực tổng hợp" subtitle="Thang điểm 0–100 theo sáu phương diện" />
          <StatsRadar member={member} color={chartColor} />
        </Panel>
        <Panel corners>
          <SectionTitle han="力" title="Diễn biến chiến lực" subtitle="8 tuần gần nhất" />
          <PowerHistoryChart member={member} color={chartColor} />
        </Panel>
      </div>

      {/* sư đồ + tình duyên */}
      {(feat.suDo || feat.duyen) && (
      <div className={cn('grid grid-cols-1 gap-6', feat.suDo && feat.duyen && 'xl:grid-cols-2')}>
        {feat.suDo && (
          <Panel corners>
            <SectionTitle
              han="师"
              title="Sư đồ"
              subtitle={`${data.asMaster.length} đồ đệ · ${data.asDisciple.length ? 'có sư phụ' : 'chưa bái sư'}`}
              right={
                <Link to="/su-do" className="btn btn-ghost btn-sm text-gold">
                  Sư Đồ Đường <ArrowUpRight size={14} />
                </Link>
              }
            />
            {data.asDisciple.length === 0 && data.asMaster.length === 0 ? (
              <EmptyState han="拜" title="Chưa có duyên sư đồ" desc="Hãy ghé Sư Đồ Đường để bái sư hoặc nhận đồ đệ." />
            ) : (
              <div className="space-y-4">
                {data.asDisciple.map((ms) => {
                  const master = members[ms.masterId]
                  if (!master) return null
                  return (
                    <div key={ms.id}>
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Sư phụ</div>
                      <div className="flex items-center gap-3 rounded-2xl border border-line bg-black/10 p-3">
                        <MemberChip member={master} size={40} className="flex-1" />
                        <span className="chip shrink-0" style={{ color: ms.status === 'graduated' ? 'var(--gold)' : 'var(--jade)' }}>
                          {ms.status === 'graduated' ? 'Đã xuất sư' : MENTOR_STAGES[ms.stage].name}
                        </span>
                      </div>
                    </div>
                  )
                })}
                {data.asMaster.length > 0 && (
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Đồ đệ</div>
                    <ul className="space-y-2">
                      {data.asMaster.map((ms) => {
                        const d = members[ms.discipleId]
                        if (!d) return null
                        const done = ms.tasks.filter((t) => t.done).length
                        return (
                          <li key={ms.id} className="rounded-2xl border border-line bg-black/10 p-3">
                            <div className="flex items-center gap-3">
                              <MemberChip member={d} size={36} className="flex-1" />
                              <span className="chip shrink-0" style={{ color: ms.status === 'graduated' ? 'var(--gold)' : 'var(--jade)' }}>
                                {ms.status === 'graduated' ? 'Đã xuất sư' : `${MENTOR_STAGES[ms.stage].name} · ${ms.stage + 1}/5`}
                              </span>
                            </div>
                            {ms.status === 'active' && <ProgressBar value={done} max={ms.tasks.length} className="mt-2.5" height={5} />}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Panel>
        )}
        {feat.duyen && (
          <Panel corners>
            <SectionTitle
              han="缘"
              title="Tình duyên"
              subtitle={data.myBonds.length ? `${data.myBonds.length} mối duyên` : 'Vẫn đang một mình ngắm trăng'}
              right={
                <Link to="/tinh-duyen" className="btn btn-ghost btn-sm text-gold">
                  Tình Duyên Các <ArrowUpRight size={14} />
                </Link>
              }
            />
            {data.myBonds.length === 0 ? (
              <EmptyState han="月" title="Chưa kết duyên" desc="Nguyệt Lão chưa se chỉ hồng… có lẽ đang đợi một trận phó bản định mệnh." />
            ) : (
              <ul className="space-y-3">
                {data.myBonds.map((b) => {
                  const partner = members[b.aId === member.id ? b.bId : b.aId]
                  const t = BOND_TYPES[b.type]
                  if (!partner) return null
                  return (
                    <li
                      key={b.id}
                      className="flex items-center gap-3 rounded-2xl border p-3"
                      style={{ borderColor: alpha(t.color, 0.35), background: `linear-gradient(90deg, ${alpha(t.color, 0.12)}, transparent 70%)` }}
                    >
                      <span
                        className="seal h-11 w-11 shrink-0 text-[22px]"
                        style={{ background: `radial-gradient(circle at 30% 25%, ${alpha(t.color, 0.95)}, ${alpha(t.color, 0.6)} 75%)` }}
                        title={t.desc}
                      >
                        {t.han}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: t.color }}>
                          {t.name} · {daysBetween(b.since)} ngày
                        </div>
                        <MemberChip member={partner} size={32} className="mt-1" />
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[11px] text-muted">Thân mật</div>
                        <div className="text-[14px] font-bold tabular-nums text-ink">{fmt(b.intimacy)}</div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        )}
      </div>
      )}

      {/* thành tựu */}
      {feat.thanhTuu && (
        <Panel corners>
          <SectionTitle
            han="勋"
            title="Thành tựu"
            subtitle={`Đã đạt ${unlocked.size}/${ACHIEVEMENTS.length} huy hiệu`}
            right={
              <Link to="/thanh-tuu" className="btn btn-ghost btn-sm text-gold">
                Tất cả <ArrowUpRight size={14} />
              </Link>
            }
          />
          <ProgressBar value={unlocked.size} max={ACHIEVEMENTS.length} className="mb-5" height={6} />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
            {[...ACHIEVEMENTS]
              .sort((a, b) => Number(unlocked.has(b.id)) - Number(unlocked.has(a.id)))
              .map((a, i) => {
                const r = RARITY[a.rarity]
                const has = unlocked.has(a.id)
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.4) }}
                    className={cn('group flex flex-col items-center text-center', !has && 'opacity-35 grayscale')}
                    title={`${a.name} — ${a.desc}${has ? '' : ' (chưa đạt)'}`}
                  >
                    <span
                      className="han grid h-14 w-14 place-items-center rounded-full border-2 text-[24px] transition-transform group-hover:-translate-y-1"
                      style={{
                        color: r.color,
                        borderColor: alpha(r.color, has ? 0.8 : 0.3),
                        background: `radial-gradient(circle at 35% 30%, ${alpha(r.color, 0.3)}, ${alpha(r.color, 0.06)} 70%)`,
                        boxShadow: has ? `0 0 18px -4px ${r.glow}, inset 0 0 0 3px ${alpha(r.color, 0.15)}` : undefined,
                      }}
                    >
                      {a.icon}
                    </span>
                    <span className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-tight text-ink-2">{a.name}</span>
                  </motion.div>
                )
              })}
          </div>
        </Panel>
      )}

      {/* phó bản + sổ cống hiến */}
      {(feat.phoBan || feat.kho) && (
      <div className={cn('grid grid-cols-1 gap-6', feat.phoBan && feat.kho && 'xl:grid-cols-2')}>
        {feat.phoBan && (
          <Panel corners>
            <SectionTitle
              han="征"
              title="Chinh phạt gần đây"
              subtitle="Những lượt hạ boss có mặt"
              right={
                <Link to="/pho-ban" className="btn btn-ghost btn-sm text-gold">
                  Phó Bản <ArrowUpRight size={14} />
                </Link>
              }
            />
            {data.myClears.length === 0 ? (
              <EmptyState han="剑" title="Chưa có lượt clear nào" desc={`Hãy cùng ${orgName} chinh phạt phó bản đầu tiên!`} />
            ) : (
              <ul className="space-y-2">
                {data.myClears.map((c) => {
                  const d = DUNGEON_MAP[c.dungeonId]
                  const boss = d?.bosses.find((b) => b.id === c.bossId)
                  const mvp = c.mvpId === member.id
                  return (
                    <li key={c.id} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.03]">
                      <span className="han grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[18px]" style={{ background: alpha(boss?.color ?? '#888888', 0.18), color: boss?.color }}>
                        {boss?.glyph ?? '?'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold text-ink">
                          {boss?.name}
                          {mvp && (
                            <span className="chip !h-5 !px-1.5 !text-[10px] text-gold" title="MVP">
                              <Crown size={10} /> MVP
                            </span>
                          )}
                        </div>
                        <div className="truncate text-[11.5px] text-muted">
                          {d?.name} · {timeAgo(c.date)} · {fmtDuration(c.durationSec)}
                        </div>
                      </div>
                      <ModeTag mode={c.mode} />
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        )}
        {feat.kho && (
          <Panel corners>
            <SectionTitle
              han="库"
              title="Sổ cống hiến"
              subtitle={`Số dư hiện tại ${fmt(member.contribution)} điểm`}
              right={
                <Link to="/bang-kho" className="btn btn-ghost btn-sm text-gold">
                  {type === 'guild' ? 'Bang Khố' : 'Quỹ & Đấu Giá'} <ArrowUpRight size={14} />
                </Link>
              }
            />
            {data.myLedger.length === 0 ? (
              <EmptyState han="账" title="Chưa có bút toán nào" />
            ) : (
              <ul className="divide-y divide-line">
                {data.myLedger.map((l) => {
                  const cat = LEDGER_CATEGORIES[l.category]
                  return (
                    <li key={l.id} className="flex items-center gap-3 py-2.5">
                      <span className="chip !h-6 shrink-0 !text-[10.5px]" style={{ color: cat.color, borderColor: alpha(cat.color, 0.35) }}>
                        {cat.name}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] text-ink-2">{l.reason}</div>
                        <div className="text-[11px] text-muted">{timeAgo(l.date)}</div>
                      </div>
                      <span className={cn('shrink-0 text-[14px] font-bold tabular-nums', l.delta >= 0 ? 'text-jade' : 'text-cinnabar')}>
                        {l.delta >= 0 ? '+' : ''}
                        {fmt(l.delta)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        )}
      </div>
      )}

      <MemberFormModal open={editOpen} onClose={() => setEditOpen(false)} member={member} />

      <Modal
        open={expelOpen}
        onClose={() => setExpelOpen(false)}
        size="sm"
        han="逐"
        title={expelText.title}
        subtitle="Hành động này không thể hoàn tác"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setExpelOpen(false)}>
              Giữ lại
            </button>
            <button className="btn btn-cinnabar" disabled={busy} onClick={() => void expel()}>
              <UserMinus size={15} /> {expelText.button}
            </button>
          </>
        }
      >
        <div className="flex items-center gap-4">
          <ChibiAvatar look={{ ...member.look, expression: 'shy' }} classId={member.classId} rank={member.rank} size={64} />
          <div className="space-y-1.5 text-[13.5px] text-ink-2">
            <p>
              <b className="text-ink">{kimlan ? `${honorific} ${member.name}` : member.name}</b> sẽ không còn là {info.memberWord} của {orgName}.
              {expelLoses.length > 0 && ` Dữ liệu ${expelLoses.join(', ')} của người này trong ${orgName} cũng sẽ bị gỡ bỏ.`}
              {kimlan && ' Những người ngồi sau sẽ được dồn lên một ghế.'}
            </p>
            <p className="text-[12px] text-muted">Nhân vật vẫn giữ nguyên ở các tổ chức khác.</p>
          </div>
        </div>
      </Modal>

      {seatMove.dialog}
    </div>
  )
}

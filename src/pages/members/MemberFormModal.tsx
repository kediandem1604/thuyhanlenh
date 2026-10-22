import { useEffect, useMemo, useState } from 'react'
import { Lock, Shuffle } from 'lucide-react'
import { Field, Modal } from '@/components/ui/Modal'
import { Segmented } from '@/components/ui/Segmented'
import { Chibi } from '@/components/chibi/Chibi'
import { RoleBadge } from '@/components/ui/Badges'
import { CLASSES, CLASS_IDS, RANKS } from '@/domain/constants'
import { ORG_TYPES, RANK_IDS_BY_TYPE, SEAT_HAN } from '@/domain/orgs'
import type { ClassId, Gender, Member, OrgType, RankId } from '@/domain/types'
import { lookFromSeed } from '@/data/seed'
import { useCan, useCurrentUser, useGuild, useOrg, useOrgType } from '@/store/guild'
import { checkAssignRank, permHint } from '@/domain/permissions'
import { toast } from '@/store/ui'
import { alpha } from '@/lib/color'
import { cn, normalize } from '@/lib/utils'
import { SeatSeal, announceRankChange, honorificAt, leaderAfterMove, rankLockHint, rankOptionLabel, seatOf, useSeatMove } from './orgRoster'

interface Props {
  open: boolean
  onClose: () => void
  /** có member → chế độ sửa */
  member?: Member | null
  onSaved?: (m: Member) => void
}

interface FormState {
  name: string
  classId: ClassId
  gender: Gender
  rank: RankId
  /** Kim Lan: ghế thứ bậc */
  seat: number
  level: string
  power: string
  title: string
  bio: string
}

type Errors = Partial<Record<keyof FormState, string>>

const ADD_TEXT: Record<OrgType, { title: string; han: string; welcome: string }> = {
  guild: { title: 'Thu nhận môn hạ', han: '迎', welcome: 'Chào mừng tân môn hạ!' },
  kimlan: { title: 'Kết nghĩa Kim Lan', han: '义', welcome: 'Thêm một người trong Kim Lan!' },
  team: { title: 'Thêm thành viên', han: '迎', welcome: 'Chào mừng thành viên mới!' },
}

const LOCKED_HINT = 'Nhân vật đã có chủ — chỉ chủ tài khoản mới sửa được'

function initial(member: Member | null | undefined, entryRank: RankId, seat: number): FormState {
  if (member)
    return {
      name: member.name,
      classId: member.classId,
      gender: member.look.gender,
      rank: member.rank,
      seat,
      level: String(member.level),
      power: String(member.power),
      title: member.title,
      bio: member.bio,
    }
  return { name: '', classId: 'to-van', gender: 'nu', rank: entryRank, seat, level: '60', power: '120000', title: '', bio: '' }
}

/** Hộp thoại thêm / sửa thành viên (mọi loại tổ chức), có xem trước chibi trực tiếp */
export function MemberFormModal({ open, onClose, member, onSaved }: Props) {
  const members = useGuild((s) => s.members)
  const addMember = useGuild((s) => s.addMember)
  const updateMember = useGuild((s) => s.updateMember)
  const setRank = useGuild((s) => s.setRank)
  const refreshMe = useGuild((s) => s.refreshMe)
  const org = useOrg()
  const type = useOrgType()
  const info = ORG_TYPES[type]
  const orgName = org?.name ?? info.name
  const kimlan = type === 'kimlan'
  const rankIds = RANK_IDS_BY_TYPE[type]
  const capacity = org ? org.capacity : info.capacity
  const seatMove = useSeatMove(orgName)
  const roster = seatMove.roster
  const isEdit = !!member
  /** ghế hiện tại của người đang sửa (thêm mới: 0 — người mới luôn vào ghế cuối) */
  const currentSeat = member ? seatOf(roster, member) : 0
  const [f, setF] = useState<FormState>(() => initial(member, info.entryRank, currentSeat))
  const [salt, setSalt] = useState(0)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const me = useCurrentUser()
  const canEditAll = useCan('member.edit')
  const canAssign = useCan('rank.assign')
  const canInvite = useCan('recruit.review')
  const isMe = !!me && !!member && me.id === member.id
  /** nhân vật dùng chung đã có chủ tài khoản (không phải mình) → mọi thông tin nhân vật chỉ đọc */
  const charLocked = isEdit && !!member?.claimed && !isMe
  /** đang tự sửa hồ sơ mình mà không có quyền member.edit */
  const selfOnly = isEdit && !canEditAll && !charLocked
  /** khóa tên, lưu phái, cấp, chiến lực */
  const coreLocked = selfOnly || charLocked

  const rankAllowed = (r: RankId) => {
    if (!isEdit) return canEditAll && r !== info.leaderRank
    if (!me || !member) return false
    return r === member.rank || checkAssignRank(me.rank, member.rank, r, isMe, type).ok
  }
  const canRank = !kimlan && isEdit && rankAllowed(f.rank)
  const rankSelectable = rankIds.some((r) => r !== f.rank && rankAllowed(r))
  const canSeat = kimlan && isEdit && canAssign && roster.length > 1

  useEffect(() => {
    if (open) {
      setF(initial(member, info.entryRank, currentSeat))
      setSalt(0)
      setErrors({})
    }
  }, [open, member, info.entryRank, currentSeat])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setF((s) => ({ ...s, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const preview = useMemo(() => {
    if (member && salt === 0 && f.gender === member.look.gender) return member.look
    const base = member ? member.id : `new-${normalize(f.name.trim()) || 'vo-danh'}`
    return lookFromSeed(`${base}-${salt}-${f.gender}`, f.classId, f.gender)
  }, [member, salt, f.gender, f.classId, f.name])

  const rankCounts = useMemo(() => {
    const c: Partial<Record<RankId, number>> = {}
    members.forEach((m) => {
      if (m.id !== member?.id) c[m.rank] = (c[m.rank] ?? 0) + 1
    })
    return c
  }, [members, member])

  const validate = (): Errors => {
    const e: Errors = {}
    if (!isEdit && capacity !== null && members.length >= capacity) {
      e.name = kimlan ? 'Kim Lan đã đủ 12 người.' : `${orgName} đã đủ ${capacity} người.`
      return e
    }
    if (!coreLocked) {
      const name = f.name.trim()
      if (!name) e.name = 'Hãy đặt danh hiệu giang hồ cho nhân vật.'
      else if (name.length > 28) e.name = 'Tên tối đa 28 ký tự.'
      else if (members.some((m) => m.id !== member?.id && normalize(m.name) === normalize(name))) e.name = `Tên này đã có người dùng trong ${orgName}.`
      const level = Number(f.level)
      if (!Number.isInteger(level) || level < 1 || level > 80) e.level = 'Cấp từ 1 đến 80.'
      const power = Number(f.power)
      if (!Number.isFinite(power) || power <= 0) e.power = 'Chiến lực phải lớn hơn 0.'
      else if (power > 2_000_000) e.power = 'Chiến lực quá lớn.'
    }
    if (!kimlan) {
      const r = RANKS[f.rank]
      if (f.rank !== member?.rank && r.max !== undefined && (rankCounts[f.rank] ?? 0) >= r.max) e.rank = `Chức ${r.name} đã đủ ${r.max} người.`
    }
    return e
  }

  const submit = async () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) {
      toast({ tone: 'error', title: 'Chưa thể lưu', desc: Object.values(e)[0] })
      return
    }
    const name = f.name.trim()
    const level = Number(f.level)
    const power = Math.round(Number(f.power))
    setBusy(true)
    try {
      if (!member) {
        const r = await addMember({
          name,
          classId: f.classId,
          gender: f.gender,
          level,
          power,
          title: f.title,
          bio: f.bio,
          look: preview,
          rank: !kimlan && f.rank !== info.entryRank ? f.rank : undefined,
        })
        if (!r.ok) return toast({ tone: 'error', title: 'Chưa ghi danh được', desc: r.error })
        const joined = kimlan && r.data.honorific ? `${name} đã kết nghĩa ${orgName}, thành ${r.data.honorific}.` : `${name} đã gia nhập ${orgName}.`
        toast({ tone: 'success', title: ADD_TEXT[type].welcome, desc: canInvite ? `${joined} Mở hồ sơ để tạo link nhận danh tính cho chủ nhân vật.` : joined })
        onSaved?.(r.data)
      } else {
        let saved = false
        if (!charLocked) {
          // tự sửa hồ sơ của mình (không có quyền member.edit) chỉ được đổi danh hiệu, tiểu sử, tạo hình
          const patch = selfOnly
            ? { title: f.title.trim() || member.title, bio: f.bio.trim() || member.bio, look: preview }
            : { name, classId: f.classId, level, power, title: f.title.trim() || member.title, bio: f.bio.trim() || member.bio, look: preview }
          const r = await updateMember(member.id, patch)
          if (!r.ok) return toast({ tone: 'error', title: 'Chưa lưu được hồ sơ', desc: r.error })
          saved = true
        }
        if (!kimlan && f.rank !== member.rank && canRank) {
          const rr = await setRank(member.id, f.rank)
          if (!rr.ok) toast({ tone: 'error', title: 'Không thể đổi chức vụ', desc: rr.error })
          else if (announceRankChange(member.name, member.rank, f.rank, type, orgName)) void refreshMe()
        }
        if (saved) toast({ tone: 'success', title: 'Đã cập nhật hồ sơ', desc: charLocked ? member.name : name })
        // Kim Lan: đổi ghế sau cùng — nhường ghế Đại ca sẽ hỏi xác nhận (hộp thoại còn sống sau khi đóng form)
        if (canSeat && f.seat !== currentSeat) seatMove.request(member, f.seat)
        onSaved?.({ ...member, name: charLocked ? member.name : name })
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const cls = CLASSES[f.classId]
  const addText = ADD_TEXT[type]
  // Kim Lan: ghế khi thêm mới là ghế cuối
  const newSeat = roster.length + 1
  const newHonorific = honorificAt({ look: preview }, newSeat, newSeat)

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="lg"
        han={isEdit ? '改' : addText.han}
        title={isEdit ? 'Chỉnh sửa hồ sơ' : addText.title}
        subtitle={isEdit ? (kimlan && member?.honorific ? `${member.honorific} · ${member.name}` : member?.name) : `Ghi danh một hiệp khách mới vào ${orgName}`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={onClose}>
              Hủy
            </button>
            <button className="btn btn-gold" onClick={() => void submit()} disabled={busy}>
              {busy ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Ghi danh'}
            </button>
          </>
        }
      >
        {charLocked && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-line-strong bg-black/10 px-3.5 py-2.5 text-[12.5px] text-ink-2">
            <Lock size={14} className="mt-0.5 shrink-0 text-gold" />
            <span>
              <b className="text-ink">{LOCKED_HINT}.</b> Nhân vật dùng chung ở mọi tổ chức của người đó.
              {canRank || canSeat ? ` Bạn vẫn có thể đổi ${kimlan ? 'thứ bậc' : 'chức vụ'} trong ${orgName}.` : ''}
            </span>
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-[200px_1fr]">
          {/* xem trước */}
          <div className="flex flex-col items-center">
            <div
              className="relative grid w-full place-items-center overflow-hidden rounded-2xl border border-line pb-2 pt-4"
              style={{ background: `radial-gradient(circle at 50% 60%, ${alpha(cls.palette.accent, 0.3)}, transparent 72%)` }}
            >
              <span className="han pointer-events-none absolute -top-2 right-1 text-[72px] leading-none opacity-10" style={{ color: cls.palette.accent }}>
                {cls.han[0]}
              </span>
              <Chibi look={preview} classId={f.classId} size={150} />
            </div>
            <span title={charLocked ? LOCKED_HINT : undefined} className="mt-3 inline-flex">
              <button type="button" className="btn btn-sm" onClick={() => setSalt((s) => s + 1)} disabled={charLocked}>
                <Shuffle size={14} /> Đổi tạo hình
              </button>
            </span>
            <p className="mt-2 text-center text-[11.5px] text-muted">{cls.tagline}</p>
          </div>

          {/* biểu mẫu */}
          <div className="space-y-4">
            <Field label="Danh hiệu giang hồ (tên nhân vật)">
              <input
                className={cn('field', errors.name && '!border-cinnabar')}
                value={f.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="VD: Nguyệt Hạ Vô Song"
                maxLength={32}
                autoFocus={!coreLocked}
                disabled={coreLocked}
                title={charLocked ? LOCKED_HINT : selfOnly ? `${permHint('member.edit', type)} để đổi tên` : undefined}
              />
              {selfOnly && <span className="mt-1 block text-[11.5px] text-muted">Bạn chỉ có thể đổi danh hiệu, tiểu sử và tạo hình của mình.</span>}
              {errors.name && <span className="mt-1 block text-[11.5px] text-cinnabar">{errors.name}</span>}
            </Field>

            <div>
              <span className="label">Lưu phái</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CLASS_IDS.map((id) => {
                  const c = CLASSES[id]
                  const active = f.classId === id
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-label={c.name}
                      aria-pressed={active}
                      disabled={coreLocked}
                      onClick={() => set('classId', id)}
                      className={cn(
                        'flex h-10 items-center gap-2 rounded-xl border px-2.5 text-left text-[12.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
                        active ? 'text-ink' : 'border-line text-ink-2 hover:text-ink',
                      )}
                      style={
                        active
                          ? { borderColor: alpha(c.palette.accent, 0.7), background: alpha(c.palette.accent, 0.16), boxShadow: `0 0 16px -6px ${c.palette.accent}` }
                          : undefined
                      }
                    >
                      <span className="han text-[15px]" style={{ color: c.palette.accent }}>
                        {c.han[0]}
                      </span>
                      <span className="truncate">{c.name}</span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-2">
                <RoleBadge role={cls.role} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="label">Giới tính</span>
                <div className={cn(charLocked && 'pointer-events-none opacity-60')} aria-disabled={charLocked} title={charLocked ? LOCKED_HINT : undefined}>
                  <Segmented
                    value={f.gender}
                    onChange={(v) => set('gender', v)}
                    options={[
                      { value: 'nu', label: 'Nữ hiệp' },
                      { value: 'nam', label: 'Nam hiệp' },
                    ]}
                  />
                </div>
              </div>

              {kimlan ? (
                isEdit && member ? (
                  <Field label="Thứ bậc (ghế)" hint={canSeat ? 'Đưa người khác lên ghế 一 là nhường ghế Đại ca.' : undefined}>
                    <select
                      className="field"
                      value={f.seat}
                      onChange={(e) => set('seat', Number(e.target.value))}
                      disabled={!canSeat}
                      title={canSeat ? undefined : rankLockHint('kimlan')}
                    >
                      {Array.from({ length: Math.max(roster.length, currentSeat) }, (_, i) => i + 1).map((s) => {
                        const transfer = s !== currentSeat && leaderAfterMove(roster, member.id, s)?.id !== roster[0]?.id
                        return (
                          <option key={s} value={s}>
                            Ghế {SEAT_HAN[s]} · {honorificAt(member, s, roster.length).name}
                            {transfer ? ' (nhường ghế Đại ca)' : ''}
                          </option>
                        )
                      })}
                    </select>
                  </Field>
                ) : (
                  <div>
                    <span className="label">Thứ bậc</span>
                    <div className="flex h-11 items-center gap-2.5 rounded-xl border border-line px-3">
                      <SeatSeal seat={newSeat} size="sm" />
                      <span className="text-[13px] font-semibold text-ink">{newHonorific.name}</span>
                      <span className="han text-[14px] text-muted">{newHonorific.han}</span>
                    </div>
                    <span className="mt-1 block text-[11.5px] text-muted">Người mới ngồi ghế cuối — Đại ca xếp lại sau.</span>
                  </div>
                )
              ) : (
                <Field label="Chức vụ">
                  <select
                    className={cn('field', errors.rank && '!border-cinnabar')}
                    value={f.rank}
                    onChange={(e) => set('rank', e.target.value as RankId)}
                    disabled={!rankSelectable}
                    title={isEdit && !rankSelectable ? rankLockHint(type) : undefined}
                  >
                    {rankIds.map((r) => {
                      const rk = RANKS[r]
                      const full = r !== member?.rank && rk.max !== undefined && (rankCounts[r] ?? 0) >= rk.max
                      const allowed = rankAllowed(r)
                      return (
                        <option key={r} value={r} disabled={full || !allowed}>
                          {isEdit ? rankOptionLabel(r, type, member?.rank) : rk.name}
                          {full ? ' (đã đủ người)' : !allowed ? ' (không đủ quyền)' : ''}
                        </option>
                      )
                    })}
                  </select>
                  {errors.rank && <span className="mt-1 block text-[11.5px] text-cinnabar">{errors.rank}</span>}
                </Field>
              )}

              <Field label="Cấp độ">
                <input
                  className={cn('field', errors.level && '!border-cinnabar')}
                  type="number"
                  min={1}
                  max={80}
                  value={f.level}
                  disabled={coreLocked}
                  title={charLocked ? LOCKED_HINT : undefined}
                  onChange={(e) => set('level', e.target.value)}
                />
                {errors.level && <span className="mt-1 block text-[11.5px] text-cinnabar">{errors.level}</span>}
              </Field>
              <Field label="Chiến lực">
                <input
                  className={cn('field', errors.power && '!border-cinnabar')}
                  type="number"
                  min={1}
                  step={1000}
                  value={f.power}
                  disabled={coreLocked}
                  title={charLocked ? LOCKED_HINT : undefined}
                  onChange={(e) => set('power', e.target.value)}
                />
                {errors.power && <span className="mt-1 block text-[11.5px] text-cinnabar">{errors.power}</span>}
              </Field>
            </div>

            <Field label="Danh hiệu hiển thị" hint={charLocked ? undefined : 'Để trống sẽ dùng danh hiệu mặc định.'}>
              <input
                className="field"
                value={f.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="VD: Thần Y Diệu Thủ"
                maxLength={40}
                disabled={charLocked}
                title={charLocked ? LOCKED_HINT : undefined}
              />
            </Field>
            <Field label="Tiểu sử">
              <textarea
                className="field"
                rows={3}
                value={f.bio}
                onChange={(e) => set('bio', e.target.value)}
                placeholder="Đôi dòng về vị hiệp khách này…"
                maxLength={200}
                disabled={charLocked}
                title={charLocked ? LOCKED_HINT : undefined}
              />
            </Field>
          </div>
        </div>
      </Modal>
      {seatMove.dialog}
    </>
  )
}

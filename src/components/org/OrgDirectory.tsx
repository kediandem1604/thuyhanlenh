import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Search, Send, UserRoundCheck, Users } from 'lucide-react'
import { api, errorMessage } from '@/api/client'
import type { OrgInfo, UnclaimedMember } from '@/domain/api'
import { CLASSES, RANKS } from '@/domain/constants'
import { ORG_TYPES, themeOf } from '@/domain/orgs'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { Chibi } from '@/components/chibi/Chibi'
import { Field } from '@/components/ui/Modal'
import { cn, normalize } from '@/lib/utils'
import { toast } from '@/store/ui'

/** Thẻ giới thiệu ngắn một tổ chức (danh bạ, lời mời) */
export function OrgBadge({ org, size = 'md' }: { org: OrgInfo; size?: 'md' | 'lg' }) {
  const theme = themeOf(org.theme)
  const info = ORG_TYPES[org.type]
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={cn(
          'han grid shrink-0 place-items-center rounded-2xl border font-bold leading-none',
          size === 'lg' ? 'h-16 w-16' : 'h-11 w-11',
          [...org.han].length >= 3 ? (size === 'lg' ? 'text-[18px]' : 'text-[12px]') : [...org.han].length === 2 ? (size === 'lg' ? 'text-[24px]' : 'text-[16px]') : size === 'lg' ? 'text-[34px]' : 'text-[22px]',
        )}
        style={{ color: theme.accent, borderColor: `color-mix(in oklab, ${theme.accent} 45%, transparent)`, background: `color-mix(in oklab, ${theme.accent} 12%, transparent)` }}
      >
        {org.han}
      </span>
      <span className="min-w-0">
        <span className={cn('block truncate font-bold text-ink', size === 'lg' ? 'text-[20px]' : 'text-[14.5px]')}>{org.name}</span>
        <span className="block truncate text-[12px] text-muted">
          {info.name} · {org.server} · {org.memberCount}
          {org.capacity ? `/${org.capacity}` : ''} {info.memberWord}
        </span>
      </span>
    </div>
  )
}

/**
 * Danh bạ bang hội nhận đơn công khai.
 * `hasCharacter`: đã có nhân vật → gửi đơn bằng nhân vật đó; chưa có → chỉ cho "nhận danh tính" (tên đã có sẵn trong bang).
 */
export function OrgDirectory({ hasCharacter, excludeIds = [], onDone }: { hasCharacter: boolean; excludeIds?: string[]; onDone: () => void | Promise<void> }) {
  const [orgs, setOrgs] = useState<OrgInfo[] | null>(null)
  const [picked, setPicked] = useState<OrgInfo | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    api
      .get<{ orgs: OrgInfo[] }>('/api/orgs/public')
      .then((r) => setOrgs(r.orgs))
      .catch((e) => {
        setOrgs([])
        toast({ tone: 'error', title: 'Không tải được danh bạ bang hội', desc: errorMessage(e) })
      })
  }, [])

  const list = useMemo(() => {
    const nq = normalize(q.trim())
    return (orgs ?? []).filter((o) => !excludeIds.includes(o.id) && (!nq || normalize(o.name).includes(nq)))
  }, [orgs, q, excludeIds])

  if (picked)
    return (
      <div>
        <button className="btn btn-ghost btn-sm mb-3" onClick={() => setPicked(null)}>
          <ArrowLeft size={14} /> Danh bạ
        </button>
        <div className="mb-4 rounded-2xl border border-line bg-black/10 p-4">
          <OrgBadge org={picked} size="lg" />
          {picked.motto && <p className="mt-3 text-[13px] italic text-ink-2">“{picked.motto}”</p>}
        </div>
        {hasCharacter ? <ApplyForm org={picked} onDone={onDone} /> : <ClaimPicker org={picked} onDone={onDone} />}
      </div>
    )

  return (
    <div>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input className="field pl-9" placeholder="Tìm bang hội…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-3 grid gap-2">
        {orgs === null && <p className="py-8 text-center text-[13px] text-muted">Đang tải danh bạ…</p>}
        {orgs !== null && !list.length && <p className="py-8 text-center text-[13px] text-muted">Chưa có bang hội nào đang chiêu mộ công khai.</p>}
        {list.map((o) => {
          const full = o.capacity !== null && o.memberCount >= o.capacity
          return (
            <button
              key={o.id}
              onClick={() => setPicked(o)}
              className="flex items-center justify-between gap-3 rounded-2xl border border-line px-3 py-2.5 text-left transition hover:border-line-strong hover:bg-white/[0.03]"
            >
              <OrgBadge org={o} />
              <span className={cn('chip shrink-0', full ? 'text-cinnabar' : 'text-jade')}>
                <Users size={12} /> {full ? 'Đã đầy' : 'Đang nhận'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ApplyForm({ org, onDone }: { org: OrgInfo; onDone: () => void | Promise<void> }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    try {
      await api.post('/api/onboarding/apply', { orgId: org.id, message: message.trim() }, { idempotent: true })
      toast({ tone: 'gold', title: 'Đã gửi đơn gia nhập', desc: `Chờ ban quản lý ${org.name} duyệt nhé!` })
      await onDone()
    } catch (e) {
      toast({ tone: 'error', title: 'Chưa gửi được đơn', desc: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="grid gap-3">
      <Field label="Lời nhắn cho ban quản lý">
        <textarea className="field" rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Khung giờ hay online, mục tiêu, kinh nghiệm phó bản…" />
      </Field>
      <div className="flex justify-end">
        <button className="btn btn-gold" disabled={busy} onClick={() => void submit()}>
          <Send size={14} /> Gửi đơn bằng nhân vật của tôi
        </button>
      </div>
    </div>
  )
}

/** Người chưa có nhân vật nhưng đã có tên trong bang → xin nhận danh tính */
function ClaimPicker({ org, onDone }: { org: OrgInfo; onDone: () => void | Promise<void> }) {
  const [list, setList] = useState<UnclaimedMember[] | null>(null)
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<UnclaimedMember | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .get<{ members: UnclaimedMember[] }>(`/api/onboarding/unclaimed?orgId=${encodeURIComponent(org.id)}`)
      .then((r) => setList(r.members))
      .catch((e) => {
        setList([])
        toast({ tone: 'error', title: 'Không tải được danh sách', desc: errorMessage(e) })
      })
  }, [org.id])

  const filtered = useMemo(() => {
    const nq = normalize(q.trim())
    return (list ?? []).filter((m) => !nq || normalize(m.name).includes(nq))
  }, [list, q])

  const submit = async () => {
    if (!picked) return
    setBusy(true)
    try {
      await api.post('/api/onboarding/claim', { orgId: org.id, memberId: picked.id, message: message.trim() }, { idempotent: true })
      toast({ tone: 'gold', title: 'Đã gửi yêu cầu nhận danh tính', desc: `Chờ ban quản lý xác nhận bạn là ${picked.name}.` })
      await onDone()
    } catch (e) {
      toast({ tone: 'error', title: 'Chưa gửi được yêu cầu', desc: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
      <div className="min-w-0">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="field pl-9" placeholder="Tìm tên của bạn…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="mt-3 grid max-h-[340px] grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
          {list === null && <p className="col-span-full py-8 text-center text-[13px] text-muted">Đang tải…</p>}
          {list !== null && !filtered.length && <p className="col-span-full py-8 text-center text-[13px] text-muted">Không còn nhân vật chưa có chủ khớp tên này.</p>}
          {filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => setPicked(m)}
              className={cn('flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition', picked?.id === m.id ? 'border-gold bg-gold/10' : 'border-transparent hover:bg-white/[0.04]')}
            >
              <ChibiAvatar look={m.look} classId={m.classId} rank={m.rank} size={34} />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-ink">{m.name}</span>
                <span className="block truncate text-[11px] text-muted">
                  {CLASSES[m.classId].name} · {RANKS[m.rank].name}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col">
        {picked ? (
          <>
            <div className="flex flex-col items-center">
              <Chibi look={picked.look} classId={picked.classId} size={130} />
              <div className="mt-1 text-[14px] font-bold text-ink">{picked.name}</div>
            </div>
            <Field label="Lời nhắn xác minh" className="mt-3">
              <textarea className="field" rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="VD: ID game, hoặc nhờ người quen xác nhận…" />
            </Field>
            <button className="btn btn-gold mt-3" disabled={busy} onClick={() => void submit()}>
              <UserRoundCheck size={15} /> Đây là tôi
            </button>
          </>
        ) : (
          <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-line p-5 text-center text-[12.5px] text-muted">
            Chọn tên của bạn. Ban quản lý xác nhận rồi mới gắn vào tài khoản.
          </div>
        )}
      </div>
    </div>
  )
}

/** Ô nhập mã mời → mở trang lời mời */
export function InviteCodeInput({ className }: { className?: string }) {
  const [code, setCode] = useState('')
  const go = () => {
    const c = code.trim().replace(/^.*\/moi\//, '').toUpperCase()
    if (c.length < 4) return toast({ tone: 'error', title: 'Mã mời chưa đúng', desc: 'Dán cả link mời hoặc mã 8 ký tự.' })
    location.assign(`/moi/${encodeURIComponent(c)}`)
  }
  return (
    <div className={cn('flex gap-2', className)}>
      <input
        className="field font-mono uppercase tracking-[0.2em]"
        placeholder="MÃ MỜI"
        value={code}
        maxLength={80}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && go()}
      />
      <button className="btn btn-gold shrink-0" onClick={go}>
        Mở
      </button>
    </div>
  )
}

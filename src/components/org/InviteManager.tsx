import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Clock, Copy, IdCard, Infinity as InfinityIcon, Link2, RefreshCw, TicketPlus, Trash2, TriangleAlert, UserPlus } from 'lucide-react'
import { api, errorMessage } from '@/api/client'
import type { Invite } from '@/domain/api'
import { RANKS } from '@/domain/constants'
import { ORG_TYPES } from '@/domain/orgs'
import { permHint } from '@/domain/permissions'
import type { Member, OrgType } from '@/domain/types'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, Modal } from '@/components/ui/Modal'
import { SectionTitle } from '@/components/ui/Panel'
import { PermButton } from '@/components/ui/PermButton'
import { Segmented } from '@/components/ui/Segmented'
import { cn, timeAgo, timeUntil } from '@/lib/utils'
import { rankLabel, useCan, useGuild, useOrg, useOrgType } from '@/store/guild'
import { toast } from '@/store/ui'
import { orgWord } from './OrgSettingsPanel'

/* ---------------- Tiện ích ---------------- */

export const inviteLink = (code: string) => `${location.origin}/moi/${code}`

/** Chép chữ vào bộ nhớ tạm — dùng Clipboard API, trình duyệt cũ / không HTTPS thì dùng textarea ẩn */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* thử cách cũ bên dưới */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.left = '-9999px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

async function copyLink(code: string) {
  const ok = await copyText(inviteLink(code))
  if (ok) toast({ tone: 'success', title: 'Đã chép link mời', desc: inviteLink(code) })
  else toast({ tone: 'error', title: 'Trình duyệt chặn chép tự động', desc: `Hãy chép tay: ${inviteLink(code)}` })
  return ok
}

const USES = [
  { value: '1', label: '1 lượt' },
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: 'none', label: <InfinityIcon size={14} aria-label="Không giới hạn" /> },
]
const EXPIRY = [
  { value: '1', label: '1 ngày' },
  { value: '3', label: '3' },
  { value: '7', label: '7' },
  { value: '30', label: '30' },
  { value: 'none', label: 'Không hạn' },
]

type Kind = Invite['kind']

function expiryText(expiresAt: string | null) {
  if (!expiresAt) return 'Không hết hạn'
  const left = timeUntil(expiresAt) // "còn 6 ngày" / "còn 3 giờ"…
  return left.startsWith('còn ') ? `Hết hạn sau ${left.slice(4)}` : 'Sắp hết hạn'
}

/* ---------------- Khối quản lý lời mời ---------------- */

/** Link mời vào tổ chức đang xem: danh sách, tạo (vào / nhận nhân vật), chép, thu hồi */
export function InviteManager() {
  const org = useOrg()
  const type = useOrgType()
  const canInvite = useCan('recruit.review')
  const members = useGuild((s) => s.members)
  const [invites, setInvites] = useState<Invite[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState<Invite | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [fresh, setFresh] = useState<string | null>(null)
  const reqId = useRef(0)
  const orgId = org?.id
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])

  const load = async () => {
    const id = ++reqId.current
    setLoading(true)
    try {
      const res = await api.get<{ invites: Invite[] }>('/api/invites')
      if (id !== reqId.current) return
      setInvites(res.invites)
      setError(null)
    } catch (e) {
      if (id !== reqId.current) return
      setError(errorMessage(e))
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }

  // tải lại khi đổi tổ chức hoặc số thành viên đổi (có người vừa vào bằng link → lượt dùng tăng)
  useEffect(() => {
    if (!canInvite || !orgId) {
      setInvites(null)
      return
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canInvite, orgId, members.length])

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(null), 1800)
    return () => clearTimeout(t)
  }, [copied])

  if (!org) return null
  const word = orgWord(type)
  const hint = permHint('recruit.review', type)
  const full = org.capacity !== null && members.length >= org.capacity

  const onCopy = async (code: string) => {
    if (await copyLink(code)) setCopied(code)
  }

  const doRevoke = async (inv: Invite) => {
    const before = invites
    setInvites((list) => list?.filter((x) => x.code !== inv.code) ?? null)
    try {
      await api.del(`/api/invites/${inv.code}`)
      toast({ tone: 'info', title: `Đã thu hồi lời mời ${inv.code}`, desc: 'Link này không dùng được nữa.' })
    } catch (e) {
      setInvites(before)
      toast({ tone: 'error', title: 'Chưa thu hồi được', desc: errorMessage(e) })
    }
  }

  return (
    <div className="panel corners p-5">
      <SectionTitle
        han="请"
        title="Link mời"
        subtitle={type === 'guild' ? 'Mời người vào bang không cần chờ duyệt đơn' : type === 'kimlan' ? 'Kim Lan chỉ nhận người qua link mời' : `Mời người vào ${org.name}`}
        right={
          canInvite ? (
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => void load()} disabled={loading} aria-label="Tải lại danh sách lời mời" title="Tải lại">
              <RefreshCw size={15} className={cn(loading && 'animate-spin')} />
            </button>
          ) : (
            <Link2 size={18} className="text-gold" />
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-line bg-black/10 p-3.5 sm:flex-row sm:items-center">
        <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-ink-2">
          Gửi link cho người chơi: họ đăng nhập rồi vào thẳng {word} bằng nhân vật của mình. Link <b className="text-ink">nhận nhân vật</b> dành cho người đã có tên trong danh sách
          nhưng chưa có tài khoản.
        </p>
        <PermButton allowed={canInvite} hint={hint} className="btn btn-gold shrink-0" onClick={() => setCreating(true)}>
          <TicketPlus size={15} /> Tạo link mời
        </PermButton>
      </div>

      {full && (
        <p className="mb-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-[12px] text-ink-2" style={{ borderColor: 'color-mix(in oklab, var(--ember) 45%, transparent)' }}>
          <TriangleAlert size={14} className="mt-0.5 shrink-0 text-ember" />
          {org.name} đã đủ {org.capacity} người — link mời vào sẽ bị từ chối cho tới khi có chỗ trống (link nhận nhân vật vẫn dùng được).
        </p>
      )}

      {!canInvite ? (
        <p className="rounded-xl border border-dashed border-line px-3 py-3 text-center text-[12px] text-muted">
          {hint}. Hãy nhờ {type === 'kimlan' ? 'Đại ca' : type === 'team' ? 'trưởng nhóm' : 'ban quản lý bang'} gửi link mời.
        </p>
      ) : error ? (
        <div className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-[12.5px] text-muted">
          <p className="text-cinnabar">{error}</p>
          <button className="btn btn-sm mt-2" onClick={() => void load()}>
            <RefreshCw size={13} /> Thử lại
          </button>
        </div>
      ) : invites === null ? (
        <div className="space-y-2" aria-busy>
          {[0, 1].map((i) => (
            <div key={i} className="h-[74px] animate-pulse rounded-2xl border border-line bg-white/[0.02]" />
          ))}
        </div>
      ) : invites.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-line px-4 py-7 text-center">
          <span className="seal h-10 w-10 text-[20px] opacity-70">请</span>
          <p className="mt-2 text-[13px] font-semibold text-ink-2">Chưa có link mời nào đang mở</p>
          <p className="text-[12px] text-muted">Tạo một link rồi gửi qua Discord / Zalo cho {ORG_TYPES[type].memberWord} mới.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {invites.map((inv) => (
              <motion.li
                key={inv.code}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.22 }}
              >
                <InviteRow
                  inv={inv}
                  target={inv.memberId ? memberById.get(inv.memberId) : undefined}
                  copied={copied === inv.code}
                  fresh={fresh === inv.code}
                  onCopy={() => void onCopy(inv.code)}
                  onRevoke={() => setRevoking(inv)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <CreateInviteModal
        open={creating}
        onClose={() => setCreating(false)}
        type={type}
        orgName={org.name}
        onCreated={(code) => {
          setFresh(code)
          void load()
        }}
      />
      <ConfirmDialog
        open={!!revoking}
        onClose={() => setRevoking(null)}
        onConfirm={() => revoking && void doRevoke(revoking)}
        title={`Thu hồi lời mời ${revoking?.code ?? ''}?`}
        han="收"
        confirmLabel="Thu hồi"
      >
        Link sẽ ngừng hoạt động ngay — ai chưa dùng sẽ không vào được nữa. Người đã vào bằng link này vẫn ở lại {word}.
      </ConfirmDialog>
    </div>
  )
}

function InviteRow({
  inv,
  target,
  copied,
  fresh,
  onCopy,
  onRevoke,
}: {
  inv: Invite
  target?: Member
  copied: boolean
  fresh: boolean
  onCopy: () => void
  onRevoke: () => void
}) {
  const claim = inv.kind === 'claim'
  const pct = inv.maxUses ? Math.min(100, (inv.uses / inv.maxUses) * 100) : null
  return (
    <div className={cn('rounded-2xl border p-3 transition', fresh ? 'border-gold shadow-[var(--glow-gold)]' : 'border-line hover:border-line-strong')}>
      <div className="flex items-start gap-3">
        {claim && target ? (
          <ChibiAvatar look={target.look} classId={target.classId} rank={target.rank} size={38} />
        ) : (
          <span
            className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl border"
            style={{ color: claim ? 'var(--violet)' : 'var(--gold)', borderColor: `color-mix(in oklab, ${claim ? 'var(--violet)' : 'var(--gold)'} 40%, transparent)` }}
          >
            {claim ? <IdCard size={17} /> : <UserPlus size={17} />}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <code className="rounded-md border border-line bg-black/20 px-1.5 py-0.5 font-mono text-[13px] font-bold tracking-[0.18em] text-ink">{inv.code}</code>
            <span className="chip !h-5 !px-2 !text-[10.5px]" style={claim ? { color: 'var(--violet)', borderColor: 'color-mix(in oklab, var(--violet) 45%, transparent)' } : undefined}>
              {claim ? 'Nhận nhân vật' : 'Mời vào'}
            </span>
            {fresh && <span className="chip !h-5 !px-2 !text-[10.5px] text-gold">Mới tạo</span>}
          </div>
          {claim && (
            <div className="mt-1 truncate text-[12px] text-ink-2">
              Dành cho <b className="text-ink">{target?.name ?? 'nhân vật đã rời'}</b>
              {target ? ` · ${rankLabel(target)}` : ''}
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1 tabular-nums">
              {inv.uses}/{inv.maxUses ?? <InfinityIcon size={11} aria-label="không giới hạn" />} lượt
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={11} /> {expiryText(inv.expiresAt)}
            </span>
            <span className="truncate">
              {inv.createdByName ?? 'Không rõ'} · {timeAgo(inv.createdAt)}
            </span>
          </div>
          {pct !== null && (
            <div className="progress-track mt-1.5" style={{ height: 3 }}>
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button className={cn('btn btn-sm', copied && 'text-jade')} onClick={onCopy} aria-label={`Chép link mời ${inv.code}`}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span className="hidden sm:inline">{copied ? 'Đã chép' : 'Chép link'}</span>
          </button>
          <button className="btn btn-ghost btn-icon btn-sm text-muted hover:text-cinnabar" onClick={onRevoke} aria-label={`Thu hồi lời mời ${inv.code}`} title="Thu hồi">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Tạo lời mời ---------------- */

function CreateInviteModal({ open, onClose, type, orgName, onCreated }: { open: boolean; onClose: () => void; type: OrgType; orgName: string; onCreated: (code: string) => void }) {
  const members = useGuild((s) => s.members)
  const currentUserId = useGuild((s) => s.currentUserId)
  const [kind, setKind] = useState<Kind>('join')
  const [uses, setUses] = useState('10')
  const [days, setDays] = useState('7')
  const [memberId, setMemberId] = useState('')
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // nhân vật chưa có chủ (không tính chính mình — tài khoản thử cũng được coi là chưa có chủ)
  const unclaimed = useMemo(
    () =>
      members
        .filter((m) => m.claimed === false && m.id !== currentUserId)
        .sort((a, b) => (a.seat ?? 99) - (b.seat ?? 99) || RANKS[a.rank].order - RANKS[b.rank].order || a.name.localeCompare(b.name, 'vi')),
    [members, currentUserId],
  )
  const target = unclaimed.find((m) => m.id === memberId)

  useEffect(() => {
    if (!open) return
    setKind('join')
    setUses(type === 'kimlan' ? '1' : '10')
    setDays('7')
    setMemberId('')
    setCode(null)
    setCopied(false)
    setBusy(false)
  }, [open, type])

  const submit = async () => {
    if (kind === 'claim' && !memberId) return toast({ tone: 'error', title: 'Chọn nhân vật cần nhận' })
    setBusy(true)
    try {
      const body =
        kind === 'join'
          ? { kind, maxUses: uses === 'none' ? null : Number(uses), expiresInDays: days === 'none' ? null : Number(days) }
          : { kind, memberId, expiresInDays: days === 'none' ? null : Number(days) }
      const res = await api.post<{ ok: true; result: { code: string } }>('/api/invites', body, { idempotent: true })
      setCode(res.result.code)
      onCreated(res.result.code)
    } catch (e) {
      toast({ tone: 'error', title: 'Chưa tạo được lời mời', desc: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (code && (await copyLink(code))) setCopied(true)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      han="请"
      title={code ? 'Đã tạo link mời' : 'Tạo link mời'}
      subtitle={code ? 'Gửi link này cho người được mời' : `Vào ${orgName}`}
      footer={
        code ? (
          <>
            <button className="btn btn-ghost" onClick={() => setCode(null)}>
              <TicketPlus size={15} /> Tạo thêm
            </button>
            <button className="btn btn-gold" onClick={onClose}>
              Xong
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-ghost" onClick={onClose}>
              Hủy
            </button>
            <button className="btn btn-gold" disabled={busy || (kind === 'claim' && !memberId)} onClick={() => void submit()}>
              <TicketPlus size={15} /> {busy ? 'Đang tạo…' : 'Tạo link'}
            </button>
          </>
        )
      }
    >
      {code ? (
        <div className="text-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto inline-flex flex-col items-center">
            <span className="eyebrow">Mã mời</span>
            <span className="title-display text-gold-grad mt-1 font-mono text-[40px] tracking-[0.22em]">{code}</span>
          </motion.div>
          <div className="mt-4 flex items-center gap-2">
            <input className="field font-mono text-[13px]" readOnly value={inviteLink(code)} onFocus={(e) => e.currentTarget.select()} aria-label="Link mời" />
            <button className={cn('btn shrink-0', copied ? 'text-jade' : 'btn-gold')} onClick={() => void copy()}>
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Đã chép' : 'Chép'}
            </button>
          </div>
          <p className="mt-3 text-[12px] text-muted">
            {kind === 'claim'
              ? `Người nhận mở link, đăng nhập (chưa có nhân vật) là nhận đúng ${target?.name ?? 'nhân vật này'}. Link chỉ dùng được 1 lần.`
              : 'Người nhận mở link, đăng nhập rồi bấm Nhận lời mời. Ai chưa có nhân vật sẽ được hướng dẫn tạo trước.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
          <Segmented<Kind>
            value={kind}
            onChange={setKind}
            options={[
              { value: 'join', label: <><UserPlus size={14} /> Mời vào {orgWord(type)}</> },
              { value: 'claim', label: <><IdCard size={14} /> Nhận nhân vật có sẵn</>, count: unclaimed.length },
            ]}
          />

          {kind === 'join' ? (
            <OptionGroup label="Số người được dùng" hint={type === 'kimlan' ? 'Kim Lan tối đa 12 người — nên mời từng người một.' : 'Hết lượt thì link tự đóng.'}>
              <Segmented value={uses} onChange={setUses} options={USES} size="sm" />
            </OptionGroup>
          ) : unclaimed.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-[12.5px] text-muted">Mọi nhân vật trong danh sách đều đã có chủ — không cần link nhận nhân vật.</p>
          ) : (
            <div>
              <Field label="Nhân vật được nhận" hint="Chỉ hiện nhân vật chưa gắn tài khoản Discord. Link dùng 1 lần.">
                <select className="field" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                  <option value="">— Chọn nhân vật —</option>
                  {unclaimed.map((m) => (
                    <option key={m.id} value={m.id}>
                      {rankLabel(m)} · {m.name}
                    </option>
                  ))}
                </select>
              </Field>
              {target && (
                <motion.div
                  key={target.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 flex items-center gap-3 rounded-xl border border-line bg-black/10 px-3 py-2"
                >
                  <ChibiAvatar look={target.look} classId={target.classId} rank={target.rank} size={40} />
                  <div className="min-w-0 text-[12.5px]">
                    <div className="truncate font-semibold text-ink">{target.name}</div>
                    <div className="truncate text-muted">
                      {rankLabel(target)} · Lv {target.level}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          <OptionGroup label="Hết hạn sau (ngày)">
            <Segmented value={days} onChange={setDays} options={EXPIRY} size="sm" />
          </OptionGroup>
        </div>
      )}
    </Modal>
  )
}

/** Nhóm lựa chọn có nhãn — không dùng <label> vì bấm nhãn sẽ "bấm" luôn nút đầu tiên bên trong */
function OptionGroup({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-muted">{hint}</span>}
    </div>
  )
}

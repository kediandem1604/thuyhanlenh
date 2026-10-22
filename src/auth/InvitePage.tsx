import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Check, LogOut, MailOpen, UserRoundCheck, X } from 'lucide-react'
import { api, errorMessage, setOrgId } from '@/api/client'
import type { InvitePreview, Me } from '@/domain/api'
import { CLASSES, RANKS } from '@/domain/constants'
import { KIMLAN_OATH, ORG_TYPES, themeOf } from '@/domain/orgs'
import { Chibi } from '@/components/chibi/Chibi'
import { CharacterForm } from '@/components/org/CharacterForm'
import { OrgBadge } from '@/components/org/OrgDirectory'
import { celebrate, toast } from '@/store/ui'
import { useGuild } from '@/store/guild'
import { AuthBackdrop, GateMessage } from './AuthScreens'
import { logout } from './session'

const PENDING_KEY = 'thuy-han-lenh:invite'

/** Lấy mã mời từ đường dẫn /moi/:code — nhớ tạm để còn dùng sau khi đăng nhập Discord quay về trang chủ */
export function inviteCodeFromPath(path: string): string | null {
  const m = /^\/moi\/([A-Za-z0-9-]{4,40})\/?$/.exec(path)
  try {
    if (m) {
      sessionStorage.setItem(PENDING_KEY, m[1].toUpperCase())
      return m[1].toUpperCase()
    }
    return sessionStorage.getItem(PENDING_KEY)
  } catch {
    return m ? m[1].toUpperCase() : null
  }
}

function clearPendingInvite() {
  try {
    sessionStorage.removeItem(PENDING_KEY)
  } catch {
    /* không sao */
  }
}

export function InvitePage({ code, me, onDone }: { code: string; me: Me; onDone: () => void }) {
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .get<InvitePreview>(`/api/invites/${encodeURIComponent(code)}`)
      .then(setPreview)
      .catch((e) => setError(errorMessage(e)))
  }, [code])

  const leave = () => {
    clearPendingInvite()
    onDone()
  }

  const enter = (orgId: string) => {
    clearPendingInvite()
    setOrgId(orgId)
    onDone()
  }

  const accept = async () => {
    if (!preview) return
    setBusy(true)
    try {
      const res = await api.post<{ ok: true; result: { orgId: string } }>(`/api/invites/${encodeURIComponent(code)}/accept`, {})
      const info = ORG_TYPES[preview.org.type]
      celebrate({
        han: preview.org.han,
        title: preview.kind === 'claim' ? `Chào mừng ${preview.character?.name ?? ''} trở lại` : `Gia nhập ${preview.org.name}`,
        subtitle: preview.org.type === 'kimlan' ? KIMLAN_OATH : `Bạn đã là ${info.memberWord} của ${info.name} ${preview.org.name}.`,
      })
      enter(res.result.orgId)
    } catch (e) {
      toast({ tone: 'error', title: 'Chưa nhận được lời mời', desc: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  if (error)
    return (
      <AuthBackdrop>
        <GateMessage
          han="封"
          title="Lời mời không dùng được"
          desc={error}
          action={
            <button className="btn btn-gold" onClick={leave}>
              {me.orgs.length ? 'Về trang chính' : 'Về Sảnh Giang Hồ'}
            </button>
          }
        />
      </AuthBackdrop>
    )
  if (!preview)
    return (
      <AuthBackdrop>
        <div className="grid min-h-dvh place-items-center text-[13px] tracking-[0.2em] text-muted">ĐANG MỞ THIỆP MỜI…</div>
      </AuthBackdrop>
    )

  const org = preview.org
  const info = ORG_TYPES[org.type]
  const theme = themeOf(org.theme)
  const already = me.orgs.find((o) => o.org.id === org.id)
  const needsCharacter = preview.kind === 'join' && !me.character
  const claimBlocked = preview.kind === 'claim' && !!me.character

  // xem trước giao diện của tổ chức mời mình (Bạch Gia: tuyết, bạch mai…)
  return (
    <AuthBackdrop theme={org.theme}>
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4 py-10">
        <div className="mb-4 flex items-center justify-between text-[12px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <MailOpen size={14} /> Thiệp mời · {me.user.name}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => void logout()}>
            <LogOut size={13} /> Thoát
          </button>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 18, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.5 }}
          className="panel corners relative overflow-hidden p-6 sm:p-8"
          style={{ boxShadow: `0 0 0 1px color-mix(in oklab, ${theme.accent} 30%, transparent), 0 30px 80px -30px color-mix(in oklab, ${theme.accent} 45%, transparent)` }}
        >
          <span aria-hidden className="han pointer-events-none absolute -right-6 -top-10 select-none text-[220px] leading-none opacity-[0.05]" style={{ color: theme.accent }}>
            {org.han}
          </span>
          <div className="text-[11px] uppercase tracking-[0.3em]" style={{ color: theme.accent }}>
            {preview.kind === 'claim' ? 'Lời mời nhận danh tính' : `Lời mời gia nhập ${info.name}`}
          </div>
          <div className="mt-4">
            <OrgBadge org={org} size="lg" />
          </div>
          {org.motto && <p className="mt-4 text-[14px] italic text-ink-2">“{org.motto}”</p>}
          {preview.invitedBy && <p className="mt-2 text-[12.5px] text-muted">Người mời: {preview.invitedBy}</p>}

          {preview.kind === 'claim' && preview.character && (
            <div className="mt-6 flex items-center gap-4 rounded-2xl border border-line bg-black/10 p-4">
              <Chibi look={preview.character.look} classId={preview.character.classId} size={110} />
              <div>
                <div className="text-[12px] text-muted">Bạn sẽ nhận nhân vật</div>
                <div className="text-[18px] font-bold text-ink">{preview.character.name}</div>
                <div className="text-[12.5px] text-ink-2">
                  {CLASSES[preview.character.classId].name} · {preview.character.honorific ?? RANKS[preview.character.rank].name}
                </div>
              </div>
            </div>
          )}

          {!preview.valid && (
            <p className="mt-6 flex items-center gap-2 rounded-xl border border-cinnabar/40 bg-cinnabar/10 p-3 text-[13px] text-ink-2">
              <X size={15} className="text-cinnabar" /> {preview.reason ?? 'Lời mời không còn hiệu lực.'}
            </p>
          )}

          {preview.valid && already && (
            <p className="mt-6 flex items-center gap-2 rounded-xl border border-jade/40 bg-jade/10 p-3 text-[13px] text-ink-2">
              <Check size={15} className="text-jade" /> Bạn đã ở trong {org.name} ({already.title}).
            </p>
          )}

          {preview.valid && !already && claimBlocked && (
            <p className="mt-6 rounded-xl border border-line bg-black/10 p-3 text-[13px] text-ink-2">
              Tài khoản của bạn đã có nhân vật <b className="text-ink">{me.character!.name}</b>. Lời mời nhận danh tính chỉ dành cho người chưa có nhân vật — nhờ người mời gửi link “gia nhập” thay thế.
            </p>
          )}

          {preview.valid && !already && needsCharacter && (
            <div className="mt-6">
              <p className="mb-4 text-[13px] text-ink-2">Trước khi vào, hãy tạo nhân vật của bạn — nhân vật dùng chung cho mọi bang, Kim Lan và team.</p>
              <CharacterForm compact defaultName={me.user.name} onCreated={() => useGuild.getState().refreshMe()} />
            </div>
          )}

          <div className="mt-7 flex flex-wrap justify-end gap-2">
            <button className="btn btn-ghost" onClick={leave}>
              {already ? 'Đóng' : 'Để sau'}
            </button>
            {already ? (
              <button className="btn btn-gold" onClick={() => enter(org.id)}>
                Vào {org.name} <ArrowRight size={15} />
              </button>
            ) : (
              preview.valid &&
              !claimBlocked &&
              !needsCharacter && (
                <button className="btn btn-gold" disabled={busy} onClick={() => void accept()}>
                  {preview.kind === 'claim' ? <UserRoundCheck size={15} /> : <Check size={15} />}
                  {busy ? 'Đang vào…' : preview.kind === 'claim' ? 'Đây là tôi — nhận nhân vật' : `Nhận lời — vào ${info.name}`}
                </button>
              )
            )}
          </div>
        </motion.div>
      </div>
    </AuthBackdrop>
  )
}

import { useRef, useState } from 'react'
import { Check, Copy, Link2, UserCheck } from 'lucide-react'
import { api, errorMessage } from '@/api/client'
import type { ApiOkBody } from '@/domain/api'
import type { Member } from '@/domain/types'
import { toast } from '@/store/ui'
import { cn } from '@/lib/utils'

/** Chép chữ vào bộ nhớ tạm (Clipboard API, không được thì dùng lệnh copy cũ trên ô nhập) */
async function copy(text: string, input: HTMLInputElement | null) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* thử cách cũ */
  }
  try {
    input?.focus()
    input?.select()
    return document.execCommand('copy')
  } catch {
    return false
  }
}

/**
 * Nhân vật chưa có chủ: tạo link "nhận danh tính" (POST /api/invites kind claim) để người chơi thật
 * đăng nhập rồi nhận nhân vật này — dùng một lần, hết hạn sau 7 ngày.
 */
export function ClaimInvite({ member, className }: { member: Pick<Member, 'id' | 'name'>; className?: string }) {
  const [link, setLink] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const create = async () => {
    if (busy) return
    setBusy(true)
    try {
      const body = await api.post<ApiOkBody<{ code: string }>>('/api/invites', { kind: 'claim', memberId: member.id }, { idempotent: true })
      const code = body.result?.code
      if (!code) throw new Error('missing code')
      setLink(`${location.origin}/moi/${code}`)
      toast({ tone: 'gold', title: 'Đã tạo link nhận danh tính', desc: `Gửi cho chủ nhân của ${member.name} — dùng một lần, hết hạn sau 7 ngày.` })
    } catch (e) {
      toast({ tone: 'error', title: 'Không tạo được link', desc: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  const onCopy = async () => {
    if (!link) return
    const ok = await copy(link, inputRef.current)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } else toast({ tone: 'error', title: 'Trình duyệt chặn chép tự động', desc: `Hãy chép tay: ${link}` })
  }

  return (
    <div className={cn('rounded-2xl border border-dashed border-line-strong p-3.5', className)}>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--gold)_14%,transparent)] text-gold">
          <UserCheck size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-ink">Nhân vật chưa có chủ</div>
          <p className="text-[12px] text-muted">
            Gửi link để người chơi thật đăng nhập và nhận <b className="text-ink-2">{member.name}</b> làm nhân vật của mình — dùng chung ở mọi tổ chức.
          </p>
        </div>
      </div>
      {link ? (
        <div className="mt-3 flex gap-2">
          <input ref={inputRef} className="field !h-9 min-w-0 flex-1 !text-[12.5px]" readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Link nhận danh tính" />
          <button className="btn btn-gold btn-sm shrink-0" onClick={() => void onCopy()}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Đã chép' : 'Chép link'}
          </button>
        </div>
      ) : (
        <button className="btn btn-sm mt-3" onClick={() => void create()} disabled={busy}>
          <Link2 size={14} /> {busy ? 'Đang tạo…' : 'Tạo link nhận danh tính'}
        </button>
      )}
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronsUpDown, Compass, KeyRound, Plus } from 'lucide-react'
import { ORG_TYPES, themeOf } from '@/domain/orgs'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { useGuild } from '@/store/guild'
import { CreateOrgModal } from './CreateOrgModal'
import { InviteCodeInput, OrgDirectory } from './OrgDirectory'

/** Thẻ tổ chức đang xem ở thanh bên + menu đổi tổ chức / lập mới / nhập mã mời / tìm bang */
export function OrgSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const me = useGuild((s) => s.me)
  const count = useGuild((s) => s.members.length)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [modal, setModal] = useState<'create' | 'invite' | 'find' | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const myOrgIds = useMemo(() => (me?.orgs ?? []).map((o) => o.org.id), [me])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const org = me?.org
  if (!me || !org) return null
  const info = ORG_TYPES[org.type]
  const theme = themeOf(org.theme)
  const pct = org.capacity ? Math.min(100, (count / org.capacity) * 100) : null

  const pick = (id: string) => {
    setOpen(false)
    if (id === org.id) return
    onNavigate?.()
    navigate('/')
    useGuild.getState().switchOrg(id)
  }
  const openModal = (m: 'create' | 'invite' | 'find') => {
    setOpen(false)
    setModal(m)
  }

  return (
    <div ref={ref} className="relative mx-4 mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="w-full overflow-hidden rounded-2xl border border-line bg-[linear-gradient(135deg,color-mix(in_oklab,var(--gold)_14%,transparent),transparent_60%)] p-3.5 text-left transition hover:border-line-strong"
      >
        <div className="flex items-center gap-3">
          <span
            className={cn('han grid h-10 w-10 shrink-0 place-items-center rounded-xl border font-bold leading-none', sealSize(org.han, 'lg'))}
            style={{ color: theme.accent, borderColor: `color-mix(in oklab, ${theme.accent} 45%, transparent)`, background: `color-mix(in oklab, ${theme.accent} 12%, transparent)` }}
          >
            {org.han}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-bold text-ink">{org.name}</div>
            <div className="truncate text-[11px] text-muted">
              {info.name} · {org.server}
              {org.type === 'guild' ? ` · Cấp ${org.level}` : ''}
            </div>
          </div>
          <ChevronsUpDown size={15} className="shrink-0 text-muted" />
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          {pct !== null ? (
            <div className="progress-track flex-1" style={{ height: 5 }}>
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          ) : (
            <span className="flex-1 text-[11px] text-muted">Không giới hạn {info.memberWord}</span>
          )}
          <span className="chip !h-6 shrink-0 text-gold">
            {count}
            {org.capacity ? `/${org.capacity}` : ''}
          </span>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-line-strong bg-[var(--surface-solid)] p-1.5 shadow-2xl"
          >
            <div className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted">Tổ chức của tôi</div>
            <div className="max-h-[300px] overflow-y-auto">
              {me.orgs.map((o) => {
                const t = themeOf(o.org.theme)
                const active = o.org.id === org.id
                return (
                  <button
                    key={o.org.id}
                    role="menuitem"
                    onClick={() => pick(o.org.id)}
                    className={cn('flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition', active ? 'bg-white/[0.05]' : 'hover:bg-white/[0.04]')}
                  >
                    <span className={cn('han grid h-8 w-8 shrink-0 place-items-center rounded-lg border leading-none', sealSize(o.org.han, 'sm'))} style={{ color: t.accent, borderColor: `color-mix(in oklab, ${t.accent} 40%, transparent)` }}>
                      {o.org.han}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink">{o.org.name}</span>
                      <span className="block truncate text-[11px] text-muted">
                        {ORG_TYPES[o.org.type].name} · {o.title}
                      </span>
                    </span>
                    {active && <Check size={15} className="shrink-0 text-gold" />}
                  </button>
                )
              })}
            </div>
            <div className="my-1.5 border-t border-line" />
            <MenuAction icon={<Plus size={15} />} label="Lập tổ chức mới" onClick={() => openModal('create')} />
            <MenuAction icon={<KeyRound size={15} />} label="Nhập mã mời" onClick={() => openModal('invite')} />
            <MenuAction icon={<Compass size={15} />} label="Tìm bang hội đang chiêu mộ" onClick={() => openModal('find')} />
          </motion.div>
        )}
      </AnimatePresence>

      <CreateOrgModal open={modal === 'create'} onClose={() => setModal(null)} />
      <Modal open={modal === 'invite'} onClose={() => setModal(null)} size="sm" han="请" title="Nhập mã mời" subtitle="Dán link mời hoặc mã 8 ký tự từ người đứng đầu Kim Lan / team / bang">
        <InviteCodeInput />
      </Modal>
      <Modal open={modal === 'find'} onClose={() => setModal(null)} size="lg" han="募" title="Bang hội đang chiêu mộ" subtitle="Gửi đơn bằng nhân vật của bạn — ban quản lý bang sẽ duyệt">
        <OrgDirectory hasCharacter={!!me.character} excludeIds={myOrgIds} onDone={() => setModal(null)} />
      </Modal>
    </div>
  )
}

/** Chữ Hán 2–3 ký tự (惊鸿阁) phải nhỏ lại để vừa ô ấn */
function sealSize(han: string, size: 'sm' | 'lg') {
  const n = [...han].length
  if (size === 'lg') return n >= 3 ? 'text-[12px]' : n === 2 ? 'text-[15px]' : 'text-[21px]'
  return n >= 3 ? 'text-[10px]' : n === 2 ? 'text-[12.5px]' : 'text-[16px]'
}

function MenuAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button role="menuitem" onClick={onClick} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] text-ink-2 transition hover:bg-white/[0.04] hover:text-ink">
      <span className="grid h-8 w-8 place-items-center rounded-lg border border-line text-gold">{icon}</span>
      {label}
    </button>
  )
}

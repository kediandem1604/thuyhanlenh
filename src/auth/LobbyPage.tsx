import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Check, Clock, Compass, KeyRound, LogOut, Plus, RefreshCw, Sparkles, UserRoundCheck } from 'lucide-react'
import type { Me } from '@/domain/api'
import { APPLICATION_STAGES, CLASSES } from '@/domain/constants'
import { ORG_TYPES, ORG_TYPE_IDS } from '@/domain/orgs'
import type { OrgType } from '@/domain/types'
import { Chibi } from '@/components/chibi/Chibi'
import { CharacterForm } from '@/components/org/CharacterForm'
import { CreateOrgModal } from '@/components/org/CreateOrgModal'
import { InviteCodeInput, OrgDirectory } from '@/components/org/OrgDirectory'
import { Segmented } from '@/components/ui/Segmented'
import { cn, fmt, timeAgo } from '@/lib/utils'
import { AuthBackdrop } from './AuthScreens'
import { logout } from './session'

/**
 * Sảnh Giang Hồ — tài khoản chưa ở tổ chức nào.
 *  Chưa có nhân vật: tạo nhân vật mới · hoặc nhận nhân vật có sẵn trong một bang (gửi yêu cầu) · hoặc dán link mời.
 *  Đã có nhân vật: nhập mã mời · xin vào bang công khai · tự lập Bang Hội / Kim Lan / Team.
 */
export function LobbyPage({ me, onRefresh }: { me: Me; onRefresh: () => Promise<void> | void }) {
  const app = me.application
  const pending = !!app && app.stage !== 'tu-choi'

  // đơn đang chờ: tự kiểm tra lại mỗi 15 giây để vào ngay khi được duyệt
  useEffect(() => {
    if (!pending) return
    const t = setInterval(() => void onRefresh(), 15000)
    return () => clearInterval(t)
  }, [pending, onRefresh])

  return (
    <AuthBackdrop>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="seal h-11 w-11 text-[26px]">令</span>
            <div>
              <div className="title-display text-gold-grad text-[22px] leading-none">Thủy Hàn Lệnh</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted">Sảnh Giang Hồ</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {me.user.avatarUrl ? (
              <img src={me.user.avatarUrl} alt="" className="h-9 w-9 rounded-full ring-2 ring-line-strong" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-[13px] font-bold text-gold ring-2 ring-line">{me.user.name.slice(0, 1)}</span>
            )}
            <span className="hidden text-[13px] font-semibold text-ink sm:inline">{me.user.name}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => void logout()}>
              <LogOut size={14} /> Thoát
            </button>
          </div>
        </header>

        <div className="text-halo mb-6">
          <h1 className="title-display text-gold-grad text-[36px] sm:text-[44px]">{me.character ? `${me.character.name}, chọn đường đi` : 'Bước vào giang hồ'}</h1>
          <p className="mt-2 max-w-2xl text-[14px] text-ink-2">
            {me.character
              ? 'Bạn chưa ở bang hội, Kim Lan hay team nào. Nhận lời mời, xin vào một bang đang chiêu mộ, hoặc tự lập tổ chức của riêng mình.'
              : `Chào ${me.user.name}! Tạo nhân vật trong game của bạn — một nhân vật dùng chung cho mọi bang hội, Kim Lan và team bạn tham gia.`}
          </p>
        </div>

        {pending && <PendingCard me={me} onRefresh={onRefresh} />}
        {app?.stage === 'tu-choi' && (
          <div className="mb-4 rounded-2xl border border-cinnabar/40 bg-cinnabar/10 p-4 text-[13px] text-ink-2">
            Đơn trước của bạn{app.orgName ? ` vào ${app.orgName}` : ''} chưa được chấp nhận. Bạn có thể thử bang khác hoặc gửi lại.
          </div>
        )}

        {me.character ? <WithCharacter me={me} onRefresh={onRefresh} pending={pending} /> : <NoCharacter me={me} onRefresh={onRefresh} pending={pending} />}
      </div>
    </AuthBackdrop>
  )
}

/* ------------------------------------------------------------------ */

function NoCharacter({ me, onRefresh, pending }: { me: Me; onRefresh: () => Promise<void> | void; pending: boolean }) {
  const [mode, setMode] = useState<'new' | 'claim'>('new')
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'new', label: 'Tạo nhân vật mới' },
            { value: 'claim', label: 'Tôi đã có tên trong một bang' },
          ]}
        />
        <motion.div key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="panel corners mt-4 p-6 sm:p-8">
          {mode === 'new' ? (
            <CharacterForm defaultName={me.user.name} onCreated={onRefresh} />
          ) : pending ? (
            <p className="text-[13px] text-muted">Bạn đang có một yêu cầu chờ duyệt — đợi kết quả trước khi gửi yêu cầu mới.</p>
          ) : (
            <OrgDirectory hasCharacter={false} onDone={onRefresh} />
          )}
        </motion.div>
      </div>
      <InviteBox />
    </div>
  )
}

function WithCharacter({ me, onRefresh, pending }: { me: Me; onRefresh: () => Promise<void> | void; pending: boolean }) {
  const c = me.character!
  const [creating, setCreating] = useState<OrgType | null>(null)
  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <div className="grid content-start gap-5">
        <div className="panel corners flex flex-col items-center p-5">
          <Chibi look={c.look} classId={c.classId} size={170} />
          <div className="mt-1 text-[16px] font-bold text-ink">{c.name}</div>
          <div className="text-[12px] text-muted">
            {CLASSES[c.classId].name} · Cấp {c.level} · {fmt(c.power)} chiến lực
          </div>
        </div>
        <InviteBox />
      </div>

      <div className="grid content-start gap-5">
        <Section icon={<Plus size={16} />} title="Tự lập tổ chức" desc="Bạn là người đứng đầu — mời anh em vào bằng link mời.">
          <div className="grid gap-2 sm:grid-cols-3">
            {ORG_TYPE_IDS.map((t) => {
              const info = ORG_TYPES[t]
              return (
                <button
                  key={t}
                  onClick={() => setCreating(t)}
                  className="group rounded-2xl border border-line p-4 text-left transition hover:-translate-y-0.5 hover:border-line-strong hover:bg-white/[0.03]"
                >
                  <span className="seal h-10 w-10 text-[21px] transition group-hover:scale-110">{info.han}</span>
                  <div className="mt-3 text-[14.5px] font-bold text-ink">Lập {info.name}</div>
                  <p className="mt-1 text-[11.5px] leading-snug text-muted">{info.tagline}</p>
                </button>
              )
            })}
          </div>
        </Section>

        <Section icon={<Compass size={16} />} title="Bang hội đang chiêu mộ" desc="Gửi đơn bằng nhân vật của bạn — ban quản lý bang sẽ duyệt.">
          {pending ? <p className="text-[13px] text-muted">Đơn của bạn đang chờ duyệt — đợi kết quả trước khi gửi đơn khác.</p> : <OrgDirectory hasCharacter onDone={onRefresh} />}
        </Section>
      </div>
      <CreateOrgModal open={!!creating} initialType={creating ?? 'team'} onClose={() => setCreating(null)} />
    </div>
  )
}

function Section({ icon, title, desc, children }: { icon: ReactNode; title: string; desc: string; children: ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="panel corners p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line text-gold">{icon}</span>
        <div>
          <h2 className="text-[16px] font-bold text-ink">{title}</h2>
          <p className="text-[12.5px] text-muted">{desc}</p>
        </div>
      </div>
      {children}
    </motion.section>
  )
}

function InviteBox() {
  return (
    <div className="panel corners p-5">
      <div className="flex items-center gap-2 text-[14px] font-bold text-ink">
        <KeyRound size={15} className="text-gold" /> Có link / mã mời?
      </div>
      <p className="mb-3 mt-1 text-[12px] text-muted">Kim Lan và team chỉ vào được bằng lời mời của người đứng đầu.</p>
      <InviteCodeInput />
    </div>
  )
}

function PendingCard({ me, onRefresh }: { me: Me; onRefresh: () => Promise<void> | void }) {
  const app = me.application!
  const steps = APPLICATION_STAGES.filter((s) => s.id !== 'tu-choi')
  const idx = steps.findIndex((s) => s.id === app.stage)
  const [checking, setChecking] = useState(false)
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="panel corners mb-6 grid gap-6 p-6 sm:grid-cols-[150px_1fr]">
      <div className="flex flex-col items-center">
        <Chibi look={app.look} classId={app.classId} size={130} />
        <div className="text-center text-[14px] font-bold text-ink">{app.name}</div>
      </div>
      <div>
        <div className="chip text-gold">
          {app.kind === 'claim' ? <UserRoundCheck size={12} /> : <Sparkles size={12} />}
          {app.kind === 'claim' ? 'Xin nhận danh tính' : 'Đơn gia nhập'}
          {app.orgName ? ` · ${app.orgName}` : ''} · gửi {timeAgo(app.appliedAt)}
        </div>
        <ol className="mt-5 grid grid-cols-4 gap-2">
          {steps.map((s, i) => (
            <li key={s.id} className="flex flex-col items-center gap-2 text-center">
              <span
                className={cn('grid h-9 w-9 place-items-center rounded-full border-2 text-[12px] font-bold', i <= idx ? 'text-[#1b1406]' : 'border-line text-muted')}
                style={i <= idx ? { background: s.color, borderColor: s.color } : undefined}
              >
                {i < idx ? <Check size={15} /> : i + 1}
              </span>
              <span className={cn('text-[11.5px]', i === idx ? 'font-semibold text-ink' : 'text-muted')}>{s.name}</span>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            className="btn btn-sm"
            disabled={checking}
            onClick={async () => {
              setChecking(true)
              await onRefresh()
              setChecking(false)
            }}
          >
            <RefreshCw size={13} className={cn(checking && 'animate-spin')} /> Kiểm tra lại
          </button>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
            <Clock size={13} /> Tự kiểm tra mỗi 15 giây
          </span>
        </div>
      </div>
    </motion.div>
  )
}

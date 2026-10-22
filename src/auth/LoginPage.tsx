import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { FlaskConical, Search, ShieldCheck, UserPlus } from 'lucide-react'
import { api } from '@/api/client'
import type { AuthProviders, DevMemberOption } from '@/domain/api'
import { CLASSES, RANKS } from '@/domain/constants'
import { lookFromSeed } from '@/data/seed'
import { Chibi } from '@/components/chibi/Chibi'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { Modal, Field } from '@/components/ui/Modal'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { cn, normalize } from '@/lib/utils'
import { toast } from '@/store/ui'
import { AuthBackdrop, DiscordMark } from './AuthScreens'
import { devLogin, discordLogin } from './session'

const LOGIN_ERRORS: Record<string, string> = {
  denied: 'Bạn đã từ chối cấp quyền trên Discord.',
  state: 'Phiên đăng nhập hết hạn hoặc không hợp lệ, hãy thử lại.',
  expired: 'Mã đăng nhập Discord đã hết hạn hoặc đã được dùng — bấm đăng nhập lại nhé.',
  config: 'Máy chủ đang cấu hình sai khóa Discord (Client ID / Client Secret). Báo quản trị viên kiểm tra.',
  discord: 'Discord đang trục trặc, thử lại sau ít phút.',
}

// chibi trang trí khi máy chủ không bật đăng nhập thử
const DECOR = [
  { look: lookFromSeed('login-a', 'to-van', 'nu'), classId: 'to-van' as const },
  { look: { ...lookFromSeed('login-b', 'huyet-ha', 'nam'), mood: 'cool' as const, expression: 'smirk' as const }, classId: 'huyet-ha' as const },
  { look: lookFromSeed('login-c', 'long-ngam', 'nu'), classId: 'long-ngam' as const },
]

export function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [providers, setProviders] = useState<AuthProviders | null>(null)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [guestOpen, setGuestOpen] = useState(false)
  const [guestName, setGuestName] = useState('')
  const wide = useMediaQuery('(min-width: 1024px)')

  useEffect(() => {
    api
      .get<AuthProviders>('/auth/providers')
      .then(setProviders)
      .catch(() => setProviders({ discord: false, dev: false }))
    const err = new URLSearchParams(location.search).get('login_error')
    if (err) {
      toast({ tone: 'error', title: 'Đăng nhập chưa thành công', desc: LOGIN_ERRORS[err] ?? 'Thử lại nhé.' })
      history.replaceState(null, '', location.pathname)
    }
  }, [])

  const trio = useMemo(() => {
    const dm = providers?.devMembers
    if (dm && dm.length >= 3) return [dm[1], dm[0], dm[3] ?? dm[2]].map((m) => ({ look: m.look, classId: m.classId }))
    return [DECOR[0], DECOR[1], DECOR[2]]
  }, [providers])

  const filtered = useMemo(() => {
    const list = providers?.devMembers ?? []
    const nq = normalize(q.trim())
    return nq ? list.filter((m) => normalize(`${m.name} ${CLASSES[m.classId].name} ${RANKS[m.rank].name} ${m.orgs ?? ''}`).includes(nq)) : list
  }, [providers, q])

  const loginAs = async (m: DevMemberOption) => {
    setBusy(m.id)
    if (await devLogin({ characterId: m.id })) onLoggedIn()
    setBusy(null)
  }

  const loginGuest = async () => {
    const name = guestName.trim()
    if (name.length < 2) return toast({ tone: 'error', title: 'Tên cần ít nhất 2 ký tự' })
    setBusy('guest')
    if (await devLogin({ guestName: name })) onLoggedIn()
    setBusy(null)
  }

  return (
    <AuthBackdrop>
      <div className="mx-auto grid min-h-dvh max-w-6xl grid-cols-1 items-center gap-10 px-4 py-10 lg:grid-cols-[1.05fr_1fr] lg:px-8">
        {/* Thương hiệu */}
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-halo text-center lg:text-left">
          <div className="eyebrow flex items-center justify-center gap-2 lg:justify-start">
            <span className="h-px w-6 bg-gold/60" />
            Nghịch Thủy Hàn · Bang hội
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 lg:justify-start">
            <span className="seal h-16 w-16 rounded-[18px] text-[38px]">令</span>
            <h1 className="title-display text-gold-grad text-[46px] sm:text-[60px]">Thủy Hàn Lệnh</h1>
          </div>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-ink-2 lg:mx-0">
            Cổng vào giang hồ <b className="text-ink">Nghịch Thủy Hàn</b> — quản lý <b className="text-ink">bang hội</b>, <b className="text-ink">Kim Lan</b> <span className="han text-gold">金兰</span> và <b className="text-ink">team</b>: phó bản, bày trận, lịch, sư đồ, bang khố… trên một trang.
          </p>
          <div className="mt-8 flex items-end justify-center gap-1 sm:gap-3 lg:justify-start">
            {trio.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.1, type: 'spring', damping: 16 }}>
                <Chibi look={c.look} classId={c.classId} size={(i === 1 ? 170 : 128) * (wide ? 1 : 0.72)} />
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Thẻ đăng nhập */}
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="panel corners w-full p-6 sm:p-8">
          <h2 className="title-display text-[30px] text-ink">Vào bang</h2>
          <p className="mt-1 text-[13px] text-muted">Đăng nhập để thấy dữ liệu chung của cả bang, cập nhật trực tiếp.</p>

          <div className="mt-6">
            {providers?.discord ? (
              <button
                onClick={discordLogin}
                className="btn h-12 w-full border-0 text-[15px] text-white shadow-[0_10px_30px_-10px_#5865F2] hover:brightness-110"
                style={{ background: 'linear-gradient(135deg,#6d78f7,#5865F2 55%,#4752c4)' }}
              >
                <DiscordMark /> Đăng nhập bằng Discord
              </button>
            ) : (
              <div className="rounded-2xl border border-dashed border-line-strong p-4 text-[13px] text-ink-2">
                <div className="mb-1 flex items-center gap-2 font-semibold text-ink">
                  <DiscordMark size={16} /> Đăng nhập Discord chưa bật
                </div>
                Quản trị viên cần tạo ứng dụng Discord và điền <code className="kbd">DISCORD_CLIENT_ID</code> / <code className="kbd">DISCORD_CLIENT_SECRET</code> trong file <code className="kbd">.env</code> của máy chủ.
              </div>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted">
              <ShieldCheck size={13} className="text-jade" /> Chỉ đọc tên và ảnh đại diện Discord (quyền <i>identify</i>), không đọc tin nhắn hay máy chủ của bạn.
            </p>
          </div>

          {providers?.dev && (
            <div className="mt-7 border-t border-line pt-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                    <FlaskConical size={15} className="text-violet" /> Đăng nhập thử
                  </div>
                  <p className="text-[12px] text-muted">Chế độ dev — vào ngay với tư cách một môn hạ demo để thử phân quyền.</p>
                </div>
                <button className="btn btn-sm shrink-0" onClick={() => setGuestOpen(true)}>
                  <UserPlus size={14} /> Khách mới
                </button>
              </div>
              <div className="relative mt-3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input className="field pl-9" placeholder="Tìm tên, lưu phái, tổ chức…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <ul className="mt-3 max-h-[300px] space-y-1 overflow-y-auto pr-1">
                {filtered.map((m) => (
                  <li key={m.id}>
                    <button
                      disabled={m.claimed || !!busy}
                      onClick={() => void loginAs(m)}
                      title={m.claimed ? 'Nhân vật này đã gắn tài khoản Discord' : m.orgs}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-45',
                        busy === m.id && 'bg-white/[0.06]',
                      )}
                    >
                      <ChibiAvatar look={m.look} classId={m.classId} rank={m.rank} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold text-ink">{m.name}</span>
                        <span className="block truncate text-[11.5px] text-muted">
                          {m.claimed ? 'đã gắn Discord' : (m.orgs ?? CLASSES[m.classId].name)}
                        </span>
                      </span>
                      <span className="seal h-6 w-6 shrink-0 rounded-[7px] text-[13px]" style={{ background: RANKS[m.rank].color }}>
                        {RANKS[m.rank].han}
                      </span>
                    </button>
                  </li>
                ))}
                {!filtered.length && <li className="py-6 text-center text-[13px] text-muted">Không thấy ai phù hợp.</li>}
              </ul>
            </div>
          )}
        </motion.section>
      </div>

      <Modal
        open={guestOpen}
        onClose={() => setGuestOpen(false)}
        title="Vào với tư cách khách mới"
        han="客"
        subtitle="Thử luồng nhập môn: gửi đơn hoặc xin nhận danh tính"
        size="sm"
        footer={
          <>
            <button className="btn" onClick={() => setGuestOpen(false)}>
              Thôi
            </button>
            <button className="btn btn-gold" disabled={busy === 'guest'} onClick={() => void loginGuest()}>
              Vào bang
            </button>
          </>
        }
      >
        <Field label="Tên hiển thị">
          <input className="field" autoFocus value={guestName} maxLength={32} onChange={(e) => setGuestName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void loginGuest()} placeholder="Ví dụ: Lãng Khách Phương Nam" />
        </Field>
      </Modal>
    </AuthBackdrop>
  )
}

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { api, ApiError, getOrgId, setOrgId } from '@/api/client'
import { connectRealtime } from '@/api/realtime'
import type { Me, Slice } from '@/domain/api'
import { useGuild } from '@/store/guild'
import { useUi } from '@/store/ui'
import { AuthBackdrop, GateMessage, Splash } from './AuthScreens'
import { InvitePage, inviteCodeFromPath } from './InvitePage'
import { LobbyPage } from './LobbyPage'
import { LoginPage } from './LoginPage'

type Phase = 'checking' | 'login' | 'lobby' | 'invite' | 'ready' | 'offline'

/**
 * Cổng vào app:
 *  chưa đăng nhập → Đăng nhập · mở link mời /moi/:code → trang Lời mời
 *  chưa có tổ chức nào → Sảnh Giang Hồ (tạo nhân vật, nhập mã mời, xin vào bang, lập tổ chức)
 *  có tổ chức → nạp dữ liệu tổ chức đang chọn + mở kênh realtime → vào app.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('checking')
  const me = useGuild((s) => s.me)
  const status = useGuild((s) => s.status)
  const loadError = useGuild((s) => s.error)
  const reloadKey = useGuild((s) => s.reloadKey)
  const [inviteCode, setInviteCode] = useState<string | null>(() => inviteCodeFromPath(location.pathname))

  const check = useCallback(async () => {
    try {
      let fresh = await api.get<Me>('/api/me')
      // tổ chức đang lưu không còn hợp lệ (đã rời / bị mời ra) → chuyển sang tổ chức đầu tiên của mình
      if (!fresh.member && fresh.orgs.length) {
        setOrgId(fresh.orgs[0].org.id)
        fresh = await api.get<Me>('/api/me')
      }
      if (fresh.member && fresh.org && getOrgId() !== fresh.org.id) setOrgId(fresh.org.id)
      useGuild.getState().setMe(fresh)
      const code = inviteCodeFromPath(location.pathname)
      if (code) {
        setInviteCode(code)
        return setPhase('invite')
      }
      if (fresh.member) {
        await useGuild.getState().load()
        setPhase('ready')
      } else {
        setPhase('lobby')
      }
    } catch (e) {
      useGuild.getState().setMe(null)
      setPhase(e instanceof ApiError && e.status === 401 ? 'login' : 'offline')
    }
  }, [])

  useEffect(() => {
    void check()
  }, [check, reloadKey])

  // phiên hết hạn giữa chừng (API trả 401) → quay về màn đăng nhập
  useEffect(() => {
    if (phase === 'ready' && !me) setPhase('login')
  }, [phase, me])

  useRealtime(phase === 'ready', reloadKey)

  const leaveInvite = () => {
    setInviteCode(null)
    history.replaceState(null, '', '/')
    void check()
  }

  if (phase === 'checking') return <Splash text="Đang mở cổng giang hồ…" />
  if (phase === 'login') return <LoginPage onLoggedIn={check} />
  if (phase === 'invite' && me && inviteCode) return <InvitePage code={inviteCode} me={me} onDone={leaveInvite} />
  if (phase === 'lobby' && me) return <LobbyPage me={me} onRefresh={check} />
  if (phase === 'offline' || (phase === 'ready' && status === 'error'))
    return (
      <AuthBackdrop>
        <GateMessage
          han="断"
          title="Mất liên lạc với máy chủ"
          desc={loadError ?? 'Không kết nối được máy chủ API. Nếu đang chạy trên máy mình, hãy bật bằng lệnh npm run dev.'}
          action={
            <button className="btn btn-gold" onClick={() => void check()}>
              Thử kết nối lại
            </button>
          }
        />
      </AuthBackdrop>
    )
  if (phase === 'ready' && status !== 'ready') return <Splash text="Đang nạp dữ liệu…" />
  return <>{children}</>
}

/** Nhận "invalidate" từ server → gộp các slice trong 250ms rồi tải lại một lần; "org" → tải lại /api/me. */
function useRealtime(enabled: boolean, reloadKey: number) {
  const pending = useRef(new Set<Slice>())
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    if (!enabled) return
    const flush = () => {
      const slices = [...pending.current]
      pending.current.clear()
      void useGuild.getState().refresh(slices)
    }
    const stop = connectRealtime({
      onStatus: (s) => useUi.getState().setRealtime(s),
      onReconnect: () => void useGuild.getState().load(),
      onMessage: (msg) => {
        if (msg.type === 'org') return void useGuild.getState().refreshMe()
        if (msg.type !== 'invalidate') return
        msg.slices.forEach((s) => pending.current.add(s))
        clearTimeout(timer.current)
        timer.current = setTimeout(flush, 250)
      },
    })
    return () => {
      clearTimeout(timer.current)
      stop()
      useUi.getState().setRealtime('closed')
    }
  }, [enabled, reloadKey])
}

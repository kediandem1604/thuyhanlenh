import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import type { AuthProviders } from '@/domain/api'
import { LandingPage } from '@/landing/LandingPage'
import { toast } from '@/store/ui'
import { LoginPage } from './LoginPage'
import { discordLogin } from './session'

const LOGIN_ERRORS: Record<string, string> = {
  denied: 'Bạn đã từ chối cấp quyền trên Discord.',
  state: 'Phiên đăng nhập hết hạn hoặc không hợp lệ, hãy thử lại.',
  expired: 'Mã đăng nhập Discord đã hết hạn hoặc đã được dùng — bấm đăng nhập lại nhé.',
  config: 'Máy chủ đang cấu hình sai khóa Discord (Client ID / Client Secret). Báo quản trị viên kiểm tra.',
  discord: 'Discord đang trục trặc, thử lại sau ít phút.',
}

/**
 * Màn đầu tiên khi chưa đăng nhập: landing page giới thiệu hệ thống.
 * Đăng nhập Discord / vào xem thử ngay từ đây; bảng "đăng nhập thử" cũ chỉ còn ở máy dev.
 */
export function LandingGate({ onLoggedIn, onDemo }: { onLoggedIn: () => void; onDemo: () => Promise<void> }) {
  const [providers, setProviders] = useState<AuthProviders | null>(null)
  const [devPanel, setDevPanel] = useState(false)

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

  if (devPanel) return <LoginPage onLoggedIn={onLoggedIn} />
  return (
    <LandingPage
      discordEnabled={providers ? providers.discord : null}
      onDiscordLogin={discordLogin}
      onDemo={onDemo}
      onDevLogin={providers?.dev ? () => setDevPanel(true) : undefined}
    />
  )
}

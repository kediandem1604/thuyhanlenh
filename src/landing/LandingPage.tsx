// Trang giới thiệu (landing page) — màn đầu tiên cho khách chưa đăng nhập.
// Bán trải nghiệm cho mọi người chơi Nghịch Thủy Hàn trước khi mời đăng nhập:
// đầu trang → ba con đường → tính năng nổi bật → 3 bước bắt đầu → hỏi đáp → kêu gọi cuối + chân trang.
import { useEffect, useState } from 'react'
import { MotionConfig } from 'motion/react'
import { toast } from '@/store/ui'
import { AuthBackdrop } from '@/auth/AuthScreens'
import { useDiscordState, type Busy, type CtaProps } from './cta'
import { SiteHeader } from './SiteHeader'
import { Hero } from './sections/Hero'
import { Paths } from './sections/Paths'
import { Features } from './sections/Features'
import { Steps } from './sections/Steps'
import { Faq } from './sections/Faq'
import { FinalCta, SiteFooter } from './sections/Closing'
import './landing.css'

export interface LandingProps {
  /** máy chủ đã bật đăng nhập Discord (null = đang hỏi máy chủ) */
  discordEnabled: boolean | null
  onDiscordLogin: () => void
  /** vào chế độ xem thử bằng dữ liệu mẫu (không cần đăng nhập) */
  onDemo: () => void | Promise<void>
  /** chỉ có ở máy dev: mở bảng đăng nhập thử */
  onDevLogin?: () => void
}

export function LandingPage({ discordEnabled, onDiscordLogin, onDemo, onDevLogin }: LandingProps) {
  const discord = useDiscordState(discordEnabled)
  const [busy, setBusy] = useState<Busy>(null)

  useEffect(() => {
    // qua khỏi phần mở đầu → làm mờ trăng nền (xem landing.css)
    const root = document.documentElement
    // chỉ bật/tắt một thuộc tính — trùng giá trị thì trình duyệt bỏ qua, nên gọi mỗi lần cuộn vẫn rẻ
    const onScroll = () => root.toggleAttribute('data-lp-scrolled', window.scrollY > window.innerHeight * 0.55)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      root.removeAttribute('data-lp-scrolled')
    }
  }, [])

  useEffect(() => {
    // quay lại bằng nút Back sau khi sang Discord (bfcache) → bỏ trạng thái "đang mở"
    const reset = (e: PageTransitionEvent) => e.persisted && setBusy(null)
    window.addEventListener('pageshow', reset)
    return () => window.removeEventListener('pageshow', reset)
  }, [])

  const cta: CtaProps = {
    discord,
    busy,
    onLogin: () => {
      setBusy('discord')
      onDiscordLogin()
    },
    onDemo: () => {
      setBusy('demo')
      // thành công thì trang này biến mất; lỗi (vd mạng chập chờn khi tải phần xem thử) thì mở khóa nút ngay
      Promise.resolve(onDemo()).catch(() => {
        setBusy(null)
        toast({ tone: 'error', title: 'Chưa mở được bản xem thử', desc: 'Kiểm tra mạng rồi thử lại nhé.' })
      })
    },
  }

  return (
    <MotionConfig reducedMotion="user">
      <AuthBackdrop theme="kinh-hong">
        <div className="lp-root overflow-x-clip">
          <a
            href="#noi-dung"
            className="sr-only z-50 rounded-xl bg-[var(--surface-solid)] px-4 py-2 text-[13px] font-semibold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            Bỏ qua tới nội dung
          </a>
          <SiteHeader {...cta} />
          <main id="noi-dung" tabIndex={-1} className="outline-none">
            <div id="dau-trang">
              <Hero {...cta} />
            </div>
            <Paths />
            <Features />
            <Steps />
            <Faq />
            <FinalCta {...cta} />
          </main>
          <SiteFooter onDevLogin={onDevLogin} />
        </div>
      </AuthBackdrop>
    </MotionConfig>
  )
}

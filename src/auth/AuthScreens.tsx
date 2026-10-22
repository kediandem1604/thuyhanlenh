import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { InkScape } from '@/components/layout/InkScape'
import { Petals } from '@/components/layout/Petals'
import { useUi } from '@/store/ui'
import type { OrgThemeId } from '@/domain/orgs'

/**
 * Nền thủy mặc toàn màn hình cho các màn trước khi vào app.
 * Mặc định theo `data-org-theme` trên <html> (sảnh không có tổ chức → Kinh Hồng).
 * `theme` ép một giao diện cho riêng màn này (token CSS kế thừa qua khung display:contents).
 */
export function AuthBackdrop({ children, theme }: { children: ReactNode; theme?: OrgThemeId }) {
  const petals = useUi((s) => s.petals)
  const body = (
    <>
      <InkScape theme={theme} />
      <div className="app-grain" />
      {petals && <Petals count={12} theme={theme} />}
      <div className="relative z-10 min-h-dvh">{children}</div>
    </>
  )
  return theme ? (
    <div data-org-theme={theme} className="contents">
      {body}
    </div>
  ) : (
    body
  )
}

export function Splash({ text }: { text: string }) {
  return (
    <AuthBackdrop>
      <div className="grid min-h-dvh place-items-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
          <span className="seal h-20 w-20 animate-pulse rounded-[20px] text-[46px]">令</span>
          <span className="title-display text-gold-grad text-[26px]">Thủy Hàn Lệnh</span>
          <span className="text-[12px] tracking-[0.22em] text-muted">{text.toUpperCase()}</span>
        </motion.div>
      </div>
    </AuthBackdrop>
  )
}

export function GateMessage({ han, title, desc, action }: { han: string; title: string; desc: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="panel corners w-full max-w-md p-8 text-center">
        <span className="seal mx-auto h-16 w-16 text-[36px]">{han}</span>
        <h1 className="title-display text-gold-grad mt-5 text-[30px]">{title}</h1>
        <p className="mt-2 text-[14px] text-ink-2">{desc}</p>
        {action && <div className="mt-6 flex justify-center gap-2">{action}</div>}
      </motion.div>
    </div>
  )
}

/** Logo Discord (dùng trên nút đăng nhập) */
export function DiscordMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.6 1.25a18.27 18.27 0 0 0-5.49 0 12.6 12.6 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.74 19.74 0 0 0-4.88 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13l.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.07 0a.07.07 0 0 1 .08.01l.37.29a.08.08 0 0 1-.01.13c-.6.35-1.22.65-1.87.89a.08.08 0 0 0-.04.11c.36.7.78 1.36 1.23 1.99a.08.08 0 0 0 .08.03 19.84 19.84 0 0 0 6-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.68-3.55-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.22 0 2.18 1.1 2.16 2.42 0 1.34-.94 2.42-2.16 2.42Z" />
    </svg>
  )
}

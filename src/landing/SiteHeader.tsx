// Thanh đầu trang: thương hiệu, mục lục (màn rộng), đổi Dạ / Nhật, nút đăng nhập gọn. Trong suốt ở đầu trang, mờ kính khi cuộn.
import { useEffect, useState } from 'react'
import { Compass, Moon, Sun } from 'lucide-react'
import { DiscordMark } from '@/auth/AuthScreens'
import { useUi } from '@/store/ui'
import { cn } from '@/lib/utils'
import type { CtaProps } from './cta'

const NAV = [
  { id: 'con-duong', label: 'Con đường' },
  { id: 'tinh-nang', label: 'Tính năng' },
  { id: 'bat-dau', label: 'Bắt đầu' },
  { id: 'hoi-dap', label: 'Hỏi đáp' },
]

export function SiteHeader({ discord, busy, onLogin, onDemo }: CtaProps) {
  const [scrolled, setScrolled] = useState(false)
  const theme = useUi((s) => s.theme)
  const toggleTheme = useUi((s) => s.toggleTheme)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color] duration-300',
        scrolled ? 'border-line bg-[color-mix(in_oklab,var(--bg)_80%,transparent)] backdrop-blur-md' : 'border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 lg:px-8">
        <a href="#dau-trang" className="flex shrink-0 items-center gap-2.5 rounded-xl" aria-label="Thủy Hàn Lệnh — về đầu trang">
          <span className="seal h-9 w-9 text-[20px]" aria-hidden>
            令
          </span>
          <span className="title-display text-[20px] text-ink max-[359px]:hidden">Thủy Hàn Lệnh</span>
        </a>

        <nav aria-label="Mục lục" className="ml-6 hidden md:block">
          <ul className="flex gap-0.5">
            {NAV.map((n) => (
              <li key={n.id}>
                <a href={`#${n.id}`} className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-2 transition hover:text-gold">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng (Nhật)' : 'Chuyển sang giao diện tối (Dạ)'}
            title={theme === 'dark' ? 'Giao diện Nhật' : 'Giao diện Dạ'}
          >
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          {discord === 'off' ? (
            <button type="button" className="btn btn-gold btn-sm" onClick={() => !busy && onDemo()}>
              <Compass size={15} aria-hidden /> Xem thử
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm lp-discord"
              aria-disabled={discord === 'pending' || !!busy}
              onClick={() => discord === 'ready' && !busy && onLogin()}
            >
              <DiscordMark size={15} /> Đăng nhập
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

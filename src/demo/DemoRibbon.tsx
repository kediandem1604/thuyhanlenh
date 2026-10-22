import { Eye, LogOut } from 'lucide-react'
import { isDemoMode } from '@/api/client'
import { DiscordMark } from '@/auth/AuthScreens'
import { exitDemo } from './mode'

/** Dải báo đầu trang khi đang xem thử: nhắc đây là dữ liệu mẫu, mời đăng nhập thật. */
export function DemoRibbon() {
  if (!isDemoMode()) return null
  return (
    <div className="relative z-20 border-b border-line-strong bg-[linear-gradient(90deg,color-mix(in_oklab,var(--gold)_18%,transparent),color-mix(in_oklab,var(--gold)_6%,transparent))] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-6 lg:px-8">
        <Eye size={15} className="shrink-0 text-gold" />
        <p className="min-w-0 flex-1 text-[12.5px] text-ink-2">
          <b className="text-ink">Đang xem thử</b> bằng dữ liệu mẫu — đi khắp các trang thoải mái, nhưng chưa lưu được thay đổi.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="btn btn-sm border-0 text-white hover:brightness-110"
            style={{ background: 'linear-gradient(135deg,#6d78f7,#5865F2 55%,#4752c4)' }}
            onClick={() => exitDemo('/auth/discord/login?next=%2F')}
          >
            <DiscordMark size={15} /> Đăng nhập để dùng thật
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => exitDemo('/')}>
            <LogOut size={14} /> Thoát
          </button>
        </div>
      </div>
    </div>
  )
}

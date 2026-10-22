import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, Flower2, Menu, Moon, Search, Sun } from 'lucide-react'
import type { NavItem } from '@/app/nav'
import { useNavItems } from '@/app/useNav'
import { useGuild, useMemberMap } from '@/store/guild'
import { useUi } from '@/store/ui'
import { cn, timeAgo } from '@/lib/utils'
import { ACTIVITY_META } from '@/components/feed/activityMeta'

function currentNav(items: NavItem[], pathname: string) {
  if (pathname === '/') return items[0]
  return items.find((n) => n.path !== '/' && pathname.startsWith(n.path)) ?? items[0]
}

function Notifications() {
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem('thuy-han-lenh:seen') ?? ''
    } catch {
      return ''
    }
  })
  const activities = useGuild((s) => s.activities)
  const members = useMemberMap()
  const ref = useRef<HTMLDivElement>(null)
  const latest = activities.slice(0, 8)
  const unread = seen ? activities.filter((a) => a.date > seen).length : Math.min(activities.length, 5)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && activities[0]) {
      setSeen(activities[0].date)
      try {
        localStorage.setItem('thuy-han-lenh:seen', activities[0].date)
      } catch {
        /* bỏ qua */
      }
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button className="btn btn-ghost btn-icon relative" onClick={toggle} aria-label="Thông báo">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-cinnabar px-1 text-[9.5px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            className="panel absolute right-0 top-12 z-50 w-[340px] max-w-[calc(100vw-24px)] overflow-hidden !bg-[var(--surface-solid)] p-0"
          >
            <div className="border-b border-line px-4 py-3 text-[13px] font-semibold text-ink">Tin mới trong bang</div>
            <div className="max-h-[360px] overflow-y-auto">
              {latest.map((a) => {
                const meta = ACTIVITY_META[a.type]
                const m = a.memberId ? members[a.memberId] : undefined
                return (
                  <div key={a.id} className="flex gap-3 border-b border-line/60 px-4 py-3 last:border-0">
                    <span className="han grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[15px]" style={{ background: `${meta.color}22`, color: meta.color }}>
                      {meta.han}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] leading-snug text-ink-2">{a.text}</p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {timeAgo(a.date)}
                        {m && ` · ${m.name}`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            <Link to="/" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-2.5 text-center text-[12px] font-semibold text-gold hover:bg-white/[0.03]">
              Xem nhật ký bang hội
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Chấm trạng thái kênh realtime: xanh = đang đồng bộ trực tiếp. */
function RealtimeDot() {
  const rt = useUi((s) => s.realtime)
  const online = useGuild((s) => s.members.filter((m) => m.status === 'online').length)
  const label = rt === 'open' ? `Đồng bộ trực tiếp · ${online} người đang online` : rt === 'connecting' ? 'Đang kết nối realtime…' : 'Mất kết nối realtime — đang thử lại'
  const color = rt === 'open' ? 'var(--jade)' : rt === 'connecting' ? 'var(--gold)' : 'var(--cinnabar)'
  return (
    <span title={label} aria-label={label} className="hidden h-10 items-center gap-1.5 rounded-xl px-2 text-[11.5px] text-muted md:inline-flex">
      <span className={cn('relative h-2 w-2 rounded-full', rt === 'open' && 'pulse-online')} style={{ background: color }} />
      <span className="hidden xl:inline">{rt === 'open' ? 'Trực tiếp' : rt === 'connecting' ? 'Đang nối…' : 'Ngoại tuyến'}</span>
    </span>
  )
}

export function Topbar() {
  const { pathname } = useLocation()
  const navItems = useNavItems()
  const nav = currentNav(navItems, pathname)
  const theme = useUi((s) => s.theme)
  const toggleTheme = useUi((s) => s.toggleTheme)
  const petals = useUi((s) => s.petals)
  const setPetals = useUi((s) => s.setPetals)
  const setNavOpen = useUi((s) => s.setNavOpen)
  const setPaletteOpen = useUi((s) => s.setPaletteOpen)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-20 transition-all duration-300',
        scrolled
          ? 'border-b border-line bg-[color-mix(in_oklab,var(--bg)_78%,transparent)] backdrop-blur-xl'
          : 'border-b border-transparent bg-gradient-to-b from-[color-mix(in_oklab,var(--bg)_70%,transparent)] to-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button className="btn btn-ghost btn-icon lg:hidden" onClick={() => setNavOpen(true)} aria-label="Mở menu">
          <Menu size={20} />
        </button>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="han hidden text-[22px] text-gold sm:inline">{nav.han}</span>
          <div className="min-w-0">
            <div className="truncate text-[14.5px] font-semibold text-ink">{nav.label}</div>
            <div className="hidden truncate text-[11.5px] text-muted sm:block">{nav.desc}</div>
          </div>
        </div>

        <button
          onClick={() => setPaletteOpen(true)}
          className="ml-auto flex h-10 w-10 items-center gap-2.5 rounded-xl border border-line bg-[color-mix(in_oklab,var(--bg)_50%,transparent)] px-3 text-[13px] text-muted transition hover:border-line-strong hover:text-ink sm:w-[300px]"
          aria-label="Tìm kiếm"
        >
          <Search size={16} className="shrink-0" />
          <span className="hidden flex-1 text-left sm:inline">Tìm thành viên, trang, lệnh…</span>
          <span className="kbd hidden sm:inline-flex">Ctrl K</span>
        </button>

        <RealtimeDot />
        <button
          className={cn('btn btn-ghost btn-icon hidden sm:inline-flex', petals && 'text-sakura')}
          onClick={() => setPetals(!petals)}
          aria-label="Bật/tắt hoa rơi"
          title="Hoa rơi"
        >
          <Flower2 size={18} />
        </button>
        <button className="btn btn-ghost btn-icon" onClick={toggleTheme} aria-label="Đổi giao diện" title={theme === 'dark' ? 'Giao diện Tuyên Chỉ' : 'Giao diện Dạ Thủy Mặc'}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </motion.span>
          </AnimatePresence>
        </button>
        <Notifications />
      </div>
    </header>
  )
}

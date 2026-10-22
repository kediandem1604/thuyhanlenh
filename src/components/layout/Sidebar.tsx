import { NavLink } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { LogOut, X } from 'lucide-react'
import { logout } from '@/auth/session'
import { useNav } from '@/app/useNav'
import { OrgSwitcher } from '@/components/org/OrgSwitcher'
import { rankLabel, useCurrentUser, useGuild } from '@/store/guild'
import { useUi } from '@/store/ui'
import { cn, nextWeeklyReset } from '@/lib/utils'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { Countdown } from '@/components/ui/Countdown'

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 pb-5 pt-6">
      <span className="seal h-11 w-11 text-[26px]">令</span>
      <div>
        <div className="title-display text-gold-grad text-[22px] leading-none">Thủy Hàn Lệnh</div>
        <div className="mt-1 text-[10.5px] uppercase tracking-[0.24em] text-muted">Nghịch Thủy Hàn</div>
      </div>
    </div>
  )
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const nav = useNav()
  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-4">
      {nav.map((group) => (
        <div key={group.title} className="mb-4">
          <div className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.24em] text-muted/80">{group.title}</div>
          {group.items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group relative mb-0.5 flex h-10 items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium transition-all',
                  isActive ? 'text-ink' : 'text-ink-2 hover:bg-white/[0.03] hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-xl border border-line-strong"
                      style={{ background: 'linear-gradient(90deg, color-mix(in oklab, var(--gold) 18%, transparent), transparent)' }}
                      transition={{ type: 'spring', damping: 30, stiffness: 380 }}
                    />
                  )}
                  {isActive && <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r bg-gold shadow-[0_0_10px_var(--gold)]" />}
                  <item.icon size={17} className={cn('relative shrink-0', isActive ? 'text-gold' : 'text-muted group-hover:text-gold')} />
                  <span className="relative flex-1 truncate">{item.label}</span>
                  <span className={cn('han relative text-[15px] transition-opacity', isActive ? 'text-gold opacity-90' : 'opacity-0 group-hover:opacity-50')}>
                    {item.han}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}

function UserCard() {
  const me = useCurrentUser()
  const user = useGuild((s) => s.me?.user)
  if (!me) return null
  return (
    <div className="border-t border-line p-4">
      <div className="mb-3 flex items-center justify-between rounded-xl border border-line bg-black/10 px-3 py-2 text-[11.5px]">
        <span className="text-muted">Reset tuần sau</span>
        <span className="font-semibold text-gold">
          <Countdown to={nextWeeklyReset()} compact />
        </span>
      </div>
      <div className="flex items-center gap-1">
        <NavLink to={`/thanh-vien/${me.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1.5 transition hover:bg-white/[0.03]">
          <span className="relative">
            <ChibiAvatar look={me.look} classId={me.classId} rank={me.rank} status={me.status} size={40} />
            {user?.avatarUrl && <img src={user.avatarUrl} alt="" className="absolute -bottom-1 -left-1 h-4 w-4 rounded-full ring-2 ring-[var(--surface-solid)]" />}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-semibold text-ink">{me.name}</div>
            <div className="truncate text-[11.5px] text-gold">
              {rankLabel(me)}
              {user?.provider === 'dev' && <span className="ml-1 text-muted">· thử</span>}
            </div>
          </div>
        </NavLink>
        <button className="btn btn-ghost btn-icon btn-sm shrink-0 text-muted hover:text-cinnabar" title="Đăng xuất" aria-label="Đăng xuất" onClick={() => void logout()}>
          <LogOut size={16} />
        </button>
      </div>
    </div>
  )
}

export function Sidebar() {
  const navOpen = useUi((s) => s.navOpen)
  const setNavOpen = useUi((s) => s.setNavOpen)
  const content = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <Brand />
      <OrgSwitcher onNavigate={onNavigate} />
      <NavList onNavigate={onNavigate} />
      <UserCard />
    </div>
  )

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] border-r border-line bg-[color-mix(in_oklab,var(--bg)_72%,transparent)] backdrop-blur-xl lg:block">
        {content()}
      </aside>
      <AnimatePresence>
        {navOpen && (
          <motion.div className="fixed inset-0 z-[70] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setNavOpen(false)} />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute inset-y-0 left-0 w-[282px] border-r border-line bg-[var(--surface-solid)]"
            >
              <button className="btn btn-ghost btn-icon btn-sm absolute right-3 top-6" onClick={() => setNavOpen(false)} aria-label="Đóng menu">
                <X size={18} />
              </button>
              {content(() => setNavOpen(false))}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

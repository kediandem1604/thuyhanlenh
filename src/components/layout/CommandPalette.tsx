import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { CornerDownLeft, Moon, RotateCcw, Search, Swords, UserPlus, Flower2, type LucideIcon } from 'lucide-react'
import { useNavItems } from '@/app/useNav'
import { CLASSES } from '@/domain/constants'
import { rankLabel, useGuild } from '@/store/guild'
import { useUi } from '@/store/ui'
import { cn, normalize } from '@/lib/utils'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'

interface Cmd {
  id: string
  group: string
  label: string
  hint?: string
  run: () => void
  icon?: LucideIcon
  han?: string
  avatar?: React.ReactNode
}

/** Thanh lệnh Ctrl+K: nhảy trang, tìm thành viên, thao tác nhanh */
export function CommandPalette() {
  const open = useUi((s) => s.paletteOpen)
  const setOpen = useUi((s) => s.setPaletteOpen)
  const toggleTheme = useUi((s) => s.toggleTheme)
  const setPetals = useUi((s) => s.setPetals)
  const members = useGuild((s) => s.members)
  const navItems = useNavItems()
  const permissions = useGuild((s) => s.me?.permissions)
  const features = useGuild((s) => s.me?.org?.features)
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!useUi.getState().paletteOpen)
      } else if (e.key === '/' && !typing) {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  useEffect(() => {
    if (open) {
      setQ('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const commands = useMemo<Cmd[]>(() => {
    const go = (path: string) => () => {
      navigate(path)
      setOpen(false)
    }
    const pages: Cmd[] = navItems.map((n) => ({ id: `p-${n.path}`, group: 'Trang', label: n.label, hint: n.desc, run: go(n.path), han: n.han }))
    const actions: Cmd[] = [
      ...(permissions?.includes('member.edit') ? [{ id: 'a-add', group: 'Thao tác', label: 'Thêm thành viên mới', icon: UserPlus, run: go('/thanh-vien?action=add') }] : []),
      ...(features?.includes('pho-ban') ? [{ id: 'a-clear', group: 'Thao tác', label: 'Ghi nhận lượt clear phó bản', icon: Swords, run: go('/pho-ban?action=record') }] : []),
      {
        id: 'a-theme',
        group: 'Thao tác',
        label: 'Đổi giao diện Dạ / Nhật',
        icon: Moon,
        run: () => {
          toggleTheme()
          setOpen(false)
        },
      },
      {
        id: 'a-petal',
        group: 'Thao tác',
        label: 'Bật / tắt hoa rơi',
        icon: Flower2,
        run: () => {
          setPetals(!useUi.getState().petals)
          setOpen(false)
        },
      },
      { id: 'a-reset', group: 'Thao tác', label: 'Thiết lập & dữ liệu demo', icon: RotateCcw, run: go('/thiet-lap') },
    ]
    const people: Cmd[] = members.map((m) => ({
      id: `m-${m.id}`,
      group: 'Thành viên',
      label: m.name,
      hint: `${CLASSES[m.classId].name} · ${rankLabel(m)}`,
      run: go(`/thanh-vien/${m.id}`),
      avatar: <ChibiAvatar look={m.look} classId={m.classId} rank={m.rank} size={30} />,
    }))
    return [...pages, ...actions, ...people]
  }, [members, navItems, permissions, features, navigate, setOpen, toggleTheme, setPetals])

  const results = useMemo(() => {
    const nq = normalize(q.trim())
    if (!nq) return commands.filter((c) => c.group !== 'Thành viên').concat(commands.filter((c) => c.group === 'Thành viên').slice(0, 5))
    return commands.filter((c) => normalize(`${c.label} ${c.hint ?? ''}`).includes(nq)).slice(0, 30)
  }, [q, commands])

  useEffect(() => setActive(0), [q])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(results.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      results[active]?.run()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  let lastGroup = ''
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-start justify-center px-3 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="panel corners relative w-full max-w-xl overflow-hidden !bg-[var(--surface-solid)] p-0"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={18} className="text-gold" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Gõ tên thành viên, trang hoặc lệnh…"
                className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
              />
              <span className="kbd">Esc</span>
            </div>
            <div className="max-h-[56vh] overflow-y-auto p-2">
              {results.length === 0 && <p className="px-3 py-8 text-center text-[13px] text-muted">Không tìm thấy gì phù hợp.</p>}
              {results.map((c, i) => {
                const header = c.group !== lastGroup
                lastGroup = c.group
                return (
                  <div key={c.id}>
                    {header && <div className="px-3 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted">{c.group}</div>}
                    <button
                      onMouseEnter={() => setActive(i)}
                      onClick={c.run}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition',
                        i === active ? 'bg-[color-mix(in_oklab,var(--gold)_14%,transparent)] text-ink' : 'text-ink-2',
                      )}
                    >
                      {c.avatar ??
                        (c.han ? (
                          <span className="han grid h-[30px] w-[30px] place-items-center rounded-lg border border-line text-[16px] text-gold">{c.han}</span>
                        ) : c.icon ? (
                          <span className="grid h-[30px] w-[30px] place-items-center rounded-lg border border-line text-gold">
                            <c.icon size={15} />
                          </span>
                        ) : null)}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">{c.label}</span>
                        {c.hint && <span className="block truncate text-[11.5px] text-muted">{c.hint}</span>}
                      </span>
                      {i === active && <CornerDownLeft size={14} className="text-gold" />}
                    </button>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

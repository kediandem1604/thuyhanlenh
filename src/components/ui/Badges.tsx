import { Shield, HeartPulse, Swords } from 'lucide-react'
import { CLASSES, MODES, RANKS, RARITY, ROLES, STATUS } from '@/domain/constants'
import type { ClassId, CombatRole, DungeonMode, MemberStatus, RankId, Rarity } from '@/domain/types'
import { alpha } from '@/lib/color'
import { cn } from '@/lib/utils'

/** Nhãn lưu phái: chấm màu + tên (+ chữ Hán) */
export function ClassBadge({ classId, showHan = false, className }: { classId: ClassId; showHan?: boolean; className?: string }) {
  const c = CLASSES[classId]
  return (
    <span
      className={cn('chip', className)}
      style={{ borderColor: alpha(c.palette.accent, 0.35), background: alpha(c.palette.accent, 0.1), color: c.palette.accent }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.palette.accent }} />
      {c.name}
      {showHan && <span className="han text-[13px] opacity-80">{c.han}</span>}
    </span>
  )
}

/** Ấn triện chức vụ */
/** Ấn chức vụ. Kim Lan truyền `member` để hiện danh xưng theo ghế (Nhị tỷ 二…) thay cho tên chức vụ. */
export function RankSeal({
  rank,
  size = 'md',
  withName = true,
  member,
}: {
  rank: RankId
  size?: 'sm' | 'md' | 'lg'
  withName?: boolean
  member?: { honorific?: string; honorificHan?: string }
}) {
  const r = RANKS[rank]
  const han = member?.honorificHan ? [...member.honorificHan][0] : r.han
  const name = member?.honorific ?? r.name
  const dim = size === 'sm' ? 'h-5 w-5 text-[12px] rounded-[6px]' : size === 'lg' ? 'h-10 w-10 text-[22px]' : 'h-7 w-7 text-[16px] rounded-[8px]'
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn('seal', dim)}
        style={{
          background: `radial-gradient(circle at 30% 25%, ${alpha(r.color, 0.95)}, ${alpha(r.color, 0.65)} 75%)`,
          boxShadow: `inset 0 0 0 1.5px rgba(255,240,220,.5), 0 4px 12px -4px ${alpha(r.color, 0.7)}`,
        }}
      >
        {han}
      </span>
      {withName && <span className="text-[12.5px] font-semibold text-ink-2">{name}</span>}
    </span>
  )
}

const ROLE_ICON = { tank: Shield, healer: HeartPulse, dps: Swords }

export function RoleIcon({ role, size = 14, className }: { role: CombatRole; size?: number; className?: string }) {
  const Icon = ROLE_ICON[role]
  return <Icon size={size} className={className} style={{ color: ROLES[role].color }} aria-label={ROLES[role].name} />
}

export function RoleBadge({ role }: { role: CombatRole }) {
  return (
    <span className="chip" style={{ color: ROLES[role].color, borderColor: alpha(ROLES[role].color, 0.35) }}>
      <RoleIcon role={role} size={12} />
      {ROLES[role].short}
    </span>
  )
}

export function StatusDot({ status, className }: { status: MemberStatus; className?: string }) {
  const s = STATUS[status]
  return (
    <span
      title={s.name}
      className={cn(
        'inline-block h-2.5 w-2.5 rounded-full ring-2 ring-[var(--surface-solid)]',
        // vòng sóng là ::after định vị tuyệt đối → chấm cần được định vị (trừ khi đã truyền absolute/fixed…)
        status === 'online' && 'pulse-online',
        status === 'online' && !/(absolute|fixed|relative|sticky)/.test(className ?? '') && 'relative',
        className,
      )}
      style={{ background: s.color }}
    />
  )
}

export function StatusText({ status }: { status: MemberStatus }) {
  const s = STATUS[status]
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: s.color }}>
      <StatusDot status={status} />
      {s.name}
    </span>
  )
}

export function RarityTag({ rarity }: { rarity: Rarity }) {
  const r = RARITY[rarity]
  return (
    <span className="chip" style={{ color: r.color, borderColor: alpha(r.color, 0.45), boxShadow: `0 0 12px -4px ${r.glow}` }}>
      {r.name}
    </span>
  )
}

export function ModeTag({ mode }: { mode: DungeonMode }) {
  const m = MODES[mode]
  return (
    <span className="chip" style={{ color: m.color, borderColor: alpha(m.color, 0.4), background: alpha(m.color, 0.08) }}>
      <span className="han text-[13px]">{m.han}</span>
      {m.name}
    </span>
  )
}

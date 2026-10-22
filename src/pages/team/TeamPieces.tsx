import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Plus, X } from 'lucide-react'
import { CLASSES, ROLES } from '@/domain/constants'
import type { CombatRole, Member } from '@/domain/types'
import { alpha } from '@/lib/color'
import { cn, fmtCompact } from '@/lib/utils'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { RoleIcon } from '@/components/ui/Badges'
import { roleOfMember } from './teamUtils'

export interface DragData {
  memberId: string
  fromSlot?: number
}

/** Thẻ thành viên trong danh sách — kéo được, bấm để thêm nhanh */
export function RosterCard({ member, onAdd }: { member: Member; onAdd: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `roster:${member.id}`,
    data: { memberId: member.id } satisfies DragData,
  })
  const role = roleOfMember(member)
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={() => onAdd(member.id)}
      className={cn(
        'flex w-full touch-none items-center gap-2.5 rounded-xl border border-transparent px-2 py-1.5 text-left transition',
        'hover:border-line hover:bg-white/[0.03]',
        isDragging && 'opacity-30',
      )}
      title="Kéo vào ô trống, hoặc bấm để thêm"
    >
      <ChibiAvatar look={member.look} classId={member.classId} rank={member.rank} status={member.status} size={34} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-ink">{member.name}</span>
        <span className="flex items-center gap-1 truncate text-[11px] text-muted">
          <RoleIcon role={role} size={11} />
          {CLASSES[member.classId].name}
        </span>
      </span>
      <span className="text-[12px] font-semibold tabular-nums text-ink-2">{fmtCompact(member.power)}</span>
    </button>
  )
}

/** Ảnh nổi khi đang kéo */
export function DragGhost({ member }: { member: Member }) {
  return (
    <div className="panel flex w-[230px] cursor-grabbing items-center gap-2.5 !rounded-xl !bg-[var(--surface-solid)] px-2.5 py-2 shadow-2xl ring-1 ring-[var(--gold)]">
      <ChibiAvatar look={member.look} classId={member.classId} rank={member.rank} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-ink">{member.name}</span>
        <span className="block truncate text-[11px] text-muted">
          {CLASSES[member.classId].name} · {fmtCompact(member.power)}
        </span>
      </span>
    </div>
  )
}

function FilledSlot({ member, index, onRemove }: { member: Member; index: number; onRemove: (i: number) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `slot:${index}`,
    data: { memberId: member.id, fromSlot: index } satisfies DragData,
  })
  const role = roleOfMember(member)
  const accent = CLASSES[member.classId].palette.accent
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn('group relative flex h-full touch-none cursor-grab flex-col items-center justify-center gap-1 px-1.5 py-2 text-center', isDragging && 'opacity-30')}
      style={{ background: `radial-gradient(circle at 50% 30%, ${alpha(accent, 0.16)}, transparent 70%)` }}
    >
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onRemove(index)}
        className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/30 text-muted opacity-80 transition hover:bg-cinnabar hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
        aria-label={`Bỏ ${member.name} khỏi đội`}
      >
        <X size={12} />
      </button>
      <ChibiAvatar look={member.look} classId={member.classId} rank={member.rank} status={member.status} size={40} />
      <span className="w-full truncate text-[12px] font-semibold text-ink">{member.name}</span>
      <span className="flex items-center gap-1 text-[10.5px] text-muted">
        <RoleIcon role={role} size={10} />
        {fmtCompact(member.power)}
      </span>
    </div>
  )
}

/** Một ô trong trận hình */
export function Slot({
  index,
  member,
  hint,
  onRemove,
}: {
  index: number
  member?: Member
  hint: CombatRole
  onRemove: (i: number) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `drop:${index}` })
  const mismatch = member && roleOfMember(member) !== hint
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative h-[118px] overflow-hidden rounded-2xl border transition-all',
        member ? 'border-line bg-[var(--surface-2)]' : 'border-dashed border-line-strong bg-black/10',
        isOver && 'scale-[1.03] border-solid border-gold shadow-[0_0_0_3px_color-mix(in_oklab,var(--gold)_25%,transparent)]',
      )}
    >
      {member ? (
        <FilledSlot member={member} index={index} onRemove={onRemove} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-1 text-muted">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-dashed border-line-strong">
            <Plus size={15} />
          </span>
          <span className="flex items-center gap-1 text-[10.5px]" style={{ color: ROLES[hint].color }}>
            <RoleIcon role={hint} size={10} /> {ROLES[hint].short}
          </span>
        </div>
      )}
      {mismatch && <span className="absolute bottom-1 left-1.5 h-1.5 w-1.5 rounded-full" style={{ background: ROLES[hint].color }} title={`Vị trí gợi ý: ${ROLES[hint].short}`} />}
    </div>
  )
}

/** Vùng thả để trả người về danh sách */
export function RosterDrop({ children, className }: { children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'drop:roster' })
  return (
    <div ref={setNodeRef} className={cn(className, 'transition', isOver && 'ring-2 ring-[var(--cinnabar)] ring-offset-0')}>
      {children}
    </div>
  )
}

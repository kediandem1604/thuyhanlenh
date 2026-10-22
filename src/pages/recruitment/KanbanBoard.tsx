import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { AnimatePresence, motion } from 'motion/react'
import { APPLICATION_STAGES } from '@/domain/constants'
import type { Application, ApplicationStage, Member } from '@/domain/types'
import { cn, normalize } from '@/lib/utils'
import { ApplicationCard, type CardActions } from './ApplicationCard'

const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  return hits.length ? hits : rectIntersection(args)
}

function DraggableCard({
  app,
  referrer,
  claimMember,
  memberId,
  actions,
  busy,
}: {
  app: Application
  referrer?: Member
  claimMember?: Member
  memberId?: string
  actions?: CardActions
  busy: boolean
}) {
  const locked = app.stage === 'chap-nhan' || !actions || busy
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: app.id, disabled: locked })
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.25 }}>
      <div ref={setNodeRef} {...listeners} {...attributes} className={cn('outline-none', !locked && 'cursor-grab active:cursor-grabbing')} aria-roledescription="Thẻ đơn có thể kéo">
        <ApplicationCard app={app} referrer={referrer} claimMember={claimMember} memberId={memberId} actions={actions} dragging={isDragging} busy={busy} />
      </div>
    </motion.div>
  )
}

function Column({
  stage,
  children,
  count,
  dragging,
}: {
  stage: (typeof APPLICATION_STAGES)[number]
  children: React.ReactNode
  count: number
  dragging: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[440px] min-w-[252px] flex-1 flex-col rounded-[20px] border p-2.5 transition-colors',
        isOver ? 'bg-[color-mix(in_oklab,var(--gold)_7%,transparent)]' : 'bg-black/10',
      )}
      style={{ borderColor: isOver ? stage.color : dragging ? `color-mix(in oklab, ${stage.color} 35%, var(--line))` : 'var(--line)' }}
    >
      <div className="mb-2.5 flex items-center gap-2 px-1.5 pt-1">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.color, boxShadow: `0 0 10px ${stage.color}` }} />
        <span className="text-[13px] font-bold text-ink">{stage.name}</span>
        <span className="ml-auto rounded-full bg-white/5 px-2 text-[11px] font-semibold text-muted">{count}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2">{children}</div>
    </div>
  )
}

/** Bảng kanban duyệt đơn — kéo thả giữa các cột hoặc dùng nút trên thẻ */
export function KanbanBoard({
  applications,
  members,
  actions,
  busy,
}: {
  applications: Application[]
  members: Member[]
  /** không có = chỉ xem (không đủ quyền duyệt) */
  actions?: CardActions
  busy?: ReadonlySet<string>
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [activeId, setActiveId] = useState<string | null>(null)

  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])) as Record<string, Member>, [members])
  const memberIdByName = useMemo(() => {
    const map = new Map<string, string>()
    members.forEach((m) => {
      const k = normalize(m.name)
      if (!map.has(k)) map.set(k, m.id)
    })
    return map
  }, [members])

  const byStage = useMemo(() => {
    const g = Object.fromEntries(APPLICATION_STAGES.map((s) => [s.id, [] as Application[]])) as Record<ApplicationStage, Application[]>
    applications.forEach((a) => g[a.stage]?.push(a))
    Object.values(g).forEach((list) => list.sort((x, y) => y.appliedAt.localeCompare(x.appliedAt)))
    return g
  }, [applications])

  const active = activeId ? applications.find((a) => a.id === activeId) : undefined

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const app = applications.find((a) => a.id === e.active.id)
    const to = e.over?.id as ApplicationStage | undefined
    if (!actions || !app || !to || to === app.stage) return
    if (to === 'chap-nhan') actions.onAccept(app)
    else actions.onMove(app, to)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="scroll-x -mx-1 pb-3">
        <div className="flex gap-3 px-1">
          {APPLICATION_STAGES.map((stage) => (
            <Column key={stage.id} stage={stage} count={byStage[stage.id].length} dragging={!!activeId}>
              <AnimatePresence initial={false}>
                {byStage[stage.id].map((app) => (
                  <DraggableCard
                    key={app.id}
                    app={app}
                    referrer={app.referrerId ? memberById[app.referrerId] : undefined}
                    claimMember={app.claimMemberId ? memberById[app.claimMemberId] : undefined}
                    memberId={
                      app.stage === 'chap-nhan' ? (app.claimMemberId && memberById[app.claimMemberId] ? app.claimMemberId : memberIdByName.get(normalize(app.name))) : undefined
                    }
                    actions={actions}
                    busy={!!busy?.has(app.id)}
                  />
                ))}
              </AnimatePresence>
              {byStage[stage.id].length === 0 && (
                <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-line px-3 py-8 text-center text-[11.5px] text-muted">
                  {actions ? 'Thả thẻ vào đây' : 'Chưa có đơn'}
                </div>
              )}
            </Column>
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(.22,1,.36,1)' }}>
        {active ? (
          <ApplicationCard
            app={active}
            referrer={active.referrerId ? memberById[active.referrerId] : undefined}
            claimMember={active.claimMemberId ? memberById[active.claimMemberId] : undefined}
            overlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

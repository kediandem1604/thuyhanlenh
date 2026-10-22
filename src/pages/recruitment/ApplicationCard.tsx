import { Link } from 'react-router'
import { Check, ChevronRight, ExternalLink, GripVertical, IdCard, Lock, RotateCcw, UserCheck, X } from 'lucide-react'
import { APPLICATION_STAGES } from '@/domain/constants'
import type { Application, ApplicationStage, Member } from '@/domain/types'
import { cn, fmt, timeAgo } from '@/lib/utils'
import { rankLabel, useOrgType } from '@/store/guild'
import { recruitWords } from './words'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { ClassBadge } from '@/components/ui/Badges'

export const FLOW: ApplicationStage[] = ['moi', 'phong-van', 'thu-thach', 'chap-nhan']

export function nextStage(stage: ApplicationStage): ApplicationStage | null {
  if (stage === 'tu-choi') return 'moi'
  const i = FLOW.indexOf(stage)
  return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null
}

export const stageName = (id: ApplicationStage) => APPLICATION_STAGES.find((s) => s.id === id)?.name ?? id

export interface CardActions {
  onMove: (app: Application, to: ApplicationStage) => void
  onAccept: (app: Application) => void
}

/** Thẻ đơn xin gia nhập — dùng cả trong cột lẫn lớp kéo (overlay) */
export function ApplicationCard({
  app,
  referrer,
  claimMember,
  memberId,
  actions,
  overlay,
  dragging,
  busy,
}: {
  app: Application
  referrer?: Member
  /** môn hạ mà đơn "xin nhận danh tính" muốn nhận */
  claimMember?: Member
  memberId?: string
  actions?: CardActions
  overlay?: boolean
  dragging?: boolean
  busy?: boolean
}) {
  const locked = app.stage === 'chap-nhan'
  const next = nextStage(app.stage)
  const isClaim = app.kind === 'claim'
  const w = recruitWords(useOrgType())
  return (
    <div
      className={cn(
        'group relative rounded-2xl border border-line bg-[var(--surface-solid)] p-3 transition',
        !locked && 'hover:border-line-strong',
        isClaim && !locked && 'border-violet/45',
        overlay && 'rotate-[2deg] scale-[1.03] border-gold shadow-[0_24px_50px_-18px_rgba(0,0,0,.8),0_0_0_1px_var(--gold)]',
        dragging && 'opacity-35',
        busy && 'pointer-events-none opacity-60',
      )}
      aria-busy={busy || undefined}
    >
      <div className="flex items-start gap-2.5">
        <ChibiAvatar look={app.look} classId={app.classId} size={44} animated={overlay} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-bold text-ink">{app.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <ClassBadge classId={app.classId} className="!h-5 !px-2 !text-[10.5px]" />
            <span className="text-[11px] text-muted">Lv {app.level}</span>
          </div>
        </div>
        {locked ? (
          <Lock size={14} className="mt-1 shrink-0 text-jade" aria-label={`Đã vào ${w.org}`} />
        ) : (
          <span
            className={cn('mt-0.5 shrink-0 cursor-grab touch-none rounded-md p-0.5 text-muted hover:text-gold active:cursor-grabbing', overlay && 'cursor-grabbing')}
            aria-hidden
            title="Kéo để chuyển cột"
          >
            <GripVertical size={16} />
          </span>
        )}
      </div>

      {(isClaim || app.hasAccount) && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {isClaim && (
            <span className="chip !h-5 !px-2 !text-[10.5px]" style={{ color: 'var(--violet)', borderColor: 'color-mix(in oklab, var(--violet) 45%, transparent)' }}>
              <IdCard size={11} /> Xin nhận danh tính
            </span>
          )}
          {app.hasAccount && (
            <span className="chip !h-5 !px-2 !text-[10.5px]" style={{ color: 'var(--jade)' }} title="Đơn gửi từ tài khoản đã đăng nhập — chấp nhận là người đó vào thẳng app">
              <UserCheck size={11} /> Có tài khoản
            </span>
          )}
        </div>
      )}
      {isClaim && claimMember && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-black/10 px-2 py-1.5">
          <ChibiAvatar look={claimMember.look} classId={claimMember.classId} rank={claimMember.rank} size={24} />
          <div className="min-w-0 text-[11px] leading-tight">
            <div className="text-muted">Muốn nhận {w.member}</div>
            <div className="truncate font-semibold text-ink">
              {claimMember.name} · {rankLabel(claimMember)}
            </div>
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-[11.5px]">
        <span className="text-muted">Chiến lực</span>
        <span className="font-semibold tabular-nums text-gold">{fmt(app.power)}</span>
      </div>
      {app.message ? (
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-ink-2">“{app.message}”</p>
      ) : (
        <p className="mt-1.5 text-[12px] italic text-muted">Không để lại lời nhắn.</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted">
        <span>{timeAgo(app.appliedAt)}</span>
        {referrer && (
          <span className="chip !h-5 !px-2 !text-[10.5px]" title="Người tiến cử">
            Tiến cử: {referrer.name}
          </span>
        )}
      </div>

      {actions && !overlay && (
        <div className="mt-2.5 flex items-center gap-1 border-t border-line/70 pt-2">
          {locked ? (
            memberId ? (
              <Link to={`/thanh-vien/${memberId}`} className="btn btn-ghost btn-sm !h-7 text-jade">
                <ExternalLink size={13} /> Xem hồ sơ
              </Link>
            ) : (
              <span className="px-1 text-[11px] text-jade">Đã vào {w.org}</span>
            )
          ) : (
            <>
              {next && next !== 'chap-nhan' && (
                <button className="btn btn-ghost btn-sm !h-7 !px-2 text-[11.5px]" onClick={() => actions.onMove(app, next)} title={`Chuyển sang ${stageName(next)}`}>
                  {app.stage === 'tu-choi' ? <RotateCcw size={13} /> : <ChevronRight size={13} />}
                  {app.stage === 'tu-choi' ? 'Mở lại' : stageName(next)}
                </button>
              )}
              {app.stage !== 'tu-choi' && (
                <button className="btn btn-ghost btn-sm !h-7 !px-2 text-[11.5px] text-jade" onClick={() => actions.onAccept(app)} title={`Chấp nhận vào ${w.org}`}>
                  <Check size={13} /> Nhận
                </button>
              )}
              {app.stage !== 'tu-choi' && (
                <button
                  className="btn btn-ghost btn-sm btn-icon !ml-auto !h-7 !w-7 text-muted hover:text-cinnabar"
                  onClick={() => actions.onMove(app, 'tu-choi')}
                  title="Từ chối"
                  aria-label="Từ chối"
                >
                  <X size={14} />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

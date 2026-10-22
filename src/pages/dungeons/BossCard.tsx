import { motion } from 'motion/react'
import { Lock, Target, Timer, Swords, CalendarCheck } from 'lucide-react'
import type { Boss, BossProgress } from '@/domain/types'
import { alpha, shade } from '@/lib/color'
import { cn, fmtDate, fmtDuration } from '@/lib/utils'
import { useOrgWords } from '@/pages/dashboard/orgWords'

/** Thẻ boss: huy chương chữ Hán, dấu "斩" khi đã hạ, sương mờ khi chưa chinh phục */
export function BossCard({
  boss,
  index,
  progress,
  isTarget,
}: {
  boss: Boss
  index: number
  progress?: BossProgress
  isTarget: boolean
}) {
  const defeated = (progress?.kills ?? 0) > 0
  const w = useOrgWords()
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index, duration: 0.4 }}
      className={cn(
        'panel relative overflow-hidden p-4',
        defeated ? 'panel-hover' : '',
        isTarget && 'ring-1 ring-[color-mix(in_oklab,var(--cinnabar)_70%,transparent)]',
      )}
      style={
        isTarget
          ? { boxShadow: `var(--shadow), 0 0 0 1px ${alpha('#e0523f', 0.35)}, 0 0 36px -10px ${alpha('#e0523f', 0.6)}` }
          : undefined
      }
    >
      {/* nền tông màu boss */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(260px 160px at 50% 0%, ${alpha(boss.color, defeated ? 0.22 : 0.1)}, transparent 70%)` }}
      />

      <div className="relative flex items-center justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted">Ải {index + 1}</span>
        {isTarget && (
          <span className="chip !h-6 text-cinnabar" style={{ borderColor: alpha('#e0523f', 0.45), background: alpha('#e0523f', 0.1) }}>
            <Target size={12} /> Mục tiêu
          </span>
        )}
      </div>

      {/* huy chương */}
      <div className="relative mx-auto mt-3 grid h-24 w-24 place-items-center">
        <div
          className={cn('absolute inset-0 rounded-full', !defeated && 'grayscale')}
          style={{
            background: `radial-gradient(circle at 35% 30%, ${shade(boss.color, 30)}, ${boss.color} 55%, ${shade(boss.color, -45)})`,
            boxShadow: `inset 0 0 0 3px ${alpha('#ffffff', 0.18)}, 0 0 0 1.5px ${alpha(boss.color, 0.6)}, 0 10px 30px -8px ${alpha(boss.color, defeated ? 0.8 : 0.3)}`,
            opacity: defeated ? 1 : 0.55,
          }}
        />
        <div className="absolute inset-[7px] rounded-full border border-dashed border-white/25" />
        <span className={cn('han relative text-[46px] leading-none text-white drop-shadow-[0_2px_6px_rgba(0,0,0,.5)]', !defeated && 'opacity-60')}>
          {boss.glyph}
        </span>
        {!defeated && (
          <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-line bg-[var(--surface-solid)] text-muted">
            <Lock size={14} />
          </span>
        )}
      </div>

      {/* dấu chém */}
      {defeated && (
        <motion.span
          initial={{ scale: 2.2, opacity: 0, rotate: -30 }}
          animate={{ scale: 1, opacity: 1, rotate: -14 }}
          transition={{ delay: 0.15 + 0.06 * index, type: 'spring', damping: 11, stiffness: 180 }}
          className="seal absolute right-3 top-10 h-12 w-12 text-[28px]"
          aria-label="Đã hạ"
        >
          斩
        </motion.span>
      )}

      <div className="relative mt-4 text-center">
        <h4 className="title-display text-[20px] text-ink">{boss.name}</h4>
        <p className="text-[12px] text-muted">{boss.title}</p>
      </div>

      <div className="relative mt-4 border-t border-line pt-3">
        {defeated ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-[10.5px] text-muted">
                <Swords size={11} /> Lượt hạ
              </div>
              <div className="mt-0.5 text-[15px] font-bold tabular-nums text-ink">{progress?.kills}</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-[10.5px] text-muted">
                <CalendarCheck size={11} /> First kill
              </div>
              <div className="mt-0.5 text-[12.5px] font-semibold tabular-nums text-ink">
                {progress?.firstKill ? fmtDate(progress.firstKill, { day: '2-digit', month: '2-digit' }) : '—'}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-[10.5px] text-muted">
                <Timer size={11} /> Kỷ lục
              </div>
              <div className="mt-0.5 text-[15px] font-bold tabular-nums text-gold">
                {progress?.bestTimeSec !== undefined ? fmtDuration(progress.bestTimeSec) : '—'}
              </div>
            </div>
          </div>
        ) : (
          <p className="py-1.5 text-center text-[12.5px] italic text-muted">
            {isTarget ? `Ải kế tiếp — ${w.all} dồn sức chinh phạt!` : 'Chưa chinh phục · sương mù che phủ'}
          </p>
        )}
      </div>
    </motion.div>
  )
}

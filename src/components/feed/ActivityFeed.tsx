import { motion } from 'motion/react'
import { useGuild, useMemberMap } from '@/store/guild'
import { timeAgo } from '@/lib/utils'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { ACTIVITY_META } from './activityMeta'

/** Dòng thời gian hoạt động bang hội */
export function ActivityFeed({ limit = 10 }: { limit?: number }) {
  const activities = useGuild((s) => s.activities)
  const members = useMemberMap()
  return (
    <ol className="relative space-y-1">
      <span aria-hidden className="absolute bottom-3 left-[19px] top-3 w-px bg-gradient-to-b from-gold/40 via-line to-transparent" />
      {activities.slice(0, limit).map((a, i) => {
        const meta = ACTIVITY_META[a.type]
        const m = a.memberId ? members[a.memberId] : undefined
        return (
          <motion.li
            key={a.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.03 * i }}
            className="relative flex gap-3 rounded-xl px-1 py-2"
          >
            <span
              className="han relative z-[1] grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-[17px]"
              style={{ background: `color-mix(in oklab, ${meta.color} 14%, var(--surface-solid))`, borderColor: `${meta.color}55`, color: meta.color }}
            >
              {meta.han}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] leading-snug text-ink-2">{a.text}</p>
              <p className="mt-0.5 text-[11px] text-muted">
                <span style={{ color: meta.color }}>{meta.label}</span> · {timeAgo(a.date)}
              </p>
            </div>
            {m && <ChibiAvatar look={m.look} classId={m.classId} rank={m.rank} size={30} className="mt-1" />}
          </motion.li>
        )
      })}
    </ol>
  )
}

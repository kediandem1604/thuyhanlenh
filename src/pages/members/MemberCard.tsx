import { useState } from 'react'
import { Link } from 'react-router'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { Flame } from 'lucide-react'
import { Chibi } from '@/components/chibi/Chibi'
import { ClassBadge, RankSeal, RoleIcon, StatusDot } from '@/components/ui/Badges'
import { CLASSES, STATUS } from '@/domain/constants'
import type { Member } from '@/domain/types'
import { alpha } from '@/lib/color'
import { fmt } from '@/lib/utils'

/** Thẻ môn hạ: chibi trên hào quang lưu phái, nghiêng 3D khi rê chuột */
export function MemberCard({ member, index }: { member: Member; index: number }) {
  const [hover, setHover] = useState(false)
  const cls = CLASSES[member.classId]
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 220, damping: 20 })
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 220, damping: 20 })

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }
  const onLeave = () => {
    mx.set(0)
    my.set(0)
    setHover(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.025, 0.45) }}
      style={{ perspective: 900 }}
    >
      <motion.div
        onMouseMove={onMove}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={onLeave}
        whileHover={{ y: -4 }}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="panel panel-hover h-full overflow-hidden !p-0"
      >
        <Link to={`/thanh-vien/${member.id}`} className="block h-full" aria-label={`Hồ sơ ${member.name}`}>
          {/* khung chibi ngoài màn hình: trình duyệt bỏ qua dựng hình (vốn đã overflow-hidden nên không đổi gì khi nhìn) */}
          <div
            className="relative h-[150px] overflow-hidden [content-visibility:auto] sm:h-[172px]"
            style={{
              background: `radial-gradient(circle at 50% 70%, ${alpha(cls.palette.accent, hover ? 0.42 : 0.28)}, ${alpha(cls.palette.robeDark, 0.18)} 55%, transparent 82%)`,
              transition: 'background .4s ease',
            }}
          >
            <span className="han pointer-events-none absolute -right-2 -top-4 select-none text-[96px] leading-none opacity-[0.09] sm:text-[110px]" style={{ color: cls.palette.accent }}>
              {cls.han[0]}
            </span>
            <div className="absolute left-2.5 top-2.5 z-[1]">
              <RankSeal rank={member.rank} member={member} size="sm" withName={false} />
            </div>
            <div className="absolute right-3 top-3 z-[1]" title={STATUS[member.status].name}>
              <StatusDot status={member.status} />
            </div>
            <div className="absolute inset-x-0 -bottom-2 flex origin-bottom scale-[0.88] justify-center sm:scale-100">
              <Chibi look={member.look} classId={member.classId} size={134} animated={hover} effects={hover} title={member.name} className="drop-shadow-[0_10px_14px_rgba(0,0,0,.35)]" />
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--surface-solid)] to-transparent opacity-70" />
          </div>

          <div className="relative px-3.5 pb-3.5 pt-2.5">
            <div className="truncate text-[14.5px] font-bold text-ink">{member.name}</div>
            <div className="truncate text-[11.5px] italic text-muted">{member.title}</div>
            <div className="mt-2 flex items-center gap-1.5">
              <ClassBadge classId={member.classId} className="!h-[22px] !px-2 !text-[11px]" />
              <RoleIcon role={cls.role} size={13} />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[12px]">
              <span className="inline-flex items-center gap-1 text-muted">
                <Flame size={12} className="text-gold" /> Chiến lực
              </span>
              <span className="font-bold tabular-nums text-ink">{fmt(member.power)}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2" title={`Độ sôi nổi ${member.activity}/100`}>
              <div className="progress-track flex-1" style={{ height: 5 }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${member.activity}%`, background: `linear-gradient(90deg, ${alpha(cls.palette.accent, 0.55)}, ${cls.palette.accent})` }}
                />
              </div>
              <span className="w-6 text-right text-[10.5px] tabular-nums text-muted">{member.activity}</span>
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  )
}

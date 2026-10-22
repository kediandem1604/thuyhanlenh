import { Link } from 'react-router'
import { CLASSES, RANKS } from '@/domain/constants'
import type { ChibiLook, ClassId, Member, MemberStatus, RankId } from '@/domain/types'
import { alpha } from '@/lib/color'
import { cn } from '@/lib/utils'
import { rankLabel } from '@/store/guild'
import { StatusDot } from '@/components/ui/Badges'
import { Chibi } from './Chibi'

/** Ảnh đại diện tròn: chibi cắt nửa người trong khung viền màu chức vụ */
export function ChibiAvatar({
  look,
  classId,
  size = 44,
  rank,
  status,
  className,
  animated = false,
}: {
  look: ChibiLook
  classId: ClassId
  size?: number
  rank?: RankId
  status?: MemberStatus
  className?: string
  animated?: boolean
}) {
  const ring = rank ? RANKS[rank].color : CLASSES[classId].palette.accent
  return (
    <span className={cn('relative inline-block shrink-0', className)} style={{ width: size, height: size }}>
      <span
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 35%, ${alpha(CLASSES[classId].palette.accent, 0.35)}, ${alpha(CLASSES[classId].palette.robeDark, 0.9)} 80%)`,
          boxShadow: `0 0 0 1.5px ${alpha(ring, 0.85)}, 0 4px 14px -6px ${alpha(ring, 0.8)}`,
        }}
      >
        <Chibi look={look} classId={classId} size={size * 1.12} variant="bust" animated={animated} effects={false} showProp={false} className="-ml-[6%] mt-[4%]" />
      </span>
      {status && <StatusDot status={status} className="absolute bottom-0 right-0" />}
    </span>
  )
}

/** Avatar + tên + phụ đề (mặc định: lưu phái · chức vụ / danh xưng Kim Lan), bấm vào mở hồ sơ */
export function MemberChip({
  member,
  size = 36,
  sub,
  link = true,
  className,
}: {
  member: Pick<Member, 'id' | 'name' | 'look' | 'classId' | 'rank' | 'status' | 'honorific'>
  size?: number
  sub?: React.ReactNode
  link?: boolean
  className?: string
}) {
  const body = (
    <>
      <ChibiAvatar look={member.look} classId={member.classId} rank={member.rank} status={member.status} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-semibold text-ink group-hover:text-gold">{member.name}</span>
        <span className="block truncate text-[11.5px] text-muted">{sub ?? `${CLASSES[member.classId].name} · ${rankLabel(member)}`}</span>
      </span>
    </>
  )
  return link ? (
    <Link to={`/thanh-vien/${member.id}`} className={cn('group inline-flex min-w-0 items-center gap-2.5', className)}>
      {body}
    </Link>
  ) : (
    <span className={cn('inline-flex min-w-0 items-center gap-2.5', className)}>{body}</span>
  )
}

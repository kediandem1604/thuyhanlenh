import { Flame, Swords, Target, Users } from 'lucide-react'
import { useFeature, useGuild } from '@/store/guild'
import { cn, fmtCompact } from '@/lib/utils'
import { StatCard } from '@/components/ui/StatCard'
import { HeroBanner } from './HeroBanner'
import { useOrgWords } from './orgWords'
import {
  ActivityPanel,
  Announcements,
  ClassDistribution,
  DungeonWidget,
  MentorWidget,
  PowerTrend,
  UpcomingEvents,
  WeeklyHonor,
  useDungeonSummary,
  useKpi,
} from './widgets'

/** Bang Hội Đường — tổng quan đầy đủ của một bang hội */
export function GuildDashboard() {
  const members = useGuild((s) => s.members)
  const w = useOrgWords()
  const kpi = useKpi()
  const { pct } = useDungeonSummary()
  const hasLich = useFeature('lich')
  const hasDungeon = useFeature('pho-ban')
  const hasTreasury = useFeature('bang-kho')
  const hasMentor = useFeature('su-do')

  const cards = [
    <StatCard key="m" index={0} icon={Users} label={w.Member} value={members.length} hint={`${kpi.online} đang hoạt động`} color="#6fa8ff" />,
    <StatCard key="p" index={1} icon={Flame} label="Chiến lực TB" value={kpi.avg} format={fmtCompact} delta={kpi.delta} hint="so với tuần trước" color="#d8b46a" />,
    hasDungeon && (
      <StatCard key="d" index={2} icon={Swords} label="Tiến độ phó bản" value={pct} format={(n) => `${Math.round(n)}`} suffix="%" hint={`${kpi.clearsWeek} lượt clear tuần này`} color="#5ec7b0" />
    ),
    hasTreasury && <StatCard key="c" index={3} icon={Target} label="Cống hiến tuần" value={kpi.weekly} format={fmtCompact} hint={`tổng ${w.all}`} color="#e0523f" />,
  ].filter(Boolean)

  const middle = [hasDungeon && <DungeonWidget key="d" />, hasTreasury && <WeeklyHonor key="h" />, <Announcements key="a" />].filter(Boolean)

  return (
    <div className="space-y-6">
      <HeroBanner />

      <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', cards.length >= 4 && 'xl:grid-cols-4', cards.length === 3 && 'xl:grid-cols-3')}>{cards}</div>

      <div className={cn('grid grid-cols-1 gap-6', hasLich && 'xl:grid-cols-[1.6fr_1fr]')}>
        <PowerTrend />
        {hasLich && <UpcomingEvents subtitle="Hoạt động bang trong những ngày tới" />}
      </div>

      <div className={cn('grid grid-cols-1 gap-6 lg:grid-cols-2', middle.length >= 3 && '2xl:grid-cols-3')}>{middle}</div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <ActivityPanel title="Nhật ký bang hội" />
        <div className="space-y-6">
          <ClassDistribution />
          {hasMentor && <MentorWidget />}
        </div>
      </div>
    </div>
  )
}

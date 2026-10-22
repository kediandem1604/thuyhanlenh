import { useOrgType } from '@/store/guild'
import { GuildDashboard } from './GuildDashboard'
import { KimLanDashboard } from './KimLanDashboard'
import { TeamDashboard } from './TeamDashboard'

/** Trang tổng quan — mỗi loại tổ chức một bố cục riêng */
export default function DashboardPage() {
  const type = useOrgType()
  if (type === 'kimlan') return <KimLanDashboard />
  if (type === 'team') return <TeamDashboard />
  return <GuildDashboard />
}

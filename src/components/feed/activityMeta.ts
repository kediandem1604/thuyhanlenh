import type { ActivityType } from '@/domain/types'

export const ACTIVITY_META: Record<ActivityType, { han: string; color: string; label: string }> = {
  join: { han: '迎', color: '#6fa8ff', label: 'Gia nhập' },
  clear: { han: '征', color: '#5ec7b0', label: 'Phó bản' },
  'first-kill': { han: '首', color: '#e0523f', label: 'First kill' },
  mentor: { han: '师', color: '#a08cf5', label: 'Sư đồ' },
  graduate: { han: '成', color: '#d8b46a', label: 'Xuất sư' },
  bond: { han: '缘', color: '#f2a7bf', label: 'Tình duyên' },
  war: { han: '战', color: '#e0523f', label: 'Bang chiến' },
  loot: { han: '宝', color: '#f3c969', label: 'Chiến lợi phẩm' },
  promote: { han: '升', color: '#f08a4b', label: 'Thăng chức' },
  achievement: { han: '勋', color: '#d8b46a', label: 'Thành tựu' },
  donate: { han: '捐', color: '#5ec7b0', label: 'Quyên góp' },
  event: { han: '事', color: '#8d93a8', label: 'Sự kiện' },
}

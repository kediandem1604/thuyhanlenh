// Cách gọi theo loại tổ chức (bang / Kim Lan / team) cho các trang tổng quan, chinh chiến, vinh quang.
import { useMemo } from 'react'
import { ORG_TYPES } from '@/domain/orgs'
import type { OrgType } from '@/domain/types'
import { useOrg, useOrgType } from '@/store/guild'

export interface OrgWords {
  type: OrgType
  /** tên tổ chức đang xem, vd "Kinh Hồng Các" */
  name: string
  /** gọi tắt trong câu: "bang" · "Kim Lan" · "team" */
  short: string
  /** "cả bang" · "cả nhà" · "cả team" */
  all: string
  /** một thành viên: "môn hạ" · "huynh đệ" · "thành viên" */
  member: string
  /** viết hoa chữ đầu: "Môn hạ" · "Huynh đệ" · "Thành viên" */
  Member: string
  /** tên trang chính: "Bang Hội Đường" · "Kim Lan Đường" · "Tổng Quan Team" */
  home: string
  /** người không còn trong tổ chức */
  left: string
}

const BASE: Record<OrgType, Omit<OrgWords, 'type' | 'name' | 'member' | 'Member'>> = {
  guild: { short: 'bang', all: 'cả bang', home: 'Bang Hội Đường', left: 'Đã rời bang' },
  kimlan: { short: 'Kim Lan', all: 'cả nhà', home: 'Kim Lan Đường', left: 'Đã rời Kim Lan' },
  team: { short: 'team', all: 'cả team', home: 'Tổng Quan Team', left: 'Đã rời team' },
}

export function orgWords(type: OrgType, name?: string | null): OrgWords {
  const member = ORG_TYPES[type].memberWord
  return {
    type,
    name: name || ORG_TYPES[type].name,
    member,
    Member: member.charAt(0).toUpperCase() + member.slice(1),
    ...BASE[type],
  }
}

/** Cách gọi của tổ chức đang xem */
export function useOrgWords(): OrgWords {
  const type = useOrgType()
  const name = useOrg()?.name
  return useMemo(() => orgWords(type, name), [type, name])
}

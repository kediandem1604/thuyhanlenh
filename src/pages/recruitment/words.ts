import { ORG_TYPES } from '@/domain/orgs'
import type { OrgType } from '@/domain/types'

/** Cách gọi tổ chức / người mới trong câu ở trang Chiêu Mộ, theo loại tổ chức */
export function recruitWords(type: OrgType) {
  const info = ORG_TYPES[type]
  return {
    /** "bang", "team", "Kim Lan" */
    org: type === 'guild' ? 'bang' : type === 'kimlan' ? 'Kim Lan' : 'team',
    /** "môn hạ", "thành viên", "huynh đệ" */
    member: info.memberWord,
    /** người mới được nhận: "tân binh", "thành viên mới"… */
    newcomer: type === 'guild' ? 'tân binh' : `${info.memberWord} mới`,
    /** người đứng đầu, viết thường để chèn vào câu */
    leader: type === 'guild' ? 'bang chủ' : type === 'kimlan' ? 'Đại ca' : 'trưởng nhóm',
  }
}

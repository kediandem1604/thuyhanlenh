// Dàn nhân vật mẫu cho các khung minh họa — tên hư cấu, ngoại hình sinh cố định từ hạt giống.
import { lookFromSeed } from '@/data/seed'
import { CLASSES } from '@/domain/constants'
import type { ChibiLook, ClassId, CombatRole, Gender } from '@/domain/types'

export interface SampleHero {
  id: string
  name: string
  classId: ClassId
  gender: Gender
  look: ChibiLook
  role: CombatRole
}

function hero(id: string, name: string, classId: ClassId, gender: Gender, tweak?: Partial<ChibiLook>): SampleHero {
  return { id, name, classId, gender, look: { ...lookFromSeed(`landing-${id}`, classId, gender), ...tweak }, role: CLASSES[classId].role }
}

export const CAST = {
  thanhY: hero('thanh-y', 'Lạc Thanh Y', 'to-van', 'nu', { mood: 'cute', expression: 'happy' }),
  hanPhong: hero('han-phong', 'Mộ Hàn Phong', 'thiet-y', 'nam', { mood: 'cool', expression: 'calm' }),
  vanKhe: hero('van-khe', 'Bạch Vân Khê', 'long-ngam', 'nu', { mood: 'romantic', expression: 'smile' }),
  tieuDao: hero('tieu-dao', 'Tiêu Dao Khách', 'than-tuong', 'nam', { mood: 'romantic', expression: 'smile' }),
  huyetAnh: hero('huyet-anh', 'Huyết Ảnh', 'huyet-ha', 'nam', { mood: 'cool', expression: 'smirk' }),
  daVu: hero('da-vu', 'Dạ Vũ', 'toai-mong', 'nam'),
  linhNhi: hero('linh-nhi', 'Linh Nhi', 'cuu-linh', 'nu', { mood: 'cute', expression: 'grin' }),
  toMac: hero('to-mac', 'Tô Mặc Nhiên', 'than-tuong', 'nu'),
  kiemTam: hero('kiem-tam', 'Kiếm Tâm', 'long-ngam', 'nam'),
  hoaRu: hero('hoa-ru', 'Hoa Rũ', 'to-van', 'nu'),
  thietCot: hero('thiet-cot', 'Thiết Cốt', 'thiet-y', 'nam'),
  vanTieu: hero('van-tieu', 'Vân Tiêu', 'cuu-linh', 'nu'),
} satisfies Record<string, SampleHero>

/** Bộ ba ở đầu trang: trái · giữa (to nhất) · phải */
export const HERO_TRIO: SampleHero[] = [CAST.tieuDao, CAST.thanhY, CAST.huyetAnh]

/** Tổ 6 người đang bày (ô cuối bỏ trống) */
export const PARTY: (SampleHero | null)[] = [CAST.hanPhong, CAST.thanhY, CAST.huyetAnh, CAST.vanKhe, CAST.daVu, null]

/** Kim Lan 9/12 — thứ tự theo ghế */
export const KIMLAN: SampleHero[] = [
  CAST.hanPhong,
  CAST.vanKhe,
  CAST.tieuDao,
  CAST.toMac,
  CAST.kiemTam,
  CAST.hoaRu,
  CAST.daVu,
  CAST.vanTieu,
  CAST.linhNhi,
]

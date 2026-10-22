import { HAIR_COLORS } from '@/data/seed'
import type { Expression, Gender, Mood } from '@/domain/types'

export const GENDERS: { value: Gender; label: string }[] = [
  { value: 'nu', label: 'Nữ' },
  { value: 'nam', label: 'Nam' },
]

export const BANGS = ['Mái bằng', 'Mái lệch', 'Mái nhọn', 'Mái rèm']

export const BACK_HAIR = ['Xõa dài', 'Búi đôi', 'Đuôi ngựa cao', 'Búi nửa đầu', 'Tóc ngắn']

export const HAIR_SWATCHES: { value: string; label: string }[] = [
  { value: HAIR_COLORS.black, label: 'Mực đen' },
  { value: HAIR_COLORS.brown, label: 'Nâu trầm' },
  { value: HAIR_COLORS.chestnut, label: 'Hạt dẻ' },
  { value: HAIR_COLORS.silver, label: 'Bạch kim' },
  { value: HAIR_COLORS.white, label: 'Tuyết trắng' },
  { value: HAIR_COLORS.ink, label: 'Lam mực' },
  { value: HAIR_COLORS.wine, label: 'Rượu vang' },
  { value: HAIR_COLORS.gold, label: 'Kim sắc' },
  { value: HAIR_COLORS.pink, label: 'Đào hồng' },
  { value: HAIR_COLORS.violet, label: 'Tử đằng' },
]

export const EYE_SWATCHES: { value: string; label: string }[] = [
  { value: '#3b2a20', label: 'Nâu đen' },
  { value: '#7a3b2a', label: 'Hổ phách' },
  { value: '#2f5aa8', label: 'Lam ngọc' },
  { value: '#3d9e8d', label: 'Bích ngọc' },
  { value: '#a03048', label: 'Huyết dụ' },
  { value: '#7b5cc8', label: 'Tử tinh' },
  { value: '#c9902f', label: 'Hoàng kim' },
  { value: '#1f6f8b', label: 'Thu thủy' },
  { value: '#c0392b', label: 'Chu sa' },
  { value: '#ff9ec4', label: 'Hoa đào' },
  { value: '#52d6c8', label: 'Long lân' },
]

export const SKIN_SWATCHES: { value: string; label: string }[] = [
  { value: '#fff0e4', label: 'Trắng sứ' },
  { value: '#fde8d8', label: 'Hồng phấn' },
  { value: '#fbe4d5', label: 'Ngà' },
  { value: '#f9ddc8', label: 'Mật ong nhạt' },
  { value: '#f4d0b6', label: 'Bánh mật' },
  { value: '#e7bc98', label: 'Rám nắng' },
]

export const EXPRESSIONS: { value: Expression; label: string }[] = [
  { value: 'smile', label: 'Mỉm cười' },
  { value: 'grin', label: 'Cười tươi' },
  { value: 'happy', label: 'Híp mắt cười' },
  { value: 'wink', label: 'Nháy mắt' },
  { value: 'shy', label: 'E thẹn' },
  { value: 'calm', label: 'Điềm tĩnh' },
  { value: 'smirk', label: 'Nhếch mép' },
  { value: 'sleepy', label: 'Lim dim' },
]

export const MOODS: { value: Mood; label: string; desc: string }[] = [
  { value: 'cute', label: 'Dễ thương', desc: 'Lấp lánh sao' },
  { value: 'cool', label: 'Ngầu', desc: 'Gió cuốn bên người' },
  { value: 'romantic', label: 'Lãng mạn', desc: 'Tim và hoa đào' },
]

export const ACCESSORIES: { label: string; hint: string }[] = [
  { label: 'Mặc định', hint: 'Chỉ dấu ấn lưu phái' },
  { label: 'Trâm tua rua', hint: 'Trâm cài có tua lắc lư' },
  { label: 'Hoa cài', hint: 'Dành cho nhân vật nữ' },
  { label: 'Nơ buộc tóc', hint: 'Hợp với đuôi ngựa cao' },
]

export const PRESETS: { name: string; seed: string; gender: Gender; mood: Mood; expression: Expression }[] = [
  { name: 'Thiếu hiệp phong lưu', seed: 'preset-thieu-hiep', gender: 'nam', mood: 'romantic', expression: 'smile' },
  { name: 'Tiểu sư muội', seed: 'preset-su-muoi', gender: 'nu', mood: 'cute', expression: 'happy' },
  { name: 'Sát thủ lạnh lùng', seed: 'preset-sat-thu', gender: 'nam', mood: 'cool', expression: 'calm' },
  { name: 'Tiên tử thoát tục', seed: 'preset-tien-tu', gender: 'nu', mood: 'romantic', expression: 'shy' },
  { name: 'Lãng khách giang hồ', seed: 'preset-lang-khach', gender: 'nam', mood: 'cool', expression: 'smirk' },
  { name: 'Đáng yêu vô địch', seed: 'preset-dang-yeu', gender: 'nu', mood: 'cute', expression: 'wink' },
]

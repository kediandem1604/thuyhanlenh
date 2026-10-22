import { BookOpen, Gem, Shield, Shirt, Sword, type LucideIcon } from 'lucide-react'
import type { LootItem, Rarity } from '@/domain/types'

export const KIND_META: Record<LootItem['kind'], { name: string; icon: LucideIcon }> = {
  'vu-khi': { name: 'Vũ khí', icon: Sword },
  'trang-bi': { name: 'Trang bị', icon: Shield },
  'bi-kip': { name: 'Bí kíp', icon: BookOpen },
  'ngoai-trang': { name: 'Ngoại trang', icon: Shirt },
  'nguyen-lieu': { name: 'Nguyên liệu', icon: Gem },
}

export const START_PRICE: Record<Rarity, number> = { lam: 100, tu: 400, kim: 1200, hong: 3000 }

export function bidStep(item: Pick<LootItem, 'startPrice'>) {
  return Math.max(10, Math.round(item.startPrice / 10))
}

/** Giá cao nhất hiện tại (hoặc giá khởi điểm nếu chưa ai trả) */
export function currentPrice(item: LootItem) {
  return item.bids.at(-1)?.amount ?? item.startPrice
}

/** Mức tối thiểu cho lượt trả giá kế tiếp */
export function minNextBid(item: LootItem) {
  const top = item.bids.at(-1)?.amount
  return top === undefined ? item.startPrice : top + bidStep(item)
}

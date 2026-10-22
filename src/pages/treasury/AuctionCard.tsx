import { motion } from 'motion/react'
import { Clock, Gavel, Hammer, MapPin } from 'lucide-react'
import { RARITY } from '@/domain/constants'
import type { LootItem, Member } from '@/domain/types'
import { RarityTag } from '@/components/ui/Badges'
import { Countdown } from '@/components/ui/Countdown'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { fmt } from '@/lib/utils'
import { KIND_META, currentPrice } from './lootMeta'

export function LootIcon({ item, size = 56 }: { item: Pick<LootItem, 'kind' | 'rarity'>; size?: number }) {
  const r = RARITY[item.rarity]
  const Icon = KIND_META[item.kind].icon
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-2xl"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${r.color} 55%, transparent), color-mix(in oklab, ${r.color} 12%, var(--surface-solid)) 75%)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${r.color} 60%, transparent), 0 0 22px -6px ${r.glow}`,
        // pha màu phẩm chất với màu chữ: sáng trên nền tối, đậm trên nền giấy
        color: `color-mix(in oklab, ${r.color} 55%, var(--text))`,
      }}
    >
      <Icon size={size * 0.42} strokeWidth={1.9} style={{ filter: `drop-shadow(0 0 5px ${r.glow})` }} />
    </span>
  )
}

export function AuctionCard({
  item,
  members,
  now,
  index,
  onBid,
  onClose,
  canClose = true,
  closeHint,
  closing = false,
}: {
  item: LootItem
  members: Record<string, Member>
  now: number
  index: number
  onBid: () => void
  onClose: () => void
  /** người xem có quyền chốt phiên không */
  canClose?: boolean
  closeHint?: string
  closing?: boolean
}) {
  const r = RARITY[item.rarity]
  const top = item.bids.at(-1)
  const bidder = top ? members[top.memberId] : undefined
  const expired = new Date(item.endsAt).getTime() <= now

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.05 }}
      className="panel panel-hover relative flex flex-col overflow-hidden p-4"
      style={{ borderColor: `color-mix(in oklab, ${r.color} 40%, transparent)`, boxShadow: `var(--shadow), 0 0 30px -14px ${r.glow}` }}
    >
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full blur-2xl" style={{ background: r.glow }} />
      <div className="relative flex gap-3">
        <LootIcon item={item} />
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-2 text-[14.5px] font-bold leading-snug text-ink">{item.name}</h4>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <RarityTag rarity={item.rarity} />
            <span className="chip !h-6">{KIND_META[item.kind].name}</span>
          </div>
        </div>
      </div>
      <div className="relative mt-2 flex items-center gap-1 text-[11.5px] text-muted">
        <MapPin size={12} /> {item.source}
      </div>

      <div className="relative mt-3 grid grid-cols-2 gap-2 rounded-xl border border-line bg-black/10 p-3">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted">{top ? 'Giá cao nhất' : 'Khởi điểm'}</div>
          <div className="title-display text-[24px] tabular-nums text-ink">{fmt(currentPrice(item))}</div>
          <div className="text-[11px] text-muted">{item.bids.length} lượt trả giá</div>
        </div>
        <div className="min-w-0">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted">Người dẫn đầu</div>
          {bidder ? (
            <div className="mt-1 flex items-center gap-2">
              <ChibiAvatar look={bidder.look} classId={bidder.classId} rank={bidder.rank} size={28} />
              <span className="truncate text-[12.5px] font-semibold text-ink">{bidder.name}</span>
            </div>
          ) : (
            <div className="mt-1.5 text-[12.5px] text-muted">Chưa có ai</div>
          )}
        </div>
      </div>

      <div className="relative mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: expired ? 'var(--cinnabar)' : 'var(--text-2)' }}>
          <Clock size={13} />
          {expired ? 'Hết giờ · máy chủ đang chốt' : <Countdown to={item.endsAt} compact />}
        </span>
        <div className="flex gap-1.5">
          {!expired && (
            <button className="btn btn-gold btn-sm" onClick={onBid}>
              <Gavel size={14} /> Ra giá
            </button>
          )}
          {canClose ? (
            <button className="btn btn-sm" onClick={onClose} disabled={closing} title="Kết thúc phiên và trao vật phẩm cho người trả giá cao nhất">
              <Hammer size={14} /> {closing ? 'Đang chốt…' : 'Chốt'}
            </button>
          ) : (
            // bọc span để title vẫn hiện khi nút bị khóa
            <span title={closeHint}>
              <button className="btn btn-sm" disabled aria-label={`Chốt phiên — ${closeHint ?? ''}`}>
                <Hammer size={14} /> Chốt
              </button>
            </span>
          )}
        </div>
      </div>
    </motion.article>
  )
}

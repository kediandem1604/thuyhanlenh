import { useEffect, useMemo, useState } from 'react'
import { Gavel, Lock } from 'lucide-react'
import { Modal, Field } from '@/components/ui/Modal'
import { RarityTag } from '@/components/ui/Badges'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import type { LootItem } from '@/domain/types'
import { useCan, useGuild, useOrgType } from '@/store/guild'
import { toast } from '@/store/ui'
import { cn, fmt } from '@/lib/utils'
import { LootIcon } from './AuctionCard'
import { bidStep, currentPrice, minNextBid } from './lootMeta'
import { permHint } from '@/domain/permissions'

export function BidModal({ item: openItem, onClose }: { item: LootItem | null; onClose: () => void }) {
  const members = useGuild((s) => s.members)
  const loot = useGuild((s) => s.loot)
  const currentUserId = useGuild((s) => s.currentUserId)
  const placeBid = useGuild((s) => s.placeBid)
  // ra giá thay người khác chỉ dành cho người có quyền chốt phiên
  const canProxy = useCan('loot.close')
  const orgType = useOrgType()
  const [bidderId, setBidderId] = useState(currentUserId)
  const [amount, setAmount] = useState(0)
  const [busy, setBusy] = useState(false)
  // giữ vật phẩm cuối cùng để hộp thoại vẫn có nội dung khi đang đóng (hiệu ứng thoát)
  const [last, setLast] = useState<LootItem | null>(openItem)

  useEffect(() => {
    if (openItem) {
      setLast(openItem)
      setBidderId(currentUserId)
      setAmount(minNextBid(openItem))
    }
  }, [openItem, currentUserId])

  const sorted = useMemo(() => [...members].sort((a, b) => a.name.localeCompare(b.name, 'vi')), [members])
  const item = openItem ?? last
  const effectiveBidder = canProxy ? bidderId : currentUserId
  const bidder = members.find((m) => m.id === effectiveBidder)

  // điểm đang "giữ chỗ" ở các phiên khác mà người này dẫn giá — server cũng trừ phần này
  const committed = useMemo(() => {
    if (!item) return 0
    let total = 0
    for (const l of loot) {
      if (l.status !== 'auction' || l.id === item.id) continue
      const top = l.bids.reduce<LootItem['bids'][number] | undefined>((best, b) => (!best || b.amount > best.amount ? b : best), undefined)
      if (top?.memberId === effectiveBidder) total += top.amount
    }
    return total
  }, [loot, item, effectiveBidder])

  if (!item) return null

  const step = bidStep(item)
  const min = minNextBid(item)
  const available = (bidder?.contribution ?? 0) - committed
  const short = bidder ? amount > available : false

  const submit = async () => {
    if (!bidder || busy) return
    setBusy(true)
    const res = await placeBid(item.id, bidder.id, amount)
    setBusy(false)
    if (res.ok) {
      toast({ tone: 'gold', title: 'Đã ra giá', desc: `${bidder.name} trả ${fmt(amount)} cống hiến cho ${item.name}` })
      onClose()
    } else {
      toast({ tone: 'error', title: 'Không thể ra giá', desc: res.error })
    }
  }

  return (
    <Modal
      open={!!openItem}
      onClose={onClose}
      title="Ra giá đấu"
      han="拍"
      subtitle="Dùng điểm cống hiến để tranh bảo vật"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-gold" onClick={submit} disabled={!bidder || short || amount < min || busy}>
            <Gavel size={16} /> {busy ? 'Đang gửi…' : `Xác nhận ${fmt(amount)}`}
          </button>
        </>
      }
    >
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-line bg-black/10 p-3">
        <LootIcon item={item} size={52} />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold text-ink">{item.name}</div>
          <div className="mt-1 flex items-center gap-2 text-[12px] text-muted">
            <RarityTag rarity={item.rarity} />
            Hiện tại: <b className="text-ink">{fmt(currentPrice(item))}</b>
          </div>
        </div>
      </div>

      {canProxy ? (
        <Field label="Người ra giá" hint="Bạn có quyền ra giá thay thành viên khác.">
          <select className="field" value={bidderId} onChange={(e) => setBidderId(e.target.value)}>
            {sorted.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.id === currentUserId ? ' (bạn)' : ''} — {fmt(m.contribution)} cống hiến
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <div>
          <span className="label">Người ra giá</span>
          <div className="flex items-center gap-2 text-[12px] text-muted" title={permHint('loot.close', orgType) + ' để ra giá thay người khác'}>
            <Lock size={12} /> Bạn ra giá cho chính mình
          </div>
        </div>
      )}
      {bidder && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted">
          <ChibiAvatar look={bidder.look} classId={bidder.classId} rank={bidder.rank} size={24} />
          <span className="font-semibold text-ink">{bidder.name}</span>· Khả dụng:{' '}
          <b className={cn('tabular-nums', short ? 'text-cinnabar' : 'text-jade')}>{fmt(Math.max(0, available))}</b>
          {committed > 0 && <span>(đang giữ {fmt(committed)} ở phiên khác)</span>}
          {short && <span className="text-cinnabar">· không đủ điểm</span>}
        </div>
      )}

      <Field label={`Giá trả (tối thiểu ${fmt(min)}, bước giá ${fmt(step)})`} className="mt-4">
        <input
          type="number"
          className="field tabular-nums"
          min={min}
          step={step}
          value={amount}
          onChange={(e) => setAmount(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
        />
      </Field>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[1, 2, 5, 10].map((k) => (
          <button key={k} className="btn btn-sm" onClick={() => setAmount(min + step * (k - 1))}>
            {k === 1 ? 'Tối thiểu' : `+${fmt(step * (k - 1))}`}
          </button>
        ))}
      </div>
    </Modal>
  )
}

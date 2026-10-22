import { useEffect, useMemo, useState } from 'react'
import { PackagePlus, Scale } from 'lucide-react'
import { Modal, Field } from '@/components/ui/Modal'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { DUNGEONS, RARITY } from '@/domain/constants'
import type { LootItem, Rarity } from '@/domain/types'
import { useGuild } from '@/store/guild'
import { toast } from '@/store/ui'
import { cn, fmt } from '@/lib/utils'
import { KIND_META, START_PRICE } from './lootMeta'
import { LootIcon } from './AuctionCard'

/* ---------------- Thêm vật phẩm đấu giá ---------------- */

export function AddLootModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addLoot = useGuild((s) => s.addLoot)
  const [name, setName] = useState('')
  const [rarity, setRarity] = useState<Rarity>('kim')
  const [kind, setKind] = useState<LootItem['kind']>('trang-bi')
  const [source, setSource] = useState(DUNGEONS[DUNGEONS.length - 1].name)
  const [price, setPrice] = useState(START_PRICE.kim)
  const [hours, setHours] = useState(24)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setRarity('kim')
      setKind('trang-bi')
      setSource(DUNGEONS[DUNGEONS.length - 1].name)
      setPrice(START_PRICE.kim)
      setHours(24)
    }
  }, [open])

  const submit = async () => {
    if (busy) return
    const n = name.trim()
    if (n.length < 2) return toast({ tone: 'error', title: 'Tên vật phẩm quá ngắn' })
    if (n.length > 60) return toast({ tone: 'error', title: 'Tên vật phẩm tối đa 60 ký tự' })
    if (price < 1 || price > 1_000_000) return toast({ tone: 'error', title: 'Giá khởi điểm từ 1 đến 1.000.000' })
    if (hours < 1 || hours > 168) return toast({ tone: 'error', title: 'Thời lượng từ 1 đến 168 giờ' })
    setBusy(true)
    const res = await addLoot({ name: n, rarity, kind, source, startPrice: Math.floor(price), endsAt: new Date(Date.now() + hours * 3600000).toISOString() })
    setBusy(false)
    if (!res.ok) return toast({ tone: 'error', title: 'Chưa mở được phiên', desc: res.error })
    toast({ tone: 'gold', title: 'Đã mở phiên đấu giá', desc: `${n} · kết thúc sau ${hours} giờ` })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm vật phẩm"
      han="宝"
      subtitle="Mở một phiên đấu giá mới bằng điểm cống hiến"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-gold" onClick={submit} disabled={busy}>
            <PackagePlus size={16} /> {busy ? 'Đang mở…' : 'Mở phiên'}
          </button>
        </>
      }
    >
      <div className="mb-4 flex items-center gap-3">
        <LootIcon item={{ kind, rarity }} size={56} />
        <div className="text-[12.5px] text-muted">Xem trước khung bảo vật theo phẩm chất và loại.</div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên vật phẩm" className="sm:col-span-2">
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Ngọc Bội Long Văn" autoFocus />
        </Field>
        <Field label="Phẩm chất">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(RARITY) as Rarity[]).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRarity(r)
                  setPrice(START_PRICE[r])
                }}
                className={cn('chip !h-8 !px-3 transition', rarity === r && 'ring-1')}
                style={{ color: RARITY[r].color, borderColor: rarity === r ? RARITY[r].color : undefined, boxShadow: rarity === r ? `0 0 14px -4px ${RARITY[r].glow}` : undefined }}
              >
                {RARITY[r].name}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Loại">
          <select className="field" value={kind} onChange={(e) => setKind(e.target.value as LootItem['kind'])}>
            {(Object.keys(KIND_META) as LootItem['kind'][]).map((k) => (
              <option key={k} value={k}>
                {KIND_META[k].name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nguồn rơi">
          <select className="field" value={source} onChange={(e) => setSource(e.target.value)}>
            {DUNGEONS.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
            <option value="Boss Thế Giới">Boss Thế Giới</option>
            <option value="Quyên góp">Quyên góp</option>
          </select>
        </Field>
        <Field label="Giá khởi điểm">
          <input type="number" min={1} className="field tabular-nums" value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))} />
        </Field>
        <Field label="Thời lượng (giờ)" hint="Tối đa 7 ngày">
          <input type="number" min={1} max={168} className="field tabular-nums" value={hours} onChange={(e) => setHours(Math.max(0, Number(e.target.value) || 0))} />
        </Field>
      </div>
    </Modal>
  )
}

/* ---------------- Bút toán điều chỉnh ---------------- */

export function AdjustModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const members = useGuild((s) => s.members)
  const addLedger = useGuild((s) => s.addLedger)
  const currentUserId = useGuild((s) => s.currentUserId)
  const [memberId, setMemberId] = useState('')
  const [delta, setDelta] = useState(100)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const sorted = useMemo(() => [...members].sort((a, b) => a.name.localeCompare(b.name, 'vi')), [members])

  // chỉ đặt lại khi mở hộp thoại — snapshot realtime đổi `sorted` không được xóa form đang nhập
  useEffect(() => {
    if (open) {
      setMemberId((id) => (id && sorted.some((m) => m.id === id) ? id : (sorted[0]?.id ?? '')))
      setDelta(100)
      setReason('')
    }
  }, [open, sorted.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const member = members.find((m) => m.id === memberId)
  const after = (member?.contribution ?? 0) + delta
  const approver = members.find((m) => m.id === currentUserId)

  const submit = async () => {
    if (busy) return
    if (!member) return toast({ tone: 'error', title: 'Chưa chọn thành viên' })
    if (!Number.isFinite(delta) || delta === 0) return toast({ tone: 'error', title: 'Số điểm điều chỉnh phải khác 0' })
    if (Math.abs(delta) > 100000) return toast({ tone: 'error', title: 'Mức điều chỉnh quá lớn', desc: 'Tối đa ±100.000 mỗi bút toán.' })
    const why = reason.trim()
    if (why.length < 4) return toast({ tone: 'error', title: 'Hãy ghi rõ lý do điều chỉnh' })
    if (why.length > 120) return toast({ tone: 'error', title: 'Lý do tối đa 120 ký tự' })
    if (after < 0) return toast({ tone: 'error', title: 'Số dư sẽ bị âm', desc: `${member.name} chỉ còn ${fmt(member.contribution)} cống hiến.` })
    setBusy(true)
    // máy chủ tự ghi kèm người duyệt vào lý do
    const res = await addLedger({ memberId: member.id, delta: Math.trunc(delta), reason: why })
    setBusy(false)
    if (!res.ok) return toast({ tone: 'error', title: 'Chưa ghi được bút toán', desc: res.error })
    toast({ tone: 'success', title: 'Đã ghi bút toán', desc: `${member.name} ${delta > 0 ? '+' : ''}${fmt(delta)} cống hiến` })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Điều chỉnh cống hiến"
      han="账"
      subtitle="Ghi thêm một bút toán — sổ không bao giờ bị sửa hay xóa"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-gold" onClick={submit} disabled={busy}>
            <Scale size={16} /> {busy ? 'Đang ghi…' : 'Ghi sổ'}
          </button>
        </>
      }
    >
      <Field label="Thành viên">
        <select className="field" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          {sorted.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {fmt(m.contribution)}
            </option>
          ))}
        </select>
      </Field>
      {member && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-black/10 p-3 text-[12.5px]">
          <ChibiAvatar look={member.look} classId={member.classId} rank={member.rank} size={32} />
          <div className="flex-1">
            <div className="font-semibold text-ink">{member.name}</div>
            <div className="text-muted">
              Số dư: <b className="text-ink tabular-nums">{fmt(member.contribution)}</b> → <b className={cn('tabular-nums', after < 0 ? 'text-cinnabar' : 'text-jade')}>{fmt(after)}</b>
            </div>
          </div>
        </div>
      )}
      <Field label="Biến động (âm để trừ điểm)" className="mt-4">
        <input type="number" className="field tabular-nums" value={delta} onChange={(e) => setDelta(Math.trunc(Number(e.target.value) || 0))} />
      </Field>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[-500, -100, 100, 500, 1000].map((v) => (
          <button key={v} className="btn btn-sm" onClick={() => setDelta(v)} style={{ color: v < 0 ? 'var(--cinnabar)' : 'var(--jade)' }}>
            {v > 0 ? '+' : ''}
            {fmt(v)}
          </button>
        ))}
      </div>
      <Field label="Lý do" className="mt-4" hint={approver ? `Sổ sẽ ghi người duyệt: ${approver.name}` : undefined}>
        <textarea className="field" rows={2} maxLength={120} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Bù điểm phó bản bị ghi thiếu tối thứ Năm" />
      </Field>
    </Modal>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { BOND_TYPES, CLASSES } from '@/domain/constants'
import type { BondType } from '@/domain/types'
import { useCan, useGuild, useOrgType } from '@/store/guild'
import { celebrate, toast } from '@/store/ui'
import { cn } from '@/lib/utils'
import { permHint } from '@/domain/permissions'
import { Field, Modal } from '@/components/ui/Modal'
import { CoupleStage } from './CoupleStage'
import { DEFAULT_NOTES } from './romance'

export interface BondDraft {
  aId: string
  bId: string
  type: BondType
}

const TYPE_IDS = Object.keys(BOND_TYPES) as BondType[]

export function BondModal({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: BondDraft | null }) {
  const members = useGuild((s) => s.members)
  const createBond = useGuild((s) => s.createBond)
  const currentUserId = useGuild((s) => s.currentUserId)
  // không có bond.manage → chỉ kết duyên cho chính mình (người thứ nhất khóa là mình)
  const canManage = useCan('bond.manage')
  const orgType = useOrgType()
  const [aId, setAId] = useState('')
  const [bId, setBId] = useState('')
  const [type, setType] = useState<BondType>('phu-the')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    if (canManage) {
      setAId(initial?.aId ?? '')
      setBId(initial?.bId ?? '')
    } else {
      setAId(currentUserId)
      setBId([initial?.bId, initial?.aId].find((x) => x && x !== currentUserId) ?? '')
    }
    setType(initial?.type ?? 'phu-the')
    setNote('')
    setBusy(false)
  }, [open, initial, canManage, currentUserId])

  const sorted = useMemo(() => [...members].sort((x, y) => x.name.localeCompare(y.name, 'vi')), [members])
  const a = members.find((m) => m.id === aId)
  const b = members.find((m) => m.id === bId)

  const submit = async () => {
    if (!a || !b) {
      toast({ tone: 'error', title: 'Thiếu người', desc: 'Hãy chọn đủ hai người để kết duyên.' })
      return
    }
    const text = note.trim() || DEFAULT_NOTES[type]
    if (text.length > 140) {
      toast({ tone: 'error', title: 'Lời thề quá dài', desc: 'Tối đa 140 ký tự.' })
      return
    }
    setBusy(true)
    const r = await createBond(a.id, b.id, type, text)
    setBusy(false)
    if (!r.ok) {
      toast({ tone: 'error', title: 'Không thể kết duyên', desc: r.error })
      return
    }
    if (type === 'phu-the') celebrate({ han: '囍', title: 'Thiên Tác Chi Hợp', subtitle: `${a.name} & ${b.name} chính thức kết thành phu thê. Trăm năm hảo hợp!` })
    else if (type === 'tri-ky') toast({ tone: 'gold', title: 'Tri âm tương ngộ', desc: `${a.name} và ${b.name} đã thành tri kỷ.` })
    else toast({ tone: 'gold', title: 'Đào viên kết nghĩa', desc: `${a.name} và ${b.name} nâng chén thề nguyện.` })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kết Duyên"
      han="缘"
      subtitle="Nguyệt Lão se chỉ hồng, thiên hạ chứng giám"
      size="lg"
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-gold" onClick={submit} disabled={!a || !b || busy}>
            {busy ? 'Đang se chỉ…' : 'Kết duyên'}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Người thứ nhất"
          hint={canManage ? undefined : `Là bạn — ${permHint('bond.manage', orgType).replace('Cần', 'cần')} để se duyên hộ người khác`}
        >
          <select className="field" value={aId} onChange={(e) => setAId(e.target.value)} disabled={!canManage}>
            <option value="">— Chọn —</option>
            {sorted.map((m) => (
              <option key={m.id} value={m.id} disabled={m.id === bId}>
                {m.name} · {CLASSES[m.classId].name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Người thứ hai">
          <select className="field" value={bId} onChange={(e) => setBId(e.target.value)}>
            <option value="">— Chọn —</option>
            {sorted.map((m) => (
              <option key={m.id} value={m.id} disabled={m.id === aId}>
                {m.name} · {CLASSES[m.classId].name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-4">
        <span className="label">Loại duyên phận</span>
        <div className="grid gap-2 sm:grid-cols-3">
          {TYPE_IDS.map((id) => {
            const t = BOND_TYPES[id]
            const on = id === type
            return (
              <button
                key={id}
                onClick={() => setType(id)}
                className={cn('flex items-start gap-2.5 rounded-2xl border p-3 text-left transition', on ? 'bg-black/10' : 'border-line hover:border-line-strong')}
                style={on ? { borderColor: t.color, boxShadow: `0 0 0 3px color-mix(in oklab, ${t.color} 18%, transparent)` } : undefined}
                aria-pressed={on}
              >
                <span className="seal h-8 w-8 shrink-0 text-[17px]" style={{ background: `radial-gradient(circle at 30% 25%, ${t.color}, color-mix(in oklab, ${t.color} 60%, #000) 80%)` }}>
                  {t.han}
                </span>
                <span>
                  <span className="block text-[13.5px] font-bold text-ink">{t.name}</span>
                  <span className="block text-[11.5px] leading-snug text-muted">{t.desc}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <Field label="Lời thề (tùy chọn)" className="mt-4" hint={`${note.length}/140 — bỏ trống sẽ dùng lời thề mặc định`}>
        <textarea className="field" rows={2} maxLength={140} value={note} placeholder={DEFAULT_NOTES[type]} onChange={(e) => setNote(e.target.value)} />
      </Field>

      {a && b && (
        <div className="mt-4 rounded-2xl border border-line bg-[radial-gradient(360px_160px_at_50%_60%,color-mix(in_oklab,var(--sakura)_14%,transparent),transparent_70%)] px-2 pb-2 pt-3">
          <CoupleStage a={a} b={b} type={type} size={96} animated />
          <div className="grid grid-cols-2 text-center text-[12.5px] font-semibold text-ink">
            <span className="truncate">{a.name}</span>
            <span className="truncate">{b.name}</span>
          </div>
        </div>
      )}
    </Modal>
  )
}

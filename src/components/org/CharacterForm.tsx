import { useMemo, useState } from 'react'
import { Shuffle, Sparkles } from 'lucide-react'
import { api, errorMessage } from '@/api/client'
import { CLASSES, CLASS_IDS } from '@/domain/constants'
import type { ClassId } from '@/domain/types'
import { lookFromSeed } from '@/data/seed'
import { Chibi } from '@/components/chibi/Chibi'
import { Field } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { toast } from '@/store/ui'

/** Tạo nhân vật của tài khoản (dùng chung ở mọi tổ chức). Chibi xem trước chính là chibi được lưu. */
export function CharacterForm({ defaultName = '', onCreated, compact = false }: { defaultName?: string; onCreated: () => void | Promise<void>; compact?: boolean }) {
  const [name, setName] = useState(defaultName.slice(0, 32))
  const [classId, setClassId] = useState<ClassId>('to-van')
  const [gender, setGender] = useState<'nam' | 'nu'>('nu')
  const [power, setPower] = useState('150000')
  const [level, setLevel] = useState('65')
  const [salt, setSalt] = useState(0)
  const [busy, setBusy] = useState(false)
  const look = useMemo(() => lookFromSeed(`char-${name.trim()}-${salt}`, classId, gender), [name, classId, gender, salt])

  const submit = async () => {
    const p = Number(power)
    const l = Number(level)
    if (name.trim().length < 2) return toast({ tone: 'error', title: 'Tên nhân vật cần ít nhất 2 ký tự' })
    if (!Number.isFinite(p) || p <= 0) return toast({ tone: 'error', title: 'Chiến lực không hợp lệ' })
    if (!Number.isInteger(l) || l < 1 || l > 80) return toast({ tone: 'error', title: 'Cấp phải từ 1 đến 80' })
    setBusy(true)
    try {
      await api.post('/api/characters', { name: name.trim(), classId, gender, power: Math.round(p), level: l, look }, { idempotent: true })
      toast({ tone: 'gold', title: 'Đã tạo nhân vật', desc: `${name.trim()} bước vào giang hồ!` })
      await onCreated()
    } catch (e) {
      toast({ tone: 'error', title: 'Chưa tạo được nhân vật', desc: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('grid gap-6', compact ? 'sm:grid-cols-[170px_1fr]' : 'sm:grid-cols-[210px_1fr]')}>
      <div className="flex flex-col items-center">
        <Chibi look={look} classId={classId} size={compact ? 150 : 185} />
        <button type="button" className="btn btn-sm btn-ghost mt-1" onClick={() => setSalt((s) => s + 1)}>
          <Shuffle size={13} /> Đổi dáng
        </button>
        <p className="mt-1 text-center text-[11px] text-muted">Tinh chỉnh kỹ hơn ở Xưởng Chibi</p>
      </div>
      <div className="grid gap-4">
        <Field label="Tên nhân vật trong game">
          <input className="field" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} placeholder="VD: Nguyệt Hạ Vô Song" />
        </Field>
        <Field label="Lưu phái">
          <div className="flex flex-wrap gap-1.5">
            {CLASS_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setClassId(id)}
                className={cn('chip h-8 px-3 transition', classId === id ? 'text-[#1b1406]' : 'hover:text-ink')}
                style={classId === id ? { background: CLASSES[id].palette.accent, borderColor: 'transparent' } : undefined}
              >
                <span className="han">{CLASSES[id].han[0]}</span> {CLASSES[id].name}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Giới tính">
            <select className="field" value={gender} onChange={(e) => setGender(e.target.value as 'nam' | 'nu')}>
              <option value="nu">Nữ</option>
              <option value="nam">Nam</option>
            </select>
          </Field>
          <Field label="Chiến lực">
            <input className="field" inputMode="numeric" value={power} onChange={(e) => setPower(e.target.value.replace(/\D/g, ''))} />
          </Field>
          <Field label="Cấp">
            <input className="field" inputMode="numeric" value={level} onChange={(e) => setLevel(e.target.value.replace(/\D/g, ''))} />
          </Field>
        </div>
        <div className="flex justify-end">
          <button className="btn btn-gold" disabled={busy} onClick={() => void submit()}>
            <Sparkles size={15} /> {busy ? 'Đang tạo…' : 'Tạo nhân vật'}
          </button>
        </div>
      </div>
    </div>
  )
}

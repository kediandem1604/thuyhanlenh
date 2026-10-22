import { useEffect, useMemo, useState } from 'react'
import { CLASSES, CLASS_IDS, ROLES } from '@/domain/constants'
import type { ClassId } from '@/domain/types'
import { lookFromSeed } from '@/data/seed'
import { useGuild, useOrg, useOrgType } from '@/store/guild'
import { toast } from '@/store/ui'
import { normalize } from '@/lib/utils'
import { Field, Modal } from '@/components/ui/Modal'
import { Chibi } from '@/components/chibi/Chibi'
import { recruitWords } from './words'

interface Form {
  name: string
  classId: ClassId
  power: string
  level: string
  message: string
  referrerId: string
}

const EMPTY: Form = { name: '', classId: 'to-van', power: '150000', level: '60', message: '', referrerId: '' }

/** Mô phỏng đơn gia nhập công khai mà người chơi bên ngoài sẽ điền */
export function ApplicationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const members = useGuild((s) => s.members)
  const applications = useGuild((s) => s.applications)
  const addApplication = useGuild((s) => s.addApplication)
  const org = useOrg()
  const w = recruitWords(useOrgType())
  const [f, setF] = useState<Form>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setF(EMPTY)
      setErrors({})
      setBusy(false)
    }
  }, [open])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))
  const name = f.name.trim()
  const preview = useMemo(() => lookFromSeed(`app-${name || 'Vô Danh'}`, f.classId), [name, f.classId])
  const referrers = useMemo(() => [...members].sort((a, b) => a.name.localeCompare(b.name, 'vi')), [members])

  const validate = () => {
    const e: Partial<Record<keyof Form, string>> = {}
    const power = Number(f.power)
    const level = Number(f.level)
    if (name.length < 2 || name.length > 24) e.name = 'Tên nhân vật từ 2 đến 24 ký tự.'
    else {
      const n = normalize(name)
      if (members.some((m) => normalize(m.name) === n)) e.name = `Đã có ${w.member} trùng tên trong ${w.org}.`
      else if (applications.some((a) => normalize(a.name) === n && a.stage !== 'tu-choi')) e.name = 'Tên này đang có đơn chờ duyệt.'
    }
    if (!Number.isInteger(power) || power < 10000 || power > 600000) e.power = 'Chiến lực từ 10.000 đến 600.000.'
    if (!Number.isInteger(level) || level < 1 || level > 80) e.level = 'Cấp độ từ 1 đến 80.'
    const msg = f.message.trim()
    if (msg.length < 10) e.message = 'Lời nhắn tối thiểu 10 ký tự.'
    else if (msg.length > 300) e.message = 'Lời nhắn tối đa 300 ký tự.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (busy) return
    if (!validate()) {
      toast({ tone: 'error', title: 'Đơn chưa hợp lệ', desc: 'Kiểm tra lại các ô được đánh dấu.' })
      return
    }
    setBusy(true)
    const r = await addApplication({
      name,
      classId: f.classId,
      power: Number(f.power),
      level: Number(f.level),
      message: f.message.trim(),
      referrerId: f.referrerId || undefined,
      look: preview,
    })
    setBusy(false)
    if (!r.ok) {
      toast({ tone: 'error', title: 'Chưa gửi được đơn', desc: r.error })
      return
    }
    toast({ tone: 'success', title: 'Đã nhận đơn gia nhập', desc: `Đơn của ${name} nằm ở cột “Đơn mới”.` })
    onClose()
  }

  const err = (k: keyof Form) => errors[k] && <span className="mt-1 block text-[11.5px] text-cinnabar">{errors[k]}</span>

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Đơn Gia Nhập"
      han="募"
      subtitle={`Nhập hộ đơn ứng tuyển vào ${org?.name ?? w.org} (người có tài khoản tự gửi từ Sảnh Giang Hồ)`}
      size="lg"
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-gold" onClick={submit} disabled={busy}>
            {busy ? 'Đang gửi…' : 'Gửi đơn'}
          </button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[1fr_180px]">
        <div className="space-y-4">
          <Field label="Tên nhân vật">
            <input className="field" value={f.name} maxLength={24} placeholder="VD: Lưu Ly Tâm" onChange={(e) => set('name', e.target.value)} />
            {err('name')}
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Lưu phái" className="sm:col-span-1">
              <select className="field" value={f.classId} onChange={(e) => set('classId', e.target.value as ClassId)}>
                {CLASS_IDS.map((id) => (
                  <option key={id} value={id}>
                    {CLASSES[id].name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Chiến lực">
              <input className="field" inputMode="numeric" value={f.power} onChange={(e) => set('power', e.target.value.replace(/\D/g, ''))} />
              {err('power')}
            </Field>
            <Field label="Cấp độ">
              <input className="field" inputMode="numeric" value={f.level} onChange={(e) => set('level', e.target.value.replace(/\D/g, ''))} />
              {err('level')}
            </Field>
          </div>
          <Field label={`Lời nhắn gửi ${w.leader}`}>
            <textarea
              className="field"
              rows={3}
              maxLength={300}
              value={f.message}
              placeholder={`Giới thiệu bản thân, khung giờ online, mong muốn khi vào ${w.org}…`}
              onChange={(e) => set('message', e.target.value)}
            />
            {err('message')}
          </Field>
          <Field label="Người tiến cử (tùy chọn)">
            <select className="field" value={f.referrerId} onChange={(e) => set('referrerId', e.target.value)}>
              <option value="">— Không có —</option>
              {referrers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex flex-col items-center rounded-2xl border border-line bg-black/10 px-2 pb-3 pt-2 text-center">
          <span className="eyebrow mb-1">Xem trước</span>
          <Chibi look={preview} classId={f.classId} size={150} />
          <span className="mt-1 max-w-full truncate text-[13px] font-bold text-ink">{name || 'Vô Danh'}</span>
          <span className="text-[11px] text-muted">
            {CLASSES[f.classId].name} · {ROLES[CLASSES[f.classId].role].short}
          </span>
          <p className="mt-2 text-[10.5px] leading-snug text-muted">Chibi được sinh từ tên — đổi tên để đổi diện mạo.</p>
        </div>
      </div>
    </Modal>
  )
}

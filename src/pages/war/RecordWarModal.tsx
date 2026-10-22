import { useMemo, useState } from 'react'
import { Check, Search, Swords } from 'lucide-react'
import { Modal, Field } from '@/components/ui/Modal'
import { Segmented } from '@/components/ui/Segmented'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { CLASSES, RANKS } from '@/domain/constants'
import type { WarLine, WarRecord } from '@/domain/types'
import { useFeature, useGuild, useOrgType } from '@/store/guild'
import { useOrgWords } from '@/pages/dashboard/orgWords'
import { celebrate, toast } from '@/store/ui'
import { cn, normalize } from '@/lib/utils'
import { MODE_META } from './warUtils'

type LineInput = { k: number; d: number; a: number; dmg: number; heal: number }
const EMPTY_LINE: LineInput = { k: 0, d: 0, a: 0, dmg: 0, heal: 0 }

function localNow() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function NumCell({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <input
      type="number"
      min={0}
      inputMode="numeric"
      aria-label={label}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
      className="field !h-8 !w-[68px] !px-2 text-right tabular-nums"
    />
  )
}

export function RecordWarModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const members = useGuild((s) => s.members)
  const wars = useGuild((s) => s.wars)
  const addWar = useGuild((s) => s.addWar)
  const w = useOrgWords()
  const isGuild = useOrgType() === 'guild'
  // cống hiến chỉ được ghi khi tổ chức có Quỹ & Đấu Giá
  const hasCredit = useFeature('bang-kho')
  const rival = isGuild ? 'bang đối thủ' : 'đội đối thủ'

  const [opponent, setOpponent] = useState('')
  const [date, setDate] = useState(localNow)
  const [mode, setMode] = useState<WarRecord['mode']>('bang-chien')
  const [result, setResult] = useState<WarRecord['result']>('win')
  const [ours, setOurs] = useState(3)
  const [theirs, setTheirs] = useState(1)
  const [picked, setPicked] = useState<string[]>([])
  const [lines, setLines] = useState<Record<string, LineInput>>({})
  const [mvpId, setMvpId] = useState('')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)

  const opponents = useMemo(() => [...new Set(wars.map((w) => w.opponent))].sort(), [wars])
  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => RANKS[a.rank].order - RANKS[b.rank].order || b.power - a.power),
    [members],
  )
  const visible = useMemo(() => {
    const nq = normalize(q.trim())
    return nq ? sortedMembers.filter((m) => normalize(m.name).includes(nq)) : sortedMembers
  }, [q, sortedMembers])
  const byId = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members])

  const reset = () => {
    setOpponent('')
    setDate(localNow())
    setMode('bang-chien')
    setResult('win')
    setOurs(3)
    setTheirs(1)
    setPicked([])
    setLines({})
    setMvpId('')
    setQ('')
  }

  const toggle = (id: string) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
    if (mvpId === id) setMvpId('')
  }

  const setLine = (id: string, key: keyof LineInput, v: number) =>
    setLines((l) => ({ ...l, [id]: { ...(l[id] ?? EMPTY_LINE), [key]: v } }))

  const pickOnline = () => setPicked(members.filter((m) => m.status !== 'offline').slice(0, 60).map((m) => m.id))

  const submit = async () => {
    if (busy) return
    const name = opponent.trim()
    if (name.length < 2) return toast({ tone: 'error', title: `Thiếu tên ${rival}`, desc: 'Tên cần ít nhất 2 ký tự.' })
    if (name.length > 40) return toast({ tone: 'error', title: `Tên ${rival} tối đa 40 ký tự` })
    if (!picked.length) return toast({ tone: 'error', title: 'Chưa chọn người tham chiến' })
    if (picked.length > 60) return toast({ tone: 'error', title: 'Tối đa 60 người tham chiến' })
    if (ours < 0 || theirs < 0 || ours > 99 || theirs > 99) return toast({ tone: 'error', title: 'Tỉ số không hợp lệ', desc: 'Mỗi bên từ 0 đến 99.' })
    if (result === 'win' && ours <= theirs) return toast({ tone: 'error', title: 'Tỉ số chưa khớp kết quả', desc: 'Thắng thì điểm của ta phải cao hơn.' })
    if (result === 'lose' && ours >= theirs) return toast({ tone: 'error', title: 'Tỉ số chưa khớp kết quả', desc: 'Thua thì điểm của ta phải thấp hơn.' })
    if (result === 'draw' && ours !== theirs) return toast({ tone: 'error', title: 'Tỉ số chưa khớp kết quả', desc: 'Hòa thì hai bên bằng điểm.' })
    const when = new Date(date)
    if (Number.isNaN(when.getTime())) return toast({ tone: 'error', title: 'Thời gian không hợp lệ' })
    if (when.getTime() > Date.now() + 3600000) return toast({ tone: 'error', title: 'Thời gian ở tương lai', desc: 'Chỉ ghi nhận trận đã diễn ra.' })

    const warLines: WarLine[] = picked.map((id) => {
      const l = lines[id] ?? EMPTY_LINE
      return { memberId: id, k: l.k, d: l.d, a: l.a, dmg: l.dmg * 1000, heal: l.heal * 1000 }
    })
    const mvp = mvpId && picked.includes(mvpId) ? mvpId : [...warLines].sort((a, b) => b.k * 2 + b.a - (a.k * 2 + a.a))[0].memberId

    setBusy(true)
    const res = await addWar({ date: when.toISOString(), opponent: name, result, score: [ours, theirs], mvpId: mvp, mode, lines: warLines })
    setBusy(false)
    if (!res.ok) return toast({ tone: 'error', title: 'Chưa ghi được trận đấu', desc: res.error })
    if (result === 'win') {
      celebrate({ title: 'Đại thắng!', subtitle: `${w.name} hạ ${name} ${ours} – ${theirs}. MVP: ${byId[mvp]?.name ?? ''}`, han: '胜' })
    } else {
      toast({ tone: 'info', title: 'Đã ghi nhận trận đấu', desc: `${result === 'lose' ? 'Thua' : 'Hòa'} trước ${name} · ${ours} – ${theirs}` })
    }
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ghi nhận trận"
      han="战"
      subtitle={`Lưu kết quả ${isGuild ? 'bang chiến' : 'thi đấu'}${hasCredit ? ' — người tham chiến tự nhận điểm cống hiến' : ''}`}
      size="xl"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-gold" onClick={submit} disabled={busy}>
            <Swords size={16} /> {busy ? 'Đang ghi…' : 'Ghi vào sử sách'}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={isGuild ? 'Bang đối thủ' : 'Đối thủ'}>
          <input className="field" list="war-opponents" value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder={isGuild ? 'VD: Thiên Hạ Hội' : 'VD: Bắc Đẩu Đội'} />
          <datalist id="war-opponents">
            {opponents.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </Field>
        <Field label="Thời gian">
          <input className="field" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Hình thức">
          <select className="field" value={mode} onChange={(e) => setMode(e.target.value as WarRecord['mode'])}>
            {(Object.keys(MODE_META) as WarRecord['mode'][]).map((m) => (
              <option key={m} value={m}>
                {MODE_META[m].name}
              </option>
            ))}
          </select>
        </Field>
        <div>
          <span className="label">Kết quả & tỉ số</span>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              size="sm"
              value={result}
              onChange={setResult}
              options={[
                { value: 'win', label: 'Thắng' },
                { value: 'lose', label: 'Thua' },
                { value: 'draw', label: 'Hòa' },
              ]}
            />
            <div className="flex items-center gap-1.5">
              <input type="number" min={0} aria-label="Điểm của ta" className="field !h-9 !w-16 text-center" value={ours} onChange={(e) => setOurs(Math.max(0, Number(e.target.value) || 0))} />
              <span className="text-muted">–</span>
              <input type="number" min={0} aria-label="Điểm đối thủ" className="field !h-9 !w-16 text-center" value={theirs} onChange={(e) => setTheirs(Math.max(0, Number(e.target.value) || 0))} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="label !mb-0">Người tham chiến · {picked.length}</span>
          <button className="btn btn-sm btn-ghost ml-auto" onClick={pickOnline}>
            Chọn người đang online
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => setPicked([])}>
            Bỏ chọn
          </button>
        </div>
        <div className="relative mb-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="field !pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm thành viên…" />
        </div>
        <div className="grid max-h-[220px] grid-cols-1 gap-1.5 overflow-y-auto rounded-xl border border-line p-2 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((m) => {
            const on = picked.includes(m.id)
            return (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition',
                  on ? 'border-line-strong bg-[color-mix(in_oklab,var(--gold)_12%,transparent)]' : 'border-transparent hover:bg-white/[0.03]',
                )}
              >
                <ChibiAvatar look={m.look} classId={m.classId} rank={m.rank} size={26} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-ink">{m.name}</span>
                  <span className="block truncate text-[10.5px] text-muted">{CLASSES[m.classId].name}</span>
                </span>
                <span className={cn('grid h-4 w-4 place-items-center rounded border', on ? 'border-gold bg-gold text-[#1b1406]' : 'border-line-strong')}>
                  {on && <Check size={11} strokeWidth={3} />}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {picked.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <span className="label !mb-0">Chiến tích từng người</span>
            <label className="ml-auto flex items-center gap-2 text-[12px] text-muted">
              MVP
              <select className="field !h-8 !w-auto !py-0 text-[13px]" value={mvpId} onChange={(e) => setMvpId(e.target.value)}>
                <option value="">Tự chọn theo chiến tích</option>
                {picked.map((id) => (
                  <option key={id} value={id}>
                    {byId[id]?.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="scroll-x rounded-xl border border-line">
            <table className="table-ink min-w-[620px]">
              <thead>
                <tr>
                  <th>Thành viên</th>
                  <th className="!text-right">Hạ</th>
                  <th className="!text-right">Ngã</th>
                  <th className="!text-right">Hỗ trợ</th>
                  <th className="!text-right">Sát thương (K)</th>
                  <th className="!text-right">Trị liệu (K)</th>
                </tr>
              </thead>
              <tbody>
                {picked.map((id) => {
                  const m = byId[id]
                  const l = lines[id] ?? EMPTY_LINE
                  if (!m) return null
                  return (
                    <tr key={id}>
                      <td>
                        <span className="flex items-center gap-2">
                          <ChibiAvatar look={m.look} classId={m.classId} rank={m.rank} size={24} />
                          <span className="truncate text-[12.5px] font-semibold text-ink">{m.name}</span>
                        </span>
                      </td>
                      <td className="text-right">
                        <NumCell label="Hạ" value={l.k} onChange={(n) => setLine(id, 'k', n)} />
                      </td>
                      <td className="text-right">
                        <NumCell label="Ngã" value={l.d} onChange={(n) => setLine(id, 'd', n)} />
                      </td>
                      <td className="text-right">
                        <NumCell label="Hỗ trợ" value={l.a} onChange={(n) => setLine(id, 'a', n)} />
                      </td>
                      <td className="text-right">
                        <NumCell label="Sát thương" value={l.dmg} onChange={(n) => setLine(id, 'dmg', n)} />
                      </td>
                      <td className="text-right">
                        <NumCell label="Trị liệu" value={l.heal} onChange={(n) => setLine(id, 'heal', n)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  )
}

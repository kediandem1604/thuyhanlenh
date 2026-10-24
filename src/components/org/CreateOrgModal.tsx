import { useEffect, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { api, errorMessage } from '@/api/client'
import type { OrgInfo } from '@/domain/api'
import { FEATURE_INFO, ORG_THEME_IDS, ORG_THEMES, ORG_TYPES, ORG_TYPE_IDS, type Feature, type OrgThemeId } from '@/domain/orgs'
import type { OrgType } from '@/domain/types'
import { Field, Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { useGuild } from '@/store/guild'
import { celebrate, toast } from '@/store/ui'

const HAN_SUGGEST: Record<OrgType, string[]> = {
  guild: ['鸿', '龙', '剑', '凌', '天', '玄'],
  kimlan: ['兰', '义', '白', '同', '心', '金'],
  team: ['星', '夜', '风', '锋', '影', '月'],
}
const DEFAULT_THEME: Record<OrgType, OrgThemeId> = { guild: 'kinh-hong', kimlan: 'bach-gia', team: 'thanh-ngoc' }

/** Lập tổ chức mới (Bang Hội / Kim Lan / Team) — người lập trở thành người đứng đầu */
export function CreateOrgModal({ open, onClose, initialType = 'team' }: { open: boolean; onClose: () => void; initialType?: OrgType }) {
  const female = useGuild((s) => s.me?.character?.look.gender === 'nu')
  const [type, setType] = useState<OrgType>(initialType)
  const [name, setName] = useState('')
  const [han, setHan] = useState(HAN_SUGGEST[initialType][0])
  const [motto, setMotto] = useState('')
  const [theme, setTheme] = useState<OrgThemeId>(DEFAULT_THEME[initialType])
  const [features, setFeatures] = useState<Feature[]>([...ORG_TYPES.team.defaults])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setType(initialType)
    setHan(HAN_SUGGEST[initialType][0])
    setTheme(DEFAULT_THEME[initialType])
    setName('')
    setMotto('')
    setFeatures([...ORG_TYPES.team.defaults])
  }, [open, initialType])

  const pickType = (t: OrgType) => {
    setType(t)
    setHan(HAN_SUGGEST[t][0])
    setTheme(DEFAULT_THEME[t])
  }

  const submit = async () => {
    if (name.trim().length < 2) return toast({ tone: 'error', title: 'Tên cần ít nhất 2 ký tự' })
    if (!han.trim()) return toast({ tone: 'error', title: 'Chọn một chữ Hán làm biểu tượng' })
    setBusy(true)
    try {
      const res = await api.post<{ ok: true; result: { orgId: string; org: OrgInfo } }>(
        '/api/orgs',
        { type, name: name.trim(), han: han.trim(), motto: motto.trim(), theme, features: type === 'team' ? features : undefined },
        { idempotent: true },
      )
      onClose()
      celebrate({ han: han.trim(), title: `${ORG_TYPES[type].name} ${name.trim()}`, subtitle: type === 'kimlan' ? `Kim Lan kết nghĩa — bạn ngồi ghế ${female ? 'Đại tỷ' : 'Đại ca'}.` : 'Đã lập xong — bạn là người đứng đầu.' })
      useGuild.getState().switchOrg(res.result.orgId)
    } catch (e) {
      toast({ tone: 'error', title: 'Chưa lập được', desc: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  const info = ORG_TYPES[type]
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      han={info.han}
      title="Lập tổ chức mới"
      subtitle="Bạn sẽ là người đứng đầu — mời thêm người bằng link mời"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-gold" disabled={busy} onClick={() => void submit()}>
            <Plus size={15} /> {busy ? 'Đang lập…' : `Lập ${info.name}`}
          </button>
        </>
      }
    >
      <div className="grid gap-5">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {ORG_TYPE_IDS.map((t) => {
            const ti = ORG_TYPES[t]
            const active = t === type
            return (
              <button
                key={t}
                type="button"
                onClick={() => pickType(t)}
                className={cn('rounded-2xl border p-3 text-left transition', active ? 'border-line-strong bg-gold/10 shadow-[var(--glow-gold)]' : 'border-line hover:border-line-strong')}
              >
                <div className="flex items-center gap-2">
                  <span className="seal h-8 w-8 text-[17px]">{ti.han}</span>
                  <span className="text-[14px] font-bold text-ink">{ti.name}</span>
                  {active && <Check size={15} className="ml-auto text-gold" />}
                </div>
                <p className="mt-1.5 text-[11.5px] leading-snug text-muted">{ti.tagline}</p>
              </button>
            )
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
          <Field label={`Tên ${info.name}`}>
            <input className="field" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder={type === 'kimlan' ? 'VD: Gia Tộc Họ Lâm' : type === 'team' ? 'VD: Đội Khai Hoang Thứ Năm' : 'VD: Thiên Hạ Hội'} />
          </Field>
          <Field label="Chữ Hán biểu tượng">
            <input className="field han text-center !text-[20px]" value={han} maxLength={3} onChange={(e) => setHan(e.target.value)} />
          </Field>
        </div>
        <div className="-mt-2 flex flex-wrap gap-1.5">
          {HAN_SUGGEST[type].map((h) => (
            <button key={h} type="button" onClick={() => setHan(h)} className={cn('han grid h-8 w-8 place-items-center rounded-lg border text-[17px]', han === h ? 'border-gold text-gold' : 'border-line text-ink-2 hover:text-gold')}>
              {h}
            </button>
          ))}
        </div>
        <Field label="Khẩu hiệu (tùy chọn)">
          <input className="field" value={motto} maxLength={120} onChange={(e) => setMotto(e.target.value)} placeholder={type === 'kimlan' ? 'Nhị nhân đồng tâm, kỳ lợi đoạn kim' : 'Một câu thật kêu cho anh em'} />
        </Field>

        <div>
          <span className="label">Giao diện</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {ORG_THEME_IDS.map((id) => {
              const t = ORG_THEMES[id]
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTheme(id)}
                  className={cn('relative rounded-xl border p-2 text-left transition', theme === id ? 'border-gold bg-white/[0.04] shadow-[var(--glow-gold)]' : 'border-line opacity-80 hover:border-line-strong hover:opacity-100')}
                >
                  <span className="block h-8 rounded-lg" style={{ background: `linear-gradient(135deg, ${t.accent}, color-mix(in oklab, ${t.accent} 35%, #0e1322))` }} />
                  {theme === id && (
                    <span className="bg-gold-grad text-on-gold absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                  <span className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-ink">
                    <span className="han text-[13px]">{t.han}</span> {t.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {type === 'team' && (
          <div>
            <span className="label">Chức năng của team (đổi lại được trong Thiết Lập)</span>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {info.allowed.map((f) => {
                const on = features.includes(f)
                return (
                  <label key={f} className={cn('flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 transition', on ? 'border-line-strong bg-white/[0.03]' : 'border-line')}>
                    <input type="checkbox" className="accent-[var(--gold)]" checked={on} onChange={() => setFeatures((cur) => (on ? cur.filter((x) => x !== f) : [...cur, f]))} />
                    <span className="han text-[15px] text-gold">{FEATURE_INFO[f].han}</span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-ink">{FEATURE_INFO[f].name}</span>
                      <span className="block truncate text-[11px] text-muted">{FEATURE_INFO[f].desc}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )}
        {type === 'kimlan' && (
          <p className="rounded-xl border border-line bg-black/10 p-3 text-[12.5px] text-ink-2">
            Kim Lan tối đa <b className="text-ink">12 người</b>, có thứ bậc kết nghĩa (Đại ca → Tiểu muội) và các chức năng có trong game: <b className="text-ink">phó bản, bày trận, lịch đi phó bản</b>.
          </p>
        )}
      </div>
    </Modal>
  )
}

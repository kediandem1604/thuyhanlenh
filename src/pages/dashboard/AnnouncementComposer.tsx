import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import type { Announcement } from '@/domain/types'
import { useGuild } from '@/store/guild'
import { toast } from '@/store/ui'
import { cn } from '@/lib/utils'
import { Field, Modal } from '@/components/ui/Modal'
import { useOrgWords } from './orgWords'

export const ANNOUNCE_TAGS: Record<Announcement['tag'], { name: string; color: string; desc: string }> = {
  'thong-bao': { name: 'Thông báo', color: 'var(--azure)', desc: 'Tin chung cho mọi người' },
  'su-kien': { name: 'Sự kiện', color: 'var(--jade)', desc: 'Lịch tập trung, phó bản, thi đấu' },
  'quy-dinh': { name: 'Quy định', color: 'var(--cinnabar)', desc: 'Luật lệ, chia đồ, kỷ luật' },
  'vinh-danh': { name: 'Vinh danh', color: 'var(--gold)', desc: 'Khen thưởng, chúc mừng' },
}

const TAG_IDS = Object.keys(ANNOUNCE_TAGS) as Announcement['tag'][]

/** Hộp soạn tin cho bảng tin — chỉ người có quyền `announce.manage` mở được */
export function AnnouncementComposer({ open, onClose, noun = 'cáo thị' }: { open: boolean; onClose: () => void; noun?: string }) {
  const addAnnouncement = useGuild((s) => s.addAnnouncement)
  const w = useOrgWords()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tag, setTag] = useState<Announcement['tag']>(w.type === 'kimlan' ? 'quy-dinh' : 'thong-bao')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1)

  useEffect(() => {
    if (open) {
      setTitle('')
      setBody('')
      setTag(w.type === 'kimlan' ? 'quy-dinh' : 'thong-bao')
      setError(null)
    }
  }, [open, w.type])

  const submit = async () => {
    const t = title.trim()
    const b = body.trim()
    if (t.length < 3) return setError('Tiêu đề cần ít nhất 3 ký tự.')
    if (!b) return setError('Nội dung không được để trống.')
    setBusy(true)
    const r = await addAnnouncement({ title: t, body: b, tag })
    setBusy(false)
    if (!r.ok) {
      setError(r.error)
      return
    }
    toast({ tone: 'gold', title: `Đã đăng ${noun}`, desc: t })
    onClose()
  }

  const placeholder =
    w.type === 'kimlan'
      ? 'VD: Tối thứ Ba 21:00 cả nhà tập trung ở cổng Vĩnh Dạ Tinh Đô'
      : w.type === 'team'
        ? 'VD: Lịch cố định tối thứ Tư 22:00'
        : 'VD: Tập trung bang chiến 19:45 tối nay'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Viết ${Noun}`}
      han={w.type === 'kimlan' ? '训' : '告'}
      subtitle={`Hiện ngay trên ${w.home} của mọi ${w.member}`}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-gold" onClick={submit} disabled={busy}>
            <Send size={15} /> {busy ? 'Đang đăng…' : `Đăng ${noun}`}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Loại tin">
          <div className="grid grid-cols-2 gap-2">
            {TAG_IDS.map((id) => {
              const t = ANNOUNCE_TAGS[id]
              const active = id === tag
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTag(id)}
                  className={cn('rounded-xl border px-3 py-2 text-left transition', active ? 'bg-white/[0.04]' : 'border-line hover:border-line-strong')}
                  style={active ? { borderColor: t.color, boxShadow: `0 0 0 1px ${t.color}` } : undefined}
                >
                  <span className="block text-[13px] font-semibold" style={{ color: t.color }}>
                    {t.name}
                  </span>
                  <span className="block text-[11px] text-muted">{t.desc}</span>
                </button>
              )
            })}
          </div>
        </Field>
        <Field label="Tiêu đề">
          <input className="field" value={title} maxLength={120} placeholder={placeholder} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Nội dung" hint={`${body.trim().length}/2000 ký tự`}>
          <textarea
            className="field"
            rows={5}
            maxLength={2000}
            value={body}
            placeholder="Chi tiết: thời gian, địa điểm, ai cần chuẩn bị gì…"
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
        {error && <p className="text-[12.5px] text-cinnabar">{error}</p>}
      </div>
    </Modal>
  )
}

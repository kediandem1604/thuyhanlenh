import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { Heart, Shuffle, Sparkles, Swords, Users } from 'lucide-react'
import { BOND_TYPES } from '@/domain/constants'
import type { BondType, Member } from '@/domain/types'
import { useCan, useGuild, useMemberMap, useOrg } from '@/store/guild'
import { toast } from '@/store/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, SectionTitle } from '@/components/ui/Panel'
import { StatCard } from '@/components/ui/StatCard'
import { Segmented } from '@/components/ui/Segmented'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { fmtCompact } from '@/lib/utils'
import { CoupleCard } from './CoupleCard'
import { BondModal, type BondDraft } from './BondModal'

type Filter = 'all' | BondType

/** Hiệu ứng riêng của trang (tim đập, nốt nhạc bay) */
function RomanceStyles() {
  return (
    <style>{`
      .romance-beat { animation: romance-beat 1.6s ease-in-out infinite; transform-origin: center; }
      .romance-note { animation: romance-note 2.6s ease-in-out infinite; }
      @keyframes romance-beat { 0%,100% { transform: scale(1); } 15% { transform: scale(1.18); } 30% { transform: scale(0.96); } 45% { transform: scale(1.1); } }
      @keyframes romance-note { 0% { transform: translateY(6px); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(-14px); opacity: 0; } }
      @media (prefers-reduced-motion: reduce) { .romance-beat, .romance-note { animation: none; } }
    `}</style>
  )
}

const LONELY_LINES = [
  'Nguyệt Lão đã chuẩn bị sẵn chỉ hồng, chỉ chờ một ánh mắt chạm nhau…',
  'Đêm trăng Biện Kinh dài lắm, đi một mình thì lạnh lắm.',
  'Nghe nói ai tặng hoa đầu tiên ở yến tiệc giang hồ sẽ gặp được ý trung nhân.',
]

export default function RomancePage() {
  const bonds = useGuild((s) => s.bonds)
  const memberList = useGuild((s) => s.members)
  const currentUserId = useGuild((s) => s.currentUserId)
  const canManage = useCan('bond.manage')
  const orgName = useOrg()?.name ?? 'tổ chức'
  const members = useMemberMap()
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<BondDraft | null>(null)

  const valid = useMemo(() => bonds.filter((b) => members[b.aId] && members[b.bId]), [bonds, members])
  const counts = useMemo(() => {
    const c: Record<BondType, number> = { 'phu-the': 0, 'tri-ky': 0, 'ket-nghia': 0 }
    valid.forEach((b) => c[b.type]++)
    return c
  }, [valid])
  const totalIntimacy = useMemo(() => valid.reduce((s, b) => s + b.intimacy, 0), [valid])
  const shown = useMemo(
    () => valid.filter((b) => filter === 'all' || b.type === filter).sort((x, y) => y.intimacy - x.intimacy),
    [valid, filter],
  )
  const topId = shown[0]?.id

  const singles = useMemo(() => {
    const bonded = new Set(valid.flatMap((b) => [b.aId, b.bId]))
    return memberList.filter((m) => !bonded.has(m.id))
  }, [valid, memberList])
  const lonelyLine = LONELY_LINES[singles.length % LONELY_LINES.length]

  const openNew = (d: BondDraft | null = null) => {
    setDraft(d)
    setOpen(true)
  }

  const randomMatch = () => {
    // Trưởng Lão trở lên se duyên cho bất kỳ ai; còn lại Nguyệt Lão tìm người cho chính mình
    if (!canManage) {
      const me = members[currentUserId]
      const pool = singles.filter((m) => m.id !== currentUserId).sort(() => Math.random() - 0.5)
      if (!me || pool.length === 0) {
        toast({ tone: 'info', title: 'Nguyệt Lão hết chỉ rồi', desc: 'Không còn ai độc thân để se duyên cùng bạn.' })
        return
      }
      const married = valid.some((b) => b.type === 'phu-the' && (b.aId === me.id || b.bId === me.id))
      const partner = pool.find((m) => m.look.gender !== me.look.gender) ?? pool[0]
      openNew({ aId: me.id, bId: partner.id, type: married ? 'tri-ky' : 'phu-the' })
      return
    }
    if (singles.length < 2) {
      toast({ tone: 'info', title: 'Nguyệt Lão hết chỉ rồi', desc: 'Không đủ người độc thân để se duyên.' })
      return
    }
    const pool = [...singles].sort(() => Math.random() - 0.5)
    const first: Member = pool[0]
    const second = pool.find((m) => m.id !== first.id && m.look.gender !== first.look.gender) ?? pool[1]
    openNew({ aId: first.id, bId: second.id, type: 'phu-the' })
  }

  return (
    <div className="space-y-6">
      <RomanceStyles />
      <PageHeader
        eyebrow="Hồng tuyến giang hồ"
        title="Tình Duyên Các"
        han="缘"
        description={`Giang hồ hiểm ác, may mà có nhau. Nơi lưu giữ những mối duyên phu thê, tri kỷ và tình huynh đệ kết nghĩa của ${orgName}.`}
        actions={
          <button className="btn btn-gold" onClick={() => openNew()}>
            <Heart size={16} /> Kết duyên
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} icon={Heart} label="Phu thê" value={counts['phu-the']} hint={BOND_TYPES['phu-the'].desc} color={BOND_TYPES['phu-the'].color} />
        <StatCard index={1} icon={Sparkles} label="Tri kỷ" value={counts['tri-ky']} hint={BOND_TYPES['tri-ky'].desc} color={BOND_TYPES['tri-ky'].color} />
        <StatCard index={2} icon={Swords} label="Kết nghĩa" value={counts['ket-nghia']} hint={BOND_TYPES['ket-nghia'].desc} color={BOND_TYPES['ket-nghia'].color} />
        <StatCard index={3} icon={Users} label="Tổng thân mật" value={totalIntimacy} format={fmtCompact} hint={`cả ${orgName} cộng lại`} color="#ff7d9a" />
      </div>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="seal h-8 w-8 text-[17px]">囍</span>
            <div>
              <h3 className="title-display text-[21px] text-ink">Những mối duyên</h3>
              <p className="text-[12.5px] text-muted">Rê chuột vào thẻ để các nhân vật cử động · tặng hoa để tăng thân mật</p>
            </div>
          </div>
          <Segmented
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Tất cả', count: valid.length },
              { value: 'phu-the', label: 'Phu thê', count: counts['phu-the'] },
              { value: 'tri-ky', label: 'Tri kỷ', count: counts['tri-ky'] },
              { value: 'ket-nghia', label: 'Kết nghĩa', count: counts['ket-nghia'] },
            ]}
          />
        </div>

        {shown.length === 0 ? (
          <Panel>
            <EmptyState
              han="缘"
              title="Chưa có mối duyên nào"
              desc="Có duyên ắt sẽ gặp — hãy để Nguyệt Lão ra tay."
              action={
                <button className="btn btn-gold btn-sm" onClick={() => openNew()}>
                  <Heart size={14} /> Kết duyên
                </button>
              }
            />
          </Panel>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {shown.map((b, i) => (
              <CoupleCard key={b.id} bond={b} a={members[b.aId]} b={members[b.bId]} index={i} featured={b.id === topId} />
            ))}
          </div>
        )}
      </section>

      <Panel corners className="relative overflow-hidden">
        <span aria-hidden className="han pointer-events-none absolute -right-4 -top-8 select-none text-[150px] leading-none text-sakura opacity-[0.07]">
          月
        </span>
        <SectionTitle
          han="月"
          title="Góc Nguyệt Lão"
          subtitle={`${singles.length} đại hiệp vẫn còn lẻ bóng`}
          right={
            <button className="btn btn-sm" onClick={randomMatch} style={{ borderColor: 'color-mix(in oklab, var(--sakura) 45%, transparent)' }}>
              <Shuffle size={14} className="text-sakura" /> {canManage ? 'Se duyên ngẫu nhiên' : 'Nhờ Nguyệt Lão tìm giúp'}
            </button>
          }
        />
        <p className="relative mb-4 max-w-2xl text-[13px] italic text-ink-2">{lonelyLine}</p>
        {singles.length === 0 ? (
          <EmptyState han="囍" title={`Cả ${orgName} đều đã có đôi!`} desc="Nguyệt Lão xin phép nghỉ hưu." />
        ) : (
          <div className="relative flex flex-wrap gap-2">
            {singles.slice(0, 24).map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.015 * i }}>
                <Link
                  to={`/thanh-vien/${m.id}`}
                  className="group flex items-center gap-2 rounded-full border border-line bg-black/10 py-1 pl-1 pr-3 transition hover:border-sakura/60"
                  title={m.name}
                >
                  <ChibiAvatar look={m.look} classId={m.classId} size={30} />
                  <span className="max-w-[120px] truncate text-[12.5px] font-medium text-ink-2 group-hover:text-sakura">{m.name}</span>
                </Link>
              </motion.div>
            ))}
            {singles.length > 24 && <span className="chip self-center">+{singles.length - 24} người nữa</span>}
          </div>
        )}
      </Panel>

      <BondModal open={open} onClose={() => setOpen(false)} initial={draft} />
    </div>
  )
}

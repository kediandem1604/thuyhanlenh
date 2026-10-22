import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { Award, GraduationCap, HeartHandshake, UserPlus, Users } from 'lucide-react'
import { MENTOR_STAGES } from '@/domain/constants'
import type { MentorshipStage } from '@/domain/types'
import { useCan, useGuild, useMemberMap, useOrg, useOrgType } from '@/store/guild'
import { daysBetween, fmt, fmtDate } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, SectionTitle } from '@/components/ui/Panel'
import { StatCard } from '@/components/ui/StatCard'
import { Segmented } from '@/components/ui/Segmented'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { LineageTree } from './LineageTree'
import { PairCard } from './PairCard'
import { CreateMentorshipModal } from './CreateMentorshipModal'
import { permHint } from '@/domain/permissions'

type StageFilter = 'all' | `${MentorshipStage}`

export default function MentorshipPage() {
  const mentorships = useGuild((s) => s.mentorships)
  const members = useMemberMap()
  const canTake = useCan('mentor.take')
  const type = useOrgType()
  const orgName = useOrg()?.name ?? 'tổ chức'
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<StageFilter>('all')

  const { active, graduated, stats } = useMemo(() => {
    const active = mentorships.filter((m) => m.status === 'active' && members[m.masterId] && members[m.discipleId])
    const graduated = mentorships
      .filter((m) => m.status === 'graduated' && members[m.masterId] && members[m.discipleId])
      .sort((a, b) => (b.graduatedAt ?? '').localeCompare(a.graduatedAt ?? ''))
    const valid = [...active, ...graduated]
    const avgBond = valid.length ? valid.reduce((s, m) => s + m.bond, 0) / valid.length : 0
    const masters = new Set(valid.map((m) => m.masterId)).size
    return { active, graduated, stats: { avgBond, masters } }
  }, [mentorships, members])

  const shown = useMemo(
    () => [...active].filter((m) => filter === 'all' || String(m.stage) === filter).sort((a, b) => b.stage - a.stage || b.bond - a.bond),
    [active, filter],
  )

  const stageOptions = [
    { value: 'all' as StageFilter, label: 'Tất cả', count: active.length },
    ...MENTOR_STAGES.map((st) => ({
      value: String(st.id) as StageFilter,
      label: st.name,
      count: active.filter((m) => m.stage === st.id).length,
    })),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Truyền thừa võ học"
        title="Sư Đồ Đường"
        han="师"
        description={`Nơi tiền bối dìu dắt hậu bối: bái sư, luyện công, thực chiến và lễ xuất sư. Mỗi đồ đệ thành tài là một mạch võ học của ${orgName} được nối dài.`}
        actions={
          <button
            className="btn btn-gold"
            onClick={() => setOpen(true)}
            disabled={!canTake}
            title={canTake ? undefined : `${permHint('mentor.take', type)} mới được nhận đồ đệ`}
          >
            <UserPlus size={16} /> Mở lễ bái sư
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} icon={GraduationCap} label="Đang truyền nghề" value={active.length} hint="cặp sư đồ" color="#a08cf5" />
        <StatCard index={1} icon={Award} label="Đã xuất sư" value={graduated.length} hint="đồ đệ thành tài" color="#d8b46a" />
        <StatCard index={2} icon={HeartHandshake} label="Tình sư đồ TB" value={stats.avgBond} hint="điểm mỗi cặp" color="#f2a7bf" />
        <StatCard index={3} icon={Users} label="Sư phụ" value={stats.masters} hint="người từng truyền nghề" color="#5ec7b0" />
      </div>

      <Panel corners>
        <SectionTitle han="传" title="Cây truyền thừa" subtitle={`Mạch sư đồ của ${orgName} — ấn 成 là đồ đệ đã xuất sư`} />
        <LineageTree mentorships={mentorships} members={members} />
      </Panel>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="seal h-8 w-8 text-[17px]">授</span>
            <div>
              <h3 className="title-display text-[21px] text-ink">Đang truyền nghề</h3>
              <p className="text-[12.5px] text-muted">Đánh dấu nhiệm vụ, thăng giai đoạn và cử hành lễ xuất sư</p>
            </div>
          </div>
          <Segmented size="sm" value={filter} onChange={setFilter} options={stageOptions} />
        </div>
        {shown.length === 0 ? (
          <Panel>
            <EmptyState
              han="空"
              title="Chưa có cặp sư đồ nào ở giai đoạn này"
              desc="Hãy mở lễ bái sư để các tân binh có người dẫn đường."
              action={
                canTake ? (
                  <button className="btn btn-gold btn-sm" onClick={() => setOpen(true)}>
                    <UserPlus size={14} /> Mở lễ bái sư
                  </button>
                ) : undefined
              }
            />
          </Panel>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {shown.map((ms, i) => (
              <PairCard key={ms.id} ms={ms} master={members[ms.masterId]} disciple={members[ms.discipleId]} index={i} />
            ))}
          </div>
        )}
      </section>

      <Panel corners>
        <SectionTitle han="成" title="Đường Truyền Thừa" subtitle="Vinh danh những đồ đệ đã xuất sư" />
        {graduated.length === 0 ? (
          <EmptyState han="成" title="Chưa có ai xuất sư" desc="Lễ xuất sư đầu tiên sẽ được khắc tên tại đây." />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {graduated.map((ms, i) => {
              const master = members[ms.masterId]
              const disciple = members[ms.discipleId]
              const days = ms.graduatedAt ? Math.max(1, daysBetween(ms.startedAt, ms.graduatedAt)) : 0
              return (
                <motion.div
                  key={ms.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i }}
                  className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-line bg-[linear-gradient(120deg,color-mix(in_oklab,var(--gold)_10%,transparent),transparent_60%)] p-3.5"
                >
                  <span aria-hidden className="han pointer-events-none absolute -right-2 -top-4 text-[72px] leading-none text-gold opacity-[0.07]">
                    成
                  </span>
                  <Link to={`/thanh-vien/${master.id}`} title={master.name}>
                    <ChibiAvatar look={master.look} classId={master.classId} rank={master.rank} size={40} />
                  </Link>
                  <span className="text-[11px] text-muted">→</span>
                  <Link to={`/thanh-vien/${disciple.id}`} className="relative" title={disciple.name}>
                    <ChibiAvatar look={disciple.look} classId={disciple.classId} rank={disciple.rank} size={40} />
                    <span className="seal absolute -bottom-1 -right-1.5 h-[18px] w-[18px] !rounded-[5px] text-[10px]">成</span>
                  </Link>
                  <div className="relative min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-ink">
                      {disciple.name} <span className="font-normal text-muted">bái</span> {master.name}
                    </div>
                    <div className="truncate text-[11.5px] text-muted">
                      {fmtDate(ms.startedAt)} → {ms.graduatedAt ? fmtDate(ms.graduatedAt) : '—'} · {days} ngày
                    </div>
                  </div>
                  <span className="chip relative shrink-0 text-sakura">♥ {fmt(ms.bond)}</span>
                </motion.div>
              )
            })}
          </div>
        )}
      </Panel>

      <CreateMentorshipModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

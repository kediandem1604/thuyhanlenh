import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Flame, LayoutGrid, Rows3, Search, UserPlus, Users, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { Segmented } from '@/components/ui/Segmented'
import { EmptyState } from '@/components/ui/EmptyState'
import { CountUp } from '@/components/ui/CountUp'
import { PermButton } from '@/components/ui/PermButton'
import { RoleIcon } from '@/components/ui/Badges'
import { CLASSES, CLASS_IDS, RANKS, ROLES, STATUS } from '@/domain/constants'
import { ORG_TYPES, RANK_IDS_BY_TYPE } from '@/domain/orgs'
import { permHint } from '@/domain/permissions'
import type { ClassId, CombatRole, MemberStatus, OrgType, RankId } from '@/domain/types'
import { useCan, useFeature, useGuild, useOrg, useOrgType } from '@/store/guild'
import { toast } from '@/store/ui'
import { alpha } from '@/lib/color'
import { cn, fmtCompact, normalize, sum } from '@/lib/utils'
import { MemberCard } from './MemberCard'
import { MembersTable } from './MembersTable'
import { MemberFormModal } from './MemberFormModal'
import { KimLanRoster } from './KimLanRoster'
import { capitalize } from './orgRoster'
import { DEFAULT_DIR, SORT_OPTIONS, sortMembers, type SortDir, type SortKey } from './sorting'

type View = 'grid' | 'table'
const VIEW_KEY = 'thuy-han-lenh:members-view'

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'grid'
  } catch {
    return 'grid'
  }
}

/** Chữ trên đầu trang theo loại tổ chức */
const HEADER: Record<OrgType, { han: string; description: string; addLabel: string }> = {
  guild: {
    han: '众',
    description: 'Mỗi hiệp khách một dáng hình riêng. Tra cứu, sắp xếp và quản lý toàn bộ môn hạ trong bang.',
    addLabel: 'Thêm môn hạ',
  },
  kimlan: {
    han: '兰',
    description: 'Mười hai chiếc ghế, một lời thề. Thứ bậc huynh đệ tỷ muội xếp theo ghế ngồi — ghế 一 là Đại ca / Đại tỷ, ghế cuối là Tiểu đệ / Tiểu muội.',
    addLabel: 'Ghi danh huynh đệ',
  },
  team: {
    han: '队',
    description: 'Tra cứu, sắp xếp và quản lý thành viên của team — không giới hạn sĩ số.',
    addLabel: 'Thêm thành viên',
  },
}

function SummaryTile({
  icon,
  label,
  value,
  color,
  format,
  index,
  className,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
  format?: (n: number) => string
  index: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index }}
      className={cn('panel flex items-center gap-3 !rounded-2xl px-3.5 py-3 sm:px-4', className)}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: alpha(color, 0.14), color }}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-muted sm:tracking-[0.14em]">{label}</div>
        <div className="title-display text-[24px] tabular-nums text-ink">
          <CountUp value={value} format={format} />
        </div>
      </div>
    </motion.div>
  )
}

export default function MembersPage() {
  const members = useGuild((s) => s.members)
  const org = useOrg()
  const type = useOrgType()
  const info = ORG_TYPES[type]
  const hasTreasury = useFeature('bang-kho')
  const hasRecruit = useFeature('chieu-mo')
  const [params, setParams] = useSearchParams()
  const [modalOpen, setModalOpen] = useState(false)
  const [view, setView] = useState<View>(readView)
  const [q, setQ] = useState('')
  const [classFilter, setClassFilter] = useState<ClassId | 'all'>('all')
  const [rankFilter, setRankFilter] = useState<RankId | 'all'>('all')
  const [status, setStatus] = useState<MemberStatus | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('power')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const orgName = org?.name ?? info.name
  const memberWord = info.memberWord
  const head = HEADER[type]
  const rankIds = RANK_IDS_BY_TYPE[type]
  // chức vụ đang lọc không có ở loại tổ chức này (vừa đổi tổ chức) → coi như "tất cả"
  const rank: RankId | 'all' = rankFilter !== 'all' && rankIds.includes(rankFilter) ? rankFilter : 'all'
  // cống hiến tuần chỉ có khi tổ chức bật Quỹ & Đấu Giá
  const sortOptions = useMemo(() => SORT_OPTIONS.filter((o) => hasTreasury || o.value !== 'weekly'), [hasTreasury])
  const activeSort: SortKey = !hasTreasury && sortKey === 'weekly' ? 'power' : sortKey

  const capacity = org ? org.capacity : info.capacity
  const full = capacity !== null && members.length >= capacity
  const canEdit = useCan('member.edit')
  const canAdd = canEdit && !full
  const addHint = !canEdit
    ? `${permHint('member.edit', type)} — người mới ${type === 'guild' && hasRecruit ? 'hãy vào qua trang Chiêu Mộ' : 'vào qua link mời'}`
    : `${orgName} đã đủ ${capacity} người`

  // mở hộp thoại khi URL có ?action=add (từ thanh lệnh Ctrl+K)
  useEffect(() => {
    if (params.get('action') === 'add') {
      if (canAdd) setModalOpen(true)
      else toast({ tone: 'info', title: canEdit ? `${orgName} đã đủ người` : permHint('member.edit', type) })
      const next = new URLSearchParams(params)
      next.delete('action')
      setParams(next, { replace: true })
    }
  }, [params, setParams, canAdd, canEdit, orgName, type])

  const changeView = (v: View) => {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* bỏ qua */
    }
  }

  const onSort = (k: SortKey) => {
    if (k === activeSort) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(k)
      setSortDir(DEFAULT_DIR[k])
    }
  }

  const summary = useMemo(() => {
    const roles: Record<CombatRole, number> = { tank: 0, healer: 0, dps: 0 }
    members.forEach((m) => roles[CLASSES[m.classId].role]++)
    const online = members.filter((m) => m.status === 'online' || m.status === 'in-raid').length
    const avg = members.length ? sum(members.map((m) => m.power)) / members.length : 0
    return { roles, online, avg }
  }, [members])

  const classCounts = useMemo(() => {
    const c: Partial<Record<ClassId, number>> = {}
    members.forEach((m) => (c[m.classId] = (c[m.classId] ?? 0) + 1))
    return c
  }, [members])

  const filtered = useMemo(() => {
    const nq = normalize(q.trim())
    const list = members.filter(
      (m) =>
        (classFilter === 'all' || m.classId === classFilter) &&
        (rank === 'all' || m.rank === rank) &&
        (status === 'all' || m.status === status) &&
        (!nq || normalize(`${m.name} ${m.title}`).includes(nq)),
    )
    return sortMembers(list, activeSort, sortDir)
  }, [members, q, classFilter, rank, status, activeSort, sortDir])

  const hasFilter = q.trim() !== '' || classFilter !== 'all' || rank !== 'all' || status !== 'all'
  const resetFilters = () => {
    setQ('')
    setClassFilter('all')
    setRankFilter('all')
    setStatus('all')
  }

  const header = (
    <PageHeader
      eyebrow={`${orgName} · ${capitalize(memberWord)}`}
      title={info.rosterName}
      han={head.han}
      description={head.description}
      actions={
        <>
          <span className="chip !h-10 !px-3.5 !text-[13px]" title="Sĩ số">
            <Users size={14} className="text-gold" />
            <b className="tabular-nums text-ink">{members.length}</b>
            {capacity !== null ? <span className="tabular-nums text-muted">/ {capacity}</span> : <span className="text-muted">· không giới hạn</span>}
          </span>
          <PermButton className="btn btn-gold" allowed={canAdd} hint={addHint} onClick={() => setModalOpen(true)}>
            <UserPlus size={16} /> {head.addLabel}
          </PermButton>
        </>
      }
    />
  )

  const tiles = (
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {(['tank', 'healer', 'dps'] as CombatRole[]).map((r, i) => (
        <SummaryTile key={r} index={i} icon={<RoleIcon role={r} size={18} />} label={ROLES[r].short} value={summary.roles[r]} color={ROLES[r].color} />
      ))}
      <SummaryTile index={3} icon={<Users size={18} />} label="Trực tuyến" value={summary.online} color="#5ec7b0" />
      <SummaryTile index={4} icon={<Flame size={18} />} label="Chiến lực TB" value={summary.avg} format={fmtCompact} color="#d8b46a" className="col-span-2 md:col-span-1" />
    </div>
  )

  /* ---------------- Kim Lan: Kim Lan Phổ theo ghế ---------------- */
  if (type === 'kimlan') {
    return (
      <div>
        {header}
        {members.length === 0 ? (
          <Panel corners>
            <EmptyState han="兰" title="Kim Lan chưa có ai" desc="Hãy gửi link mời để huynh đệ tỷ muội cùng nâng chén thề." />
          </Panel>
        ) : (
          <>
            {tiles}
            <KimLanRoster orgName={orgName} canAdd={canAdd} onAdd={() => setModalOpen(true)} />
          </>
        )}
        <MemberFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </div>
    )
  }

  /* ---------------- Bang Hội / Team ---------------- */
  return (
    <div>
      {header}
      {tiles}

      {/* thanh công cụ */}
      <Panel className="mb-5 space-y-4 !p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="field !pl-10"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên hoặc danh hiệu (gõ không dấu cũng được)…"
              aria-label={`Tìm ${memberWord}`}
            />
            {q && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink" onClick={() => setQ('')} aria-label="Xóa tìm kiếm">
                <X size={15} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:w-auto">
            <select className="field lg:w-[150px]" value={rank} onChange={(e) => setRankFilter(e.target.value as RankId | 'all')} aria-label="Lọc chức vụ">
              <option value="all">Mọi chức vụ</option>
              {rankIds.map((r) => (
                <option key={r} value={r}>
                  {RANKS[r].name}
                </option>
              ))}
            </select>
            <select className="field lg:w-[150px]" value={status} onChange={(e) => setStatus(e.target.value as MemberStatus | 'all')} aria-label="Lọc trạng thái">
              <option value="all">Mọi trạng thái</option>
              {(Object.keys(STATUS) as MemberStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS[s].name}
                </option>
              ))}
            </select>
            <select
              className="field col-span-2 sm:col-span-1 lg:w-[160px]"
              value={sortOptions.some((o) => o.value === activeSort) ? activeSort : ''}
              onChange={(e) => {
                const k = e.target.value as SortKey
                setSortKey(k)
                setSortDir(DEFAULT_DIR[k])
              }}
              aria-label="Sắp xếp"
            >
              {!sortOptions.some((o) => o.value === activeSort) && <option value="">Theo cột bảng</option>}
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  Xếp: {o.label}
                </option>
              ))}
            </select>
          </div>
          <Segmented
            className="self-start lg:self-auto"
            value={view}
            onChange={changeView}
            options={[
              {
                value: 'grid',
                label: (
                  <>
                    <LayoutGrid size={14} /> Thẻ
                  </>
                ),
              },
              {
                value: 'table',
                label: (
                  <>
                    <Rows3 size={14} /> Bảng
                  </>
                ),
              },
            ]}
          />
        </div>

        {/* lọc lưu phái */}
        <div className="scroll-x -mx-1 flex gap-2 px-1 pb-1">
          <button
            onClick={() => setClassFilter('all')}
            className={cn('chip shrink-0 !h-8 !px-3 transition', classFilter === 'all' ? '!border-line-strong text-gold' : 'hover:text-ink')}
            style={classFilter === 'all' ? { background: 'color-mix(in oklab, var(--gold) 14%, transparent)' } : undefined}
          >
            Tất cả <span className="text-muted">{members.length}</span>
          </button>
          {CLASS_IDS.map((id) => {
            const c = CLASSES[id]
            const active = classFilter === id
            return (
              <button
                key={id}
                onClick={() => setClassFilter(active ? 'all' : id)}
                className="chip shrink-0 !h-8 !px-3 transition"
                aria-pressed={active}
                style={{
                  color: active ? c.palette.accent : undefined,
                  borderColor: active ? alpha(c.palette.accent, 0.6) : undefined,
                  background: active ? alpha(c.palette.accent, 0.15) : undefined,
                }}
              >
                <span className="han text-[14px]" style={{ color: c.palette.accent }}>
                  {c.han[0]}
                </span>
                {c.name}
                <span className="text-muted">{classCounts[id] ?? 0}</span>
              </button>
            )
          })}
        </div>
      </Panel>

      <div className="mb-3 flex items-center justify-between gap-3 text-[12.5px] text-muted">
        <span>
          Hiển thị <b className="text-ink">{filtered.length}</b> / {members.length} {memberWord}
        </span>
        {hasFilter && (
          <button className="btn btn-ghost btn-sm text-gold" onClick={resetFilters}>
            <X size={13} /> Bỏ lọc
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Panel corners>
          <EmptyState
            han="寻"
            title={members.length ? `Không tìm thấy ${memberWord} nào` : `${orgName} chưa có ${memberWord} nào`}
            desc={members.length ? 'Thử bỏ bớt bộ lọc hoặc tìm bằng tên khác — giang hồ rộng lớn, người vẫn ở đâu đó.' : 'Hãy gửi link mời để mọi người cùng gia nhập.'}
            action={
              hasFilter ? (
                <button className="btn" onClick={resetFilters}>
                  Bỏ mọi bộ lọc
                </button>
              ) : undefined
            }
          />
        </Panel>
      ) : view === 'grid' ? (
        <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-5">
          <AnimatePresence mode="popLayout">
            {filtered.map((m, i) => (
              <MemberCard key={m.id} member={m} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <MembersTable members={filtered} sortKey={activeSort} sortDir={sortDir} onSort={onSort} nameLabel={capitalize(memberWord)} showContribution={hasTreasury} />
      )}

      <MemberFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}

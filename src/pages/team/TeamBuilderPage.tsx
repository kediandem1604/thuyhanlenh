import { useEffect, useMemo, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { motion } from 'motion/react'
import { Check, Copy, FolderOpen, Loader2, Lock, Save, Search, Sparkles, Trash, TriangleAlert, Users, WandSparkles } from 'lucide-react'
import { CLASSES, CLASS_IDS, DUNGEONS, DUNGEON_MAP, MODES, PARTY_SIZE, ROLES, minPartySize, modeFor, partyLabel } from '@/domain/constants'
import type { ClassId, CombatRole, DungeonMode, Member } from '@/domain/types'
import { useCan, useGuild, useMemberMap, useOrgType } from '@/store/guild'
import { useOrgWords } from '@/pages/dashboard/orgWords'
import { permHint } from '@/domain/permissions'
import { toast } from '@/store/ui'
import { cn, fmt, fmtCompact, fmtDate, normalize, sum } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, SectionTitle } from '@/components/ui/Panel'
import { Segmented } from '@/components/ui/Segmented'
import { ProgressBar, ProgressRing } from '@/components/ui/Progress'
import { Field, Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { RoleIcon } from '@/components/ui/Badges'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { DragGhost, RosterCard, RosterDrop, Slot, type DragData } from './TeamPieces'
import { SLOT_ROLE, autoFill, fitSlots, quotas, roleOfMember } from './teamUtils'

type RoleFilter = 'all' | CombatRole
type SortKey = 'power' | 'activity' | 'name'

/* ------------------------------------------------------------------ */
/* Phân tích đội hình                                                  */
/* ------------------------------------------------------------------ */

function Analysis({ team, size, rec }: { team: Member[]; size: number; rec: number }) {
  const q = quotas(size)
  const counts: Record<CombatRole, number> = { tank: 0, healer: 0, dps: 0 }
  team.forEach((m) => counts[roleOfMember(m)]++)
  const avg = team.length ? sum(team.map((m) => m.power)) / team.length : 0
  const ratio = rec ? avg / rec : 0
  const verdict = !team.length
    ? { text: 'Chưa xếp ai', color: 'var(--muted)' }
    : ratio >= 1
      ? { text: 'Đủ sức chinh phục', color: 'var(--jade)' }
      : ratio >= 0.8
        ? { text: 'Hơi đuối sức', color: 'var(--gold)' }
        : { text: 'Quá sức', color: 'var(--cinnabar)' }
  const classes = Array.from(new Set(team.map((m) => m.classId)))
  const online = team.filter((m) => m.status === 'online' || m.status === 'in-raid').length

  return (
    <Panel corners>
      <SectionTitle han="析" title="Quân sư luận trận" subtitle="Đánh giá đội hình hiện tại" />

      <div className="flex items-center gap-4 rounded-2xl border border-line bg-black/10 p-3.5">
        <ProgressRing value={Math.min(ratio, 1.2)} max={1.2} size={76} stroke={7} color={ratio >= 1 ? '#5ec7b0' : ratio >= 0.8 ? '#d8b46a' : '#e0523f'}>
          <span className="text-[14px] font-bold text-ink">{team.length ? `${Math.round(ratio * 100)}%` : '—'}</span>
        </ProgressRing>
        <div className="min-w-0 space-y-0.5 text-[12.5px]">
          <div className="font-bold" style={{ color: verdict.color }}>
            {verdict.text}
          </div>
          <div className="text-muted">
            Chiến lực TB <b className="tabular-nums text-ink">{fmt(avg)}</b>
          </div>
          <div className="text-muted">
            Khuyến nghị <b className="tabular-nums text-ink">{fmt(rec)}</b>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {(Object.keys(q) as CombatRole[]).map((r) => {
          const ok = counts[r] >= q[r] && (r === 'dps' || counts[r] <= q[r] + 1)
          return (
            <div key={r}>
              <div className="mb-1 flex items-center justify-between text-[12.5px]">
                <span className="flex items-center gap-1.5 font-semibold text-ink-2">
                  <RoleIcon role={r} size={13} /> {ROLES[r].name}
                </span>
                <span className="flex items-center gap-1.5 tabular-nums">
                  <b className="text-ink">{counts[r]}</b>
                  <span className="text-muted">/ {q[r]}</span>
                  {team.length > 0 && (ok ? <Check size={13} className="text-jade" /> : <TriangleAlert size={13} className="text-ember" />)}
                </span>
              </div>
              <ProgressBar value={counts[r]} max={q[r]} color={ROLES[r].color} height={6} />
            </div>
          )
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-black/10 p-3">
          <div className="text-[11px] text-muted">Đa dạng lưu phái</div>
          <div className="mt-0.5 text-[18px] font-bold tabular-nums text-ink">
            {classes.length}
            <span className="text-[12px] font-normal text-muted">/7</span>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-black/10 p-3">
          <div className="text-[11px] text-muted">Đang trực tuyến</div>
          <div className="mt-0.5 text-[18px] font-bold tabular-nums text-jade">
            {online}
            <span className="text-[12px] font-normal text-muted">/{team.length}</span>
          </div>
        </div>
      </div>
      {classes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {classes.map((c) => (
            <span key={c} className="chip !h-6 !text-[11px]" style={{ color: CLASSES[c].palette.accent }}>
              <span className="han text-[12px]">{CLASSES[c].han[0]}</span>
              {CLASSES[c].name}
            </span>
          ))}
        </div>
      )}
    </Panel>
  )
}

/* ------------------------------------------------------------------ */

export default function TeamBuilderPage() {
  const members = useGuild((s) => s.members)
  const teams = useGuild((s) => s.teams)
  const saveTeam = useGuild((s) => s.saveTeam)
  const deleteTeam = useGuild((s) => s.deleteTeam)
  const memberMap = useMemberMap()
  const orgType = useOrgType()
  const w = useOrgWords()

  // mặc định: phó bản mới nhất vừa sĩ số tổ chức (Kim Lan 12 người → Vĩnh Dạ Tinh Đô, team 7 người → phó bản 6 người)
  const [dungeonId, setDungeonId] = useState(() => {
    const fits = DUNGEONS.filter((d) => minPartySize(d) <= Math.max(PARTY_SIZE, members.length))
    return (fits.at(-1) ?? DUNGEONS[0]).id
  })
  const [pickedMode, setMode] = useState<DungeonMode>('anh-hung')
  const dungeon = DUNGEON_MAP[dungeonId] ?? DUNGEONS[0]
  const mode = modeFor(dungeon, pickedMode)
  const size = dungeon.size
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(size).fill(null))
  const [loadedTemplate, setLoadedTemplate] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [classFilter, setClassFilter] = useState<'all' | ClassId>('all')
  const [sortKey, setSortKey] = useState<SortKey>('power')
  const [dragging, setDragging] = useState<string | null>(null)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const canManage = useCan('team.manage')

  const exists = (id: string) => !!memberMap[id]

  // đổi phó bản → co giãn trận hình
  useEffect(() => {
    setSlots((s) => fitSlots(s, size, (id) => !!memberMap[id]))
  }, [size, memberMap])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const inTeam = useMemo(() => new Set(slots.filter(Boolean) as string[]), [slots])
  const team = useMemo(() => slots.map((id) => (id ? memberMap[id] : undefined)).filter(Boolean) as Member[], [slots, memberMap])

  const roster = useMemo(() => {
    const q = normalize(search.trim())
    const list = members.filter(
      (m) =>
        !inTeam.has(m.id) &&
        (roleFilter === 'all' || roleOfMember(m) === roleFilter) &&
        (classFilter === 'all' || m.classId === classFilter) &&
        (!q || normalize(`${m.name} ${CLASSES[m.classId].name}`).includes(q)),
    )
    return list.sort((a, b) => (sortKey === 'power' ? b.power - a.power : sortKey === 'activity' ? b.activity - a.activity : a.name.localeCompare(b.name, 'vi')))
  }, [members, inTeam, search, roleFilter, classFilter, sortKey])

  const addToFirstEmpty = (id: string) => {
    const idx = slots.findIndex((x) => !x)
    if (idx < 0) {
      toast({ tone: 'error', title: 'Trận hình đã đủ người', desc: `${dungeon.name} tối đa ${size} người.` })
      return
    }
    setSlots((s) => s.map((x, i) => (i === idx ? id : x)))
  }

  const removeAt = (i: number) => setSlots((s) => s.map((x, j) => (j === i ? null : x)))

  const onDragStart = (e: DragStartEvent) => setDragging((e.active.data.current as DragData | undefined)?.memberId ?? null)

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null)
    const data = e.active.data.current as DragData | undefined
    const overId = e.over?.id ? String(e.over.id) : null
    if (!data || !overId) return
    if (overId === 'drop:roster') {
      if (data.fromSlot !== undefined) removeAt(data.fromSlot)
      return
    }
    if (!overId.startsWith('drop:')) return
    const target = Number(overId.slice(5))
    setSlots((prev) => {
      const next = [...prev]
      if (data.fromSlot !== undefined) {
        ;[next[data.fromSlot], next[target]] = [next[target], next[data.fromSlot]]
      } else {
        const existing = next.indexOf(data.memberId)
        if (existing >= 0) [next[existing], next[target]] = [next[target], next[existing]]
        else next[target] = data.memberId
      }
      return next
    })
  }

  const runAutoFill = () => {
    setSlots(autoFill(members, size))
    setLoadedTemplate(null)
    toast({ tone: 'gold', title: 'Quân sư đã bày trận', desc: 'Đủ chỉ tiêu vai trò, ưu tiên cao thủ đang trực tuyến.' })
  }

  const clearTeam = () => {
    setSlots(Array(size).fill(null))
    setLoadedTemplate(null)
  }

  const copyTeam = async () => {
    const groups = Math.ceil(size / PARTY_SIZE)
    const lines = [`【${dungeon.name} · ${MODES[mode].name}】`]
    for (let g = 0; g < groups; g++) {
      const names = slots
        .slice(g * PARTY_SIZE, (g + 1) * PARTY_SIZE)
        .map((id) => (id && memberMap[id] ? `${memberMap[id].name} (${CLASSES[memberMap[id].classId].name})` : '—'))
      lines.push(`Tổ ${g + 1}: ${names.join(', ')}`)
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      toast({ tone: 'success', title: 'Đã sao chép đội hình', desc: 'Dán vào Discord/Zalo để báo danh.' })
    } catch {
      toast({ tone: 'error', title: 'Không sao chép được', desc: 'Trình duyệt chặn quyền clipboard.' })
    }
  }

  const openSave = () => {
    if (!team.length) return toast({ tone: 'error', title: 'Trận hình đang trống' })
    const current = teams.find((t) => t.id === loadedTemplate)
    setSaveName(current?.name ?? `Đội ${dungeon.name} · ${MODES[mode].name}`)
    setSaveOpen(true)
  }

  const doSave = async (asNew: boolean) => {
    if (saving) return
    if (!canManage) return toast({ tone: 'error', title: 'Chưa đủ quyền lưu mẫu', desc: `${permHint('team.manage', orgType)}.` })
    const name = saveName.trim()
    if (!name) return toast({ tone: 'error', title: 'Hãy đặt tên cho mẫu đội hình' })
    if (name.length > 40) return toast({ tone: 'error', title: 'Tên quá dài (tối đa 40 ký tự)' })
    setSaving(true)
    const r = await saveTeam({
      id: asNew ? undefined : (loadedTemplate ?? undefined),
      name,
      dungeonId: dungeon.id,
      slots: slots.map((id) => (id && exists(id) ? id : null)),
    })
    setSaving(false)
    if (!r.ok) return toast({ tone: 'error', title: 'Chưa lưu được mẫu', desc: r.error })
    setLoadedTemplate(r.data.id)
    setSaveOpen(false)
    toast({ tone: 'success', title: asNew || !loadedTemplate ? 'Đã lưu mẫu đội hình' : 'Đã cập nhật mẫu', desc: name })
  }

  const loadTemplate = (id: string) => {
    const t = teams.find((x) => x.id === id)
    if (!t) return
    const d = t.dungeonId && DUNGEON_MAP[t.dungeonId] ? DUNGEON_MAP[t.dungeonId] : dungeon
    setDungeonId(d.id)
    const fitted = fitSlots(t.slots, d.size, exists)
    setSlots(fitted)
    setLoadedTemplate(t.id)
    const dropped = t.slots.filter(Boolean).length - fitted.filter(Boolean).length
    toast({
      tone: 'info',
      title: `Đã nạp "${t.name}"`,
      desc: dropped > 0 ? `${dropped} vị trí bị bỏ do khác sĩ số hoặc ${w.member} đã rời ${w.short}.` : `${fitted.filter(Boolean).length} thành viên vào vị trí.`,
    })
  }

  const groups = Math.ceil(size / PARTY_SIZE)
  const filled = team.length
  const draggingMember = dragging ? memberMap[dragging] : undefined

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={orgType === 'kimlan' ? 'Kim Lan · Bày Trận' : 'Chinh Chiến · Bày Trận'}
        title="Bày Trận Xuất Chinh"
        han="阵"
        description={`Kéo thả ${w.member} vào trận hình, quân sư sẽ luận xem đội có đủ sức hạ boss hay không.`}
        actions={
          <>
            <button className="btn btn-gold" onClick={runAutoFill}>
              <WandSparkles size={16} /> Tự xếp đội
            </button>
            <button className="btn" onClick={openSave} disabled={!canManage} title={canManage ? undefined : permHint('team.manage', orgType)}>
              {canManage ? <Save size={16} /> : <Lock size={15} />} Lưu mẫu
            </button>
            <button className="btn btn-ghost" onClick={copyTeam} disabled={!filled}>
              <Copy size={16} /> Sao chép
            </button>
            <button className="btn btn-ghost" onClick={clearTeam} disabled={!filled}>
              <Trash size={16} /> Xóa đội
            </button>
          </>
        }
      />

      {/* cấu hình */}
      <Panel className="flex flex-col gap-3 !py-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <span className="han grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[20px]" style={{ background: `color-mix(in oklab, ${dungeon.color} 18%, transparent)`, color: dungeon.color }}>
            {dungeon.han[0]}
          </span>
          <select
            className="field !w-auto min-w-[220px]"
            value={dungeonId}
            onChange={(e) => {
              setDungeonId(e.target.value)
              setLoadedTemplate(null)
            }}
            aria-label="Chọn phó bản"
          >
            {DUNGEONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {partyLabel(d)} người
              </option>
            ))}
          </select>
        </div>
        <Segmented value={mode} onChange={setMode} options={dungeon.modes.map((m) => ({ value: m, label: MODES[m].name }))} />
        <div className="flex items-center gap-2 md:ml-auto">
          <span className="chip !h-8 !px-3">
            <Users size={13} className="text-gold" />
            <b className="tabular-nums text-ink">
              {filled}/{size}
            </b>
            đã vào trận
          </span>
          {loadedTemplate && (
            <span className="chip !h-8 !px-3 text-gold">
              <FolderOpen size={13} /> {teams.find((t) => t.id === loadedTemplate)?.name}
            </span>
          )}
        </div>
      </Panel>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_320px]">
          {/* danh sách thành viên */}
          <RosterDrop className="lg:sticky lg:top-20 lg:self-start">
            <Panel corners className="flex flex-col !p-4 lg:max-h-[calc(100dvh-110px)]">
              <SectionTitle han="众" title={w.Member} subtitle={`Còn ${roster.length} người chưa vào trận`} />
              <div className="relative mb-2">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input className="field !h-9 pl-9 !text-[13px]" placeholder={`Tìm ${w.member}…`} value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Segmented
                size="sm"
                className="mb-2 w-full"
                value={roleFilter}
                onChange={setRoleFilter}
                options={[
                  { value: 'all' as RoleFilter, label: 'Tất cả' },
                  { value: 'tank' as RoleFilter, label: 'Tank' },
                  { value: 'healer' as RoleFilter, label: 'Trị liệu' },
                  { value: 'dps' as RoleFilter, label: 'DPS' },
                ]}
              />
              <div className="mb-2 grid grid-cols-2 gap-2">
                <select className="field !h-8 !text-[12px]" value={classFilter} onChange={(e) => setClassFilter(e.target.value as 'all' | ClassId)} aria-label="Lọc lưu phái">
                  <option value="all">Mọi lưu phái</option>
                  {CLASS_IDS.map((c) => (
                    <option key={c} value={c}>
                      {CLASSES[c].name}
                    </option>
                  ))}
                </select>
                <select className="field !h-8 !text-[12px]" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} aria-label="Sắp xếp">
                  <option value="power">Chiến lực</option>
                  <option value="activity">Sôi nổi</option>
                  <option value="name">Tên A–Z</option>
                </select>
              </div>
              <div className="-mx-1 max-h-[420px] min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1 lg:max-h-none">
                {roster.map((m) => (
                  <RosterCard key={m.id} member={m} onAdd={addToFirstEmpty} />
                ))}
                {roster.length === 0 && <p className="py-8 text-center text-[12.5px] text-muted">Không còn ai phù hợp bộ lọc.</p>}
              </div>
              <p className="mt-2 border-t border-line pt-2 text-center text-[11px] text-muted">Kéo người trong trận thả vào đây để rút khỏi đội</p>
            </Panel>
          </RosterDrop>

          {/* trận hình */}
          <div className="min-w-0 space-y-4">
            {Array.from({ length: groups }, (_, g) => {
              const groupMembers = slots.slice(g * PARTY_SIZE, (g + 1) * PARTY_SIZE).filter(Boolean).length
              return (
                <motion.div key={`${dungeon.id}-${g}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * g }}>
                  <Panel className="!p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="seal h-7 w-7 text-[15px]">{'一二三四五'[g]}</span>
                        <span className="title-display text-[19px] text-ink">Tổ {g + 1}</span>
                      </div>
                      <span className="text-[11.5px] tabular-nums text-muted">
                        {groupMembers}/{PARTY_SIZE}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
                      {Array.from({ length: PARTY_SIZE }, (_, k) => {
                        const i = g * PARTY_SIZE + k
                        if (i >= size) return null
                        const id = slots[i]
                        return <Slot key={i} index={i} member={id ? memberMap[id] : undefined} hint={SLOT_ROLE[k]} onRemove={removeAt} />
                      })}
                    </div>
                  </Panel>
                </motion.div>
              )
            })}
            <div className="2xl:hidden">
              <Analysis team={team} size={size} rec={dungeon.recommendedPower[mode] ?? 0} />
            </div>
          </div>

          <div className="hidden 2xl:block">
            <div className="sticky top-20">
              <Analysis team={team} size={size} rec={dungeon.recommendedPower[mode] ?? 0} />
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.22,1,.36,1)' }}>{draggingMember ? <DragGhost member={draggingMember} /> : null}</DragOverlay>
      </DndContext>

      {/* mẫu đã lưu */}
      <Panel corners>
        <SectionTitle han="谱" title="Trận phổ đã lưu" subtitle="Nạp lại đội hình quen thuộc chỉ với một lần bấm" right={<Sparkles size={16} className="text-gold" />} />
        {teams.length === 0 ? (
          <EmptyState han="谱" title="Chưa có trận phổ nào" desc="Bày xong đội hình thì bấm “Lưu mẫu” để dùng lại cho các tuần sau." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {teams.map((t) => {
              const d = t.dungeonId ? DUNGEON_MAP[t.dungeonId] : undefined
              const ids = t.slots.filter((x): x is string => !!x && !!memberMap[x])
              const avg = ids.length ? sum(ids.map((id) => memberMap[id].power)) / ids.length : 0
              const active = t.id === loadedTemplate
              return (
                <div key={t.id} className={cn('rounded-2xl border bg-black/10 p-4 transition', active ? 'border-line-strong' : 'border-line')}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-bold text-ink">{t.name}</div>
                      <div className="text-[11.5px] text-muted">
                        {d ? `${d.name} · ${partyLabel(d)} người` : 'Không rõ phó bản'} · {fmtDate(t.createdAt)}
                      </div>
                    </div>
                    {active && <span className="chip !h-5 shrink-0 text-gold">Đang dùng</span>}
                  </div>
                  <div className="mt-3 flex -space-x-2">
                    {ids.slice(0, 8).map((id) => {
                      const m = memberMap[id]
                      return <ChibiAvatar key={id} look={m.look} classId={m.classId} rank={m.rank} size={28} className="ring-2 ring-[var(--surface-solid)] rounded-full" />
                    })}
                    {ids.length > 8 && (
                      <span className="grid h-7 w-7 place-items-center rounded-full border border-line bg-[var(--surface-solid)] text-[10.5px] text-muted">+{ids.length - 8}</span>
                    )}
                  </div>
                  <div className="mt-2 text-[11.5px] text-muted">
                    {ids.length} người · chiến lực TB <b className="tabular-nums text-ink-2">{fmtCompact(avg)}</b>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="btn btn-sm flex-1" onClick={() => loadTemplate(t.id)}>
                      <FolderOpen size={14} /> Dùng
                    </button>
                    {!canManage ? (
                      <span className="btn btn-sm btn-ghost btn-icon pointer-events-auto cursor-not-allowed opacity-45" title={permHint('team.manage', orgType)} aria-label="Không đủ quyền xóa">
                        <Lock size={13} />
                      </span>
                    ) : confirmDelete === t.id ? (
                      <button
                        className="btn btn-sm btn-cinnabar"
                        onClick={async () => {
                          setConfirmDelete(null)
                          // store tự báo lỗi nếu server từ chối
                          const r = await deleteTeam(t.id)
                          if (!r.ok) return
                          if (loadedTemplate === t.id) setLoadedTemplate(null)
                          toast({ tone: 'info', title: 'Đã xóa trận phổ', desc: t.name })
                        }}
                        onBlur={() => setConfirmDelete(null)}
                      >
                        Chắc chắn?
                      </button>
                    ) : (
                      <button className="btn btn-sm btn-ghost btn-icon" onClick={() => setConfirmDelete(t.id)} aria-label={`Xóa ${t.name}`}>
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Lưu trận phổ"
        han="谱"
        subtitle={`${filled} người · ${dungeon.name}`}
        size="sm"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setSaveOpen(false)} disabled={saving}>
              Hủy
            </button>
            {loadedTemplate && (
              <button className="btn" onClick={() => doSave(true)} disabled={saving}>
                Lưu thành mẫu mới
              </button>
            )}
            <button className="btn btn-gold" onClick={() => doSave(false)} disabled={saving}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {loadedTemplate ? 'Cập nhật mẫu' : 'Lưu'}
            </button>
          </>
        }
      >
        <Field label="Tên trận phổ" hint="Ví dụ: Đội chủ lực tối thứ Năm (tối đa 40 ký tự)">
          <input className="field" value={saveName} onChange={(e) => setSaveName(e.target.value)} autoFocus maxLength={40} onKeyDown={(e) => e.key === 'Enter' && doSave(false)} />
        </Field>
      </Modal>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, Search, Swords, X } from 'lucide-react'
import { CLASSES, DUNGEONS, DUNGEON_MAP, MODES, MODE_IDS } from '@/domain/constants'
import type { DungeonMode } from '@/domain/types'
import { useFeature, useGuild } from '@/store/guild'
import { useOrgWords } from '@/pages/dashboard/orgWords'
import { celebrate, toast } from '@/store/ui'
import { cn, fmtCompact, normalize } from '@/lib/utils'
import { Field, Modal } from '@/components/ui/Modal'
import { Segmented } from '@/components/ui/Segmented'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'

function parseDuration(text: string): number | null {
  const m = /^\s*(\d{1,3})\s*:\s*([0-5]\d)\s*$/.exec(text)
  if (!m) return null
  const sec = Number(m[1]) * 60 + Number(m[2])
  return sec > 0 ? sec : null
}

/** Hộp thoại ghi nhận một lượt hạ boss */
export function RecordClearModal({
  open,
  onClose,
  defaultDungeonId,
  defaultMode,
}: {
  open: boolean
  onClose: () => void
  defaultDungeonId: string
  defaultMode: DungeonMode
}) {
  const members = useGuild((s) => s.members)
  const teams = useGuild((s) => s.teams)
  const progress = useGuild((s) => s.progress)
  const recordClear = useGuild((s) => s.recordClear)
  // cống hiến chỉ được ghi khi tổ chức có Quỹ & Đấu Giá
  const hasCredit = useFeature('bang-kho')
  const w = useOrgWords()

  const [dungeonId, setDungeonId] = useState(defaultDungeonId)
  const [mode, setMode] = useState<DungeonMode>(defaultMode)
  const [bossId, setBossId] = useState('')
  const [duration, setDuration] = useState('6:30')
  const [wipes, setWipes] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [mvpId, setMvpId] = useState('')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)

  const dungeon = DUNGEON_MAP[dungeonId] ?? DUNGEONS[0]

  // mở lại → nạp mặc định
  useEffect(() => {
    if (!open) return
    setDungeonId(defaultDungeonId)
    setMode(defaultMode)
    setDuration('6:30')
    setWipes(0)
    setSelected([])
    setMvpId('')
    setSearch('')
  }, [open, defaultDungeonId, defaultMode])

  // boss mặc định = ải chưa hạ đầu tiên của độ khó, nếu hết thì ải cuối
  useEffect(() => {
    const map = progress[dungeon.id]?.[mode] ?? {}
    const next = dungeon.bosses.find((b) => (map[b.id]?.kills ?? 0) === 0) ?? dungeon.bosses[dungeon.bosses.length - 1]
    setBossId(next.id)
  }, [dungeon, mode, progress])

  // bỏ bớt người khi đổi sang phó bản nhỏ hơn
  useEffect(() => {
    setSelected((s) => s.slice(0, dungeon.size))
  }, [dungeon.size])

  useEffect(() => {
    if (mvpId && !selected.includes(mvpId)) setMvpId('')
  }, [selected, mvpId])

  const sorted = useMemo(() => [...members].sort((a, b) => b.power - a.power), [members])
  const visible = useMemo(() => {
    const q = normalize(search.trim())
    if (!q) return sorted
    return sorted.filter((m) => normalize(`${m.name} ${CLASSES[m.classId].name}`).includes(q))
  }, [sorted, search])

  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members])

  const toggle = (id: string) => {
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id)
      if (s.length >= dungeon.size) {
        toast({ tone: 'error', title: 'Đội đã đủ người', desc: `${dungeon.name} chỉ cho phép ${dungeon.size} người.` })
        return s
      }
      return [...s, id]
    })
  }

  const loadTemplate = (teamId: string) => {
    const t = teams.find((x) => x.id === teamId)
    if (!t) return
    const ids = t.slots.filter((x): x is string => !!x && !!memberById[x]).slice(0, dungeon.size)
    setSelected(ids)
    toast({ tone: 'info', title: `Đã nạp đội hình "${t.name}"`, desc: `${ids.length} ${w.member}` })
  }

  const submit = async () => {
    if (busy) return
    const sec = parseDuration(duration)
    if (sec === null) return toast({ tone: 'error', title: 'Thời gian không hợp lệ', desc: 'Nhập theo dạng phút:giây, ví dụ 7:45.' })
    if (sec < 30 || sec > 7200) return toast({ tone: 'error', title: 'Thời gian không hợp lệ', desc: 'Một lượt clear từ 0:30 đến 120:00.' })
    if (selected.length < 1) return toast({ tone: 'error', title: 'Chưa chọn thành viên nào' })
    if (selected.length > dungeon.size) return toast({ tone: 'error', title: `Tối đa ${dungeon.size} người` })
    if (!mvpId || !selected.includes(mvpId)) return toast({ tone: 'error', title: 'Hãy chọn MVP trong đội' })
    if (wipes < 0 || wipes > 50 || !Number.isFinite(wipes)) return toast({ tone: 'error', title: 'Số lần wipe không hợp lệ', desc: 'Từ 0 đến 50.' })
    const boss = dungeon.bosses.find((b) => b.id === bossId)
    if (!boss) return toast({ tone: 'error', title: 'Hãy chọn boss' })

    setBusy(true)
    const r = await recordClear({
      dungeonId: dungeon.id,
      mode,
      bossId: boss.id,
      date: new Date().toISOString(),
      durationSec: sec,
      memberIds: selected,
      mvpId,
      wipes: Math.round(wipes),
    })
    setBusy(false)
    if (!r.ok) return toast({ tone: 'error', title: 'Chưa ghi nhận được', desc: r.error })
    const { firstKill, newRecord } = r.data
    const reward = dungeon.size * (mode === 'ac-mong' ? 12 : mode === 'anh-hung' ? 8 : 5)
    if (firstKill) {
      celebrate({ han: '斩', title: 'First Kill!', subtitle: `${boss.name} · ${dungeon.name} (${MODES[mode].name})` })
    } else if (newRecord) {
      toast({ tone: 'gold', title: 'Kỷ lục mới!', desc: `${boss.name} gục ngã chỉ sau ${duration.trim()}.` })
    } else {
      toast({
        tone: 'success',
        title: 'Đã ghi nhận lượt clear',
        desc: hasCredit ? `+${reward} cống hiến cho mỗi người trong đội.` : `${boss.name} · ${dungeon.name} (${MODES[mode].name})`,
      })
    }
    onClose()
  }

  const bossMap = progress[dungeon.id]?.[mode] ?? {}

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ghi nhận lượt clear"
      han="斩"
      subtitle={hasCredit ? `Mỗi ${w.member} tham gia được cộng điểm cống hiến` : `Khắc tên ${w.all} vào sử ký chinh phạt`}
      size="xl"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Hủy
          </button>
          <button className="btn btn-gold" onClick={submit} disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Swords size={16} />} {busy ? 'Đang ghi…' : 'Ghi nhận'}
          </button>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
        {/* cột trái: thông tin trận */}
        <div className="space-y-4">
          <Field label="Phó bản">
            <select className="field" value={dungeonId} onChange={(e) => setDungeonId(e.target.value)}>
              {DUNGEONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.size} người
                </option>
              ))}
            </select>
          </Field>
          <div>
            <span className="label">Độ khó</span>
            <Segmented
              value={mode}
              onChange={setMode}
              options={MODE_IDS.map((m) => ({ value: m, label: MODES[m].name }))}
            />
          </div>
          <div>
            <span className="label">Boss</span>
            <div className="grid gap-1.5">
              {dungeon.bosses.map((b, i) => {
                const killed = (bossMap[b.id]?.kills ?? 0) > 0
                const active = b.id === bossId
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBossId(b.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition',
                      active ? 'border-line-strong bg-[color-mix(in_oklab,var(--gold)_12%,transparent)]' : 'border-line hover:border-line-strong',
                    )}
                  >
                    <span
                      className="han grid h-8 w-8 shrink-0 place-items-center rounded-full text-[16px] text-white"
                      style={{ background: b.color, opacity: killed ? 1 : 0.65 }}
                    >
                      {b.glyph}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink">
                        Ải {i + 1} · {b.name}
                      </span>
                      <span className="block text-[11px] text-muted">{killed ? `Đã hạ ${bossMap[b.id]?.kills} lần` : 'Chưa từng hạ — first kill!'}</span>
                    </span>
                    {active && <Check size={16} className="text-gold" />}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Thời gian (phút:giây)" hint="Ví dụ 7:45">
              <input className="field tabular-nums" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="7:45" inputMode="numeric" />
            </Field>
            <Field label="Số lần wipe">
              <input
                className="field tabular-nums"
                type="number"
                min={0}
                max={50}
                value={wipes}
                onChange={(e) => setWipes(Math.max(0, Number(e.target.value) || 0))}
              />
            </Field>
          </div>
          <Field label="MVP" hint="Chọn trong số thành viên tham gia">
            <select className="field" value={mvpId} onChange={(e) => setMvpId(e.target.value)} disabled={!selected.length}>
              <option value="">{selected.length ? '— Chọn MVP —' : 'Chọn thành viên trước'}</option>
              {selected.map((id) => {
                const m = memberById[id]
                return m ? (
                  <option key={id} value={id}>
                    {m.name} · {CLASSES[m.classId].name}
                  </option>
                ) : null
              })}
            </select>
          </Field>
        </div>

        {/* cột phải: chọn đội */}
        <div className="flex min-h-0 flex-col">
          <div className="mb-2 flex items-center justify-between">
            <span className="label !mb-0">Thành viên tham gia</span>
            <span className={cn('chip', selected.length === dungeon.size && 'text-gold')}>
              {selected.length}/{dungeon.size}
            </span>
          </div>
          <div className="mb-2 flex flex-wrap gap-2">
            <select className="field !h-9 flex-1 !text-[13px]" value="" onChange={(e) => e.target.value && loadTemplate(e.target.value)}>
              <option value="">Dùng đội hình đã lưu…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {selected.length > 0 && (
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelected([])}>
                <X size={14} /> Bỏ chọn
              </button>
            )}
          </div>
          <div className="relative mb-2">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="field !h-9 pl-9 !text-[13px]" placeholder="Tìm theo tên hoặc lưu phái…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="max-h-[360px] flex-1 space-y-1 overflow-y-auto pr-1">
            {visible.map((m) => {
              const on = selected.includes(m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-1.5 text-left transition',
                    on ? 'border-line-strong bg-[color-mix(in_oklab,var(--gold)_12%,transparent)]' : 'border-transparent hover:bg-white/[0.03]',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-5 w-5 shrink-0 place-items-center rounded-md border transition',
                      on ? 'border-transparent bg-gold text-[#1b1406]' : 'border-line-strong',
                    )}
                  >
                    {on && <Check size={13} strokeWidth={3} />}
                  </span>
                  <ChibiAvatar look={m.look} classId={m.classId} rank={m.rank} status={m.status} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{m.name}</span>
                    <span className="block truncate text-[11px] text-muted">{CLASSES[m.classId].name}</span>
                  </span>
                  <span className="text-[12px] font-semibold tabular-nums text-ink-2">{fmtCompact(m.power)}</span>
                  {mvpId === m.id && <span className="chip !h-5 text-gold">MVP</span>}
                </button>
              )
            })}
            {visible.length === 0 && <p className="py-6 text-center text-[13px] text-muted">Không tìm thấy thành viên.</p>}
          </div>
        </div>
      </div>
    </Modal>
  )
}

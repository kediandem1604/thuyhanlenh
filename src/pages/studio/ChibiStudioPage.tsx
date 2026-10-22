import { useMemo, useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Check, Dices, Download, RotateCcw, Save, Sparkles } from 'lucide-react'
import { rankLabel, useCan, useCurrentUser, useGuild, useOrg, useOrgType } from '@/store/guild'
import { celebrate, toast } from '@/store/ui'
import { CLASSES, CLASS_IDS, RANKS } from '@/domain/constants'
import { ORG_TYPES, RANK_IDS_BY_TYPE } from '@/domain/orgs'
import type { ChibiLook, ClassId } from '@/domain/types'
import { lookFromSeed, randomLook } from '@/data/seed'
import { alpha } from '@/lib/color'
import { cn, createRng } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, SectionTitle } from '@/components/ui/Panel'
import { ClassBadge, RankSeal } from '@/components/ui/Badges'
import { Chibi } from '@/components/chibi/Chibi'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { SeatSeal } from '@/pages/members/orgRoster'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { ACCESSORIES, BACK_HAIR, BANGS, EXPRESSIONS, EYE_SWATCHES, GENDERS, HAIR_SWATCHES, MOODS, PRESETS, SKIN_SWATCHES } from './options'
import { downloadSvgAsPng, slugify } from './exportPng'

/* ------------------------------------------------------------------ */
/* Ô chọn                                                              */
/* ------------------------------------------------------------------ */

function Group({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="label !mb-0">{label}</span>
        {hint && <span className="truncate text-[11px] text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function Pills<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; title?: string }[]
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              'h-8 rounded-[10px] border px-3 text-[12.5px] font-semibold transition',
              active
                ? 'bg-gold-grad text-on-gold border-transparent shadow-[0_6px_18px_-8px_var(--gold-shadow)]'
                : 'border-line bg-[color-mix(in_oklab,var(--bg)_45%,transparent)] text-ink-2 hover:border-line-strong hover:text-ink',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function Swatches({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value.toLowerCase() === value.toLowerCase()
        return (
          <button
            key={o.value}
            type="button"
            title={o.label}
            aria-label={o.label}
            onClick={() => onChange(o.value)}
            className={cn('relative grid h-8 w-8 place-items-center rounded-full transition hover:scale-110', active && 'scale-110')}
            style={{
              background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${o.value} 70%, white), ${o.value} 60%)`,
              boxShadow: active
                ? `0 0 0 2px var(--surface-solid), 0 0 0 4px var(--gold), 0 4px 14px -4px ${o.value}`
                : `0 0 0 1px var(--line-strong), 0 3px 10px -4px rgba(0,0,0,.5)`,
            }}
          >
            {active && <Check size={13} strokeWidth={3} style={{ color: '#fff', filter: 'drop-shadow(0 0 2px rgba(0,0,0,.8))' }} />}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */

const sameLook = (a: ChibiLook, b: ChibiLook) => JSON.stringify(a) === JSON.stringify(b)

export default function ChibiStudioPage() {
  const members = useGuild((s) => s.members)
  const currentUserId = useGuild((s) => s.currentUserId)
  const updateMember = useGuild((s) => s.updateMember)
  const wide = useMediaQuery('(min-width: 640px)')

  const initial = members.find((m) => m.id === currentUserId) ?? members[0]
  const [memberId, setMemberId] = useState(initial?.id ?? '')
  const member = members.find((m) => m.id === memberId) ?? initial
  const [draft, setDraft] = useState<ChibiLook>(() => initial?.look ?? lookFromSeed('studio', 'to-van'))
  const [previewClass, setPreviewClass] = useState<ClassId>(initial?.classId ?? 'to-van')
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const me = useCurrentUser()
  const canEditOthers = useCan('member.edit')
  const org = useOrg()
  const type = useOrgType()
  const info = ORG_TYPES[type]
  const stageRef = useRef<HTMLDivElement>(null)

  // xếp theo chức vụ của loại tổ chức (Kim Lan: theo ghế)
  const sortedMembers = useMemo(() => {
    const order = RANK_IDS_BY_TYPE[type]
    return [...members].sort((a, b) =>
      type === 'kimlan'
        ? (a.seat ?? 99) - (b.seat ?? 99) || a.name.localeCompare(b.name, 'vi')
        : order.indexOf(a.rank) - order.indexOf(b.rank) || a.name.localeCompare(b.name, 'vi'),
    )
  }, [members, type])

  const presets = useMemo(
    () =>
      PRESETS.map((p) => ({
        ...p,
        look: { ...lookFromSeed(p.seed, previewClass, p.gender), mood: p.mood, expression: p.expression } as ChibiLook,
      })),
    [previewClass],
  )

  if (!member) return null

  const dirty = !sameLook(draft, member.look)
  const palette = CLASSES[previewClass].palette
  const set = <K extends keyof ChibiLook>(key: K, v: ChibiLook[K]) => setDraft((d) => ({ ...d, [key]: v }))

  const pickMember = (id: string) => {
    const m = members.find((x) => x.id === id)
    if (!m) return
    setMemberId(id)
    setDraft(m.look)
    setPreviewClass(m.classId)
  }

  const randomize = () => {
    const look = randomLook(createRng(Math.floor(Math.random() * 1e9)), draft.gender, previewClass)
    setDraft(look)
  }

  // chỉ lưu được tạo hình của mình, hoặc của người thấp hơn khi có quyền member.edit —
  // nhân vật dùng chung đã có chủ tài khoản thì chỉ chủ nhân vật tự sửa
  const isMine = !!me && member.id === me.id
  const ownedByOther = !isMine && !!member.claimed
  const canSave =
    !!me && (isMine || (canEditOthers && !ownedByOther && (me.rank === info.leaderRank || RANKS[me.rank].order < RANKS[member.rank].order)))
  const saveHint = ownedByOther
    ? 'Nhân vật đã có chủ — chỉ chủ tài khoản mới sửa được. Vẫn có thể tải PNG.'
    : 'Chỉ lưu được tạo hình của mình (hoặc của người thấp hơn khi có quyền sửa thành viên). Vẫn có thể tải PNG.'

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    const r = await updateMember(member.id, { look: draft })
    setSaving(false)
    if (!r.ok) return toast({ tone: 'error', title: 'Chưa lưu được tạo hình', desc: r.error })
    toast({ tone: 'success', title: 'Đã lưu tạo hình', desc: `${member.name} khoác lên diện mạo mới.` })
    celebrate({ title: 'Diện mạo mới!', subtitle: `${member.name} vừa bước ra từ Xưởng Chibi`, han: '绘' })
  }

  const exportPng = async () => {
    const svg = stageRef.current?.querySelector('svg')
    if (!svg) return
    setBusy(true)
    try {
      await downloadSvgAsPng(svg, `chibi-${slugify(member.name)}.png`, 3)
      toast({ tone: 'gold', title: 'Đã tải ảnh PNG', desc: 'Dùng làm ảnh đại diện Discord / Zalo nhé!' })
    } catch (e) {
      toast({ tone: 'error', title: 'Không xuất được ảnh', desc: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Vinh Quang · Họa Các"
        title="Xưởng Chibi"
        han="绘"
        description={`Tự tay vẽ lại diện mạo chibi cho bản thân hoặc ${info.memberWord} trong ${org?.name ?? info.name} — từ mái tóc, ánh mắt đến khí chất.`}
        actions={
          <label className="flex items-center gap-2">
            <span className="hidden whitespace-nowrap text-[12.5px] text-muted sm:inline">Đang chỉnh:</span>
            <select className="field !h-10 min-w-[220px]" value={member.id} onChange={(e) => pickMember(e.target.value)} aria-label="Chọn thành viên">
              {sortedMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {rankLabel(m)}
                  {m.id === currentUserId ? ' (bạn)' : ''}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* ---------------- Sân khấu ---------------- */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Panel corners padded={false} className="relative overflow-hidden">
            <div
              ref={stageRef}
              className="relative flex h-[380px] flex-col items-center justify-end overflow-hidden sm:h-[470px]"
              style={{
                background: `radial-gradient(520px 340px at 50% 58%, ${alpha(palette.accent, 0.26)}, transparent 70%), linear-gradient(180deg, color-mix(in oklab, var(--bg) 40%, transparent), transparent 60%)`,
              }}
            >
              {/* trăng + vòng xoay + chữ Hán chìm */}
              <div
                aria-hidden
                className="absolute right-[10%] top-[8%] h-20 w-20 rounded-full sm:h-24 sm:w-24"
                style={{
                  background: 'radial-gradient(circle at 40% 38%, color-mix(in oklab, var(--moon) 100%, white 15%), var(--moon) 60%)',
                  boxShadow: '0 0 60px 14px color-mix(in oklab, var(--moon) 22%, transparent)',
                  opacity: 0.8,
                }}
              />
              <div aria-hidden className="animate-spin-slow absolute left-1/2 top-[46%] h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed" style={{ borderColor: alpha(palette.accent, 0.3) }} />
              <div aria-hidden className="absolute left-1/2 top-[46%] h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full border" style={{ borderColor: alpha(palette.trim, 0.2) }} />
              <span aria-hidden className="han pointer-events-none absolute left-4 top-2 select-none text-[120px] leading-none opacity-[0.08] sm:text-[150px]" style={{ color: palette.accent }}>
                {CLASSES[previewClass].han[0]}
              </span>
              {[
                [14, 30],
                [82, 46],
                [24, 64],
                [74, 22],
                [60, 70],
              ].map(([x, y], i) => (
                <span
                  key={i}
                  aria-hidden
                  className="chibi-twinkle absolute h-1.5 w-1.5 rotate-45 rounded-[1px]"
                  style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.45}s`, background: i % 2 ? palette.accent : '#fff', boxShadow: `0 0 8px ${palette.accent}` }}
                />
              ))}

              <motion.div key={`${previewClass}-${draft.gender}`} initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', damping: 18 }} className="relative z-[1]">
                <Chibi look={draft} classId={previewClass} size={wide ? 320 : 236} title={`Chibi của ${member.name}`} className="drop-shadow-[0_20px_26px_rgba(0,0,0,.45)]" />
              </motion.div>
              {/* đài mây */}
              <div aria-hidden className="relative z-0 -mt-12 mb-3 h-10 w-[62%] rounded-[50%]" style={{ background: `radial-gradient(ellipse at center, ${alpha(palette.accent, 0.45)}, transparent 70%)` }} />
              <div className="relative z-[1] mb-5 flex flex-wrap items-center justify-center gap-2 px-4">
                <span className="title-display text-[22px] text-ink">{member.name}</span>
                <ClassBadge classId={previewClass} showHan />
                {previewClass !== member.classId && <span className="chip text-muted">xem thử</span>}
              </div>
            </div>
          </Panel>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button className="btn" onClick={randomize}>
              <Dices size={16} /> Ngẫu nhiên
            </button>
            <button className="btn" onClick={() => setDraft(member.look)} disabled={!dirty}>
              <RotateCcw size={16} /> Hoàn tác
            </button>
            <button
              className="btn btn-gold"
              onClick={() => void save()}
              disabled={!dirty || !canSave || saving}
              title={canSave ? undefined : saveHint}
            >
              <Save size={16} /> {saving ? 'Đang lưu…' : 'Lưu tạo hình'}
            </button>
            <button className="btn" onClick={exportPng} disabled={busy}>
              <Download size={16} /> {busy ? 'Đang vẽ…' : 'Tải PNG'}
            </button>
          </div>

          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[12.5px] font-semibold text-ink-2">Ảnh đại diện</div>
                <div className="text-[11.5px] text-muted">Hiển thị trong danh sách, bảng xếp hạng…</div>
              </div>
              <div className="flex items-end gap-4">
                {[32, 52, 80].map((s) => (
                  <ChibiAvatar key={s} look={draft} classId={previewClass} rank={member.rank} size={s} animated={s === 80} />
                ))}
              </div>
            </div>
            {dirty && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-line-strong bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] px-3 py-2 text-[12px] text-gold">
                <Sparkles size={13} /> Có thay đổi chưa lưu
              </div>
            )}
          </Panel>
        </div>

        {/* ---------------- Bảng điều khiển ---------------- */}
        <div className="space-y-4">
          <Panel corners>
            <SectionTitle han="身" title="Thân phận" subtitle="Giới tính và trang phục lưu phái" right={
                type === 'kimlan' && member.seat ? (
                  <span className="inline-flex items-center gap-2">
                    <SeatSeal seat={member.seat} size="sm" />
                    <span className="text-[12.5px] font-semibold text-ink-2">{rankLabel(member)}</span>
                  </span>
                ) : (
                  <RankSeal rank={member.rank} member={member} size="sm" />
                )
              } />
            <div className="space-y-4">
              <Group label="Giới tính">
                <Pills value={draft.gender} onChange={(v) => set('gender', v)} options={GENDERS} />
              </Group>
              <Group label="Xem thử lưu phái" hint="Chỉ đổi trang phục khi xem — lưu sẽ giữ lưu phái thật">
                <div className="flex flex-wrap gap-1.5">
                  {CLASS_IDS.map((id) => {
                    const c = CLASSES[id]
                    const active = id === previewClass
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPreviewClass(id)}
                        className="chip !h-8 !px-3 transition"
                        style={
                          active
                            ? { color: c.palette.accent, borderColor: alpha(c.palette.accent, 0.7), background: alpha(c.palette.accent, 0.16), boxShadow: `0 0 14px -6px ${c.palette.accent}` }
                            : undefined
                        }
                      >
                        <span className="han text-[14px]">{c.han[0]}</span>
                        {c.name}
                        {id === member.classId && <span className="text-[10px] text-muted">· gốc</span>}
                      </button>
                    )
                  })}
                </div>
              </Group>
            </div>
          </Panel>

          <Panel corners>
            <SectionTitle han="发" title="Mái tóc" subtitle="Kiểu mái, kiểu tóc sau và màu tóc" />
            <div className="space-y-4">
              <Group label="Kiểu mái">
                <Pills value={draft.bangs} onChange={(v) => set('bangs', v)} options={BANGS.map((label, i) => ({ value: i, label }))} />
              </Group>
              <Group label="Kiểu tóc sau">
                <Pills value={draft.backHair} onChange={(v) => set('backHair', v)} options={BACK_HAIR.map((label, i) => ({ value: i, label }))} />
              </Group>
              <Group label="Màu tóc" hint={HAIR_SWATCHES.find((s) => s.value === draft.hairColor)?.label}>
                <Swatches value={draft.hairColor} onChange={(v) => set('hairColor', v)} options={HAIR_SWATCHES} />
              </Group>
            </div>
          </Panel>

          <Panel corners>
            <SectionTitle han="颜" title="Dung mạo" subtitle="Ánh mắt, làn da và biểu cảm" />
            <div className="space-y-4">
              <Group label="Màu mắt" hint={EYE_SWATCHES.find((s) => s.value === draft.eyeColor)?.label}>
                <Swatches value={draft.eyeColor} onChange={(v) => set('eyeColor', v)} options={EYE_SWATCHES} />
              </Group>
              <Group label="Màu da" hint={SKIN_SWATCHES.find((s) => s.value === draft.skin)?.label}>
                <Swatches value={draft.skin} onChange={(v) => set('skin', v)} options={SKIN_SWATCHES} />
              </Group>
              <Group label="Biểu cảm">
                <Pills value={draft.expression} onChange={(v) => set('expression', v)} options={EXPRESSIONS} />
              </Group>
            </div>
          </Panel>

          <Panel corners>
            <SectionTitle han="气" title="Khí chất & phụ kiện" subtitle="Hiệu ứng quanh người và vật trang sức" />
            <div className="space-y-4">
              <Group label="Khí chất">
                <div className="grid grid-cols-3 gap-2">
                  {MOODS.map((m) => {
                    const active = draft.mood === m.value
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => set('mood', m.value)}
                        className={cn(
                          'rounded-xl border px-3 py-2.5 text-left transition',
                          active ? 'border-line-strong bg-[color-mix(in_oklab,var(--gold)_14%,transparent)]' : 'border-line hover:border-line-strong',
                        )}
                      >
                        <div className={cn('text-[13px] font-bold', active ? 'text-gold' : 'text-ink')}>{m.label}</div>
                        <div className="text-[11px] text-muted">{m.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </Group>
              <Group label="Phụ kiện" hint={ACCESSORIES[draft.accessory]?.hint}>
                <Pills value={draft.accessory} onChange={(v) => set('accessory', v)} options={ACCESSORIES.map((a, i) => ({ value: i, label: a.label, title: a.hint }))} />
              </Group>
            </div>
          </Panel>

          <Panel corners>
            <SectionTitle han="范" title="Phong cách gợi ý" subtitle="Bấm để áp dụng ngay, rồi tinh chỉnh tiếp" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {presets.map((p) => (
                <button
                  key={p.seed}
                  type="button"
                  onClick={() => setDraft(p.look)}
                  className="group flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-[color-mix(in_oklab,var(--bg)_40%,transparent)] p-3 transition hover:-translate-y-0.5 hover:border-line-strong"
                >
                  <span
                    className="block overflow-hidden rounded-full transition group-hover:scale-105"
                    style={{ background: `radial-gradient(circle at 50% 35%, ${alpha(palette.accent, 0.35)}, ${alpha(palette.robeDark, 0.9)} 80%)`, boxShadow: `0 0 0 1.5px ${alpha(palette.trim, 0.6)}` }}
                  >
                    <Chibi look={p.look} classId={previewClass} size={78} variant="bust" animated={false} effects={false} showProp={false} />
                  </span>
                  <span className="text-center text-[12px] font-semibold text-ink-2 group-hover:text-gold">{p.name}</span>
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

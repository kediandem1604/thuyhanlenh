import { useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { CalendarDays, Check, DoorOpen, Flower, Flower2, Globe, Leaf, Lock, MapPin, Save, Snowflake, Sparkles, Undo2, Users } from 'lucide-react'
import { api, errorMessage } from '@/api/client'
import type { OrgInfo } from '@/domain/api'
import { FEATURE_INFO, FEATURES, ORG_THEME_IDS, ORG_THEMES, ORG_TYPES, themeOf, type Feature, type OrgTheme, type OrgThemeId, type ParticleKind } from '@/domain/orgs'
import { permHint } from '@/domain/permissions'
import type { OrgType } from '@/domain/types'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field } from '@/components/ui/Modal'
import { SectionTitle } from '@/components/ui/Panel'
import { cn, fmtDate } from '@/lib/utils'
import { rankLabel, useCan, useGuild, useOrg } from '@/store/guild'
import { toast } from '@/store/ui'

/* ---------------- Tiện ích dùng chung ---------------- */

/** Công tắc bật/tắt dạng viên thuốc */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'border-transparent bg-gold' : 'border-line-strong bg-black/20',
      )}
    >
      <motion.span
        layout
        transition={{ type: 'spring', damping: 26, stiffness: 420 }}
        className={cn('absolute top-[3px] h-5 w-5 rounded-full shadow', checked ? 'right-[3px] bg-[#1b1406]' : 'left-[3px] bg-[var(--text-2)]')}
      />
    </button>
  )
}

/** Cách gọi ngắn của tổ chức trong câu: "rời bang", "vào team"… */
export function orgWord(type: OrgType) {
  return type === 'guild' ? 'bang' : type === 'kimlan' ? 'Kim Lan' : 'team'
}

const PARTICLE: Record<ParticleKind, { color: string; radius: string; icon: typeof Flower2; name: string }> = {
  sakura: { color: '#f3a6c0', radius: '80% 0 80% 0', icon: Flower2, name: 'Hoa đào' },
  snow: { color: '#ffffff', radius: '50%', icon: Snowflake, name: 'Tuyết rơi' },
  lotus: { color: '#f4a3a0', radius: '80% 10% 80% 10%', icon: Flower, name: 'Cánh sen' },
  leaves: { color: '#7fd6a8', radius: '0 80% 0 80%', icon: Leaf, name: 'Lá trúc' },
  wisteria: { color: '#c9b4ff', radius: '50% 50% 50% 0', icon: Sparkles, name: 'Tử đằng' },
}

// vị trí hạt bay trong ô xem trước: [x%, y%, cỡ px, xoay độ]
const DOTS: [number, number, number, number][] = [
  [12, 18, 5, 20],
  [30, 42, 4, -30],
  [48, 14, 6, 45],
  [62, 52, 4, 10],
  [76, 30, 5, -15],
  [22, 64, 4, 60],
  [88, 60, 5, 30],
]

/** Ô xem trước giao diện tổ chức: trời đêm, trăng, núi và hạt bay theo màu nhấn */
export function OrgThemeSwatch({ theme, className }: { theme: OrgTheme; className?: string }) {
  const a = theme.accent
  const p = PARTICLE[theme.particles]
  return (
    <div
      className={cn('relative h-20 overflow-hidden rounded-xl border', className)}
      style={{
        borderColor: `color-mix(in oklab, ${a} 35%, transparent)`,
        background: `radial-gradient(120% 90% at 85% 0%, color-mix(in oklab, ${a} 32%, transparent), transparent 62%), linear-gradient(180deg, #141c30, #0b1020)`,
      }}
      aria-hidden
    >
      <svg viewBox="0 0 160 64" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <path d="M0,50 C20,34 34,44 52,30 C70,18 84,40 104,32 C124,24 140,38 160,30 L160,64 L0,64 Z" fill={a} opacity={0.15} />
        <path d="M0,58 C26,48 46,56 70,46 C96,36 118,54 160,44 L160,64 L0,64 Z" fill={a} opacity={0.3} />
      </svg>
      <span className="absolute right-3 top-2.5 h-5 w-5 rounded-full" style={{ background: a, boxShadow: `0 0 18px ${a}`, opacity: 0.9 }} />
      {DOTS.map(([x, y, r, rot], i) => (
        <span
          key={i}
          className="absolute"
          style={{ left: `${x}%`, top: `${y}%`, width: r, height: r, background: p.color, borderRadius: p.radius, opacity: 0.75, transform: `rotate(${rot}deg)` }}
        />
      ))}
      <span className="han absolute bottom-1 left-2.5 text-[22px] leading-none" style={{ color: a, textShadow: `0 0 12px ${a}` }}>
        {theme.han}
      </span>
    </div>
  )
}

/* ---------------- Bản nháp chỉnh sửa ---------------- */

interface Draft {
  name: string
  han: string
  server: string
  motto: string
  description: string
  theme: OrgThemeId
  capacity: string
  level: string
  isPublic: boolean
  features: Feature[]
}

const draftOf = (o: OrgInfo): Draft => ({
  name: o.name,
  han: o.han,
  server: o.server,
  motto: o.motto,
  description: o.description,
  theme: o.theme,
  capacity: o.capacity === null ? '' : String(o.capacity),
  level: String(o.level),
  isPublic: o.isPublic,
  features: FEATURES.filter((f) => o.features.includes(f)),
})

const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x))

/** So bản nháp với dữ liệu gốc → chỉ gửi phần đã đổi (kèm kiểm tra như server) */
function buildPatch(org: OrgInfo, d: Draft, memberCount: number): { patch: Record<string, unknown>; error?: string } {
  const patch: Record<string, unknown> = {}
  const name = d.name.trim()
  const han = d.han.trim()
  if (name !== org.name) {
    if (name.length < 2 || name.length > 40) return { patch, error: 'Tên tổ chức từ 2 đến 40 ký tự.' }
    patch.name = name
  }
  if (han !== org.han) {
    if (!han) return { patch, error: 'Cần một chữ Hán làm biểu tượng.' }
    if (han.length > 3) return { patch, error: 'Biểu tượng tối đa 3 chữ Hán.' }
    patch.han = han
  }
  if (d.server.trim() !== org.server) patch.server = d.server.trim()
  if (d.motto.trim() !== org.motto) patch.motto = d.motto.trim()
  if (d.description.trim() !== org.description) patch.description = d.description.trim()
  if (d.theme !== org.theme) patch.theme = d.theme
  if (org.type === 'guild') {
    const cap = Number(d.capacity)
    if (cap !== org.capacity) {
      if (!Number.isInteger(cap) || cap < 5 || cap > 200) return { patch, error: 'Sức chứa từ 5 đến 200 người.' }
      if (cap < memberCount) return { patch, error: `Bang đang có ${memberCount} người — sức chứa không được nhỏ hơn.` }
      patch.capacity = cap
    }
    const level = Number(d.level)
    if (level !== org.level) {
      if (!Number.isInteger(level) || level < 1 || level > 20) return { patch, error: 'Cấp bang từ 1 đến 20.' }
      patch.level = level
    }
  }
  if (org.type !== 'kimlan' && d.isPublic !== org.isPublic) patch.isPublic = d.isPublic
  if (ORG_TYPES[org.type].toggleable && !sameList(d.features, org.features)) patch.features = FEATURES.filter((f) => d.features.includes(f))
  return { patch }
}

/* ---------------- Khối "Tổ chức" ---------------- */

/** Thông tin tổ chức đang xem: xem / sửa (quyền org.manage), giao diện, chức năng, rời tổ chức */
export function OrgSettingsPanel() {
  const org = useOrg()
  if (!org) return null
  return <OrgSettingsBody org={org} />
}

function OrgSettingsBody({ org }: { org: OrgInfo }) {
  const canManage = useCan('org.manage')
  const memberCount = useGuild((s) => s.members.length) || org.memberCount
  const info = ORG_TYPES[org.type]
  const theme = themeOf(org.theme)

  // bản nháp tự làm mới khi dữ liệu tổ chức trên server đổi (người khác sửa, vừa lưu…)
  const baseKey = JSON.stringify(draftOf(org))
  const [base, setBase] = useState(baseKey)
  const [draft, setDraft] = useState<Draft>(() => draftOf(org))
  if (base !== baseKey) {
    setBase(baseKey)
    setDraft(draftOf(org))
  }
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(draft) !== baseKey
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const save = async () => {
    const { patch, error } = buildPatch(org, draft, memberCount)
    if (error) return toast({ tone: 'error', title: 'Chưa lưu được', desc: error })
    if (!Object.keys(patch).length) return toast({ tone: 'info', title: 'Không có gì thay đổi' })
    setBusy(true)
    try {
      await api.patch('/api/orgs/current', patch)
      await useGuild.getState().refreshMe()
      toast({ tone: 'gold', title: 'Đã lưu thông tin tổ chức', desc: patch.theme ? `Giao diện: ${ORG_THEMES[patch.theme as OrgThemeId].name}` : undefined })
    } catch (e) {
      toast({ tone: 'error', title: 'Chưa lưu được', desc: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  const shown = canManage ? draft : draftOf(org)
  const previewTheme = ORG_THEMES[shown.theme] ?? theme
  const a = previewTheme.accent

  return (
    <div className="panel corners p-5">
      <SectionTitle
        han="社"
        title="Tổ chức"
        subtitle={`${info.name} · thông tin, giao diện và chức năng`}
        right={
          <span className="chip" style={{ color: a, borderColor: `color-mix(in oklab, ${a} 40%, transparent)` }}>
            <span className="han text-[13px]">{info.han}</span> {info.name}
          </span>
        }
      />

      {/* Thẻ danh thiếp tổ chức — đổi theo bản nháp để xem trước */}
      <div
        className="relative mb-5 overflow-hidden rounded-2xl border p-4"
        style={{
          borderColor: `color-mix(in oklab, ${a} 40%, transparent)`,
          background: `linear-gradient(135deg, color-mix(in oklab, ${a} 14%, transparent), transparent 70%)`,
        }}
      >
        <span aria-hidden className="han pointer-events-none absolute -bottom-6 -right-2 text-[110px] leading-none opacity-[0.07]" style={{ color: a }}>
          {shown.han || org.han}
        </span>
        <div className="relative flex items-start gap-4">
          <motion.span
            key={shown.theme}
            initial={{ scale: 0.85, rotate: -6, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            className="han grid h-16 w-16 shrink-0 place-items-center whitespace-nowrap rounded-2xl border font-bold leading-none"
            style={{
              // 1 chữ to, 3 chữ (vd 惊鸿阁) thu nhỏ cho vừa ấn
              fontSize: [...(shown.han || '?')].length >= 3 ? 17 : [...(shown.han || '?')].length === 2 ? 23 : 30,
              color: a,
              borderColor: `color-mix(in oklab, ${a} 50%, transparent)`,
              background: `color-mix(in oklab, ${a} 12%, transparent)`,
              boxShadow: `0 0 26px -8px ${a}`,
            }}
          >
            {shown.han || '?'}
          </motion.span>
          <div className="min-w-0 flex-1">
            <div className="title-display truncate text-[26px] text-ink">{shown.name || org.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px]">
              <span className="chip !h-6">
                <MapPin size={11} /> {shown.server || 'Chưa đặt server'}
              </span>
              {org.type === 'guild' && <span className="chip !h-6">Cấp {shown.level}</span>}
              <span className="chip !h-6">
                <Users size={11} /> {memberCount}
                {org.capacity !== null ? `/${org.type === 'guild' ? shown.capacity || org.capacity : org.capacity}` : ''} {info.memberWord}
              </span>
              {org.type !== 'kimlan' && (
                <span className="chip !h-6" style={{ color: shown.isPublic ? 'var(--jade)' : undefined }}>
                  {shown.isPublic ? <Globe size={11} /> : <Lock size={11} />} {shown.isPublic ? 'Nhận đơn công khai' : 'Chỉ link mời'}
                </span>
              )}
              <span className="chip !h-6">
                <CalendarDays size={11} /> Lập {fmtDate(org.createdAt)}
              </span>
            </div>
            {shown.motto && <p className="mt-2 text-[13.5px] italic text-ink-2">“{shown.motto}”</p>}
            {shown.description && <p className="mt-1.5 whitespace-pre-line text-[12.5px] leading-relaxed text-muted">{shown.description}</p>}
          </div>
        </div>
      </div>

      {canManage ? (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <Field label={`Tên ${info.name}`}>
              <input className="field" value={draft.name} maxLength={40} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Chữ Hán biểu tượng">
              <input className="field han text-center !text-[20px]" value={draft.han} maxLength={3} onChange={(e) => set('han', e.target.value)} />
            </Field>
          </div>
          <div className={cn('grid gap-4', org.type === 'guild' ? 'sm:grid-cols-3' : 'sm:grid-cols-1')}>
            <Field label="Server">
              <input className="field" value={draft.server} maxLength={40} placeholder="VD: Biện Kinh" onChange={(e) => set('server', e.target.value)} />
            </Field>
            {org.type === 'guild' && (
              <>
                <Field label="Cấp bang" hint="1 – 20">
                  <input className="field" inputMode="numeric" value={draft.level} onChange={(e) => set('level', e.target.value.replace(/\D/g, '').slice(0, 2))} />
                </Field>
                <Field label="Sức chứa" hint={`Đang có ${memberCount} · tối đa ${info.maxCapacity}`}>
                  <input className="field" inputMode="numeric" value={draft.capacity} onChange={(e) => set('capacity', e.target.value.replace(/\D/g, '').slice(0, 3))} />
                </Field>
              </>
            )}
          </div>
          <Field label="Khẩu hiệu">
            <input className="field" value={draft.motto} maxLength={120} placeholder={org.type === 'kimlan' ? 'Nhị nhân đồng tâm, kỳ lợi đoạn kim' : 'Một câu thật kêu cho anh em'} onChange={(e) => set('motto', e.target.value)} />
          </Field>
          <Field label="Giới thiệu" hint={`${draft.description.length}/400`}>
            <textarea
              className="field"
              rows={3}
              maxLength={400}
              value={draft.description}
              placeholder="Giờ hoạt động, mục tiêu, luật lệ… người xem lời mời sẽ đọc đoạn này."
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>

          {org.type === 'guild' && (
            <PublicToggle
              checked={draft.isPublic}
              onChange={(v) => set('isPublic', v)}
              desc="Hiện trong danh bạ “Bang hội đang chiêu mộ” ở Sảnh Giang Hồ — ai có nhân vật cũng gửi đơn được. Tắt thì chỉ vào bằng link mời."
            />
          )}
          {org.type === 'team' && (
            <PublicToggle
              checked={draft.isPublic}
              onChange={(v) => set('isPublic', v)}
              disabled={!draft.features.includes('chieu-mo')}
              desc={
                draft.features.includes('chieu-mo')
                  ? 'Team hiện trong danh bạ chiêu mộ ở Sảnh Giang Hồ, người lạ gửi đơn để bạn duyệt ở trang Chiêu Mộ.'
                  : 'Bật chức năng Chiêu Mộ bên dưới để nhận đơn công khai. Hiện team chỉ vào được bằng link mời.'
              }
            />
          )}

          <ThemePicker value={draft.theme} onChange={(t) => set('theme', t)} />
          <FeatureSection org={org} features={draft.features} onChange={(f) => set('features', f)} editable />

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
            {dirty && <span className="mr-auto text-[12px] text-gold">Có thay đổi chưa lưu</span>}
            <button className="btn btn-ghost" disabled={!dirty || busy} onClick={() => setDraft(draftOf(org))}>
              <Undo2 size={15} /> Hoàn tác
            </button>
            <button className="btn btn-gold" disabled={!dirty || busy} onClick={() => void save()}>
              <Save size={15} /> {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <div>
            <span className="label">Giao diện</span>
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-black/10 p-2.5">
              <OrgThemeSwatch theme={theme} className="h-14 w-28 shrink-0" />
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-ink">
                  <span className="han mr-1" style={{ color: theme.accent }}>
                    {theme.han}
                  </span>
                  {theme.name}
                </div>
                <div className="text-[12px] text-muted">{theme.desc}</div>
              </div>
            </div>
          </div>
          <FeatureSection org={org} features={org.features} />
          <p className="flex items-start gap-2 rounded-xl border border-dashed border-line px-3 py-2.5 text-[12px] text-muted">
            <Lock size={13} className="mt-0.5 shrink-0" />
            <span>Bạn đang xem ở chế độ chỉ xem — sửa thông tin, giao diện, chức năng của tổ chức: {permHint('org.manage', org.type)}.</span>
          </p>
        </div>
      )}

      <LeaveOrg org={org} memberCount={memberCount} />
    </div>
  )
}

function PublicToggle({ checked, onChange, desc, disabled }: { checked: boolean; onChange: (v: boolean) => void; desc: string; disabled?: boolean }) {
  return (
    <div className={cn('flex items-center gap-4 rounded-2xl border border-line bg-black/10 p-4', disabled && 'opacity-70')}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-jade" style={{ background: 'color-mix(in oklab, var(--jade) 14%, transparent)' }}>
        <Globe size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-ink">Nhận đơn công khai</div>
        <div className="text-[12px] text-muted">{desc}</div>
      </div>
      <Switch checked={checked && !disabled} onChange={onChange} label="Bật hoặc tắt nhận đơn công khai" disabled={disabled} />
    </div>
  )
}

function ThemePicker({ value, onChange }: { value: OrgThemeId; onChange: (t: OrgThemeId) => void }) {
  return (
    <div>
      <span className="label">Giao diện tổ chức</span>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-5">
        {ORG_THEME_IDS.map((id) => {
          const t = ORG_THEMES[id]
          const active = value === id
          const P = PARTICLE[t.particles]
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(id)}
              className={cn('group relative rounded-2xl border p-2 text-left transition', active ? 'border-line-strong bg-white/[0.04] shadow-[var(--glow-gold)]' : 'border-line hover:border-line-strong')}
            >
              <OrgThemeSwatch theme={t} />
              <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
                <span className="han text-[14px]" style={{ color: t.accent }}>
                  {t.han}
                </span>
                {t.name}
              </div>
              <div className="flex items-center gap-1 text-[10.5px] text-muted">
                <P.icon size={10} /> {P.name}
              </div>
              {active && (
                <span className="absolute left-3.5 top-3.5 grid h-5 w-5 place-items-center rounded-full bg-gold text-[#1b1406] shadow">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>
      <p className="mt-1.5 text-[11.5px] text-muted">{ORG_THEMES[value].desc} — mọi thành viên sẽ thấy giao diện này khi mở tổ chức.</p>
    </div>
  )
}

function FeatureChip({ f }: { f: Feature }) {
  return (
    <span className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.02] px-2.5 py-1.5">
      <span className="han text-[15px] text-gold">{FEATURE_INFO[f].han}</span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-semibold text-ink">{FEATURE_INFO[f].name}</span>
        <span className="block truncate text-[10.5px] text-muted">{FEATURE_INFO[f].desc}</span>
      </span>
    </span>
  )
}

function FeatureSection({ org, features, onChange, editable = false }: { org: OrgInfo; features: Feature[]; onChange?: (f: Feature[]) => void; editable?: boolean }) {
  const info = ORG_TYPES[org.type]
  if (org.type === 'kimlan') {
    return (
      <div>
        <span className="label">Chức năng của Kim Lan (cố định)</span>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          {info.allowed.map((f) => (
            <FeatureChip key={f} f={f} />
          ))}
        </div>
        <p className="mt-2 rounded-xl border border-line bg-black/10 p-3 text-[12px] leading-relaxed text-ink-2">
          Trong game, Kim Lan chỉ cùng nhau <b className="text-ink">đi phó bản</b> (kèm lịch hẹn, bày trận) và có <b className="text-ink">thứ bậc kết nghĩa</b> từ Đại ca tới Tiểu muội — không có quỹ chung,
          đấu giá hay PvP nhóm, nên các chức năng ấy được ẩn. Tối đa <b className="text-ink">12 người</b>, chỉ vào bằng link mời.
        </p>
      </div>
    )
  }
  if (org.type === 'guild') {
    return (
      <div>
        <span className="label">Chức năng</span>
        <p className="mb-2 text-[12px] text-muted">Bang Hội có đủ {FEATURES.length} chức năng tùy chọn — luôn bật.</p>
        <div className="flex flex-wrap gap-1.5">
          {FEATURES.map((f) => (
            <span key={f} className="chip">
              <span className="han text-[13px] text-gold">{FEATURE_INFO[f].han}</span> {FEATURE_INFO[f].name}
            </span>
          ))}
        </div>
      </div>
    )
  }
  // team
  if (!editable || !onChange) {
    return (
      <div>
        <span className="label">Chức năng đang bật ({features.length})</span>
        {features.length ? (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {features.map((f) => (
              <FeatureChip key={f} f={f} />
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted">Team chỉ dùng phần lõi: Tổng quan, Thành viên, Xưởng Chibi.</p>
        )}
      </div>
    )
  }
  const toggle = (f: Feature) => onChange(features.includes(f) ? features.filter((x) => x !== f) : FEATURES.filter((x) => x === f || features.includes(x)))
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <span className="label">Chức năng của team</span>
        <span className="mb-1.5 text-[11.5px] text-muted">
          Đang bật {features.length}/{info.allowed.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {info.allowed.map((f) => {
          const on = features.includes(f)
          return (
            <label key={f} className={cn('flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 transition', on ? 'border-line-strong bg-white/[0.03]' : 'border-line hover:border-line-strong')}>
              <input type="checkbox" className="accent-[var(--gold)]" checked={on} onChange={() => toggle(f)} />
              <span className={cn('han text-[15px]', on ? 'text-gold' : 'text-muted')}>{FEATURE_INFO[f].han}</span>
              <span className="min-w-0">
                <span className={cn('block text-[13px] font-semibold', on ? 'text-ink' : 'text-ink-2')}>{FEATURE_INFO[f].name}</span>
                <span className="block truncate text-[11px] text-muted">{FEATURE_INFO[f].desc}</span>
              </span>
            </label>
          )
        })}
      </div>
      <p className="mt-1.5 text-[11.5px] text-muted">Tổng quan, Thành viên, Xưởng Chibi, Thiết lập luôn có. Tắt chức năng chỉ ẩn trang — dữ liệu cũ vẫn giữ.</p>
    </div>
  )
}

/* ---------------- Rời tổ chức ---------------- */

function LeaveOrg({ org, memberCount }: { org: OrgInfo; memberCount: number }) {
  const navigate = useNavigate()
  const me = useGuild((s) => s.me)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!me?.member) return null
  const info = ORG_TYPES[org.type]
  const word = orgWord(org.type)
  const isLeader = me.member.rank === info.leaderRank
  const blocked = isLeader && memberCount > 1
  const alone = memberCount <= 1
  const next = me.orgs.find((o) => o.org.id !== org.id)

  const leave = async () => {
    setBusy(true)
    try {
      await api.post('/api/orgs/current/leave')
      toast({ tone: 'info', title: `Đã rời ${org.name}`, desc: next ? `Chuyển sang ${next.org.name}.` : 'Bạn quay về Sảnh Giang Hồ.' })
      navigate('/')
      useGuild.getState().switchOrg(next?.org.id ?? null)
    } catch (e) {
      // server là nơi quyết định (vd người đứng đầu chưa truyền ngôi) — hiện nguyên lời giải thích
      toast({ tone: 'error', title: 'Chưa rời được', desc: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center" style={{ borderColor: 'color-mix(in oklab, var(--cinnabar) 35%, transparent)' }}>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-cinnabar">Rời {org.name}</div>
        <div className="text-[12px] text-muted">
          {blocked
            ? `Bạn là ${rankLabel(me.member)} — hãy truyền ngôi cho người khác ở trang Thành viên trước khi rời ${word}.`
            : `Nhân vật của bạn vẫn giữ nguyên ở các tổ chức khác; chức vụ${org.type === 'kimlan' ? ', thứ bậc' : ''} và cống hiến ở đây sẽ mất.`}
        </div>
      </div>
      {blocked ? (
        <span title={`Bạn là ${rankLabel(me.member)} — cần truyền ngôi trước`} className="inline-flex">
          <button className="btn" disabled>
            <Lock size={15} /> Rời {word}
          </button>
        </span>
      ) : (
        <button className="btn btn-cinnabar" disabled={busy} onClick={() => setConfirm(true)}>
          <DoorOpen size={15} /> {busy ? 'Đang rời…' : `Rời ${word}`}
        </button>
      )}
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={() => void leave()} title={`Rời ${org.name}?`} han="别" confirmLabel={`Rời ${word}`}>
        <p>
          Bạn sẽ không còn là {info.memberWord} của <b className="text-ink">{org.name}</b>. Muốn quay lại cần link mời mới
          {org.type === 'guild' && org.isPublic ? ' hoặc gửi đơn chiêu mộ' : ''}.
        </p>
        {alone && <p className="mt-2 text-cinnabar">Bạn là người cuối cùng — {word} sẽ không còn ai.</p>}
        {next ? (
          <p className="mt-2 text-[12.5px] text-muted">Sau khi rời sẽ chuyển sang {next.org.name}.</p>
        ) : (
          <p className="mt-2 text-[12.5px] text-muted">Đây là tổ chức duy nhất của bạn — sau khi rời sẽ về Sảnh Giang Hồ.</p>
        )}
      </ConfirmDialog>
    </div>
  )
}

import { useMemo, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Check, Download, Flower2, Info, Lock, LogOut, Moon, RotateCcw, Save, Server, Sun, Undo2, UserCog } from 'lucide-react'
import { rankLabel, useCan, useCurrentUser, useFeature, useGuild, useOrg, useOrgType } from '@/store/guild'
import { api, errorMessage } from '@/api/client'
import { devLogin, logout } from '@/auth/session'
import type { Character, OrgMembership } from '@/domain/api'
import { PERMISSION_FEATURE, PERMISSION_LABELS, PERMISSION_MIN_RANK_BY_TYPE, PERMISSIONS, permHint } from '@/domain/permissions'
import { ORG_TYPES, themeOf } from '@/domain/orgs'
import { toast, useUi, type Theme } from '@/store/ui'
import { CLASSES, RANKS } from '@/domain/constants'
import type { SeedData } from '@/data/seed'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, SectionTitle } from '@/components/ui/Panel'
import { Field, Modal } from '@/components/ui/Modal'
import { ClassBadge, RankSeal } from '@/components/ui/Badges'
import { Chibi } from '@/components/chibi/Chibi'
import { OrgSettingsPanel, Switch } from '@/components/org/OrgSettingsPanel'
import { InviteManager } from '@/components/org/InviteManager'
import { AdminPanel } from '@/components/org/AdminPanel'
import { cn, fmt } from '@/lib/utils'

/* ---------------- Giao diện ---------------- */

const THEMES: { id: Theme; name: string; han: string; desc: string; icon: typeof Moon; palette: { bg: string; panel: string; line: string; text: string; muted: string; gold: string; accent: string } }[] = [
  {
    id: 'dark',
    name: 'Dạ Thủy Mặc',
    han: '夜',
    desc: 'Đêm mực, trăng vàng, núi sương — mặc định.',
    icon: Moon,
    palette: { bg: '#0e1322', panel: '#1a2136', line: 'rgba(216,180,106,.3)', text: '#eee6d6', muted: '#8d93a8', gold: '#d8b46a', accent: '#5ec7b0' },
  },
  {
    id: 'light',
    name: 'Tuyên Chỉ',
    han: '纸',
    desc: 'Giấy dó ngà, mực nâu, ấn son — dễ đọc ban ngày.',
    icon: Sun,
    palette: { bg: '#efe5d2', panel: '#fbf5e9', line: 'rgba(124,88,36,.3)', text: '#2b231b', muted: '#7b6f60', gold: '#a47a32', accent: '#c23a28' },
  },
]

function ThemePreview({ p }: { p: (typeof THEMES)[number]['palette'] }) {
  return (
    <div className="relative h-28 overflow-hidden rounded-xl border" style={{ background: p.bg, borderColor: p.line }}>
      <svg className="absolute inset-x-0 bottom-0 h-12 w-full" viewBox="0 0 200 50" preserveAspectRatio="none" aria-hidden>
        <path d="M0,40 C30,20 50,34 80,18 C110,4 130,30 160,22 C180,16 190,26 200,24 L200,50 L0,50 Z" fill={p.muted} opacity={0.18} />
      </svg>
      <div className="absolute right-4 top-3 h-7 w-7 rounded-full" style={{ background: p.gold, opacity: 0.75, boxShadow: `0 0 18px ${p.gold}` }} />
      <div className="absolute left-3 top-3 w-[58%] rounded-lg border p-2" style={{ background: p.panel, borderColor: p.line }}>
        <div className="h-2 w-16 rounded" style={{ background: p.gold }} />
        <div className="mt-1.5 h-1.5 w-full rounded" style={{ background: p.text, opacity: 0.6 }} />
        <div className="mt-1 h-1.5 w-3/4 rounded" style={{ background: p.muted, opacity: 0.6 }} />
        <div className="mt-2 flex gap-1">
          <span className="h-3 w-8 rounded" style={{ background: p.gold }} />
          <span className="h-3 w-6 rounded border" style={{ borderColor: p.line }} />
        </div>
      </div>
      <span className="absolute bottom-2 left-3 h-4 w-4 rounded" style={{ background: p.accent, opacity: 0.9 }} />
    </div>
  )
}

function AppearancePanel() {
  const theme = useUi((s) => s.theme)
  const setTheme = useUi((s) => s.setTheme)
  const petals = useUi((s) => s.petals)
  const setPetals = useUi((s) => s.setPetals)
  const org = useOrg()
  const orgTheme = themeOf(org?.theme)
  return (
    <Panel corners>
      <SectionTitle han="色" title="Sáng · Tối" subtitle="Chỉ áp dụng cho máy của bạn — giao diện tổ chức chỉnh ở phần Tổ chức" />
      <div className="grid gap-4 sm:grid-cols-2">
        {THEMES.map((t) => {
          const active = theme === t.id
          return (
            <button
              key={t.id}
              onClick={() => {
                setTheme(t.id)
                toast({ tone: 'gold', title: `Đã chuyển sang ${t.name}` })
              }}
              className={cn('group rounded-2xl border p-3 text-left transition', active ? 'border-line-strong shadow-[var(--glow-gold)]' : 'border-line hover:border-line-strong')}
              aria-pressed={active}
            >
              <ThemePreview p={t.palette} />
              <div className="mt-3 flex items-start gap-3">
                <span className="han grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line text-[18px] text-gold">{t.han}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[14px] font-bold text-ink">
                    <t.icon size={14} className="text-gold" /> {t.name}
                  </div>
                  <div className="text-[12px] text-muted">{t.desc}</div>
                </div>
                {active && (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gold text-[#1b1406]">
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
      <div className="mt-4 flex items-center gap-4 rounded-2xl border border-line bg-black/10 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sakura" style={{ background: 'color-mix(in oklab, var(--sakura) 14%, transparent)' }}>
          <Flower2 size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-ink">Hiệu ứng bay trên nền</div>
          <div className="text-[12px] text-muted">
            Theo giao diện {orgTheme.name}: {orgTheme.desc.toLowerCase()}. Tắt nếu máy yếu hoặc muốn tập trung.
          </div>
        </div>
        <Switch checked={petals} onChange={setPetals} label="Bật hoặc tắt hiệu ứng bay" />
      </div>
    </Panel>
  )
}

/* ---------------- Nhân vật của tôi ---------------- */

interface CharDraft {
  name: string
  level: string
  power: string
  title: string
  bio: string
}

const charDraftOf = (c: Character): CharDraft => ({ name: c.name, level: String(c.level), power: String(c.power), title: c.title, bio: c.bio })

function CharacterPanel() {
  const me = useGuild((s) => s.me)
  if (!me?.character) return null
  return <CharacterEditor character={me.character} orgs={me.orgs} currentOrgId={me.org?.id ?? null} />
}

function CharacterEditor({ character, orgs, currentOrgId }: { character: Character; orgs: OrgMembership[]; currentOrgId: string | null }) {
  // bản nháp tự làm mới khi nhân vật đổi trên server (vừa lưu, sửa ở tổ chức khác…)
  const baseKey = JSON.stringify(charDraftOf(character))
  const [base, setBase] = useState(baseKey)
  const [draft, setDraft] = useState<CharDraft>(() => charDraftOf(character))
  if (base !== baseKey) {
    setBase(baseKey)
    setDraft(charDraftOf(character))
  }
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(draft) !== baseKey
  const set = <K extends keyof CharDraft>(k: K, v: CharDraft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const save = async () => {
    const patch: Record<string, unknown> = {}
    const name = draft.name.trim()
    const level = Number(draft.level)
    const power = Number(draft.power)
    if (name !== character.name) {
      if (name.length < 2 || name.length > 32) return toast({ tone: 'error', title: 'Tên nhân vật từ 2 đến 32 ký tự' })
      patch.name = name
    }
    if (level !== character.level) {
      if (!Number.isInteger(level) || level < 1 || level > 80) return toast({ tone: 'error', title: 'Cấp phải từ 1 đến 80' })
      patch.level = level
    }
    if (power !== character.power) {
      if (!Number.isInteger(power) || power < 1 || power > 10_000_000) return toast({ tone: 'error', title: 'Chiến lực từ 1 đến 10.000.000' })
      patch.power = power
    }
    if (draft.title.trim() !== character.title) patch.title = draft.title.trim()
    if (draft.bio.trim() !== character.bio) patch.bio = draft.bio.trim()
    if (!Object.keys(patch).length) return toast({ tone: 'info', title: 'Không có gì thay đổi' })
    setBusy(true)
    try {
      await api.patch('/api/characters/me', patch)
      await useGuild.getState().refreshMe()
      toast({ tone: 'gold', title: 'Đã cập nhật nhân vật', desc: orgs.length > 1 ? `Áp dụng ở cả ${orgs.length} tổ chức.` : undefined })
    } catch (e) {
      toast({ tone: 'error', title: 'Chưa lưu được nhân vật', desc: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  const openOrg = (id: string) => {
    if (id === currentOrgId) return
    useGuild.getState().switchOrg(id)
  }

  return (
    <Panel corners>
      <SectionTitle han="我" title="Nhân vật của tôi" subtitle="Dùng chung ở mọi tổ chức — sửa một lần, chỗ nào cũng thấy" />
      <div className="grid gap-5 sm:grid-cols-[150px_1fr]">
        <div className="flex flex-col items-center rounded-2xl border border-line bg-[linear-gradient(160deg,color-mix(in_oklab,var(--gold)_10%,transparent),transparent_70%)] px-2 pb-3 pt-1 text-center">
          <Chibi look={character.look} classId={character.classId} size={130} />
          <div className="mt-1 max-w-full truncate text-[14px] font-bold text-ink">{draft.name.trim() || character.name}</div>
          <ClassBadge classId={character.classId} className="mt-1 !h-6" />
          {draft.title.trim() && <div className="mt-1.5 max-w-full truncate text-[11.5px] italic text-gold">“{draft.title.trim()}”</div>}
          <div className="mt-2 text-[11px] text-muted">
            Lv {draft.level || '—'} · {fmt(Number(draft.power) || 0)} CL
          </div>
        </div>

        <div className="grid content-start gap-3.5">
          <Field label="Tên nhân vật trong game">
            <input className="field" value={draft.name} maxLength={32} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Cấp" hint="1 – 80">
              <input className="field" inputMode="numeric" value={draft.level} onChange={(e) => set('level', e.target.value.replace(/\D/g, '').slice(0, 2))} />
            </Field>
            <Field label="Chiến lực" hint={Number(draft.power) ? fmt(Number(draft.power)) : 'Tối đa 10.000.000'}>
              <input className="field tabular-nums" inputMode="numeric" value={draft.power} onChange={(e) => set('power', e.target.value.replace(/\D/g, '').slice(0, 8))} />
            </Field>
          </div>
          <Field label="Danh hiệu" hint={`${draft.title.length}/40`}>
            <input className="field" value={draft.title} maxLength={40} placeholder="VD: Kiếm Khách Vô Danh" onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="Giới thiệu" hint={`${draft.bio.length}/300`}>
            <textarea className="field" rows={2} maxLength={300} value={draft.bio} placeholder="Đôi dòng về bản thân, giờ online…" onChange={(e) => set('bio', e.target.value)} />
          </Field>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {dirty && <span className="mr-auto text-[12px] text-gold">Có thay đổi chưa lưu</span>}
            <button className="btn btn-ghost btn-sm" disabled={!dirty || busy} onClick={() => setDraft(charDraftOf(character))}>
              <Undo2 size={14} /> Hoàn tác
            </button>
            <button className="btn btn-gold btn-sm" disabled={!dirty || busy} onClick={() => void save()}>
              <Save size={14} /> {busy ? 'Đang lưu…' : 'Lưu nhân vật'}
            </button>
          </div>
        </div>
      </div>

      <div className="divider-cloud my-4" />
      <div className="label">Đang ở {orgs.length} tổ chức</div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {orgs.map((o) => {
          const t = themeOf(o.org.theme)
          const current = o.org.id === currentOrgId
          return (
            <li key={o.org.id}>
              <button
                type="button"
                onClick={() => openOrg(o.org.id)}
                disabled={current}
                title={current ? 'Đang xem tổ chức này' : `Chuyển sang ${o.org.name}`}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition disabled:cursor-default',
                  current ? 'border-line-strong bg-white/[0.04]' : 'border-line hover:border-line-strong hover:bg-white/[0.03]',
                )}
              >
                <span
                  className="han grid h-8 w-8 shrink-0 place-items-center whitespace-nowrap rounded-lg border leading-none"
                  style={{ fontSize: [...o.org.han].length >= 3 ? 10 : [...o.org.han].length === 2 ? 13 : 16, color: t.accent, borderColor: `color-mix(in oklab, ${t.accent} 40%, transparent)` }}
                >
                  {o.org.han}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">{o.org.name}</span>
                  <span className="block truncate text-[11px] text-muted">
                    {ORG_TYPES[o.org.type].name} · <span style={{ color: RANKS[o.rank].color }}>{o.title}</span>
                  </span>
                </span>
                {current && <span className="chip !h-5 !px-2 !text-[10px] text-gold">Đang xem</span>}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-[11.5px] text-muted">Chức vụ, thứ bậc, ngày gia nhập và cống hiến là riêng từng tổ chức. Tạo hình chibi chỉnh ở Xưởng Chibi.</p>
    </Panel>
  )
}

/* ---------------- Tài khoản & quyền ---------------- */

function AccountPanel() {
  const me = useCurrentUser()
  const session = useGuild((s) => s.me)
  const members = useGuild((s) => s.members)
  const org = useOrg()
  const type = useOrgType()
  const [switching, setSwitching] = useState(false)
  const sorted = useMemo(
    () => [...members].sort((a, b) => RANKS[a.rank].order - RANKS[b.rank].order || (a.seat ?? 99) - (b.seat ?? 99) || a.name.localeCompare(b.name, 'vi')),
    [members],
  )
  // quyền của chức năng đang tắt thì không hiện
  const visible = useMemo(() => PERMISSIONS.filter((p) => !PERMISSION_FEATURE[p] || !!org?.features.includes(PERMISSION_FEATURE[p]!)), [org])
  if (!me || !session) return null
  const perms = new Set(session.permissions)
  const minRank = PERMISSION_MIN_RANK_BY_TYPE[type]
  const granted = visible.filter((p) => perms.has(p)).length

  const switchTo = async (id: string) => {
    if (id === me.id) return
    setSwitching(true)
    if (await devLogin({ memberId: id })) location.reload()
    setSwitching(false)
  }

  return (
    <Panel corners>
      <SectionTitle han="角" title="Tài khoản" subtitle="Bạn đang đăng nhập với tư cách" right={<UserCog size={18} className="text-gold" />} />
      <div className="mb-4 flex items-center gap-4 rounded-2xl border border-line-strong bg-[linear-gradient(135deg,color-mix(in_oklab,var(--gold)_12%,transparent),transparent_70%)] p-3">
        <Chibi look={me.look} classId={me.classId} size={76} effects={false} />
        <div className="min-w-0 flex-1">
          <div className="title-display truncate text-[24px] text-ink">{me.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <RankSeal rank={me.rank} member={me} size="sm" withName={false} />
            <span className="text-[12.5px] font-semibold" style={{ color: RANKS[me.rank].color }}>
              {rankLabel(me)}
            </span>
            <span className="text-[12px] text-muted">
              · {CLASSES[me.classId].name}
              {org ? ` · ${org.name}` : ''}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted">
            {session.user.avatarUrl && <img src={session.user.avatarUrl} alt="" className="h-4 w-4 rounded-full" />}
            {session.user.provider === 'discord' ? `Discord · ${session.user.name}` : 'Tài khoản thử (chế độ dev)'}
          </div>
        </div>
        <button className="btn btn-sm shrink-0" onClick={() => void logout()}>
          <LogOut size={14} /> Đăng xuất
        </button>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="label">Quyền theo chức vụ {rankLabel(me)}</div>
        <span className="mb-1.5 text-[11.5px] tabular-nums text-muted">
          {granted}/{visible.length}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {visible.map((p) => {
          const ok = perms.has(p)
          return (
            <li
              key={p}
              className={cn('flex items-center gap-2 rounded-lg px-2 py-1 text-[12.5px]', ok ? 'text-ink-2' : 'text-muted opacity-60')}
              title={ok ? undefined : permHint(p, type)}
            >
              {ok ? <Check size={13} className="shrink-0 text-jade" /> : <Lock size={12} className="shrink-0" />}
              <span className="min-w-0 flex-1 truncate">{PERMISSION_LABELS[p]}</span>
              {!ok && <span className="shrink-0 text-[10.5px]">{RANKS[minRank[p]].name}</span>}
            </li>
          )
        })}
      </ul>
      {type !== 'guild' && (
        <p className="mt-2 text-[11.5px] text-muted">
          {type === 'kimlan'
            ? 'Kim Lan: Đại ca có mọi quyền; huynh đệ cùng lên lịch, ghi nhận phó bản và xếp đội.'
            : 'Team: Trưởng nhóm có mọi quyền; Phó nhóm có gần đủ, trừ quản lý team, bổ nhiệm, mời ra, điều chỉnh cống hiến và chốt đấu giá.'}
        </p>
      )}

      {session.devLogin && (
        <div className="mt-5 rounded-2xl border border-dashed border-line-strong p-4">
          <label className="label" htmlFor="role-select">
            Đăng nhập thử với tư cách khác (chế độ dev)
          </label>
          <select id="role-select" className="field" value={me.id} disabled={switching} onChange={(e) => void switchTo(e.target.value)}>
            {sorted.map((m) => (
              <option key={m.id} value={m.id}>
                {rankLabel(m)} · {m.name}
              </option>
            ))}
          </select>
          <p className="mt-2 flex items-start gap-2 text-[12px] text-muted">
            <Info size={14} className="mt-0.5 shrink-0 text-azure" />
            Dùng để thử phân quyền. Trên máy chủ thật hãy đặt <code className="kbd">DEV_LOGIN=false</code> — khi đó chỉ đăng nhập được bằng Discord.
          </p>
        </div>
      )}
    </Panel>
  )
}

/* ---------------- Dữ liệu ---------------- */

function DataPanel() {
  const org = useOrg()
  const type = useOrgType()
  const members = useGuild((s) => s.members)
  const clears = useGuild((s) => s.clears)
  const ledger = useGuild((s) => s.ledger)
  const wars = useGuild((s) => s.wars)
  const hasDungeons = useFeature('pho-ban')
  const hasWars = useFeature('bang-chien')
  const hasTreasury = useFeature('bang-kho')
  const devLoginOn = useGuild((s) => !!s.me?.devLogin)
  const resetDemo = useGuild((s) => s.resetDemo)
  const canExport = useCan('recruit.review')
  const [confirmReset, setConfirmReset] = useState(false)
  const [busy, setBusy] = useState<'export' | 'reset' | null>(null)
  const exportHint = permHint('recruit.review', type)

  const exportJson = async () => {
    setBusy('export')
    try {
      const data = await api.get<SeedData>('/api/export')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `thuy-han-lenh-${org?.id ?? 'to-chuc'}-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast({ tone: 'success', title: 'Đã tải file sao lưu', desc: `${data.members.length} ${ORG_TYPES[type].memberWord}` })
    } catch (e) {
      toast({ tone: 'error', title: 'Không xuất được dữ liệu', desc: errorMessage(e) })
    } finally {
      setBusy(null)
    }
  }

  const doReset = async () => {
    setBusy('reset')
    const r = await resetDemo()
    setBusy(null)
    setConfirmReset(false)
    if (!r.ok) return toast({ tone: 'error', title: 'Không đặt lại được', desc: r.error })
    await useGuild.getState().refreshMe()
    toast({ tone: 'info', title: 'Đã nạp lại dữ liệu demo', desc: 'Mọi người đang mở web sẽ thấy dữ liệu mới.' })
  }

  const rows = [
    { label: ORG_TYPES[type].memberWord.replace(/^./, (c) => c.toUpperCase()), value: members.length, on: true },
    { label: 'Lượt clear gần đây', value: clears.length, on: hasDungeons },
    { label: type === 'guild' ? 'Trận bang chiến' : 'Trận thi đấu', value: wars.length, on: hasWars },
    { label: 'Bút toán gần đây', value: ledger.length, on: hasTreasury },
  ].filter((r) => r.on)

  return (
    <Panel corners>
      <SectionTitle han="档" title="Dữ liệu" subtitle={`Lưu trên máy chủ (PostgreSQL) — mọi ${ORG_TYPES[type].memberWord} thấy chung`} right={<Server size={18} className="text-gold" />} />
      <div className={cn('mb-4 grid grid-cols-2 gap-2', rows.length >= 4 ? 'sm:grid-cols-4' : rows.length === 3 ? 'sm:grid-cols-3' : '')}>
        {rows.map((r) => (
          <div key={r.label} className="rounded-xl border border-line bg-black/10 p-3">
            <div className="title-display text-[24px] tabular-nums text-ink">{fmt(r.value)}</div>
            <div className="text-[11.5px] text-muted">{r.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 rounded-2xl border border-line p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold text-ink">Sao lưu</div>
            <div className="text-[12px] text-muted">
              Tải toàn bộ dữ liệu {org?.name ?? 'tổ chức'} (JSON) từ máy chủ. {exportHint}.
            </div>
          </div>
          <span title={canExport ? undefined : exportHint} className="inline-flex shrink-0">
            <button className="btn" disabled={!canExport || busy === 'export'} onClick={() => void exportJson()}>
              <Download size={16} /> Xuất JSON
            </button>
          </span>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <div className="text-[13.5px] font-semibold text-ink">Khôi phục / chuyển dữ liệu</div>
          <div className="mt-1 text-[12px] text-muted">
            Nạp file JSON (kể cả file xuất từ bản demo cũ) bằng lệnh trên máy chủ: <code className="kbd">npm run db:import -- duong-dan.json</code>. Việc ghi đè toàn bộ dữ liệu chỉ làm được ở máy chủ để tránh bấm nhầm.
          </div>
        </div>
        {devLoginOn && (
          <div className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center" style={{ borderColor: 'color-mix(in oklab, var(--cinnabar) 40%, transparent)' }}>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold text-cinnabar">Nạp lại dữ liệu demo</div>
              <div className="text-[12px] text-muted">Chỉ có ở chế độ dev: xóa dữ liệu trên máy chủ và sinh lại Kinh Hồng Các, Gia Tộc Họ Bạch, Thất Tinh Đội (giữ liên kết tài khoản).</div>
            </div>
            <button className="btn btn-cinnabar" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={16} /> Đặt lại
            </button>
          </div>
        )}
      </div>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Nạp lại toàn bộ dữ liệu demo?"
        han="警"
        size="sm"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
              Giữ nguyên
            </button>
            <button className="btn btn-cinnabar" disabled={busy === 'reset'} onClick={() => void doReset()}>
              <RotateCcw size={16} /> Đặt lại
            </button>
          </>
        }
      >
        <p className="text-[13.5px] text-ink-2">
          Mọi thay đổi trên máy chủ ở <b className="text-ink">mọi tổ chức demo</b> (thành viên, sư đồ, lượt clear, đấu giá, link mời…) sẽ mất với <b className="text-ink">tất cả mọi người</b>. Hành động này{' '}
          <b className="text-cinnabar">không thể hoàn tác</b> — hãy xuất sao lưu trước nếu cần.
        </p>
      </Modal>
    </Panel>
  )
}

/* ---------------- Giới thiệu ---------------- */

const STACK = ['React 19', 'TypeScript', 'Vite', 'Tailwind CSS v4', 'Motion', 'Zustand', 'Recharts', 'Fastify 5', 'PostgreSQL', 'Drizzle ORM', 'WebSocket', 'Discord OAuth']

function AboutPanel() {
  const org = useOrg()
  return (
    <Panel corners className="relative overflow-hidden">
      <span aria-hidden className="han pointer-events-none absolute -right-4 -top-6 text-[130px] leading-none text-gold opacity-[0.06]">
        令
      </span>
      <SectionTitle han="令" title="Thủy Hàn Lệnh" subtitle={`Phiên bản 3.0.0${org ? ` · ${ORG_TYPES[org.type].name} ${org.name}` : ''}`} />
      <p className="text-[13px] text-ink-2">
        Hệ thống quản lý bang hội, Kim Lan và team cho Nghịch Thủy Hàn Mobile: thành viên, sư đồ, phó bản, bang chiến, bang khố, tình duyên — một nhân vật dùng chung cho mọi tổ chức, tất cả trong
        một quyển trục.
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {STACK.map((s) => (
          <span key={s} className="chip">
            {s}
          </span>
        ))}
      </div>
      <div className="divider-cloud my-4" />
      <p className="text-[11.5px] leading-relaxed text-muted">
        Nhân vật chibi được vẽ hoàn toàn bằng SVG. Tên phó bản, boss và các tổ chức trong dữ liệu demo là hư cấu. Dự án do cộng đồng làm, không liên kết với NetEase hay VNG.
      </p>
    </Panel>
  )
}

/* ---------------- Trang ---------------- */

function SectionLabel({ han, title, sub, className }: { han: string; title: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className={cn('mb-4 flex items-center gap-3', className)}>
      <span className="han text-[24px] leading-none text-gold">{han}</span>
      <div className="min-w-0">
        <div className="eyebrow">{title}</div>
        {sub && <div className="truncate text-[12px] text-muted">{sub}</div>}
      </div>
      <span aria-hidden className="h-px flex-1" style={{ background: 'linear-gradient(90deg, color-mix(in oklab, var(--gold) 45%, transparent), transparent)' }} />
    </motion.div>
  )
}

export default function SettingsPage() {
  const org = useOrg()
  const isAdmin = useGuild((s) => !!s.me?.isAdmin)
  return (
    <div>
      <PageHeader eyebrow="Hệ Thống · Tùy chỉnh" title="Thiết Lập" han="设" description="Thông tin tổ chức và link mời, nhân vật dùng chung, giao diện, quyền của bạn và sao lưu dữ liệu." />

      <SectionLabel han="社" title="Tổ chức" sub={org ? `${ORG_TYPES[org.type].name} ${org.name} — áp dụng cho mọi thành viên` : undefined} />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.25fr_1fr]">
        <OrgSettingsPanel />
        <div className="space-y-6">
          <InviteManager />
          <DataPanel />
        </div>
      </div>

      <SectionLabel han="我" title="Cá nhân" sub="Nhân vật, tài khoản và giao diện của riêng bạn" className="mt-10" />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.25fr_1fr]">
        <div className="space-y-6">
          <CharacterPanel />
          <AppearancePanel />
        </div>
        <div className="space-y-6">
          <AccountPanel />
          <AboutPanel />
        </div>
      </div>

      {isAdmin && (
        <>
          <SectionLabel han="管" title="Quản trị hệ thống" sub="Chỉ chủ hệ thống thấy phần này" className="mt-10" />
          <AdminPanel />
        </>
      )}
    </div>
  )
}

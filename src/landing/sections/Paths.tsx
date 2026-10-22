// "Ba con đường": Bang Hội · Kim Lan · Team — mỗi thẻ mặc giao diện tổ chức riêng (data-org-theme).
import { useState, type ReactNode } from 'react'
import { PlumBlossom, SnowCrystal } from '@/components/fx/shapes'
import { FEATURES, FEATURE_INFO, KIMLAN_OATH, ORG_THEMES, ORG_THEME_IDS, ORG_TYPES, kimlanHonorific, type Feature, type OrgThemeId } from '@/domain/orgs'
import type { OrgType } from '@/domain/types'
import { cn } from '@/lib/utils'
import { CornerLeaves, CornerPetals, FrameSnow } from '../decor'
import { Bullets, Reveal, SectionHeader } from '../shared'

function FeatureChip({ f, on = true }: { f: Feature; on?: boolean }) {
  return (
    <span className={cn('chip h-7 gap-1.5 px-2.5 text-[11.5px]', on ? 'border-[var(--line-strong)] text-ink' : 'opacity-60')}>
      <span className="han text-[13px] text-gold" aria-hidden>
        {FEATURE_INFO[f].han}
      </span>
      {FEATURE_INFO[f].name}
    </span>
  )
}

/** Thang danh xưng Kim Lan: Đại ca → … → Tiểu muội (ghế 1 mang ấn của giao diện, còn lại ấn bạc) */
const LADDER = [kimlanHonorific(1, 'nam', 12), kimlanHonorific(2, 'nu', 12), kimlanHonorific(3, 'nam', 12), kimlanHonorific(4, 'nu', 12), null, kimlanHonorific(12, 'nu', 12)]

function HonorLadder() {
  return (
    <ol className="relative mb-4 flex items-start justify-between" aria-label="Thứ bậc kết nghĩa theo ghế">
      <span aria-hidden className="absolute inset-x-4 top-[13px] border-t border-dashed border-[var(--line-strong)]" />
      {LADDER.map((h, i) =>
        h ? (
          <li key={i} className="relative flex flex-col items-center gap-1">
            <span
              className="seal h-[26px] min-w-[2.2rem] px-1 text-[12px] leading-none !rounded-[7px]"
              style={i === 0 ? undefined : { color: '#1a2130', background: 'radial-gradient(circle at 30% 25%, #ffffff, #cfdcec 78%)', boxShadow: 'inset 0 0 0 1.2px rgba(255,255,255,.6)' }}
              aria-hidden
            >
              {h.han}
            </span>
            <span className="text-[10.5px] font-semibold text-gold">{h.name}</span>
          </li>
        ) : (
          <li key={i} className="relative flex h-[26px] items-center gap-1 px-1" aria-hidden>
            {[0, 1, 2].map((k) => (
              <i key={k} className="block h-1 w-1 rounded-full bg-gold opacity-70" />
            ))}
          </li>
        ),
      )}
    </ol>
  )
}

/** Team: trưởng nhóm tự bật / tắt — bấm thử được */
function TeamToggles() {
  const [on, setOn] = useState<Set<Feature>>(() => new Set(ORG_TYPES.team.defaults))
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Bấm thử bật / tắt</div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Chức năng của Team">
        {FEATURES.map((f) => {
          const active = on.has(f)
          return (
            <button
              key={f}
              type="button"
              aria-pressed={active}
              onClick={() =>
                setOn((s) => {
                  const n = new Set(s)
                  if (n.has(f)) n.delete(f)
                  else n.add(f)
                  return n
                })
              }
              className={cn(
                'chip h-7 cursor-pointer gap-1.5 px-2.5 text-[11.5px] transition',
                active ? 'border-[var(--line-strong)] bg-[color-mix(in_oklab,var(--gold)_16%,transparent)] text-ink' : 'text-muted line-through decoration-[var(--line-strong)]',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-gold shadow-[0_0_6px_var(--gold)]' : 'bg-[var(--line-strong)]')} aria-hidden />
              {FEATURE_INFO[f].name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface PathDef {
  type: OrgType
  theme: OrgThemeId
  han: string
  sub?: string
  who: string
  stat: { value: string; label: string }
  bullets: ReactNode[]
  decor: ReactNode
  extra: ReactNode
}

const capacity = (t: OrgType) => ORG_TYPES[t].maxCapacity

const PATHS: PathDef[] = [
  {
    type: 'guild',
    theme: 'kinh-hong',
    han: '帮',
    who: 'Cho bang chủ và ban điều hành muốn quản cả bang trên một trang.',
    stat: { value: String(capacity('guild')), label: 'thành viên tối đa' },
    bullets: [
      'Chức vụ 7 bậc từ Bang Chủ tới Tân Binh, phân quyền rõ ràng',
      'Phó bản, bày trận, bang chiến, lịch điểm danh',
      'Bang khố: điểm cống hiến và đấu giá chiến lợi phẩm',
      'Chiêu mộ, sư đồ, tình duyên, thành tựu',
    ],
    decor: <CornerPetals />,
    extra: (
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Đủ bộ {FEATURES.length} chức năng</div>
        <div className="flex flex-wrap gap-1.5">
          {FEATURES.map((f) => (
            <FeatureChip key={f} f={f} />
          ))}
        </div>
      </div>
    ),
  },
  {
    type: 'kimlan',
    theme: 'bach-gia',
    han: '兰',
    sub: '金兰',
    who: 'Cho nhóm kết nghĩa huynh đệ, tỷ muội — nhỏ mà thân.',
    stat: { value: String(capacity('kimlan')), label: 'ghế kết nghĩa' },
    bullets: [
      `Tối đa ${capacity('kimlan')} người, đúng giới hạn trong game`,
      'Thứ bậc kết nghĩa: Đại ca, Nhị tỷ, Tam ca… tới Tiểu muội',
      'Chỉ phó bản, bày trận và lịch — như Kim Lan trong game',
    ],
    decor: (
      <>
        <FrameSnow count={12} />
        <div className="pointer-events-none absolute right-5 top-4 flex rotate-[-14deg] gap-1 opacity-85" aria-hidden>
          <PlumBlossom className="mt-3 h-4 w-4" />
          <PlumBlossom className="h-6 w-6" />
        </div>
        <SnowCrystal className="pointer-events-none absolute right-[34%] top-6 h-4 w-4 opacity-40" color="var(--gold-2)" />
      </>
    ),
    extra: (
      <div>
        <HonorLadder />
        <div className="flex flex-wrap gap-1.5">
          {ORG_TYPES.kimlan.allowed.map((f) => (
            <FeatureChip key={f} f={f} />
          ))}
        </div>
        <p className="mt-3 border-l-2 border-[var(--line-strong)] pl-3 text-[12.5px] italic leading-relaxed text-ink-2">“{KIMLAN_OATH}”</p>
      </div>
    ),
  },
  {
    type: 'team',
    theme: 'thanh-ngoc',
    han: '队',
    who: 'Cho hội bạn, nhóm cày phó bản hay đội PvP tự lập.',
    stat: { value: '∞', label: 'không giới hạn người' },
    bullets: ['Không giới hạn số thành viên', 'Trưởng nhóm tự bật / tắt chức năng cần dùng', 'Tối đa 3 phó nhóm phụ quản lý'],
    decor: <CornerLeaves />,
    extra: <TeamToggles />,
  },
]

function PathCard({ p }: { p: PathDef }) {
  const t = ORG_THEMES[p.theme]
  const info = ORG_TYPES[p.type]
  return (
    <div data-org-theme={p.theme} className="h-full text-ink">
      <article aria-labelledby={`lp-path-${p.type}`} className="panel panel-hover corners relative flex h-full flex-col overflow-hidden p-5 sm:p-6">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40"
          style={{ background: 'radial-gradient(420px 160px at 30% 0%, color-mix(in oklab, var(--gold) 16%, transparent), transparent 70%)' }}
          aria-hidden
        />
        {p.decor}
        <span className="han pointer-events-none absolute -right-3 top-10 text-[150px] leading-none text-gold opacity-[0.06]" aria-hidden>
          {p.han}
        </span>

        <div className="relative flex items-center justify-between gap-3">
          <span className="seal h-12 w-12 text-[26px]" aria-hidden>
            {p.han}
          </span>
          <span className="chip">
            <span className="han text-[13px] text-gold" aria-hidden>
              {t.han}
            </span>
            Giao diện {t.name}
          </span>
        </div>

        <h3 id={`lp-path-${p.type}`} className="relative mt-4 flex items-baseline gap-2.5">
          <span className="title-display text-gold-grad text-[34px]">{info.name}</span>
          {p.sub && (
            <span className="han text-[18px] text-gold" aria-hidden>
              {p.sub}
            </span>
          )}
        </h3>
        <p className="relative mt-1 text-[14px] text-ink-2">{p.who}</p>

        <div className="relative mt-4 flex items-baseline gap-2 border-y border-line py-3">
          <span className="title-display text-[40px] leading-none text-gold">{p.stat.value}</span>
          <span className="text-[13px] text-muted">{p.stat.label}</span>
        </div>

        <Bullets items={p.bullets} className="relative mt-4" />
        <div className="relative mt-auto pt-5">{p.extra}</div>
      </article>
    </div>
  )
}

export function Paths() {
  return (
    <section id="con-duong" aria-labelledby="lp-paths" className="relative px-4 py-20 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          id="lp-paths"
          eyebrow="Ba con đường"
          han="道"
          title="Bang lớn, nhà kết nghĩa hay hội bạn bè"
          sub="Chọn đúng kiểu tổ chức của bạn. Một nhân vật có thể ở nhiều nơi cùng lúc, mỗi nơi mặc một bộ giao diện riêng."
        />
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {PATHS.map((p, i) => (
            <Reveal key={p.type} delay={i * 0.1} className={cn('h-full', i === 2 && 'md:col-span-2 lg:col-span-1')}>
              <PathCard p={p} />
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13px] text-muted">
          <span>{ORG_THEME_IDS.length} bộ giao diện để chọn:</span>
          {ORG_THEME_IDS.map((id) => (
            <span key={id} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full ring-1 ring-[var(--line-strong)]" style={{ background: ORG_THEMES[id].accent }} aria-hidden />
              {ORG_THEMES[id].name}
            </span>
          ))}
        </Reveal>
      </div>
    </section>
  )
}

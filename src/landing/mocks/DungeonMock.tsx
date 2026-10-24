// Minh họa: tiến độ phó bản (boss, độ khó, first kill, đếm ngược reset tuần) + bày trận một tổ 6 người.
import { useMemo } from 'react'
import { Crown, Plus, Target, Timer } from 'lucide-react'
import { DUNGEONS, MODES, PARTY_SIZE, ROLES } from '@/domain/constants'
import type { CombatRole } from '@/domain/types'
import { ProgressBar, ProgressRing } from '@/components/ui/Progress'
import { Countdown } from '@/components/ui/Countdown'
import { RoleIcon } from '@/components/ui/Badges'
import { ChibiAvatar } from '@/components/chibi/ChibiAvatar'
import { alpha, shade } from '@/lib/color'
import { nextWeeklyReset } from '@/lib/utils'
import { MockPanel } from './MockPanel'
import { useSeen } from './useSeen'
import { PARTY } from './sample'

const DUNGEON = DUNGEONS.find((d) => d.id === 'trich-tien-kinh-dao') ?? DUNGEONS[0]
/** số độ khó đã hạ của từng boss (Thường → Anh Hùng) */
const CLEARED = [2, 2, 1]
const TOTAL = DUNGEON.bosses.length * DUNGEON.modes.length
const DONE = CLEARED.reduce((s, n) => s + n, 0)

function BossRow({ i, seen }: { i: number; seen: boolean }) {
  const b = DUNGEON.bosses[i]
  const n = CLEARED[i] ?? 0
  const first = i === 0
  const target = i === DUNGEON.bosses.length - 1
  return (
    <li className="rounded-2xl border border-line bg-[color-mix(in_oklab,var(--bg)_30%,transparent)] p-3">
      <div className="flex items-center gap-3">
        <span
          className="han grid h-10 w-10 shrink-0 place-items-center rounded-full text-[19px] text-white"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${shade(b.color, 30)}, ${b.color} 55%, ${shade(b.color, -45)})`,
            boxShadow: `inset 0 0 0 2px rgba(255,255,255,.18), 0 6px 16px -6px ${alpha(b.color, 0.8)}`,
            filter: n === 0 ? 'grayscale(1)' : undefined,
          }}
        >
          {b.glyph}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold text-ink">{b.name}</div>
          <div className="truncate text-[11.5px] text-muted">
            Ải {i + 1} · {b.title}
          </div>
        </div>
        {first ? (
          <span className="chip shrink-0 !text-gold" style={{ borderColor: 'var(--line-strong)' }}>
            <Crown size={12} /> First kill
          </span>
        ) : target ? (
          <span className="chip shrink-0 !text-cinnabar" style={{ borderColor: alpha('#e0523f', 0.45), background: alpha('#e0523f', 0.1) }}>
            <Target size={12} /> Mục tiêu
          </span>
        ) : (
          <span className="chip shrink-0">Đã hạ</span>
        )}
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {DUNGEON.modes.map((m, k) => (
          <div key={m}>
            <ProgressBar value={seen && k < n ? 1 : 0} max={1} color={MODES[m].color} height={5} />
            <div className="mt-0.5 text-[10.5px]" style={{ color: k < n ? `color-mix(in oklab, ${MODES[m].color} 70%, var(--text))` : 'var(--muted)' }}>
              {MODES[m].name}
            </div>
          </div>
        ))}
      </div>
    </li>
  )
}

const NEED: Record<CombatRole, number> = { tank: 1, healer: 1, dps: PARTY_SIZE - 2 }

function Formation() {
  const counts = useMemo(() => {
    const c: Record<CombatRole, number> = { tank: 0, healer: 0, dps: 0 }
    PARTY.forEach((h) => h && c[h.role]++)
    return c
  }, [])
  return (
    <MockPanel
      han="阵"
      title="Bày trận · Đội 1"
      sub={`${DUNGEON.name} · ${PARTY_SIZE} người`}
      right={
        <span className="hidden items-center gap-2 text-[12px] font-semibold text-ink-2 sm:inline-flex">
          {(Object.keys(NEED) as CombatRole[]).map((r) => (
            <span key={r} className="inline-flex items-center gap-1" title={ROLES[r].name}>
              <RoleIcon role={r} size={13} /> {counts[r]}/{NEED[r]}
            </span>
          ))}
        </span>
      }
    >
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 sm:gap-2">
        {PARTY.map((h, i) =>
          h ? (
            <div
              key={h.id}
              className="flex h-[104px] flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border border-line bg-[var(--surface-2)] px-1 text-center"
              style={{ background: `radial-gradient(circle at 50% 30%, ${alpha(ROLES[h.role].color, 0.16)}, transparent 70%), var(--surface-2)` }}
            >
              <ChibiAvatar look={h.look} classId={h.classId} size={36} />
              <span className="w-full truncate text-[11px] font-semibold text-ink">{h.name}</span>
              <span className="flex items-center gap-1 text-[10.5px] text-muted">
                <RoleIcon role={h.role} size={11} />
                <span className="hidden sm:inline">{ROLES[h.role].short}</span>
              </span>
            </div>
          ) : (
            <div key={`empty-${i}`} className="flex h-[104px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line-strong bg-black/10 px-1 text-center text-muted">
              <Plus size={16} />
              <span className="text-[10px] leading-tight">Cần sát thương</span>
            </div>
          ),
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
        <span className="chip !text-jade">Đủ tank & trị liệu</span>
        <span className="chip !text-ember">Thiếu 1 sát thương</span>
      </div>
    </MockPanel>
  )
}

export function DungeonMock() {
  const [ref, seen] = useSeen<HTMLDivElement>()
  const reset = useMemo(() => nextWeeklyReset(), [])
  const pct = (DONE / TOTAL) * 100
  return (
    <div ref={ref} className="relative">
      <MockPanel
        han="征"
        title="Tiến độ phó bản"
        sub={`${DUNGEON.name} · ${DUNGEON.size} người`}
        className="lg:mr-10 lg:pb-16"
        right={
          <span className="chip hidden sm:inline-flex">
            <Timer size={12} className="text-gold" /> Reset <Countdown to={reset} compact />
          </span>
        }
      >
        <div className="mb-3 flex items-center gap-4 rounded-2xl border border-line bg-[color-mix(in_oklab,var(--bg)_30%,transparent)] p-3">
          <ProgressRing value={seen ? pct : 0} size={62} stroke={6}>
            <span className="text-[13px] font-bold text-ink">{Math.round(pct)}%</span>
          </ProgressRing>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-cinnabar">
              <Target size={12} /> Mục tiêu tuần
            </div>
            <div className="truncate text-[14px] font-bold text-ink">{DUNGEON.bosses[2].name} · Anh Hùng</div>
            <div className="text-[12px] text-muted sm:hidden">
              Reset sau <Countdown to={reset} compact />
            </div>
            <div className="hidden text-[12px] text-muted sm:block">
              {DONE}/{TOTAL} lượt boss theo độ khó đã hạ
            </div>
          </div>
        </div>
        <ul className="space-y-2">
          {DUNGEON.bosses.map((b, i) => (
            <BossRow key={b.id} i={i} seen={seen} />
          ))}
        </ul>
      </MockPanel>
      {/* khung bày trận chồng lên mép dưới khung tiến độ (màn rộng) — khung trên chừa sẵn đệm dưới */}
      <div className="relative mt-4 lg:-mt-12 lg:ml-10">
        <Formation />
      </div>
    </div>
  )
}

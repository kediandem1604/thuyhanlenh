// Minh họa: một cặp sư đồ — hai chibi đối diện, thang 5 giai đoạn, nhiệm vụ chặng hiện tại (tick thử được), tình sư đồ.
import { useState } from 'react'
import { Check } from 'lucide-react'
import { CLASSES, MENTOR_STAGES, MENTOR_TASK_TEMPLATES } from '@/domain/constants'
import { Chibi } from '@/components/chibi/Chibi'
import { ProgressBar } from '@/components/ui/Progress'
import { cn } from '@/lib/utils'
import { MockPanel } from './MockPanel'
import { useSeen } from './useSeen'
import { CAST } from './sample'

const STAGE = 2
const MASTER = CAST.hanPhong
const DISCIPLE = CAST.linhNhi
const TASKS = MENTOR_TASK_TEMPLATES.filter((t) => t.stage === STAGE)

function Stepper() {
  return (
    <ol className="grid grid-cols-5 gap-1">
      {MENTOR_STAGES.map((st) => {
        const state = st.id < STAGE ? 'done' : st.id === STAGE ? 'current' : 'todo'
        return (
          <li key={st.id} className="relative flex flex-col items-center text-center" aria-current={state === 'current' ? 'step' : undefined}>
            {st.id > 0 && (
              <span
                className="absolute right-1/2 top-[15px] h-[2px] w-full"
                style={{ background: st.id <= STAGE ? 'linear-gradient(90deg, var(--gold-3), var(--gold))' : 'var(--line)' }}
              />
            )}
            <span
              className={cn(
                'han relative z-[1] grid h-8 w-8 place-items-center rounded-full border text-[15px]',
                state === 'done' && 'border-transparent text-on-gold',
                state === 'current' && 'border-gold text-gold shadow-[0_0_0_4px_color-mix(in_oklab,var(--gold)_18%,transparent)]',
                state === 'todo' && 'border-line text-muted',
              )}
              style={{ background: state === 'done' ? 'var(--gold-grad)' : 'var(--surface-solid)' }}
            >
              {st.han}
            </span>
            <span className={cn('mt-1 text-[10.5px] leading-tight', state === 'current' ? 'font-semibold text-gold' : 'text-muted')}>{st.name}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function MentorMock() {
  const [done, setDone] = useState<boolean[]>(() => TASKS.map((_, i) => i === 0))
  const [ref, seen] = useSeen<HTMLDivElement>()
  const ready = done.every(Boolean)
  const accent = CLASSES[DISCIPLE.classId].palette.accent

  return (
    <div ref={ref}>
      <MockPanel han="师" title="Sư đồ" sub="Lộ trình xuất sư" right={<span className="chip">18 ngày truyền nghề</span>} className="overflow-hidden">
        {/* sân khấu hai chibi */}
        <div
          className="relative -mx-4 -mt-1 mb-4 flex items-end justify-between gap-2 px-4 pb-1 sm:-mx-5 sm:px-6"
          style={{ background: `radial-gradient(420px 170px at 50% 100%, color-mix(in oklab, ${accent} 16%, transparent), transparent 70%)` }}
          aria-hidden
        >
          <span className="han pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 text-[86px] leading-none text-gold opacity-[0.07]">师</span>
          <div className="flex flex-col items-center">
            <Chibi look={MASTER.look} classId={MASTER.classId} size={104} animated={false} effects={false} />
            <span className="mt-1 max-w-[120px] truncate text-[13px] font-bold text-ink">{MASTER.name}</span>
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-gold">Sư phụ</span>
          </div>
          <div className="flex flex-1 flex-col items-center gap-1 self-center pb-8">
            <span className="seal h-10 w-10 text-[21px]">{MENTOR_STAGES[STAGE].han}</span>
            <span className="h-px w-full max-w-[90px] border-t border-dashed border-gold/50" />
            <span className="text-center text-[10.5px] text-muted">{MENTOR_STAGES[STAGE].name}</span>
          </div>
          <div className="flex flex-col items-center">
            <Chibi look={DISCIPLE.look} classId={DISCIPLE.classId} size={92} animated={false} effects={false} flip />
            <span className="mt-1 max-w-[120px] truncate text-[13px] font-bold text-ink">{DISCIPLE.name}</span>
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-gold">Đồ đệ</span>
          </div>
        </div>

        <Stepper />

        <div className="mt-4 rounded-2xl border border-line bg-[color-mix(in_oklab,var(--bg)_30%,transparent)] p-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            <span>Nhiệm vụ · {MENTOR_STAGES[STAGE].name}</span>
            {ready && <span className="chip !h-5 normal-case tracking-normal !text-jade">Đủ điều kiện thăng chặng</span>}
          </div>
          <ul className="space-y-1">
            {TASKS.map((t, i) => (
              <li key={t.label}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-[13px] hover:bg-white/[0.03]">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={done[i]}
                    onChange={() => setDone((d) => d.map((v, k) => (k === i ? !v : v)))}
                  />
                  <span
                    className={cn(
                      'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border transition peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--gold)]',
                      done[i] ? 'border-transparent bg-gold-grad text-on-gold' : 'border-line-strong',
                    )}
                    aria-hidden
                  >
                    {done[i] && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className={cn(done[i] ? 'text-muted line-through decoration-[var(--line-strong)]' : 'text-ink-2')}>{t.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[12px]">
            <span className="text-muted">
              Tình sư đồ · <b className="text-ink">Thân Thiết</b>
            </span>
            <span className="tabular-nums text-ink-2">820 / 1.500</span>
          </div>
          <ProgressBar value={seen ? 820 - 500 : 0} max={1000} height={7} />
        </div>
      </MockPanel>
    </div>
  )
}

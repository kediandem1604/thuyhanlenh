// Minh họa tương tác: Xưởng chibi — chọn lưu phái, giới tính, bấm "Đổi dáng" để sinh ngoại hình mới ngay tại chỗ.
import { useState } from 'react'
import { Dices } from 'lucide-react'
import { CLASSES, CLASS_IDS, ROLES } from '@/domain/constants'
import type { ChibiLook, ClassId, Gender } from '@/domain/types'
import { randomLook } from '@/data/seed'
import { Chibi } from '@/components/chibi/Chibi'
import { RoleIcon } from '@/components/ui/Badges'
import { ACCESSORIES, BACK_HAIR, BANGS, EXPRESSIONS, GENDERS, HAIR_SWATCHES, MOODS } from '@/pages/studio/options'
import { alpha } from '@/lib/color'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { cn, createRng } from '@/lib/utils'
import { CAST } from './sample'

function roll(gender: Gender, classId: ClassId): ChibiLook {
  return randomLook(createRng(Math.floor(Math.random() * 1e9)), gender, classId)
}

function describe(look: ChibiLook) {
  const hair = HAIR_SWATCHES.find((h) => h.value === look.hairColor)?.label
  const expr = EXPRESSIONS.find((e) => e.value === look.expression)?.label
  const mood = MOODS.find((m) => m.value === look.mood)?.label
  return [BANGS[look.bangs], BACK_HAIR[look.backHair], hair && `tóc ${hair.toLowerCase()}`, expr, mood && `khí chất ${mood.toLowerCase()}`, look.accessory > 0 && ACCESSORIES[look.accessory]?.label]
    .filter(Boolean)
    .join(' · ')
}

export function StudioMock() {
  const big = useMediaQuery('(min-width: 640px)')
  const [classId, setClassId] = useState<ClassId>(CAST.vanKhe.classId)
  const [gender, setGender] = useState<Gender>(CAST.vanKhe.gender)
  const [look, setLook] = useState<ChibiLook>(CAST.vanKhe.look)
  const [n, setN] = useState(0)
  const cls = CLASSES[classId]
  const accent = cls.palette.accent

  const reroll = (g = gender, c = classId) => {
    setLook(roll(g, c))
    setN((x) => x + 1)
  }

  return (
    <div className="panel corners overflow-hidden p-0">
      {/* sân khấu */}
      <div
        className="relative flex h-[260px] items-end justify-center overflow-hidden sm:h-[300px]"
        style={{ background: `radial-gradient(360px 220px at 50% 62%, ${alpha(accent, 0.24)}, transparent 72%)` }}
      >
        <span className="han pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 text-[150px] leading-none opacity-[0.08] sm:text-[180px]" style={{ color: accent }} aria-hidden>
          {cls.han[0]}
        </span>
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          <RoleIcon role={cls.role} size={12} /> {ROLES[cls.role].short}
        </span>
        <span className="chip absolute right-4 top-4">
          <span className="han text-[13px]" style={{ color: accent }} aria-hidden>
            {cls.han}
          </span>
          {cls.name}
        </span>
        <div key={n} className="lp-pop relative -mb-1">
          <Chibi look={look} classId={classId} size={big ? 200 : 168} title={`Chibi ${cls.name}`} />
        </div>
      </div>

      <div className="space-y-4 border-t border-line p-4 sm:p-5">
        <p className="min-h-[2.6em] text-[12.5px] leading-snug text-ink-2" aria-live="polite">
          <b className="text-ink">{cls.name}</b> · {describe(look)}
        </p>

        <div>
          <div className="label">Lưu phái</div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Chọn lưu phái">
            {CLASS_IDS.map((id) => {
              const c = CLASSES[id]
              const on = id === classId
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setClassId(id)
                    reroll(gender, id)
                  }}
                  className={cn('chip h-8 cursor-pointer gap-1.5 px-2.5 text-[12px] transition hover:border-[var(--line-strong)]', on && 'text-ink')}
                  style={on ? { borderColor: alpha(c.palette.accent, 0.7), background: alpha(c.palette.accent, 0.16), boxShadow: `0 0 14px -4px ${alpha(c.palette.accent, 0.7)}` } : undefined}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: c.palette.accent }} />
                  {c.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="label">Giới tính</div>
            <div className="inline-flex rounded-xl border border-line bg-[color-mix(in_oklab,var(--bg)_40%,transparent)] p-0.5" role="group" aria-label="Chọn giới tính">
              {GENDERS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  aria-pressed={gender === g.value}
                  onClick={() => {
                    if (g.value === gender) return
                    setGender(g.value)
                    reroll(g.value, classId)
                  }}
                  className={cn('h-8 rounded-[10px] px-4 text-[12.5px] font-semibold transition', gender === g.value ? 'bg-gold-grad text-on-gold' : 'text-ink-2 hover:text-ink')}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="btn btn-gold h-11 px-5 text-[14px]" onClick={() => reroll()}>
            <Dices size={17} aria-hidden /> Đổi dáng
          </button>
        </div>
      </div>
    </div>
  )
}

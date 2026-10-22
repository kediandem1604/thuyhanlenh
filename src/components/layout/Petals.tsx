import { useMemo, type CSSProperties } from 'react'
import { createRng, type Rng } from '@/lib/utils'
import { ORG_THEMES, type OrgThemeId, type ParticleKind } from '@/domain/orgs'
import { useOrgThemeId } from '@/components/fx/useOrgTheme'
import { PlumBlossom } from '@/components/fx/shapes'

/*
 * Hạt rơi theo giao diện tổ chức — thuần CSS keyframes, rất nhẹ cho máy:
 *  sakura   hoa đào (Kinh Hồng — giữ nguyên như cũ)
 *  snow     tuyết mềm nhiều cỡ + vài cánh / bông bạch mai (Bạch Gia)
 *  leaves   lá trúc ngọc bích lật trong gió (Thanh Ngọc)
 *  lotus    cánh sen hồng rơi chậm (Hồng Liên)
 *  wisteria cánh tử đằng trôi theo gió (Tử Đằng)
 * Loại hạt lấy từ `data-org-theme` trên <html> (đổi là vẽ lại); `kind` / `theme` để ép khi xem trước.
 * prefers-reduced-motion: ẩn hẳn (xem .fx-particles trong index.css).
 */
export function Petals({ count = 16, kind, theme }: { count?: number; kind?: ParticleKind; theme?: OrgThemeId }) {
  const themeId = useOrgThemeId(theme)
  const k = kind ?? ORG_THEMES[themeId].particles
  return (
    <div className="fx-particles" aria-hidden>
      {k === 'sakura' ? <Sakura count={count} /> : <Field kind={k} count={count} />}
    </div>
  )
}

/* ---------------- Hoa đào (y như bản gốc) ---------------- */

function Sakura({ count }: { count: number }) {
  const petals = useMemo(() => {
    const rng = createRng('petals')
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: rng.float(-5, 100),
      size: rng.float(7, 14),
      duration: rng.float(14, 26),
      delay: -rng.float(0, 26),
      drift: rng.float(-120, 160),
      hue: rng.pick(['#f6b8cb', '#f2a7bf', '#ffd1dc', '#f7c5a8']),
    }))
  }, [count])

  return (
    <>
      {petals.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 block"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 0.72,
              borderRadius: '150% 0 150% 0',
              background: `linear-gradient(135deg, ${p.hue}, color-mix(in oklab, ${p.hue} 60%, white))`,
              opacity: 0.75,
              boxShadow: `0 0 8px ${p.hue}55`,
              animation: `petal-fall ${p.duration}s linear ${p.delay}s infinite`,
              '--drift': `${p.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </>
  )
}

/* ---------------- Các loại hạt khác: .fx-p + biến CSS ---------------- */

interface Particle {
  id: string
  cls: string
  left: number
  w: number
  h: number
  /** thời gian rơi hết màn hình (s) */
  dur: number
  delay: number
  /** lệch ngang khi chạm đáy (px) */
  drift: number
  /** biên độ đung đưa (px) và chu kỳ (s) */
  amp: number
  sway: number
  o: number
  /** chu kỳ xoay (s), góc mỗi chu kỳ, trục xoay 3D */
  spin?: number
  turn?: number
  axis?: string
  c1?: string
  c2?: string
  c3?: string
  blossom?: boolean
}

const f2 = (n: number) => n.toFixed(2)
const axis3d = (rng: Rng) => `${f2(rng.float(0.5, 1))} ${f2(rng.float(0.1, 0.6))} ${f2(rng.float(0.1, 0.7))}`

function buildSnow(rng: Rng, count: number): Particle[] {
  const out: Particle[] = []
  // bông tuyết tròn: càng gần (to) càng rơi nhanh, càng rõ
  for (let i = 0; i < Math.round(count * 1.6); i++) {
    const depth = rng.next()
    const size = 2 + depth * 4.5 + rng.float(0, 1)
    const dur = 27 - depth * 12 + rng.float(-2, 2)
    out.push({
      id: `f${i}`,
      cls: 'fx-flake',
      left: rng.float(-3, 100),
      w: size,
      h: size,
      dur,
      delay: -rng.float(0, dur),
      drift: rng.float(-60, 90),
      amp: rng.float(6, 20) * (0.5 + depth),
      sway: rng.float(3, 6.5),
      o: 0.45 + depth * 0.45,
    })
  }
  // vài bông lớn mờ ở tiền cảnh (chiều sâu)
  for (let i = 0; i < 3; i++) {
    const size = rng.float(9, 13)
    const dur = rng.float(11, 15)
    out.push({ id: `n${i}`, cls: 'fx-flake fx-flake-near', left: rng.float(0, 96), w: size, h: size, dur, delay: -rng.float(0, dur), drift: rng.float(-40, 80), amp: rng.float(18, 30), sway: rng.float(4, 6), o: 0.5 })
  }
  // cánh bạch mai
  for (let i = 0; i < 4; i++) {
    const s = rng.float(7, 10)
    const dur = rng.float(18, 26)
    out.push({
      id: `p${i}`,
      cls: 'fx-plum',
      left: rng.float(-4, 96),
      w: s,
      h: s * 0.92,
      dur,
      delay: -rng.float(0, dur),
      drift: rng.float(-40, 120),
      amp: rng.float(16, 30),
      sway: rng.float(3, 5),
      o: 0.9,
      spin: rng.float(4, 8),
      turn: rng.pick([360, -360]),
      axis: axis3d(rng),
    })
  }
  // bông bạch mai nguyên đóa
  for (let i = 0; i < 2; i++) {
    const s = rng.float(13, 17)
    const dur = rng.float(20, 28)
    out.push({
      id: `b${i}`,
      cls: '',
      blossom: true,
      left: rng.float(4, 92),
      w: s,
      h: s,
      dur,
      delay: -rng.float(0, dur),
      drift: rng.float(-30, 100),
      amp: rng.float(14, 24),
      sway: rng.float(3.5, 5.5),
      o: 0.92,
      spin: rng.float(9, 14),
      turn: rng.pick([360, -360]),
      axis: `${f2(rng.float(0.2, 0.5))} ${f2(rng.float(0.2, 0.5))} 1`,
    })
  }
  return out
}

const LEAF_COLORS = [
  ['#2f8a64', '#5cb98a', '#a9e0bf'],
  ['#3a9d7a', '#6fcf9d', '#c2ecd2'],
  ['#2c7f6e', '#5ec7b0', '#b4ecdc'],
  ['#4c9a5a', '#86c98e', '#cdeccf'],
] as const

function buildLeaves(rng: Rng, count: number): Particle[] {
  return Array.from({ length: Math.round(count * 0.75) }, (_, i) => {
    const w = rng.float(16, 28)
    const dur = rng.float(16, 26)
    const [c1, c2, c3] = rng.pick(LEAF_COLORS)
    return {
      id: `l${i}`,
      cls: 'fx-leaf',
      left: rng.float(-10, 94),
      w,
      h: w * rng.float(0.2, 0.26),
      dur,
      delay: -rng.float(0, dur),
      drift: rng.float(40, 260),
      amp: rng.float(14, 34),
      sway: rng.float(2.6, 4.6),
      o: rng.float(0.65, 0.85),
      spin: rng.float(3.5, 7),
      turn: rng.pick([360, -360]),
      axis: axis3d(rng),
      c1,
      c2,
      c3,
    }
  })
}

function buildLotus(rng: Rng, count: number): Particle[] {
  return Array.from({ length: Math.round(count * 0.6) }, (_, i) => {
    const s = rng.float(15, 23)
    const dur = rng.float(26, 38)
    return {
      id: `s${i}`,
      cls: 'fx-lotus',
      left: rng.float(-4, 98),
      w: s * 0.66,
      h: s,
      dur,
      delay: -rng.float(0, dur),
      drift: rng.float(-80, 120),
      amp: rng.float(18, 40),
      sway: rng.float(5, 8),
      o: rng.float(0.7, 0.88),
      spin: rng.float(16, 28),
      turn: rng.pick([360, -360]),
      axis: `${f2(rng.float(0, 0.35))} ${f2(rng.float(0, 0.35))} 1`,
    }
  })
}

const WISTERIA_COLORS = [
  ['#9d84e8', '#d9cbfb'],
  ['#b49af5', '#ece4ff'],
  ['#8a6fd8', '#c9b5f7'],
  ['#c39be8', '#f1e3fb'],
] as const

function buildWisteria(rng: Rng, count: number): Particle[] {
  return Array.from({ length: Math.round(count * 1.1) }, (_, i) => {
    const s = rng.float(5, 9)
    const dur = rng.float(17, 27)
    const [c1, c2] = rng.pick(WISTERIA_COLORS)
    return {
      id: `w${i}`,
      cls: 'fx-wisteria',
      left: rng.float(-24, 88),
      w: s,
      h: s * 0.9,
      dur,
      delay: -rng.float(0, dur),
      drift: rng.float(120, 320),
      amp: rng.float(8, 18),
      sway: rng.float(2.4, 4),
      o: rng.float(0.6, 0.85),
      spin: rng.float(5, 10),
      turn: rng.pick([360, -360]),
      axis: `${f2(rng.float(0.1, 0.4))} ${f2(rng.float(0.1, 0.4))} 1`,
      c1,
      c2,
    }
  })
}

const BUILDERS: Record<Exclude<ParticleKind, 'sakura'>, (rng: Rng, count: number) => Particle[]> = {
  snow: buildSnow,
  leaves: buildLeaves,
  lotus: buildLotus,
  wisteria: buildWisteria,
}

function Field({ kind, count }: { kind: Exclude<ParticleKind, 'sakura'>; count: number }) {
  const items = useMemo(() => BUILDERS[kind](createRng(`fx-${kind}`), count), [kind, count])
  return (
    <>
      {items.map((p) => {
        const style = {
          left: `${f2(p.left)}%`,
          width: p.w,
          height: p.h,
          '--dur': `${f2(p.dur)}s`,
          '--delay': `${f2(p.delay)}s`,
          '--drift': `${Math.round(p.drift)}px`,
          '--amp': `${f2(p.amp)}px`,
          '--sway': `${f2(p.sway)}s`,
          '--o': f2(p.o),
          ...(p.spin ? { '--spin': `${f2(p.spin)}s`, '--turn': `${p.turn ?? 360}deg`, '--axis': p.axis ?? '0 0 1' } : null),
          ...(p.c1 ? { '--c1': p.c1, '--c2': p.c2, '--c3': p.c3 ?? p.c2 } : null),
        } as CSSProperties
        return p.blossom ? (
          <PlumBlossom key={p.id} className="fx-p fx-blossom" style={style} />
        ) : (
          <span key={p.id} className={`fx-p ${p.cls}`} style={style} />
        )
      })}
    </>
  )
}

import { memo, useEffect, useId, useRef, type ReactNode } from 'react'
import { CLASSES, type ClassPalette } from '@/domain/constants'
import type { ChibiLook, ClassId, Expression } from '@/domain/types'
import { shade } from '@/lib/color'

/*
 * Nhân vật chibi vẽ hoàn toàn bằng SVG.
 * Khung vẽ 160 × 200: đầu tâm (80, 80), mắt ở y = 88, thân áo 116 → 180.
 * Lớp vẽ (sau → trước): hào quang → bóng → đạo cụ sau → tóc sau → thân → đạo cụ trước
 *                       → tóc nền → mặt → mắt/miệng → mái → phụ kiện → hiệu ứng khí chất.
 */

export interface ChibiProps {
  look: ChibiLook
  classId: ClassId
  size?: number
  variant?: 'full' | 'bust'
  animated?: boolean
  effects?: boolean
  showProp?: boolean
  flip?: boolean
  className?: string
  title?: string
}

interface Ctx {
  id: (k: string) => string
  url: (k: string) => string
  look: ChibiLook
  P: ClassPalette
  hair: string
  hairLine: string
  skin: string
  skinLine: string
  line: string
  fem: boolean
  animated: boolean
}

const LINE = '#2b1b24'
const EYE_L = { cx: 63, cy: 88, s: -1 }
const EYE_R = { cx: 97, cy: 88, s: 1 }

/* ------------------------------------------------------------------ */
/* Mắt                                                                 */
/* ------------------------------------------------------------------ */

type EyeKind = 'open' | 'cool' | 'happy' | 'sleepy' | 'shy'

function eyeKinds(expr: Expression): [EyeKind, EyeKind] {
  switch (expr) {
    case 'calm':
    case 'smirk':
      return ['cool', 'cool']
    case 'wink':
      return ['open', 'happy']
    case 'happy':
      return ['happy', 'happy']
    case 'shy':
      return ['shy', 'shy']
    case 'sleepy':
      return ['sleepy', 'sleepy']
    default:
      return ['open', 'open']
  }
}

function Eye({ c, pos, kind }: { c: Ctx; pos: typeof EYE_L; kind: EyeKind }) {
  const { cx, cy, s } = pos
  const pupil = shade(c.look.eyeColor, -62)
  const outer = cx + s * 9.5
  const inner = cx - s * 9.5

  if (kind === 'happy') {
    return (
      <path
        d={`M${cx - 8},${cy + 3} Q${cx},${cy - 7} ${cx + 8},${cy + 3}`}
        fill="none"
        stroke={c.line}
        strokeWidth={3}
        strokeLinecap="round"
      />
    )
  }
  if (kind === 'sleepy') {
    return (
      <g>
        <path d={`M${cx - 8},${cy + 1} Q${cx},${cy + 6.5} ${cx + 8},${cy + 1}`} fill="none" stroke={c.line} strokeWidth={2.8} strokeLinecap="round" />
        <path d={`M${outer - s * 1},${cy + 1.5} l${s * 3},${-2}`} stroke={c.line} strokeWidth={2} strokeLinecap="round" />
      </g>
    )
  }
  if (kind === 'cool') {
    const clip = c.id(`eyeclip${s}`)
    const almond = `M${inner},${cy + 2} Q${cx - s * 1},${cy - 9} ${outer + s * 0.5},${cy - 3} Q${cx + s * 2},${cy + 10.5} ${inner},${cy + 2} Z`
    return (
      <g className={c.animated ? 'chibi-blink' : undefined}>
        <clipPath id={clip}>
          <path d={almond} />
        </clipPath>
        <path d={almond} fill="#fff" />
        <g clipPath={`url(#${clip})`}>
          <ellipse cx={cx + s * 0.5} cy={cy + 1.5} rx={6.6} ry={7.8} fill={c.url('iris')} />
          <ellipse cx={cx + s * 0.5} cy={cy + 2.2} rx={3.2} ry={4.2} fill={pupil} />
          <circle cx={cx - 2.2} cy={cy - 1.2} r={2.1} fill="#fff" />
          <circle cx={cx + 2.6} cy={cy + 4} r={1} fill="#fff" opacity={0.85} />
        </g>
        <path
          d={`M${inner},${cy + 2} Q${cx - s * 1},${cy - 9} ${outer + s * 0.5},${cy - 3} l${s * 2.6},${-1.2}`}
          fill="none"
          stroke={c.line}
          strokeWidth={3.1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    )
  }
  // mắt mở to long lanh (open / shy)
  const dy = kind === 'shy' ? 1 : 0
  const ry = c.fem ? 10.2 : 9.4
  return (
    <g className={c.animated ? 'chibi-blink' : undefined}>
      <ellipse cx={cx} cy={cy} rx={8.6} ry={ry} fill="#fff" />
      <ellipse cx={cx} cy={cy + 1 + dy} rx={7.2} ry={ry - 1.3} fill={c.url('iris')} />
      <ellipse cx={cx} cy={cy + 2.4 + dy} rx={3.5} ry={4.6} fill={pupil} />
      <path
        d={`M${cx - 4.6},${cy + 6 + dy} Q${cx},${cy + 8.6 + dy} ${cx + 4.6},${cy + 6 + dy}`}
        stroke={shade(c.look.eyeColor, 55)}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
        opacity={0.9}
      />
      <circle cx={cx - 2.6} cy={cy - 3.2 + dy} r={2.9} fill="#fff" />
      <circle cx={cx + 3} cy={cy + 4 + dy} r={1.35} fill="#fff" opacity={0.92} />
      <path
        d={`M${inner},${cy - 4.5} Q${cx - s * 1},${cy - 13.5} ${outer},${cy - 4}`}
        fill="none"
        stroke={c.line}
        strokeWidth={c.fem ? 3 : 2.6}
        strokeLinecap="round"
      />
      {c.fem && (
        <path d={`M${outer},${cy - 4} q${s * 3},${-0.6} ${s * 4.4},${-3.2}`} fill="none" stroke={c.line} strokeWidth={2} strokeLinecap="round" />
      )}
      <path
        d={`M${cx - 3.5},${cy + ry + 0.6} Q${cx},${cy + ry + 1.4} ${cx + 3.5},${cy + ry + 0.6}`}
        stroke={c.line}
        strokeWidth={1}
        fill="none"
        opacity={0.3}
        strokeLinecap="round"
      />
    </g>
  )
}

function Brows({ c }: { c: Ctx }) {
  const expr = c.look.expression
  const col = shade(c.hair, -35)
  const brow = ({ cx, cy, s }: typeof EYE_L) => {
    if (expr === 'calm' || expr === 'smirk')
      return `M${cx - s * 7},${cy - 15.5} Q${cx},${cy - 17.5} ${cx + s * 7},${cy - 19.5}`
    if (expr === 'shy') return `M${cx - s * 6},${cy - 19.5} Q${cx},${cy - 19} ${cx + s * 6.5},${cy - 16.5}`
    return `M${cx - s * 6},${cy - 17.5} Q${cx},${cy - 20} ${cx + s * 6.5},${cy - 18}`
  }
  return (
    <g opacity={0.6} fill="none" stroke={col} strokeWidth={2} strokeLinecap="round">
      <path d={brow(EYE_L)} />
      <path d={brow(EYE_R)} />
    </g>
  )
}

function Mouth({ c }: { c: Ctx }) {
  const m = '#8a3440'
  switch (c.look.expression) {
    case 'grin':
    case 'happy':
      return (
        <g>
          <path d="M74,101.5 Q80,111.5 86,101.5 Q80,103 74,101.5 Z" fill="#7a2532" stroke={m} strokeWidth={1} strokeLinejoin="round" />
          <path d="M76.8,106 Q80,104.2 83.2,106 Q80,109.4 76.8,106 Z" fill="#f2899c" />
        </g>
      )
    case 'calm':
      return <path d="M77,105 Q80,105.8 83,104.8" fill="none" stroke={m} strokeWidth={1.6} strokeLinecap="round" />
    case 'smirk':
      return <path d="M75.5,105 Q80.5,106.6 85,102.6" fill="none" stroke={m} strokeWidth={1.7} strokeLinecap="round" />
    case 'wink':
      return (
        <g>
          <path d="M74,102.5 Q77,106.4 80,102.8 Q83,106.4 86,102.5" fill="none" stroke={m} strokeWidth={1.7} strokeLinecap="round" />
          <path d="M80.5,104.6 Q82,108 84,105.2" fill="#f2899c" stroke={m} strokeWidth={0.8} />
        </g>
      )
    case 'shy':
      return <path d="M75,104.5 Q77.5,102.6 80,104.5 Q82.5,106.4 85,104.5" fill="none" stroke={m} strokeWidth={1.6} strokeLinecap="round" />
    case 'sleepy':
      return <ellipse cx={80} cy={105} rx={2.2} ry={2.7} fill="#7a2532" />
    default:
      return <path d="M75,103 Q80,108 85,103" fill="none" stroke={m} strokeWidth={1.8} strokeLinecap="round" />
  }
}

function Blush({ c }: { c: Ctx }) {
  const strong = c.look.expression === 'shy' || c.look.mood === 'romantic'
  const op = strong ? 0.6 : 0.4
  return (
    <g>
      <ellipse cx={56} cy={99.5} rx={7.5} ry={3.8} fill="#ff86a2" opacity={op} />
      <ellipse cx={104} cy={99.5} rx={7.5} ry={3.8} fill="#ff86a2" opacity={op} />
      {(strong || c.look.mood === 'cute') && (
        <g stroke="#f06486" strokeWidth={1.1} strokeLinecap="round" opacity={0.7}>
          <path d="M52,101 l2.2,-3.4 M55.5,101 l2.2,-3.4 M59,101 l2.2,-3.4" />
          <path d="M100,101 l2.2,-3.4 M103.5,101 l2.2,-3.4 M107,101 l2.2,-3.4" />
        </g>
      )}
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Tóc                                                                 */
/* ------------------------------------------------------------------ */

const CRANIUM = 'M33,86 C28,46 52,24 80,24 C108,24 132,46 127,86 C125,98 120,106 116,110 L44,110 C40,106 35,98 33,86 Z'

const BANGS = [
  // 0 — mái bằng răng cưa mềm
  'M35,82 C33,50 54,30 80,30 C106,30 127,50 125,82 Q120,70 116,64 Q114,72 110,76 Q105,66 101,60 Q98,68 93,73 Q88,63 83,57 Q80,66 74,72 Q69,64 64,59 Q61,67 55,73 Q50,66 46,62 Q41,70 35,82 Z',
  // 1 — mái lệch
  'M35,84 C32,50 54,30 82,30 C108,30 128,50 125,84 Q121,72 117,66 Q116,76 111,81 Q108,68 100,58 Q97,66 90,70 Q86,58 76,52 Q72,60 64,63 Q58,56 52,55 Q46,63 42,72 Q38,77 35,84 Z',
  // 2 — mái nhọn phong trần
  'M35,84 C33,50 54,30 80,30 C106,30 127,50 125,84 Q119,70 115,62 L109,78 Q104,64 98,56 L93,74 Q86,60 80,54 L73,72 Q68,60 62,56 L57,75 Q51,63 46,60 L41,75 Q37,79 35,84 Z',
  // 3 — mái rèm rẽ ngôi giữa
  'M35,88 C32,50 54,30 80,30 C106,30 128,50 125,88 Q121,79 111,79 Q104,71 100,62 Q94,50 81.5,46 L80,41 L78.5,46 Q66,50 60,62 Q56,71 49,79 Q39,79 35,88 Z',
]

const SPIKES_TOP = 'M50,36 L42,16 L60,28 L64,10 L77,26 L88,8 L94,26 L110,14 L108,34 Z'

function BackHair({ c }: { c: Ctx }) {
  const fill = c.url('hair')
  const st = { stroke: c.hairLine, strokeWidth: 1.3, strokeLinejoin: 'round' as const }
  switch (c.look.backHair) {
    case 0: // xõa dài
      return (
        <path
          d="M36,70 C26,112 28,150 32,174 Q40,180 46,172 Q52,180 58,172 L60,122 L100,122 L102,172 Q108,180 114,172 Q120,180 128,174 C132,150 134,112 124,70 Z"
          fill={fill}
          {...st}
        />
      )
    case 1: // búi đôi + tóc đuôi
      return (
        <g>
          <g className={c.animated ? 'chibi-sway' : undefined}>
            <path d="M42,46 Q22,92 28,146 Q34,156 40,146 Q36,104 52,58 Z" fill={fill} {...st} />
          </g>
          <g className={c.animated ? 'chibi-sway' : undefined} style={{ animationDelay: '-1.5s' }}>
            <path d="M118,46 Q138,92 132,146 Q126,156 120,146 Q124,104 108,58 Z" fill={fill} {...st} />
          </g>
        </g>
      )
    case 2: // đuôi ngựa cao
      return (
        <g className={c.animated ? 'chibi-sway' : undefined}>
          <path d="M98,30 Q142,30 144,82 Q146,124 128,156 Q136,116 128,86 Q120,56 98,42 Z" fill={fill} {...st} />
        </g>
      )
    case 3: // búi nửa đầu, tóc xõa sau
      return (
        <path
          d="M37,72 C30,108 32,138 36,158 Q44,164 50,156 L58,120 L102,120 L110,156 Q116,164 124,158 C128,138 130,108 123,72 Z"
          fill={fill}
          {...st}
        />
      )
    default: // tóc ngắn — gáy
      return <path d="M38,92 Q36,114 46,120 L114,120 Q124,114 122,92 Z" fill={fill} {...st} />
  }
}

function TopHair({ c }: { c: Ctx }) {
  // các phần tóc nằm trên đỉnh (búi), vẽ trước tóc nền để búi lộ phía trên
  const fill = c.url('hair')
  const st = { stroke: c.hairLine, strokeWidth: 1.3 }
  const nodes: ReactNode[] = []
  if (c.look.backHair === 1) {
    nodes.push(<circle key="b1" cx={44} cy={38} r={14} fill={fill} {...st} />, <circle key="b2" cx={116} cy={38} r={14} fill={fill} {...st} />)
  }
  if (c.look.backHair === 3) {
    nodes.push(<ellipse key="bun" cx={80} cy={22} rx={c.fem ? 15 : 11} ry={c.fem ? 12 : 10} fill={fill} {...st} />)
  }
  if (c.look.backHair === 2) {
    nodes.push(<ellipse key="tie" cx={100} cy={30} rx={9} ry={8} fill={fill} {...st} />)
  }
  return <>{nodes}</>
}

function SideLocks({ c }: { c: Ctx }) {
  const long = c.fem || c.look.backHair === 0
  const fill = c.url('hair')
  const st = { stroke: c.hairLine, strokeWidth: 1.2, strokeLinejoin: 'round' as const }
  return long ? (
    <g>
      <path d="M37,74 Q31,100 37,128 Q41,133 45,126 Q42,104 47,82 Z" fill={fill} {...st} />
      <path d="M123,74 Q129,100 123,128 Q119,133 115,126 Q118,104 113,82 Z" fill={fill} {...st} />
    </g>
  ) : (
    <g>
      <path d="M37,76 Q34,96 39,110 Q43,112 45,106 Q43,92 47,82 Z" fill={fill} {...st} />
      <path d="M123,76 Q126,96 121,110 Q117,112 115,106 Q117,92 113,82 Z" fill={fill} {...st} />
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Thân                                                                */
/* ------------------------------------------------------------------ */

function Body({ c }: { c: Ctx }) {
  const { P } = c
  const robeLine = shade(P.robeDark, -28)
  return (
    <g strokeLinejoin="round">
      {/* giày */}
      <ellipse cx={69} cy={185} rx={9} ry={5} fill={shade(P.robeDark, -30)} />
      <ellipse cx={91} cy={185} rx={9} ry={5} fill={shade(P.robeDark, -30)} />
      {/* cổ */}
      <rect x={73} y={106} width={14} height={14} rx={4} fill={shade(c.skin, -8)} />
      {/* thân áo */}
      <path d="M57,116 Q80,110 103,116 L114,178 Q80,189 46,178 Z" fill={c.url('robe')} stroke={robeLine} strokeWidth={1.3} />
      <path d="M86,140 L89,182" stroke={robeLine} strokeWidth={1} opacity={0.45} />
      {/* viền gấu áo */}
      <path d="M46.6,175 Q80,186 113.4,175" fill="none" stroke={P.trim} strokeWidth={3} strokeLinecap="round" />
      {/* lớp áo trong + cổ giao lĩnh */}
      <path d="M69,114 L80,136 L91,114 Z" fill={P.inner} />
      <path d="M68,113.5 L86.5,145" stroke={P.trim} strokeWidth={3.2} strokeLinecap="round" />
      <path d="M92,113.5 L81,129" stroke={P.trim} strokeWidth={3.2} strokeLinecap="round" />
      {/* đai lưng */}
      <path d="M52,141 Q80,148 108,141 L109.6,151 Q80,158 50.4,151 Z" fill={P.sash} stroke={shade(P.sash, -30)} strokeWidth={1} />
      <path d="M78,152 L72,172 L77.5,168 L80,174 Z" fill={P.sash} stroke={shade(P.sash, -30)} strokeWidth={0.8} />
      <circle cx={80} cy={150} r={3.4} fill={P.trim} stroke={shade(P.trim, -30)} strokeWidth={0.8} />
      {/* ống tay áo rộng */}
      <path d="M60,118 Q45,126 39,150 Q37,166 48,171 Q58,172 63,161 L67,132 Z" fill={c.url('robe')} stroke={robeLine} strokeWidth={1.3} />
      <path d="M100,118 Q115,126 121,150 Q123,166 112,171 Q102,172 97,161 L93,132 Z" fill={c.url('robe')} stroke={robeLine} strokeWidth={1.3} />
      <path d="M39.6,158 Q48,172 62.6,161" fill="none" stroke={P.trim} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M120.4,158 Q112,172 97.4,161" fill="none" stroke={P.trim} strokeWidth={2.6} strokeLinecap="round" />
      {/* bàn tay */}
      <circle cx={51} cy={170} r={5} fill={c.skin} stroke={c.skinLine} strokeWidth={1} />
      <circle cx={109} cy={170} r={5} fill={c.skin} stroke={c.skinLine} strokeWidth={1} />
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Đạo cụ lưu phái                                                     */
/* ------------------------------------------------------------------ */

function PropBack({ c, classId }: { c: Ctx; classId: ClassId }) {
  const { P } = c
  switch (classId) {
    case 'huyet-ha': // trường thương chéo sau lưng
      return (
        <g>
          <path d="M20,192 L138,40" stroke="#5a2a1e" strokeWidth={4.2} strokeLinecap="round" />
          <path d="M20,192 L138,40" stroke={P.trim} strokeWidth={1.2} strokeDasharray="2 10" strokeLinecap="round" />
          <path d="M134,44 L152,14 L143,48 Z" fill={c.url('steel')} stroke="#5b6475" strokeWidth={1} strokeLinejoin="round" />
          <path d="M133,48 L146,40" stroke={P.trim} strokeWidth={3.2} strokeLinecap="round" />
          <g className={c.animated ? 'chibi-sway' : undefined}>
            <path d="M138,48 Q126,58 128,72 Q134,62 140,58 Q136,66 140,74 Q142,60 142,50 Z" fill={P.accent} stroke={shade(P.accent, -30)} strokeWidth={0.8} />
          </g>
        </g>
      )
    case 'toai-mong': // trường đao sau lưng
      return (
        <g>
          <path d="M40,58 L130,178" stroke="#1b1622" strokeWidth={7} strokeLinecap="round" />
          <path d="M44,63 L130,178" stroke={P.accent} strokeWidth={1.4} opacity={0.8} />
          <path d="M30,44 L42,60" stroke={P.trim} strokeWidth={6} strokeLinecap="round" />
          <path d="M30,44 L42,60" stroke="#120e18" strokeWidth={6} strokeDasharray="2 2.5" strokeLinecap="butt" opacity={0.6} />
          <path d="M37,60 L48,52" stroke={P.trim} strokeWidth={3} strokeLinecap="round" />
        </g>
      )
    case 'long-ngam': // long khí xoáy quanh người
      return (
        <g opacity={0.85}>
          <path
            d="M14,156 C-2,104 36,58 84,62 C128,66 154,104 142,146"
            fill="none"
            stroke={P.accent}
            strokeWidth={6}
            strokeLinecap="round"
            opacity={0.35}
            filter={c.url('blur')}
          />
          <path
            d="M14,156 C-2,104 36,58 84,62 C128,66 154,104 142,146"
            fill="none"
            stroke={P.trim}
            strokeWidth={1.4}
            strokeDasharray="1 7"
            strokeLinecap="round"
          />
        </g>
      )
    case 'to-van': // dây lụa (phi bạch) bay phía sau
      return (
        <g className={c.animated ? 'chibi-float' : undefined} style={{ animationDelay: '-0.6s' }}>
          <path
            d="M60,116 C24,96 0,126 14,180 Q18,188 23,181 C12,136 28,112 60,125 Z"
            fill={P.accent}
            opacity={0.78}
            stroke={shade(P.accent, -20)}
            strokeWidth={0.8}
          />
          <path d="M56,118 C26,104 8,130 18,176" fill="none" stroke="#fff" strokeWidth={1.2} opacity={0.65} strokeLinecap="round" />
          <path
            d="M100,116 C136,96 160,126 146,180 Q142,188 137,181 C148,136 132,112 100,125 Z"
            fill={P.accent}
            opacity={0.78}
            stroke={shade(P.accent, -20)}
            strokeWidth={0.8}
          />
          <path d="M104,118 C134,104 152,130 142,176" fill="none" stroke="#fff" strokeWidth={1.2} opacity={0.65} strokeLinecap="round" />
        </g>
      )
    default:
      return null
  }
}

function PropFront({ c, classId }: { c: Ctx; classId: ClassId }) {
  const { P } = c
  switch (classId) {
    case 'thiet-y': // mạch đao cắm đất + giáp vai
      return (
        <g>
          <path d="M140,192 L140,92" stroke="#3a2e2a" strokeWidth={4.4} strokeLinecap="round" />
          <path d="M140,190 L140,96" stroke={P.trim} strokeWidth={1.2} strokeDasharray="3 6" />
          <path d="M133,94 Q128,58 142,26 Q156,58 148,94 Z" fill={c.url('steel')} stroke="#4c5566" strokeWidth={1.2} strokeLinejoin="round" />
          <path d="M141,32 L141,90" stroke="#ffffff" strokeWidth={1} opacity={0.6} />
          <rect x={131} y={92} width={19} height={6} rx={2} fill={P.trim} stroke={shade(P.trim, -35)} strokeWidth={0.8} />
          <circle cx={140.5} cy={95} r={2} fill={P.accent} />
          {/* giáp vai */}
          <path d="M53,116 Q47,128 56,136 Q66,130 67,118 Q60,113 53,116 Z" fill={P.robe} stroke={P.trim} strokeWidth={2} />
          <path d="M107,116 Q113,128 104,136 Q94,130 93,118 Q100,113 107,116 Z" fill={P.robe} stroke={P.trim} strokeWidth={2} />
        </g>
      )
    case 'than-tuong': // phi kiếm lơ lửng
      return (
        <g className={c.animated ? 'chibi-float' : undefined}>
          <path d="M14,70 L19,58 L24,70 L24,136 L14,136 Z" fill={P.accent} opacity={0.45} filter={c.url('blur')} />
          <path d="M15,70 L19,59 L23,70 L23,136 L15,136 Z" fill={c.url('steel')} stroke="#5a6b8c" strokeWidth={0.9} strokeLinejoin="round" />
          <path d="M19,64 L19,134" stroke="#fff" strokeWidth={0.9} opacity={0.75} />
          <rect x={10} y={135} width={18} height={4.5} rx={2} fill={P.trim} />
          <rect x={16.8} y={139} width={4.4} height={14} rx={1.6} fill={P.sash} />
          <circle cx={19} cy={155} r={2.6} fill={P.trim} />
          <path d="M19,157 Q14,166 18,172" fill="none" stroke={P.accent} strokeWidth={1.6} strokeLinecap="round" />
        </g>
      )
    case 'cuu-linh': // linh hồ nhỏ lơ lửng
      return (
        <g className={c.animated ? 'chibi-float' : undefined} style={{ animationDelay: '-1s' }}>
          <circle cx={136} cy={124} r={16} fill={P.accent} opacity={0.3} filter={c.url('blur')} />
          <path d="M146,130 Q160,122 156,108 Q150,120 142,122 Z" fill={P.trim} opacity={0.9} />
          <path d="M146,134 Q162,136 160,122 Q152,132 144,130 Z" fill="#f3eeff" opacity={0.95} />
          <ellipse cx={135} cy={126} rx={12} ry={10} fill="#f6f2ff" stroke={shade(P.accent, -20)} strokeWidth={1} />
          <path d="M126,119 L124,107 L132,116 Z" fill="#f6f2ff" stroke={shade(P.accent, -20)} strokeWidth={1} strokeLinejoin="round" />
          <path d="M140,116 L146,106 L145,119 Z" fill="#f6f2ff" stroke={shade(P.accent, -20)} strokeWidth={1} strokeLinejoin="round" />
          <path d="M126.5,115 L125.5,110 L129.5,114 Z" fill={P.accent} />
          <path d="M141.5,115 L144.5,110 L144,116 Z" fill={P.accent} />
          <path d="M129,125 Q131,123 133,125" fill="none" stroke={LINE} strokeWidth={1.3} strokeLinecap="round" />
          <path d="M137,125 Q139,123 141,125" fill="none" stroke={LINE} strokeWidth={1.3} strokeLinecap="round" />
          <ellipse cx={128} cy={129} rx={2.4} ry={1.3} fill="#ff9ec4" opacity={0.7} />
          <ellipse cx={142} cy={129} rx={2.4} ry={1.3} fill="#ff9ec4" opacity={0.7} />
          <circle cx={135} cy={109} r={2} fill={P.trim} className={c.animated ? 'chibi-twinkle' : undefined} />
        </g>
      )
    case 'long-ngam': // long châu + sừng rồng vàng (ở phụ kiện)
      return (
        <g className={c.animated ? 'chibi-float' : undefined} style={{ animationDelay: '-2s' }}>
          <circle cx={128} cy={150} r={11} fill={P.accent} opacity={0.4} filter={c.url('blur')} />
          <circle cx={128} cy={150} r={6.5} fill={c.url('pearl')} stroke={P.trim} strokeWidth={1.2} />
          <circle cx={126} cy={148} r={1.8} fill="#fff" opacity={0.9} />
        </g>
      )
    case 'to-van': // dây lụa vắt ngang trước
      return (
        <g>
          <path
            d="M40,150 Q80,176 120,147 L121,154 Q80,184 41,157 Z"
            fill={P.accent}
            opacity={0.85}
            stroke={shade(P.accent, -20)}
            strokeWidth={0.8}
          />
          <path d="M44,153 Q80,177 117,151" fill="none" stroke="#fff" strokeWidth={1.1} opacity={0.6} strokeLinecap="round" />
        </g>
      )
    default:
      return null
  }
}

/* ------------------------------------------------------------------ */
/* Phụ kiện đầu                                                        */
/* ------------------------------------------------------------------ */

function Flower({ x, y, r, color, center }: { x: number; y: number; r: number; color: string; center: string }) {
  return (
    <g>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={x} cy={y - r * 0.7} rx={r * 0.55} ry={r * 0.75} fill={color} transform={`rotate(${a} ${x} ${y})`} stroke={shade(color, -18)} strokeWidth={0.6} />
      ))}
      <circle cx={x} cy={y} r={r * 0.32} fill={center} />
    </g>
  )
}

function Headwear({ c, classId }: { c: Ctx; classId: ClassId }) {
  const { P } = c
  const acc = c.look.accessory
  const nodes: ReactNode[] = []

  // dấu ấn riêng của lưu phái
  if (classId === 'huyet-ha') {
    nodes.push(
      <g key="band">
        <path d="M36,62 Q80,44 124,62" fill="none" stroke={P.accent} strokeWidth={4} strokeLinecap="round" />
        <g className={c.animated ? 'chibi-sway' : undefined}>
          <path d="M124,62 Q140,70 148,86 Q138,80 128,74 Q138,90 140,100 Q128,86 122,66 Z" fill={P.accent} stroke={shade(P.accent, -30)} strokeWidth={0.8} />
        </g>
      </g>,
    )
  } else if (classId === 'thiet-y') {
    nodes.push(
      <g key="guard">
        <path d="M62,32 Q80,24 98,32 L95,40 Q80,34 65,40 Z" fill="#5a6272" stroke={P.trim} strokeWidth={1.6} strokeLinejoin="round" />
        <path d="M80,27 L84,34 L80,38 L76,34 Z" fill={P.accent} stroke={shade(P.trim, -30)} strokeWidth={0.8} />
      </g>,
    )
  } else if (classId === 'long-ngam') {
    nodes.push(
      <g key="horns" fill={P.trim} stroke={shade(P.trim, -35)} strokeWidth={1} strokeLinejoin="round">
        <path d="M52,36 Q44,22 50,10 Q52,22 60,30 Z" />
        <path d="M108,36 Q116,22 110,10 Q108,22 100,30 Z" />
      </g>,
    )
  } else if (classId === 'to-van') {
    nodes.push(<Flower key="fl" x={48} y={42} r={8} color={P.accent} center="#fff4b8" />)
    nodes.push(<Flower key="fl2" x={58} y={34} r={5} color="#fff" center={P.accent} />)
  } else if (classId === 'cuu-linh') {
    nodes.push(
      <g key="bfly" transform="translate(112 36)">
        <path d="M0,0 Q-10,-12 -12,0 Q-10,8 0,2 Z" fill={P.accent} opacity={0.9} />
        <path d="M0,0 Q10,-12 12,0 Q10,8 0,2 Z" fill={P.trim} opacity={0.9} />
        <path d="M0,-3 L0,5" stroke={LINE} strokeWidth={1.2} strokeLinecap="round" />
      </g>,
    )
  } else if (classId === 'than-tuong' && !c.fem) {
    nodes.push(
      <g key="crown">
        <path d="M70,26 Q80,14 90,26 L88,32 L72,32 Z" fill="#f3f6fb" stroke={P.trim} strokeWidth={1.6} strokeLinejoin="round" />
        <path d="M64,26 L96,26" stroke={P.trim} strokeWidth={1.6} strokeLinecap="round" />
        <circle cx={80} cy={22} r={2.4} fill={P.accent} />
      </g>,
    )
  }

  // phụ kiện cá nhân
  if (acc === 1 && classId !== 'thiet-y') {
    // trâm cài + tua rua
    nodes.push(
      <g key="pin">
        <path d="M98,30 L124,14" stroke={P.trim} strokeWidth={2.4} strokeLinecap="round" />
        <circle cx={124} cy={14} r={3.2} fill={P.accent} stroke={shade(P.trim, -30)} strokeWidth={0.8} />
        <g className={c.animated ? 'chibi-sway' : undefined}>
          <path d="M110,22 L110,38" stroke={P.trim} strokeWidth={1} />
          <circle cx={110} cy={40} r={2} fill={P.accent} />
        </g>
      </g>,
    )
  } else if (acc === 2 && classId !== 'to-van' && c.fem) {
    nodes.push(<Flower key="flw" x={112} y={40} r={7} color="#f7b8cb" center="#ffe69a" />)
  } else if (acc === 3 && c.look.backHair === 2) {
    // nơ buộc đuôi ngựa
    nodes.push(
      <g key="bow" transform="translate(100 30)">
        <path d="M0,0 L-9,-7 L-9,7 Z" fill={P.accent} stroke={shade(P.accent, -30)} strokeWidth={0.8} strokeLinejoin="round" />
        <path d="M0,0 L9,-7 L9,7 Z" fill={P.accent} stroke={shade(P.accent, -30)} strokeWidth={0.8} strokeLinejoin="round" />
        <circle r={2.6} fill={shade(P.accent, -15)} />
      </g>,
    )
  } else if (c.look.backHair === 3) {
    // trâm ngang búi tóc
    nodes.push(
      <g key="bunpin">
        <path d="M62,24 L100,18" stroke={P.trim} strokeWidth={2.2} strokeLinecap="round" />
        <circle cx={100} cy={18} r={2.6} fill={P.accent} />
      </g>,
    )
  }
  return <>{nodes}</>
}

function Mask({ c }: { c: Ctx }) {
  // khăn che mặt cho Toái Mộng khí chất "ngầu"
  return (
    <g>
      <path d="M50,97 Q80,92 110,97 Q108,114 80,120 Q52,114 50,97 Z" fill="#1d1726" stroke={c.P.trim} strokeWidth={1.2} strokeLinejoin="round" />
      <path d="M58,104 Q80,100 102,104" fill="none" stroke={c.P.accent} strokeWidth={0.9} opacity={0.6} />
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Hiệu ứng khí chất                                                   */
/* ------------------------------------------------------------------ */

function Sparkle({ x, y, r, color, delay }: { x: number; y: number; r: number; color: string; delay: string }) {
  return (
    <path
      className="chibi-twinkle"
      style={{ animationDelay: delay }}
      d={`M${x},${y - r} Q${x + r * 0.18},${y - r * 0.18} ${x + r},${y} Q${x + r * 0.18},${y + r * 0.18} ${x},${y + r} Q${x - r * 0.18},${y + r * 0.18} ${x - r},${y} Q${x - r * 0.18},${y - r * 0.18} ${x},${y - r} Z`}
      fill={color}
    />
  )
}

function Heart({ x, y, s, color, delay }: { x: number; y: number; s: number; color: string; delay: string }) {
  return (
    <g className="chibi-rise" style={{ animationDelay: delay }}>
      <path
        transform={`translate(${x} ${y}) scale(${s})`}
        d="M0,3 C-6,-3 -4,-8 0,-5 C4,-8 6,-3 0,3 Z"
        fill={color}
        stroke={shade(color, -25)}
        strokeWidth={0.4}
      />
    </g>
  )
}

function MoodFx({ c }: { c: Ctx }) {
  if (c.look.mood === 'cute')
    return (
      <g>
        <Sparkle x={20} y={42} r={5} color="#fff3c4" delay="0s" />
        <Sparkle x={144} y={36} r={4} color="#ffffff" delay="-0.8s" />
        <Sparkle x={148} y={82} r={3} color="#fff3c4" delay="-1.6s" />
        <Sparkle x={12} y={100} r={3.4} color="#ffffff" delay="-1.1s" />
      </g>
    )
  if (c.look.mood === 'romantic')
    return (
      <g>
        <Heart x={20} y={70} s={1.3} color="#ff8fb1" delay="0s" />
        <Heart x={142} y={60} s={1} color="#ffb3c9" delay="-1.5s" />
        <Heart x={148} y={104} s={0.8} color="#ff8fb1" delay="-3s" />
        <ellipse cx={14} cy={120} rx={3} ry={1.8} fill="#ffc6d6" transform="rotate(-30 14 120)" opacity={0.8} />
        <ellipse cx={150} cy={140} rx={3} ry={1.8} fill="#ffc6d6" transform="rotate(25 150 140)" opacity={0.8} />
      </g>
    )
  return (
    <g fill="none" strokeLinecap="round" opacity={0.55}>
      <path d="M4,70 Q20,64 30,72" stroke={c.P.accent} strokeWidth={1.4} />
      <path d="M2,92 Q18,86 26,94" stroke={c.P.accent} strokeWidth={1} />
      <path d="M134,50 Q146,44 158,50" stroke={c.P.accent} strokeWidth={1.2} />
      <path d="M140,96 Q150,92 158,98" stroke={c.P.accent} strokeWidth={0.9} />
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Component chính                                                     */
/* ------------------------------------------------------------------ */

/**
 * Một IntersectionObserver dùng chung cho mọi chibi đang động:
 * chibi trôi khỏi màn hình thì dừng nhịp thở / tóc bay (lớp .chibi-off), quay lại thì chạy tiếp.
 * Đổi lớp trực tiếp trên DOM — không render lại SVG.
 */
let sharedObserver: IntersectionObserver | null = null
function observer() {
  if (!sharedObserver && typeof IntersectionObserver !== 'undefined')
    sharedObserver = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('chibi-off', !e.isIntersecting)), { rootMargin: '120px' })
  return sharedObserver
}

export const Chibi = memo(function Chibi({
  look,
  classId,
  size = 160,
  variant = 'full',
  animated = true,
  effects = true,
  showProp = true,
  flip = false,
  className,
  title,
}: ChibiProps) {
  const rawId = useId()
  const svgRef = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const el = svgRef.current
    const io = animated ? observer() : null
    if (!el || !io) return
    io.observe(el)
    return () => {
      io.unobserve(el)
      el.classList.remove('chibi-off')
    }
  }, [animated])
  const uidBase = 'c' + rawId.replace(/[^a-zA-Z0-9_-]/g, '')
  const P = CLASSES[classId].palette
  const c: Ctx = {
    id: (k) => `${uidBase}-${k}`,
    url: (k) => `url(#${uidBase}-${k})`,
    look,
    P,
    hair: look.hairColor,
    hairLine: shade(look.hairColor, -42),
    skin: look.skin,
    skinLine: shade(look.skin, -24),
    line: LINE,
    fem: look.gender === 'nu',
    animated,
  }
  const [eyeL, eyeR] = eyeKinds(look.expression)
  const masked = classId === 'toai-mong' && look.mood === 'cool' && look.expression !== 'smirk'
  const bust = variant === 'bust'
  const viewBox = bust ? '22 8 116 116' : '0 0 160 200'
  const height = bust ? size : size * 1.25

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      width={size}
      height={height}
      className={className}
      role="img"
      aria-label={title ?? 'Nhân vật chibi'}
      // chibi động có lớp vẽ riêng: mỗi nhịp thở chỉ vẽ lại chính nó, không kéo theo cả khung nền phía sau
      style={{ overflow: 'visible', transform: flip ? 'scaleX(-1)' : undefined, willChange: animated ? 'transform' : undefined }}
    >
      <defs>
        <linearGradient id={c.id('hair')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(c.hair, 22)} />
          <stop offset="0.55" stopColor={c.hair} />
          <stop offset="1" stopColor={shade(c.hair, -24)} />
        </linearGradient>
        <linearGradient id={c.id('robe')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(P.robe, 10)} />
          <stop offset="1" stopColor={P.robeDark} />
        </linearGradient>
        <linearGradient id={c.id('iris')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(look.eyeColor, -48)} />
          <stop offset="0.55" stopColor={look.eyeColor} />
          <stop offset="1" stopColor={shade(look.eyeColor, 38)} />
        </linearGradient>
        <linearGradient id={c.id('skin')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(c.skin, 4)} />
          <stop offset="1" stopColor={shade(c.skin, -5)} />
        </linearGradient>
        <linearGradient id={c.id('steel')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f5f8fc" />
          <stop offset="0.5" stopColor="#c7d0de" />
          <stop offset="1" stopColor="#8e9ab0" />
        </linearGradient>
        <radialGradient id={c.id('pearl')} cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor={P.accent} />
          <stop offset="1" stopColor={shade(P.accent, -40)} />
        </radialGradient>
        <radialGradient id={c.id('aura')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={look.mood === 'romantic' ? '#ff9ec0' : P.accent} stopOpacity={0.38} />
          <stop offset="1" stopColor={P.accent} stopOpacity={0} />
        </radialGradient>
        <filter id={c.id('blur')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {effects && !bust && <ellipse cx={80} cy={100} rx={78} ry={92} fill={c.url('aura')} />}
      {!bust && <ellipse cx={80} cy={192} rx={38} ry={6} fill="#000" opacity={0.22} />}

      <g className={animated ? 'chibi-bob' : undefined}>
        {showProp && !bust && <PropBack c={c} classId={classId} />}
        <BackHair c={c} />
        <Body c={c} />
        {showProp && !bust && <PropFront c={c} classId={classId} />}

        {/* đầu */}
        <TopHair c={c} />
        {c.look.bangs === 2 && !c.fem && <path d={SPIKES_TOP} fill={c.url('hair')} stroke={c.hairLine} strokeWidth={1.3} strokeLinejoin="round" />}
        <path d={CRANIUM} fill={c.url('hair')} stroke={c.hairLine} strokeWidth={1.3} />
        <ellipse cx={41.5} cy={88} rx={5} ry={7} fill={c.skin} stroke={c.skinLine} strokeWidth={1} />
        <ellipse cx={118.5} cy={88} rx={5} ry={7} fill={c.skin} stroke={c.skinLine} strokeWidth={1} />
        <path
          d="M41,80 C41,53 58,40 80,40 C102,40 119,53 119,80 C119,101 103,117 80,118 C57,117 41,101 41,80 Z"
          fill={c.url('skin')}
          stroke={c.skinLine}
          strokeWidth={1.1}
        />
        {/* bóng mái tóc trên trán */}
        <path d="M44,66 Q80,84 116,66 L116,76 Q80,92 44,76 Z" fill={shade(c.skin, -25)} opacity={0.18} />
        <Blush c={c} />
        <Eye c={c} pos={EYE_L} kind={eyeL} />
        <Eye c={c} pos={EYE_R} kind={eyeR} />
        <ellipse cx={80} cy={97} rx={0.9} ry={0.7} fill={c.skinLine} opacity={0.6} />
        {masked ? <Mask c={c} /> : <Mouth c={c} />}

        {/* mái + tóc mai */}
        <path d={BANGS[c.look.bangs % BANGS.length]} fill={c.url('hair')} stroke={c.hairLine} strokeWidth={1.3} strokeLinejoin="round" />
        <SideLocks c={c} />
        <path d="M52,44 Q80,32 108,44" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" opacity={0.22} />
        <Brows c={c} />
        <Headwear c={c} classId={classId} />
      </g>

      {effects && !bust && <MoodFx c={c} />}
    </svg>
  )
})

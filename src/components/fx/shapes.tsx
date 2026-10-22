import { useId, type CSSProperties } from 'react'

/* Hình vẽ dùng chung cho hiệu ứng theo giao diện tổ chức (bạch mai, tinh thể tuyết, hạc trắng). */

const FIVE = [0, 72, 144, 216, 288]
const SIX = [0, 60, 120, 180, 240, 300]

/** Một bông bạch mai năm cánh (cánh trắng ửng hồng ở tâm, nhụy vàng). */
export function PlumBlossom({ className, style }: { className?: string; style?: CSSProperties }) {
  // id an toàn cho url(#…) dù React đổi định dạng useId
  const gid = `plum${useId().replace(/[^\w-]/g, '')}`
  return (
    <svg viewBox="-10 -10 20 20" className={className} style={style} aria-hidden>
      <defs>
        <radialGradient id={gid} gradientUnits="userSpaceOnUse" cx="0" cy="0" r="9.5">
          <stop offset="0.2" stopColor="#f7d3dc" />
          <stop offset="0.62" stopColor="#ffffff" />
        </radialGradient>
      </defs>
      <g fill={`url(#${gid})`} strokeWidth={0.5} style={{ stroke: 'var(--blossom-edge)' }}>
        {FIVE.map((a) => (
          <circle key={a} cx={0} cy={-5} r={4.3} transform={`rotate(${a})`} />
        ))}
      </g>
      <circle r={2.4} fill="#f4c7d2" />
      <g fill="#e2b04a">
        {FIVE.map((a) => (
          <circle key={a} cx={0} cy={-3} r={0.72} transform={`rotate(${a + 36})`} />
        ))}
      </g>
      <circle r={0.95} fill="#c98a3a" />
    </svg>
  )
}

/** Tinh thể tuyết sáu cánh. */
export function SnowCrystal({ className, style, color = '#f4f9ff' }: { className?: string; style?: CSSProperties; color?: string }) {
  return (
    <svg viewBox="-12 -12 24 24" className={className} style={style} aria-hidden>
      <g stroke={color} strokeWidth={1.3} strokeLinecap="round" fill="none">
        {SIX.map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <path d="M0,0 L0,-10.5" />
            <path d="M0,-6.2 L-2.8,-8.8 M0,-6.2 L2.8,-8.8" />
            <path d="M0,-3 L-1.8,-4.6 M0,-3 L1.8,-4.6" strokeWidth={1} />
          </g>
        ))}
      </g>
      <circle r={1.4} fill={color} />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Hạc trắng (đơn đỉnh hạc) bay sang phải — cánh vỗ quanh vai (58,30)   */
/* ------------------------------------------------------------------ */

const WING =
  'M64,29 C61,21 57,14 50,9.5 C42,5 30,2.5 17,2.5 C23,5.5 27,7.5 30,9.6 C26,10.6 24,11.8 22,13.6 C28,13.6 32,14.6 35.5,15.8 C32.5,17.6 30.6,19.6 29.6,21.8 C35,21 40,22 44.5,24 C46,26 47,28 48,30 Z'
/* dải lông bay sẫm màu dọc mép sau của cánh */
const WING_TIP =
  'M17,2.5 C23,5.5 27,7.5 30,9.6 C26,10.6 24,11.8 22,13.6 C28,13.6 32,14.6 35.5,15.8 C32.5,17.6 30.6,19.6 29.6,21.8 C33,21.4 36.5,21.6 39.5,22.4 C36,17 29,9 17,2.5 Z'
const BODY = 'M40,33 C46,27.6 62,26.6 76,29.6 C72,35 60,37.6 48,36.6 C44,36.2 41.6,35 40,33 Z'
const TAIL = 'M41,33.2 C37,32.4 33,33 29.5,35.2 C33.5,36.2 37.5,36 41.5,35.2 Z'

const fill = { fill: 'var(--crane-fill)', stroke: 'var(--crane-line)' } as const
const ink = { fill: 'var(--crane-ink)' } as const

function Wing() {
  return (
    <>
      <path d={WING} style={fill} strokeWidth={0.6} strokeLinejoin="round" />
      <path d={WING_TIP} style={ink} opacity={0.85} />
    </>
  )
}

export function CraneSvg({ flapDelay = 0 }: { flapDelay?: number }) {
  const wings = { '--flap-delay': `${flapDelay}s` } as CSSProperties
  return (
    <svg viewBox="0 0 120 64" aria-hidden>
      {/* cánh xa (sau thân) */}
      <g className="fx-crane-wings" style={wings}>
        <g transform="translate(7 -3) scale(0.9)" opacity={0.55}>
          <Wing />
        </g>
      </g>
      {/* chân duỗi ra sau */}
      <g style={{ stroke: 'var(--crane-ink)' }} strokeWidth={1.05} strokeLinecap="round" fill="none">
        <path d="M44,35.6 L12,38.2" />
        <path d="M46,36.2 L13.5,40.8" />
      </g>
      <path d={TAIL} style={ink} />
      <path d={BODY} style={fill} strokeWidth={0.6} />
      {/* cổ đen, đầu, mào đỏ, mỏ */}
      <path d="M74.5,30 C82,28.2 90,25.2 98.5,24" style={{ stroke: 'var(--crane-ink)' }} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <circle cx={100.4} cy={23.9} r={2.5} style={ink} />
      <circle cx={100.2} cy={22.4} r={1.15} fill="#d33a2c" />
      <path d="M102.4,23.2 L114.5,25 L102.4,25.4 Z" fill="#c9b98f" />
      {/* cánh gần (trước thân) */}
      <g className="fx-crane-wings" style={wings}>
        <Wing />
      </g>
    </svg>
  )
}

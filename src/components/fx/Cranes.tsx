import type { CSSProperties } from 'react'
import { CraneSvg } from './shapes'

/*
 * Hạc trắng bay ngang trời (giao diện Bạch Gia).
 * Mỗi con bay qua màn hình trong ~44% chu kỳ rồi ẩn — "thỉnh thoảng" mới thấy.
 * Một cặp bay cùng nhau + một con lẻ ở xa. Chỉ animate transform/opacity của khung HTML
 * (compositor); cánh vỗ là SVG rất nhỏ. Ẩn hẳn khi prefers-reduced-motion.
 */
const FLIGHTS = [
  { top: '13%', w: 'clamp(54px, 6.2vw, 96px)', dur: 96, delay: -8, flap: 0, o: 0.92, rise: '-7vh' },
  { top: '17.5%', w: 'clamp(46px, 5.2vw, 80px)', dur: 96, delay: -10.5, flap: -1.1, o: 0.85, rise: '-6vh' },
  { top: '27%', w: 'clamp(36px, 3.8vw, 60px)', dur: 128, delay: -78, flap: -2.3, o: 0.6, rise: '-9vh' },
]

export function Cranes({ style }: { style?: CSSProperties }) {
  return (
    <div className="fx-cranes" style={style} aria-hidden>
      {FLIGHTS.map((f, i) => (
        <div
          key={i}
          className="fx-crane"
          style={
            {
              top: f.top,
              width: f.w,
              '--dur': `${f.dur}s`,
              '--delay': `${f.delay}s`,
              '--o': f.o,
              '--rise': f.rise,
            } as CSSProperties
          }
        >
          <CraneSvg flapDelay={f.flap} />
        </div>
      ))}
    </div>
  )
}

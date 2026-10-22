// Trang trí nhẹ theo giao diện tổ chức, gói gọn trong một khung (khác Petals — Petals phủ cố định toàn màn hình).
import type { CSSProperties } from 'react'

/** Tuyết rơi trong khung (thuần CSS — .lp-snow trong landing.css, ẩn khi giảm chuyển động) */
export function FrameSnow({ count = 16 }: { count?: number }) {
  return (
    <div className="lp-snow" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const s = 2 + ((i * 7) % 5)
        const style = {
          left: `${(i * 61) % 100}%`,
          width: s,
          height: s,
          '--d': `${9 + ((i * 5) % 8)}s`,
          '--dl': `${-((i * 13) % 17)}s`,
          '--x': `${((i * 37) % 50) - 20}px`,
          '--o': (0.45 + (s / 7) * 0.45).toFixed(2),
        } as CSSProperties
        return <i key={i} style={style} />
      })}
    </div>
  )
}

const PETALS = [
  { x: 82, y: 10, s: 12, r: 20, c: '#f6b8cb' },
  { x: 90, y: 26, s: 9, r: -30, c: '#ffd1dc' },
  { x: 72, y: 22, s: 7, r: 60, c: '#f2a7bf' },
  { x: 94, y: 6, s: 8, r: 110, c: '#f7c5a8' },
]

/** Vài cánh hoa đào nằm yên ở góc khung (Kinh Hồng) */
export function CornerPetals() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="absolute block"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.s,
            height: p.s * 0.72,
            borderRadius: '150% 0 150% 0',
            background: `linear-gradient(135deg, ${p.c}, color-mix(in oklab, ${p.c} 60%, white))`,
            transform: `rotate(${p.r}deg)`,
            opacity: 0.75,
            boxShadow: `0 0 8px ${p.c}55`,
          }}
        />
      ))}
    </div>
  )
}

const LEAVES = [
  { x: 78, y: 8, w: 26, r: -24, c: ['#2f8a64', '#5cb98a', '#a9e0bf'] },
  { x: 88, y: 18, w: 20, r: 32, c: ['#2c7f6e', '#5ec7b0', '#b4ecdc'] },
  { x: 70, y: 20, w: 16, r: -60, c: ['#3a9d7a', '#6fcf9d', '#c2ecd2'] },
]

/** Vài lá trúc ngọc bích ở góc khung (Thanh Ngọc) */
export function CornerLeaves() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {LEAVES.map((l, i) => (
        <span
          key={i}
          className="absolute block"
          style={{
            left: `${l.x}%`,
            top: `${l.y}%`,
            width: l.w,
            height: l.w * 0.24,
            borderRadius: '0 100% 0 100%',
            background: `linear-gradient(100deg, ${l.c[0]} 0%, ${l.c[1]} 58%, ${l.c[2]} 100%)`,
            transform: `rotate(${l.r}deg)`,
            opacity: 0.8,
          }}
        />
      ))}
    </div>
  )
}

import { useMemo } from 'react'
import { motion } from 'motion/react'
import { createRng } from '@/lib/utils'
import { PlumBlossom, SnowCrystal } from './shapes'

/*
 * Màn ăn mừng của Bạch Gia: hai vòng sương giá lan ra, rồi tinh thể tuyết + cánh / bông
 * bạch mai bung khỏi ấn triện và rơi chậm xuống. ~40 phần tử, chạy một lần ~3s.
 */
type Kind = 'crystal' | 'dot' | 'petal' | 'blossom'

export function SnowBurst({ seed }: { seed: number }) {
  const bits = useMemo(() => {
    const rng = createRng(seed)
    return Array.from({ length: 40 }, (_, i) => {
      const kind: Kind = i < 12 ? 'crystal' : i < 26 ? 'dot' : i < 35 ? 'petal' : 'blossom'
      const angle = rng.float(0, Math.PI * 2)
      const dist = rng.float(12, 46)
      const size = kind === 'crystal' ? rng.float(12, 20) : kind === 'dot' ? rng.float(4, 9) : kind === 'petal' ? rng.float(8, 12) : rng.float(16, 22)
      return {
        id: i,
        kind,
        size,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist * 0.85,
        fall: rng.float(6, 16),
        spin: rng.float(-240, 240),
        delay: rng.float(0, 0.35),
        dur: rng.float(2.4, 3.2),
      }
    })
  }, [seed])

  return (
    <>
      {[0, 0.22].map((d) => (
        <motion.span
          key={d}
          className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 rounded-full"
          style={{
            marginLeft: -80,
            marginTop: -80,
            border: '1.5px solid rgba(220, 236, 255, 0.75)',
            boxShadow: '0 0 30px rgba(190, 220, 255, 0.45), inset 0 0 24px rgba(190, 220, 255, 0.35)',
          }}
          initial={{ scale: 0.2, opacity: 0.9 }}
          animate={{ scale: 4.2, opacity: 0 }}
          transition={{ duration: 1.5, delay: d, ease: 'easeOut' }}
        />
      ))}
      {bits.map((b) => (
        <motion.span
          key={b.id}
          className="pointer-events-none absolute left-1/2 top-1/2 block"
          style={{
            width: b.size,
            height: b.size,
            marginLeft: -b.size / 2,
            marginTop: -b.size / 2,
            ...(b.kind === 'dot'
              ? { borderRadius: 999, background: 'radial-gradient(circle, #ffffff 0 35%, rgba(205,225,255,.55) 60%, transparent 72%)' }
              : b.kind === 'petal'
                ? {
                    borderRadius: '55% 55% 50% 50% / 68% 68% 32% 32%',
                    background: 'radial-gradient(circle at 50% 92%, #f2b3c4 0 12%, #fde6ec 34%, #ffffff 64%)',
                  }
                : b.kind === 'crystal'
                  ? { borderRadius: 999, background: 'radial-gradient(circle, rgba(210,230,255,.4), transparent 68%)' }
                  : null),
          }}
          initial={{ x: '0vw', y: '0vh', opacity: 0, scale: 0, rotate: 0 }}
          animate={{
            x: ['0vw', `${b.x}vw`, `${b.x * 1.08}vw`],
            y: ['0vh', `${b.y}vh`, `${b.y + b.fall}vh`],
            opacity: [0, 1, 0],
            scale: [0, 1.1, 0.85],
            rotate: [0, b.spin * 0.6, b.spin],
          }}
          transition={{ duration: b.dur, delay: b.delay, times: [0, 0.38, 1], ease: ['easeOut', 'easeIn'] }}
        >
          {b.kind === 'crystal' && <SnowCrystal className="block h-full w-full" />}
          {b.kind === 'blossom' && <PlumBlossom className="block h-full w-full" />}
        </motion.span>
      ))}
    </>
  )
}

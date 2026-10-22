import { useEffect, useRef, useState } from 'react'
import { fmt } from '@/lib/utils'

/** Số chạy từ 0 đến giá trị — dùng cho chỉ số nổi bật */
export function CountUp({ value, duration = 1100, format = fmt }: { value: number; duration?: number; format?: (n: number) => string }) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(from + (value - from) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return <>{format(display)}</>
}

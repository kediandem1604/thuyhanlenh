import { useRef } from 'react'
import { useInView } from 'motion/react'

/** true khi khung đã lọt vào màn hình (một lần) — để thanh tiến độ chạy lúc người xem nhìn thấy */
export function useSeen<T extends Element>() {
  const ref = useRef<T>(null)
  const seen = useInView(ref, { once: true, amount: 0.25 })
  return [ref, seen] as const
}

import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useUi } from '@/store/ui'
import { createRng } from '@/lib/utils'
import type { OrgThemeId } from '@/domain/orgs'
import { useOrgThemeId } from '@/components/fx/useOrgTheme'
import { SnowBurst } from '@/components/fx/SnowBurst'

/* màu tia sáng theo giao diện tổ chức (5 màu — giữ đúng chuỗi ngẫu nhiên của Kinh Hồng) */
const SPARK_COLORS: Record<Exclude<OrgThemeId, 'bach-gia'>, readonly string[]> = {
  'kinh-hong': ['#f6e2ac', '#d8b46a', '#f2a7bf', '#ffffff', '#e0523f'],
  'thanh-ngoc': ['#c4f2e4', '#5ec7b0', '#a9e0bf', '#ffffff', '#2f8f7c'],
  'hong-lien': ['#ffd9cf', '#ec8172', '#f8bfd0', '#ffffff', '#c23a28'],
  'tu-dang': ['#ece4ff', '#b9a1f6', '#e3d7fd', '#ffffff', '#9a82e6'],
}

/** Màn ăn mừng: ấn triện lớn + mưa sắc màu giao diện (Bạch Gia: tuyết & bạch mai) — dùng cho first kill, xuất sư, thành thân… */
export function Celebration() {
  const c = useUi((s) => s.celebration)
  const clear = useUi((s) => s.clearCelebration)
  const theme = useOrgThemeId()

  useEffect(() => {
    if (!c) return
    const t = setTimeout(clear, 3600)
    return () => clearTimeout(t)
  }, [c, clear])

  const sparks = useMemo(() => {
    if (theme === 'bach-gia') return []
    const palette = SPARK_COLORS[theme]
    const rng = createRng(c?.id ?? 1)
    return Array.from({ length: 38 }, (_, i) => ({
      id: i,
      x: rng.float(-50, 50),
      y: rng.float(-45, 45),
      s: rng.float(4, 10),
      d: rng.float(0, 0.4),
      color: rng.pick(palette),
    }))
  }, [c?.id, theme])

  return createPortal(
    <AnimatePresence>
      {c && (
        <motion.div
          key={c.id}
          className="fixed inset-0 z-[110] grid cursor-pointer place-items-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={clear}
        >
          {/* nền luôn tối (cả giao diện sáng) để chữ sáng phía trên đọc rõ; lõi nhuộm theo giao diện */}
          <div className="absolute inset-0 backdrop-blur-[3px]" style={{ background: 'radial-gradient(circle at center, var(--celebrate-core), rgba(6,8,14,.9) 65%)' }} />
          {theme === 'bach-gia' ? (
            <SnowBurst seed={c.id} />
          ) : (
            sparks.map((s) => (
              <motion.span
                key={s.id}
                className="absolute left-1/2 top-1/2 rounded-full"
                style={{ width: s.s, height: s.s, background: s.color, boxShadow: `0 0 12px ${s.color}` }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{ x: `${s.x}vw`, y: `${s.y}vh`, opacity: [0, 1, 0], scale: [0, 1.2, 0.6] }}
                transition={{ duration: 2.2, delay: s.d, ease: 'easeOut' }}
              />
            ))
          )}
          <motion.div
            className="relative flex flex-col items-center px-6 text-center"
            initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 160 }}
          >
            <span className="seal h-32 w-32 rounded-[26px] text-[84px]" style={{ boxShadow: '0 0 80px var(--seal-aura)' }}>
              {c.han ?? '贺'}
            </span>
            <h2 className="title-display text-gold-grad mt-6 text-[40px] sm:text-[52px]" style={{ backgroundImage: 'var(--celebrate-grad)' }}>
              {c.title}
            </h2>
            {c.subtitle && (
              <p className="mt-2 max-w-md text-[15px]" style={{ color: 'var(--celebrate-text)' }}>
                {c.subtitle}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

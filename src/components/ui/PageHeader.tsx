import type { ReactNode } from 'react'
import { motion } from 'motion/react'

/** Đầu trang: chữ Hán lớn làm hình chìm + tiêu đề vàng + mô tả + nút hành động */
export function PageHeader({
  eyebrow,
  title,
  han,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  han: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="relative mb-7 flex flex-col gap-4 overflow-hidden sm:flex-row sm:items-end sm:justify-between">
      <span
        aria-hidden
        className="han pointer-events-none absolute -top-6 right-2 select-none text-[120px] leading-none text-gold opacity-[0.07] sm:right-40"
      >
        {han}
      </span>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-halo relative">
        <div className="eyebrow mb-2 flex items-center gap-2">
          <span className="inline-block h-px w-6 bg-gold/60" />
          {eyebrow}
        </div>
        <h1 className="title-display text-gold-grad text-[34px] sm:text-[42px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[14px] text-ink-2">{description}</p>}
      </motion.div>
      {actions && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative flex flex-wrap items-center gap-2"
        >
          {actions}
        </motion.div>
      )}
    </div>
  )
}

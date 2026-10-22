// Mảnh ghép dùng chung cho trang giới thiệu: hiện dần khi cuộn tới, tiêu đề khối, danh sách lợi ích, cặp nút kêu gọi.
import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { Check, Compass, LoaderCircle, ShieldCheck } from 'lucide-react'
import { DiscordMark } from '@/auth/AuthScreens'
import { cn } from '@/lib/utils'
import type { CtaProps } from './cta'

export type { Busy, CtaProps, DiscordState } from './cta'

/* ------------------------------------------------------------------ */
/* Chuyển động                                                         */
/* ------------------------------------------------------------------ */

const EASE = [0.22, 1, 0.36, 1] as const

/** Hiện dần + trồi nhẹ khi cuộn tới (một lần). Giảm chuyển động: MotionConfig ở gốc bỏ phần trồi. */
export function Reveal({ children, delay = 0, y = 22, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Tiêu đề khối                                                        */
/* ------------------------------------------------------------------ */

export function SectionHeader({ id, eyebrow, han, title, sub }: { id: string; eyebrow: string; han: string; title: ReactNode; sub?: ReactNode }) {
  return (
    <Reveal className="text-halo mx-auto max-w-2xl text-center">
      <div className="eyebrow flex items-center justify-center gap-3">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-[var(--gold)]" />
        <span className="han text-[15px] tracking-normal normal-case" aria-hidden>
          {han}
        </span>
        {eyebrow}
        <span className="h-px w-8 bg-gradient-to-l from-transparent to-[var(--gold)]" />
      </div>
      <h2 id={id} className="title-display mt-3 text-balance text-[32px] text-ink sm:text-[44px]">
        {title}
      </h2>
      {sub && <p className="mx-auto mt-3 max-w-xl text-[15px] text-ink-2">{sub}</p>}
    </Reveal>
  )
}

/** Danh sách lợi ích có dấu tick vàng */
export function Bullets({ items, className }: { items: ReactNode[]; className?: string }) {
  return (
    <ul className={cn('space-y-2.5', className)}>
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[14px] text-ink-2">
          <span className="mt-[3px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-line-strong bg-[color-mix(in_oklab,var(--gold)_14%,transparent)]">
            <Check size={11} strokeWidth={3} className="text-gold" />
          </span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/* Nút kêu gọi                                                         */
/* ------------------------------------------------------------------ */

export function DiscordButton({ discord, busy, onLogin, className }: Omit<CtaProps, 'onDemo'> & { className?: string }) {
  if (discord === 'off') {
    return (
      <div role="note" className={cn('flex min-h-12 items-center gap-3 rounded-[14px] border border-dashed border-line-strong px-4 py-2 text-left', className)}>
        <DiscordMark size={20} />
        <span className="text-[12.5px] leading-snug text-muted">
          <b className="block text-[13.5px] text-ink-2">Đăng nhập Discord chưa mở</b>
          Máy chủ chưa bật — bạn vẫn có thể vào xem thử.
        </span>
      </div>
    )
  }
  const pending = discord === 'pending'
  const loading = busy === 'discord'
  return (
    <button
      type="button"
      aria-disabled={pending || loading}
      aria-busy={pending || loading}
      onClick={() => !pending && !busy && onLogin()}
      className={cn('btn lp-discord h-12 rounded-[14px] px-5 text-[15px]', className)}
    >
      {loading ? <LoaderCircle size={19} className="animate-spin" aria-hidden /> : <DiscordMark />}
      {loading ? 'Đang mở Discord…' : 'Đăng nhập bằng Discord'}
    </button>
  )
}

export function DemoButton({ busy, onDemo, className }: Pick<CtaProps, 'busy' | 'onDemo'> & { className?: string }) {
  const loading = busy === 'demo'
  return (
    <button
      type="button"
      aria-busy={loading}
      aria-describedby="lp-demo-hint"
      onClick={() => !busy && onDemo()}
      className={cn('btn h-12 rounded-[14px] px-5 text-[15px] backdrop-blur-sm', className)}
    >
      {loading ? <LoaderCircle size={18} className="animate-spin text-gold" aria-hidden /> : <Compass size={18} className="text-gold" aria-hidden />}
      {loading ? 'Đang dựng bản xem thử…' : 'Vào xem thử'}
    </button>
  )
}

/** Cặp nút + dòng trấn an. `align` để canh giữa ở khối cuối trang. */
export function CtaGroup({ align = 'start', hintId = true, ...p }: CtaProps & { align?: 'start' | 'center'; hintId?: boolean }) {
  const center = align === 'center'
  return (
    <div className={cn('flex flex-col gap-3', center && 'items-center')}>
      <div className={cn('flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row', center && 'sm:justify-center')}>
        <DiscordButton {...p} className="w-full sm:w-auto" />
        <DemoButton {...p} className="w-full sm:w-auto" />
      </div>
      <ul className={cn('flex flex-col gap-1 text-[12.5px] text-muted sm:flex-row sm:flex-wrap sm:gap-x-4', center && 'items-center sm:justify-center')}>
        <li id={hintId ? 'lp-demo-hint' : undefined} className="inline-flex items-center gap-1.5">
          <Compass size={13} className="shrink-0 text-gold" aria-hidden /> Xem thử không cần đăng nhập · dữ liệu mẫu
        </li>
        <li className="inline-flex items-center gap-1.5">
          <ShieldCheck size={13} className="shrink-0 text-jade" aria-hidden /> Discord chỉ chia sẻ tên + ảnh đại diện
        </li>
      </ul>
    </div>
  )
}

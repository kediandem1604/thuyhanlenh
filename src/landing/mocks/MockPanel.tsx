import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Khung minh họa: panel sơn mài + đầu khung (ấn chữ Hán, tên, phụ đề, phần phải) — giống SectionTitle trong app */
export function MockPanel({
  han,
  title,
  sub,
  right,
  children,
  className,
}: {
  han: string
  title: ReactNode
  sub?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('panel corners p-4 sm:p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="seal h-8 w-8 shrink-0 text-[17px]" aria-hidden>
            {han}
          </span>
          <div className="min-w-0">
            <div className="title-display truncate text-[19px] text-ink">{title}</div>
            {sub && <div className="truncate text-[12px] text-muted">{sub}</div>}
          </div>
        </div>
        {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
      </div>
      {children}
    </div>
  )
}

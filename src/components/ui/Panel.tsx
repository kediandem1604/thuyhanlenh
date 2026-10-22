import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  corners?: boolean
  hover?: boolean
  padded?: boolean
}

/** Khung sơn mài cơ bản — dùng cho mọi khối nội dung */
export function Panel({ corners = false, hover = false, padded = true, className, children, ...rest }: PanelProps) {
  return (
    <div className={cn('panel', corners && 'corners', hover && 'panel-hover', padded && 'p-5', className)} {...rest}>
      {children}
    </div>
  )
}

/** Tiêu đề khối: chữ Hán nhỏ + tiêu đề + phần phải */
export function SectionTitle({
  han,
  title,
  subtitle,
  right,
  className,
}: {
  han?: string
  title: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {han && (
          <span className="seal h-8 w-8 shrink-0 text-[17px]" aria-hidden>
            {han}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="title-display truncate text-[21px] text-ink">{title}</h3>
          {subtitle && <p className="truncate text-[12.5px] text-muted">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  )
}

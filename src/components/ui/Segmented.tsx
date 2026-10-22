import { useId, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  count?: number
}

/** Thanh chọn dạng viên thuốc với chỉ báo trượt mượt */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: SegmentOption<T>[]
  className?: string
  size?: 'sm' | 'md'
}) {
  const id = useId()
  return (
    <div
      role="tablist"
      className={cn('scroll-x inline-flex max-w-full items-center gap-1 rounded-[14px] border border-line bg-[color-mix(in_oklab,var(--bg)_55%,transparent)] p-1', className)}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative shrink-0 rounded-[10px] font-semibold transition-colors',
              size === 'sm' ? 'h-7 px-3 text-[12px]' : 'h-8 px-3.5 text-[13px]',
              active ? 'text-on-gold' : 'text-ink-2 hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="bg-gold-grad absolute inset-0 rounded-[10px]"
                transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              {o.label}
              {o.count !== undefined && (
                <span className={cn('rounded-full px-1.5 text-[10.5px]', active ? 'bg-black/15' : 'bg-white/5 text-muted')}>{o.count}</span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

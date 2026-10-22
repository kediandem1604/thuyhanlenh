import type { ReactNode } from 'react'

export function EmptyState({ han = '空', title, desc, action }: { han?: string; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="han text-[56px] leading-none text-gold opacity-30">{han}</span>
      <p className="title-display text-[20px] text-ink">{title}</p>
      {desc && <p className="max-w-sm text-[13px] text-muted">{desc}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

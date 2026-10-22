import type { ButtonHTMLAttributes, ReactNode } from 'react'

/**
 * Nút phụ thuộc quyền: thiếu quyền thì khóa lại và bọc trong <span title> để vẫn hiện lời giải thích
 * (nút disabled có pointer-events: none nên title gắn trên nút sẽ không hiện).
 */
export function PermButton({
  allowed,
  hint,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { allowed: boolean; hint: string; children: ReactNode }) {
  if (allowed) return <button {...rest}>{children}</button>
  return (
    <span title={hint} className="inline-flex">
      <button {...rest} onClick={undefined} disabled aria-label={typeof children === 'string' ? `${children} — ${hint}` : hint}>
        {children}
      </button>
    </span>
  )
}

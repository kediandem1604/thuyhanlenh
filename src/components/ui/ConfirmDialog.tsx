import type { ReactNode } from 'react'
import { Modal } from '@/components/ui/Modal'

/** Hộp xác nhận cho thao tác khó hoàn tác (giải tán, giải trừ…) */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  han = '慎',
  children,
  confirmLabel = 'Xác nhận',
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  han?: string
  children: ReactNode
  confirmLabel?: string
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      han={han}
      size="sm"
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Để sau
          </button>
          <button
            className="btn btn-cinnabar"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-[14px] leading-relaxed text-ink-2">{children}</div>
    </Modal>
  )
}

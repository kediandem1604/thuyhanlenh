import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CircleCheck, CircleX, Info, Sparkles, X } from 'lucide-react'
import { useUi, type ToastTone } from '@/store/ui'

const TONE: Record<ToastTone, { color: string; icon: typeof Info }> = {
  success: { color: 'var(--jade)', icon: CircleCheck },
  error: { color: 'var(--cinnabar)', icon: CircleX },
  info: { color: 'var(--azure)', icon: Info },
  gold: { color: 'var(--gold)', icon: Sparkles },
}

export function Toaster() {
  const toasts = useUi((s) => s.toasts)
  const dismiss = useUi((s) => s.dismissToast)
  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[340px] max-w-[calc(100vw-32px)] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const tone = TONE[t.tone]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              className="panel pointer-events-auto flex items-start gap-3 !bg-[var(--surface-solid)] p-3.5"
              style={{ borderColor: `color-mix(in oklab, ${tone.color} 45%, transparent)` }}
            >
              <tone.icon size={18} style={{ color: tone.color }} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-ink">{t.title}</p>
                {t.desc && <p className="mt-0.5 text-[12px] text-muted">{t.desc}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-muted hover:text-ink" aria-label="Đóng">
                <X size={14} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>,
    document.body,
  )
}

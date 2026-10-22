import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light'
export type ToastTone = 'success' | 'error' | 'info' | 'gold'

export interface Toast {
  id: number
  tone: ToastTone
  title: string
  desc?: string
}

export interface Celebration {
  id: number
  title: string
  subtitle?: string
  han?: string
}

export type RealtimeState = 'connecting' | 'open' | 'closed'

interface UiState {
  theme: Theme
  /** trạng thái kết nối realtime (không lưu) */
  realtime: RealtimeState
  setRealtime: (r: RealtimeState) => void
  navOpen: boolean
  paletteOpen: boolean
  toasts: Toast[]
  celebration: Celebration | null
  petals: boolean
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  setNavOpen: (v: boolean) => void
  setPaletteOpen: (v: boolean) => void
  setPetals: (v: boolean) => void
  toast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
  celebrate: (c: Omit<Celebration, 'id'>) => void
  clearCelebration: () => void
}

let toastSeq = 1

export const useUi = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      realtime: 'closed',
      setRealtime: (realtime) => set({ realtime }),
      navOpen: false,
      paletteOpen: false,
      toasts: [],
      celebration: null,
      petals: true,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setNavOpen: (navOpen) => set({ navOpen }),
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
      setPetals: (petals) => set({ petals }),
      toast: (t) => {
        const id = toastSeq++
        set((s) => ({ toasts: [...s.toasts, { ...t, id }].slice(-4) }))
        setTimeout(() => get().dismissToast(id), 3800)
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      celebrate: (c) => set({ celebration: { ...c, id: Date.now() } }),
      clearCelebration: () => set({ celebration: null }),
    }),
    {
      name: 'thuy-han-lenh:ui',
      partialize: (s) => ({ theme: s.theme, petals: s.petals }),
    },
  ),
)

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'thuy-han-lenh:ui') void useUi.persist.rehydrate()
  })
}

/** Gọi nhanh ngoài component */
export const toast = (t: Omit<Toast, 'id'>) => useUi.getState().toast(t)
export const celebrate = (c: Omit<Celebration, 'id'>) => useUi.getState().celebrate(c)

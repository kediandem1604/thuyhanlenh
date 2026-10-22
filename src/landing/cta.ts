// Trạng thái nút kêu gọi (đăng nhập Discord / xem thử) dùng chung cho đầu trang, thanh đầu và khối cuối.
/** ready: hiện nút · pending: đang hỏi máy chủ (nút mờ, chưa bấm được) · off: máy chủ chưa bật Discord */
export type DiscordState = 'ready' | 'pending' | 'off'
export type Busy = 'discord' | 'demo' | null

export interface CtaProps {
  discord: DiscordState
  busy: Busy
  onLogin: () => void
  onDemo: () => void
}

/** `enabled` = null khi máy chủ chưa trả lời: nút mờ chờ, không nháy "chưa mở" → "đăng nhập" lúc vừa tải trang */
export function useDiscordState(enabled: boolean | null): DiscordState {
  if (enabled === null) return 'pending'
  return enabled ? 'ready' : 'off'
}

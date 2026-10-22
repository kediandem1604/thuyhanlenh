import type { WsMessage } from '@/domain/api'
import { CLIENT_ID, getOrgId } from './client'

export type RealtimeStatus = 'connecting' | 'open' | 'closed'

/**
 * Kết nối WebSocket `/api/ws` có tự nối lại (lùi dần 1s → 15s).
 * `onReconnect` gọi khi nối lại sau khi rớt — nên tải lại toàn bộ để không lỡ thay đổi.
 */
export function connectRealtime(handlers: {
  onMessage: (msg: WsMessage) => void
  onStatus?: (s: RealtimeStatus) => void
  onReconnect?: () => void
}) {
  let ws: WebSocket | null = null
  let stopped = false
  let attempt = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let everOpened = false

  const open = () => {
    if (stopped) return
    handlers.onStatus?.('connecting')
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const org = getOrgId()
    ws = new WebSocket(`${proto}://${location.host}/api/ws?clientId=${encodeURIComponent(CLIENT_ID)}${org ? `&org=${encodeURIComponent(org)}` : ''}`)
    ws.onopen = () => {
      handlers.onStatus?.('open')
      if (everOpened) handlers.onReconnect?.()
      everOpened = true
      attempt = 0
    }
    ws.onmessage = (ev) => {
      try {
        handlers.onMessage(JSON.parse(String(ev.data)) as WsMessage)
      } catch {
        /* bỏ qua tin lỗi */
      }
    }
    ws.onclose = (ev) => {
      handlers.onStatus?.('closed')
      ws = null
      if (stopped || ev.code === 4401) return
      const delay = Math.min(15000, 1000 * 2 ** attempt++)
      timer = setTimeout(open, delay)
    }
  }

  // nối lại ngay khi tab hiện lại / có mạng lại
  const wake = () => {
    if (!ws && !stopped) {
      clearTimeout(timer)
      attempt = 0
      open()
    }
  }
  window.addEventListener('online', wake)
  document.addEventListener('visibilitychange', wake)
  open()

  return () => {
    stopped = true
    clearTimeout(timer)
    window.removeEventListener('online', wake)
    document.removeEventListener('visibilitychange', wake)
    ws?.close()
  }
}

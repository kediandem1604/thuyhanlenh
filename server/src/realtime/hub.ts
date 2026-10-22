import type { Slice, WsMessage } from '@/domain/api'

export interface Connection {
  id: string
  clientId: string | null
  /** tổ chức đang xem trên tab này */
  guildId: string
  memberId: string
  /** nhân vật dùng chung — trạng thái online tính theo nhân vật */
  characterId: string
  send: (msg: WsMessage) => void
}

/*
 * Trạm phát realtime trong tiến trình.
 * Chạy nhiều instance thì thay bằng Redis pub/sub — giao diện giữ nguyên.
 */
export class Hub {
  private conns = new Set<Connection>()
  private timers = new Map<string, ReturnType<typeof setTimeout>>()

  /** gọi khi một nhân vật vừa online / offline hẳn (mở tab đầu, đóng tab cuối) */
  onPresence?: (characterId: string, online: boolean) => void

  add(conn: Connection) {
    const wasOnline = this.isOnline(conn.characterId)
    this.conns.add(conn)
    conn.send({ type: 'hello', clientId: conn.clientId ?? conn.id })
    if (!wasOnline) this.onPresence?.(conn.characterId, true)
  }

  remove(conn: Connection) {
    if (!this.conns.delete(conn)) return
    if (!this.isOnline(conn.characterId)) this.onPresence?.(conn.characterId, false)
  }

  isOnline(characterId: string) {
    for (const c of this.conns) if (c.characterId === characterId) return true
    return false
  }

  /** nhân vật đang online (ở bất kỳ tổ chức nào) */
  onlineCharacters(): Set<string> {
    const set = new Set<string>()
    for (const c of this.conns) set.add(c.characterId)
    return set
  }

  get size() {
    return this.conns.size
  }

  /** Báo các máy đang xem tổ chức tải lại những slice đã đổi (bỏ qua tab vừa gây ra thay đổi). */
  invalidate(guildId: string, slices: Slice[], by: string | null, exceptClientId?: string | null) {
    const msg: WsMessage = { type: 'invalidate', slices, by }
    for (const c of this.conns) {
      if (c.guildId !== guildId) continue
      if (exceptClientId && c.clientId === exceptClientId) continue
      c.send(msg)
    }
  }

  /** Báo mọi máy (mọi tổ chức) tải lại các slice — dùng cho job nền / nạp lại demo */
  invalidateAll(slices: Slice[]) {
    for (const c of this.conns) c.send({ type: 'invalidate', slices, by: null })
  }

  /** Thông tin tổ chức đổi (tên, giao diện, chức năng…) → các máy tải lại /api/me */
  broadcastOrg(guildId: string) {
    for (const c of this.conns) if (c.guildId === guildId) c.send({ type: 'org' })
  }

  /** Gộp nhiều lần đổi trạng thái online trong ~800ms thành một lần phát cho tổ chức. */
  presenceChanged(guildId: string) {
    if (this.timers.has(guildId)) return
    this.timers.set(
      guildId,
      setTimeout(() => {
        this.timers.delete(guildId)
        const online = [...this.conns].filter((c) => c.guildId === guildId).map((c) => c.memberId)
        for (const c of this.conns) {
          if (c.guildId !== guildId) continue
          c.send({ type: 'presence', online })
          c.send({ type: 'invalidate', slices: ['members'], by: null })
        }
      }, 800),
    )
  }

  close() {
    this.timers.forEach((t) => clearTimeout(t))
    this.timers.clear()
    this.conns.clear()
  }
}

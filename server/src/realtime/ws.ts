import type { FastifyInstance } from 'fastify'
import { and, eq, isNull } from 'drizzle-orm'
import * as s from '../db/schema'
import { newId } from '../lib/ids'
import type { Connection } from './hub'

/** Kênh WebSocket `/api/ws?org=…`: server → client (invalidate, presence). */
export async function wsRoutes(app: FastifyInstance) {
  app.ctx.hub.onPresence = (characterId, online) => {
    void (async () => {
      const rows = await app.ctx.db
        .select({ id: s.members.id, guildId: s.members.guildId })
        .from(s.members)
        .where(and(eq(s.members.characterId, characterId), isNull(s.members.deletedAt)))
      // ghi lại lần cuối trực tuyến khi đóng tab cuối cùng
      if (!online) await app.ctx.db.update(s.members).set({ lastOnline: new Date() }).where(eq(s.members.characterId, characterId))
      for (const r of rows) app.ctx.hub.presenceChanged(r.guildId)
    })().catch((err) => app.log.warn({ err }, 'không cập nhật được trạng thái online'))
  }

  app.get('/api/ws', { websocket: true }, (socket, req) => {
    const member = req.auth?.member
    if (!member) {
      socket.close(4401, 'unauthorized')
      return
    }
    const conn: Connection = {
      id: newId('ws'),
      clientId: req.clientId,
      guildId: member.guildId,
      memberId: member.id,
      characterId: member.characterId,
      send: (msg) => {
        if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg))
      },
    }
    app.ctx.hub.add(conn)
    const ping = setInterval(() => socket.readyState === socket.OPEN && socket.ping(), 25000)
    socket.on('close', () => {
      clearInterval(ping)
      app.ctx.hub.remove(conn)
    })
    socket.on('error', () => socket.close())
    // client không cần gửi gì; bỏ qua tin nhắn đến
    socket.on('message', () => {})
  })
}

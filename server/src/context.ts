import type { Config } from './config'
import type { Database, Db } from './db/client'
import type { Hub } from './realtime/hub'

export interface AppContext {
  config: Config
  database: Database
  db: Db
  hub: Hub
  guildId: string
  /** thay được trong test để giả lập API Discord */
  fetch: typeof fetch
}

declare module 'fastify' {
  interface FastifyInstance {
    ctx: AppContext
  }
}

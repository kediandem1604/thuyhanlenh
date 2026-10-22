import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import pg from 'pg'
import * as schema from './schema'

export type Schema = typeof schema
export type Db = PgDatabase<PgQueryResultHKT, Schema>
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
export type DbOrTx = Db | Tx

export interface Database {
  db: Db
  kind: 'pglite' | 'postgres'
  migrate: () => Promise<void>
  close: () => Promise<void>
}

const MIGRATIONS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../drizzle')

/**
 * Mở CSDL:
 * - có `databaseUrl` → PostgreSQL thật (node-postgres pool)
 * - không có → PGlite nhúng; `pgliteDir = 'memory'` cho test
 */
export async function openDatabase(opts: { databaseUrl?: string; pgliteDir: string }): Promise<Database> {
  if (opts.databaseUrl) {
    const pool = new pg.Pool({ connectionString: opts.databaseUrl, max: 10 })
    const db = drizzlePg(pool, { schema }) as unknown as Db
    return {
      db,
      kind: 'postgres',
      migrate: () => migratePg(db as never, { migrationsFolder: MIGRATIONS }),
      close: () => pool.end(),
    }
  }
  let client: PGlite
  if (opts.pgliteDir === 'memory') {
    client = new PGlite()
  } else {
    const dir = path.resolve(opts.pgliteDir)
    mkdirSync(dir, { recursive: true })
    client = new PGlite(dir)
  }
  await client.waitReady
  const db = drizzlePglite(client, { schema }) as unknown as Db
  return {
    db,
    kind: 'pglite',
    migrate: () => migratePglite(db as never, { migrationsFolder: MIGRATIONS }),
    close: () => client.close(),
  }
}

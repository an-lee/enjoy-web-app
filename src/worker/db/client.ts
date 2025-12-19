import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1'
import * as schema from './schema'
import { createLogger } from '@/shared/lib/utils'

const log = createLogger({ name: 'd1' })

export type D1Db = DrizzleD1Database<typeof schema>

/**
 * Create a Drizzle D1 database instance from the Worker env.
 *
 * Prefer passing this `db` instance down into repositories/services instead of
 * importing `Env` directly in many places – this keeps your data layer testable.
 */
export function getD1Db(env: Env): D1Db {
	if (!env.DB) {
		// In theory this should not happen if Wrangler bindings are configured correctly.
		log.error('D1 binding `DB` is not available on Env')
		throw new Error('Database not configured (missing Env.DB binding)')
	}

	return drizzle(env.DB, {
		schema,
	})
}



import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

/**
 * D1 / Drizzle schema for server-side persistence.
 *
 * Keep this file focused on table definitions only.
 * Higher-level business logic should live in repositories / services.
 */

export const creditsUsageLogs = sqliteTable('credits_usage_logs', {
	id: text('id').primaryKey(), // UUID / Snowflake generated in application code
	userId: text('user_id').notNull(),
	date: text('date').notNull(), // YYYY-MM-DD (UTC), aligned with credits KV key
	timestamp: integer('timestamp', { mode: 'number' }).notNull(), // Unix ms
	serviceType: text('service_type').notNull(), // 'tts' | 'asr' | 'translation' | 'llm' | 'assessment' | ...
	tier: text('tier').notNull(), // 'free' | 'pro' | 'ultra'
	required: integer('required').notNull(), // Credits requested for this operation
	usedBefore: integer('used_before').notNull(), // Credits used before this operation
	usedAfter: integer('used_after').notNull(), // Credits used after this operation
	allowed: integer('allowed', { mode: 'boolean' }).notNull(), // Whether the request was allowed
	meta: text('meta', { mode: 'json' }).$type<Record<string, unknown> | null>().default(null), // Optional JSON metadata
})



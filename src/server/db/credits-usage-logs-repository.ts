import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { desc, eq, and } from 'drizzle-orm'
import type { D1Db } from './client'
import { creditsUsageLogs } from './schema'

export type CreditsUsageLog = InferSelectModel<typeof creditsUsageLogs>
export type NewCreditsUsageLog = InferInsertModel<typeof creditsUsageLogs>

/**
 * Insert a single credits usage log entry.
 *
 * This is intended to be called from server-side services (e.g. Azure, TTS)
 * after a Credits check has been performed.
 */
export async function insertCreditsUsageLog(db: D1Db, log: NewCreditsUsageLog): Promise<void> {
	await db.insert(creditsUsageLogs).values(log).run()
}

/**
 * Get all credits usage logs for a user on a specific date (UTC).
 */
export async function getCreditsUsageLogsForUserOnDate(
	db: D1Db,
	userId: string,
	date: string
): Promise<CreditsUsageLog[]> {
	return db
		.select()
		.from(creditsUsageLogs)
		.where(and(eq(creditsUsageLogs.userId, userId), eq(creditsUsageLogs.date, date)))
		.orderBy(desc(creditsUsageLogs.timestamp))
		.all()
}



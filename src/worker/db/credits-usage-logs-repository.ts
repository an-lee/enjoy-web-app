import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { desc, eq, and, gte, lte } from 'drizzle-orm'
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

/**
 * Query options for getting credits usage logs.
 */
export interface GetCreditsUsageLogsOptions {
	/** Optional start date (YYYY-MM-DD format) */
	startDate?: string
	/** Optional end date (YYYY-MM-DD format) */
	endDate?: string
	/** Optional service type filter */
	serviceType?: string
	/** Page size (default: 50, max: 100) */
	limit?: number
	/** Page offset (default: 0) */
	offset?: number
}

/**
 * Get credits usage logs for a user with pagination and optional filters.
 *
 * Returns logs ordered by timestamp (descending, most recent first).
 */
export async function getCreditsUsageLogsForUser(
	db: D1Db,
	userId: string,
	options: GetCreditsUsageLogsOptions = {}
): Promise<CreditsUsageLog[]> {
	const { startDate, endDate, serviceType, limit = 50, offset = 0 } = options

	// Validate and clamp limit
	const clampedLimit = Math.min(Math.max(1, limit), 100)

	// Build where conditions
	const conditions = [eq(creditsUsageLogs.userId, userId)]

	if (startDate) {
		conditions.push(gte(creditsUsageLogs.date, startDate))
	}

	if (endDate) {
		conditions.push(lte(creditsUsageLogs.date, endDate))
	}

	if (serviceType) {
		conditions.push(eq(creditsUsageLogs.serviceType, serviceType))
	}

	return db
		.select()
		.from(creditsUsageLogs)
		.where(and(...conditions))
		.orderBy(desc(creditsUsageLogs.timestamp))
		.limit(clampedLimit)
		.offset(offset)
		.all()
}



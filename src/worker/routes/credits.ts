/**
 * Credits Usage Logs API
 * Query user credits usage records
 */

import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { UserProfile } from '../middleware/auth'
import { handleError } from '@/worker/utils/errors'
import { getD1Db } from '@/worker/db/client'
import { getCreditsUsageLogsForUser } from '@/worker/db/credits-usage-logs-repository'

const credits = new Hono<{
	Bindings: Env
	Variables: {
		user: UserProfile
	}
}>()

// Apply authentication middleware
credits.use('/*', authMiddleware)

/**
 * Get credits usage logs for the authenticated user
 * GET /credits/usages
 *
 * Query parameters:
 * - startDate: string (optional) - Start date in YYYY-MM-DD format
 * - endDate: string (optional) - End date in YYYY-MM-DD format
 * - serviceType: string (optional) - Filter by service type (e.g., 'tts', 'asr', 'translation', 'llm', 'assessment')
 * - limit: number (optional, default: 50, max: 100) - Number of records to return
 * - offset: number (optional, default: 0) - Offset for pagination
 *
 * Response (JSON):
 * - logs: CreditsUsageLog[] - Array of credits usage log entries
 */
credits.get('/usages', async (c) => {
	try {
		const env = c.env
		const user = c.get('user')

		// Skip if D1 is not available
		if (!env.DB) {
			return c.json({ error: 'Database is not configured' }, 500)
		}

		const db = getD1Db(env)

		// Parse query parameters
		const startDate = c.req.query('startDate')
		const endDate = c.req.query('endDate')
		const serviceType = c.req.query('serviceType')
		const limitParam = c.req.query('limit')
		const offsetParam = c.req.query('offset')

		// Validate and parse limit
		let limit = 50
		if (limitParam) {
			const parsedLimit = parseInt(limitParam, 10)
			if (isNaN(parsedLimit) || parsedLimit < 1) {
				return c.json({ error: 'limit must be a positive number' }, 400)
			}
			limit = parsedLimit
		}

		// Validate and parse offset
		let offset = 0
		if (offsetParam) {
			const parsedOffset = parseInt(offsetParam, 10)
			if (isNaN(parsedOffset) || parsedOffset < 0) {
				return c.json({ error: 'offset must be a non-negative number' }, 400)
			}
			offset = parsedOffset
		}

		// Validate date format (YYYY-MM-DD)
		const dateRegex = /^\d{4}-\d{2}-\d{2}$/
		if (startDate && !dateRegex.test(startDate)) {
			return c.json({ error: 'startDate must be in YYYY-MM-DD format' }, 400)
		}
		if (endDate && !dateRegex.test(endDate)) {
			return c.json({ error: 'endDate must be in YYYY-MM-DD format' }, 400)
		}

		// Query logs
		const logs = await getCreditsUsageLogsForUser(db, user.id, {
			startDate,
			endDate,
			serviceType,
			limit,
			offset,
		})

		return c.json({ logs })
	} catch (error) {
		return handleError(c, error, 'Failed to fetch credits usage logs')
	}
})

export { credits }


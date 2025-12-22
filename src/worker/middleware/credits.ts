import type { Context } from 'hono'
import type { UserProfile } from './auth'
import { createLogger } from '@/shared/lib/utils'
import {
	calculateCredits,
	checkAndDeductCredits,
	getTodayDateString,
	getDailyCreditsLimit,
	type CreditCalculationInput,
} from '@/worker/utils/credits'
import { RateLimitError } from '@/worker/utils/errors'
import { getD1Db } from '@/worker/db/client'
import { insertCreditsUsageLog } from '@/worker/db/credits-usage-logs-repository'

const log = createLogger({ name: 'credits-middleware' })

/**
 * Unified Credits enforcement helper.
 *
 * Call this inside route handlers at the point where you ALREADY know the
 * approximate usage for this request (characters / seconds / tokens, etc.).
 * It will:
 * - Compute required Credits according to `pricing-strategy.md`
 * - Deduct from the user's daily Credits pool
 * - Throw `RateLimitError('Daily Credits limit reached', 'credits', ...)` when exceeded
 */
export async function enforceCreditsLimit(
	c: Context<{
		Bindings: Env
		Variables: {
			user: UserProfile
		}
	}>,
	input: CreditCalculationInput
): Promise<void> {
	const env = c.env
	const kv = (env as any).RATE_LIMIT_KV as KVNamespace | undefined
	const user = c.get('user')

	const requiredCredits = calculateCredits(input)

	// Even if requiredCredits <= 0, we should still attempt to record a log entry
	// (though in practice, calculateCredits should rarely return 0 for real usage)
	// However, if credits are 0 or negative, skip the KV check and just record the log
	if (requiredCredits <= 0) {
		// Record a log entry even for 0-credit operations (for audit trail)
		// Try to get actual usage from KV if available
		let used = 0
		const limit = getDailyCreditsLimit(user.subscriptionTier)

		try {
			if (kv) {
				const today = getTodayDateString()
				const key = `credits:${user.id}:${today}`
				const stored = await kv.get(key, 'text')
				used = stored ? parseInt(stored, 10) || 0 : 0
			}
		} catch (error) {
			// Ignore errors when getting usage for 0-credit operations
		}

		// Calculate resetAt (next UTC midnight)
		const tomorrow = new Date()
		tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
		tomorrow.setUTCHours(0, 0, 0, 0)
		const resetAt = tomorrow.getTime()

		const mockResult = {
			allowed: true,
			used,
			limit,
			required: 0,
			resetAt,
		} as Awaited<ReturnType<typeof checkAndDeductCredits>>

		await recordCreditsAuditLog(env, user, input, mockResult, requiredCredits).catch(
			(auditError) => {
				log.warn('Failed to record credits audit log for 0-credit operation', {
					userId: user.id,
					error: String(auditError),
				})
			}
		)

		return
	}

	let creditsResult: Awaited<ReturnType<typeof checkAndDeductCredits>> | null = null

	try {
		creditsResult = await checkAndDeductCredits(
			user.id,
			user.subscriptionTier,
			requiredCredits,
			kv
		)

		if (!creditsResult.allowed) {
			throw new RateLimitError(
				'Daily Credits limit reached',
				'credits',
				creditsResult.limit,
				creditsResult.used,
				creditsResult.resetAt,
				'user_daily'
			)
		}
	} catch (error) {
		// Record audit log even when request is rejected or fails
		if (creditsResult) {
			await recordCreditsAuditLog(env, user, input, creditsResult, requiredCredits).catch(
				(auditError) => {
					// Log but don't fail the request if audit logging fails
					log.warn('Failed to record credits audit log', {
						userId: user.id,
						error: String(auditError),
					})
				}
			)
		}

		if (error instanceof RateLimitError) {
			throw error
		}

		log.error('Failed to apply Credits-based limit', {
			userId: user.id,
			input,
			error: String(error),
		})

		// Re-throw so outer route-level error handlers can respond consistently
		throw error
	}

	// Record audit log for successful credits check
	if (creditsResult) {
		await recordCreditsAuditLog(env, user, input, creditsResult, requiredCredits).catch(
			(auditError) => {
				// Log but don't fail the request if audit logging fails
				log.warn('Failed to record credits audit log', {
					userId: user.id,
					error: String(auditError),
				})
			}
		)
	}
}

/**
 * Record credits usage audit log to D1 database.
 *
 * This is called asynchronously and errors are caught to ensure audit logging
 * failures don't affect the main request flow.
 *
 * Exported for use in services that directly call checkAndDeductCredits
 * (e.g., azure.ts) to ensure audit logs are recorded.
 */
export async function recordCreditsAuditLog(
	env: Env,
	user: UserProfile,
	input: CreditCalculationInput,
	result: Awaited<ReturnType<typeof checkAndDeductCredits>>,
	requiredCredits: number
): Promise<void> {
	// Skip if D1 is not available
	if (!env.DB) {
		return
	}

	try {
		const db = getD1Db(env)
		const today = getTodayDateString()
		const timestamp = Date.now()
		const usedBefore = result.used - (result.allowed ? requiredCredits : 0)
		const usedAfter = result.used

		// Extract metadata based on input type
		const meta: Record<string, unknown> = {}
		switch (input.type) {
			case 'tts':
				meta.chars = input.chars
				break
			case 'assessment':
				meta.seconds = input.seconds
				break
			case 'asr':
				meta.seconds = input.seconds
				break
			case 'translation':
				meta.chars = input.chars
				break
			case 'llm':
				meta.tokensIn = input.tokensIn
				meta.tokensOut = input.tokensOut
				if (input.model) {
					meta.model = input.model
				}
				break
		}

		await insertCreditsUsageLog(db, {
			id: crypto.randomUUID(),
			userId: user.id,
			date: today,
			timestamp,
			serviceType: input.type,
			tier: user.subscriptionTier,
			required: requiredCredits,
			usedBefore,
			usedAfter,
			allowed: result.allowed,
			meta: Object.keys(meta).length > 0 ? meta : null,
		})
	} catch (error) {
		// Re-throw to be caught by caller
		throw error
	}
}

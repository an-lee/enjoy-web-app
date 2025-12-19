import type { Context } from 'hono'
import type { UserProfile } from '@/api/auth'
import { createLogger } from '@/lib/utils'
import {
	calculateCredits,
	checkAndDeductCredits,
	type CreditCalculationInput,
} from '@/worker/utils/credits'
import { RateLimitError } from '@/worker/utils/errors'

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
	if (requiredCredits <= 0) {
		return
	}

	try {
		const result = await checkAndDeductCredits(
			user.id,
			user.subscriptionTier,
			requiredCredits,
			kv
		)

		if (!result.allowed) {
			throw new RateLimitError(
				'Daily Credits limit reached',
				'credits',
				result.limit,
				result.used,
				result.resetAt,
				'user_daily'
			)
		}
	} catch (error) {
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
}



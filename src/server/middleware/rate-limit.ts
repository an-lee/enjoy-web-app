/**
 * Rate limiting middleware for Hono
 */

import type { Context, Next } from 'hono'
import { checkRateLimit, type ServiceType, type RateLimitResult } from '../utils/rate-limit'
import { RateLimitError } from '../utils/errors'
import type { UserProfile } from './auth'

/**
 * Create rate limiting middleware for a specific service
 */
export function createRateLimitMiddleware(service: ServiceType) {
	return async (
		c: Context<{
			Bindings: Env
			Variables: {
				user: UserProfile
				rateLimit: RateLimitResult
				service: ServiceType
			}
		}>,
		next: Next
	) => {
		const user = c.get('user')
		const env = c.env
		const kv = (env as any).RATE_LIMIT_KV as KVNamespace | undefined

		const rateLimit = await checkRateLimit(service, user.id, user.subscriptionTier, kv)

		if (!rateLimit.allowed) {
			throw new RateLimitError(
				`You have reached your daily limit of ${rateLimit.limit} requests for ${service}. Please try again tomorrow.`,
				rateLimit.limit,
				rateLimit.count,
				rateLimit.resetAt
			)
		}

		// Store rate limit info in context for later use
		c.set('rateLimit', rateLimit)
		c.set('service', service)

		await next()
	}
}


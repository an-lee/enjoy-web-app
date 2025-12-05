/**
 * Rate limiting middleware for Hono
 */

import type { Context, Next } from 'hono'
import { checkRateLimit, type ServiceType, type RateLimitResult } from '../utils/rate-limit'
import { RateLimitError } from '../utils/errors'
import type { UserProfile } from '@/services/api/auth'
import { isValidSubscriptionTier } from './auth'

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

		// Validate user subscription tier (should already be validated in auth middleware, but double-check)
		if (!isValidSubscriptionTier(user.subscriptionTier)) {
			console.error('Invalid subscription tier:', user.subscriptionTier, 'User:', user)
			throw new Error(
				`Invalid subscription tier: ${user.subscriptionTier}. Expected 'free' or 'pro'.`
			)
		}

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


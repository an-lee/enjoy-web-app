/**
 * Azure Speech Service routes
 */

import { Hono } from 'hono'
import { authMiddleware, type UserProfile } from '../middleware/auth'
import { createRateLimitMiddleware } from '../middleware/rate-limit'
import type { RateLimitResult, ServiceType } from '../utils/rate-limit'
import { getAzureConfig, generateAzureToken } from '../services/azure'
import { handleError } from '../utils/errors'

const azure = new Hono<{
	Bindings: Env
	Variables: {
		user: UserProfile
		rateLimit: RateLimitResult
		service: ServiceType
	}
}>()

// Apply authentication and rate limiting middleware
azure.use('/*', authMiddleware)
azure.use('/tokens', createRateLimitMiddleware('assessment'))

/**
 * Generate Azure Speech token
 * POST /azure/tokens
 */
azure.post('/tokens', async (c) => {
	try {
		const user = c.get('user')
		const rateLimit = c.get('rateLimit')
		const env = c.env
		const kv = (env as any).RATE_LIMIT_KV as KVNamespace | undefined

		const config = getAzureConfig(env)
		const result = await generateAzureToken(config, user, kv, rateLimit)

		return c.json(result)
	} catch (error) {
		return handleError(c, error, 'Failed to generate Azure Speech token')
	}
})

export { azure }


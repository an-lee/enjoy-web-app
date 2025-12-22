/**
 * Azure Speech Service routes
 */

import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { azureTokenRateLimitMiddleware } from '../middleware/azure-rate-limit'
import type { UserProfile } from '../middleware/auth'
import { getAzureConfig, generateAzureToken, type AzureTokenUsagePayload } from '@/worker/services/azure'
import { handleError } from '@/worker/utils/errors'

const azure = new Hono<{
	Bindings: Env
	Variables: {
		user: UserProfile
	}
}>()

// Apply authentication middleware
azure.use('/*', authMiddleware)
azure.use('/tokens', azureTokenRateLimitMiddleware)

/**
 * Generate Azure Speech token
 * POST /azure/tokens
 */
azure.post('/tokens', async (c) => {
	try {
		const user = c.get('user')
		const body = await c.req.json().catch(() => ({}))
		const env = c.env
		const kv = (env as any).RATE_LIMIT_KV as KVNamespace | undefined

		const config = getAzureConfig(env)

		// Optional usage payload from client to improve cost estimation.
		// During the compatibility window, default to a 15-second assessment
		// when the client does not provide usage.
		const usage: AzureTokenUsagePayload =
			body?.usage ?? {
				purpose: 'assessment',
				assessment: {
					durationSeconds: 15,
				},
			}

		const result = await generateAzureToken(config, user, kv, usage, env)

		return c.json(result)
	} catch (error) {
		return handleError(c, error, 'Failed to generate Azure Speech token')
	}
})

export { azure }


/**
 * Models API (OpenAI-compatible)
 * Lists available Cloudflare Workers AI models
 */

import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { UserProfile } from '@/api/auth'
import { handleError } from '@/server/utils/errors'
import { DEFAULT_WORKERS_AI_TEXT_MODEL } from '@/ai/constants'

const models = new Hono<{
	Bindings: Env
	Variables: {
		user: UserProfile
	}
}>()

// Apply authentication middleware
models.use('/*', authMiddleware)

/**
 * List Models API (OpenAI-compatible)
 * GET /models
 *
 * Returns available models
 */
models.get('/', async (c) => {
	try {
		const env = c.env
		const textModel = env.WORKERS_AI_TEXT_MODEL || DEFAULT_WORKERS_AI_TEXT_MODEL
		const ttsModel = env.WORKERS_AI_TTS_MODEL || '@cf/myshell-ai/melotts'

		return c.json({
			object: 'list',
			data: [
				{
					id: textModel,
					object: 'model',
					created: Math.floor(Date.now() / 1000),
					owned_by: 'cloudflare',
					permission: [],
					root: textModel,
					parent: null,
				},
				{
					id: ttsModel,
					object: 'model',
					created: Math.floor(Date.now() / 1000),
					owned_by: 'cloudflare',
					permission: [],
					root: ttsModel,
					parent: null,
				},
			],
		})
	} catch (error) {
		return handleError(c, error, 'Failed to list models')
	}
})

export { models }


/**
 * Chat Completions API (OpenAI-compatible)
 * Uses Cloudflare Workers AI
 */

import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { UserProfile } from '@/api/auth'
import { handleError, RateLimitError } from '@/worker/utils/errors'
import { createLogger } from '@/shared/lib/utils'
import { DEFAULT_WORKERS_AI_TEXT_MODEL } from '@/ai/constants'
import { enforceCreditsLimit } from '../middleware/credits'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'chat' })

const chat = new Hono<{
	Bindings: Env
	Variables: {
		user: UserProfile
	}
}>()

// Apply authentication middleware
chat.use('/*', authMiddleware)

/**
 * Chat Completions API (OpenAI-compatible)
 * POST /chat/completions
 *
 * Compatible with OpenAI's Chat Completions API format
 */
chat.post('/completions', async (c) => {
	try {
		const env = c.env
		const ai = (env as any).AI as Ai

		if (!ai) {
			return c.json({ error: 'Workers AI binding is not configured' }, 500)
		}

		const body = await c.req.json()
		const {
			messages,
			model = env.WORKERS_AI_TEXT_MODEL || DEFAULT_WORKERS_AI_TEXT_MODEL,
			temperature = 0.7,
			max_tokens = 2048,
			stream = false,
			top_p,
			frequency_penalty,
			presence_penalty,
		} = body

		if (!messages || !Array.isArray(messages)) {
			return c.json({ error: 'messages is required and must be an array' }, 400)
		}

		if (stream) {
			return c.json(
				{ error: 'Streaming chat completions are not supported. Use non-streaming requests only.' },
				400,
			)
		}

		// Prepare parameters for Workers AI
		const aiParams: any = {
			messages,
			temperature,
			max_tokens,
		}

		if (top_p !== undefined) {
			aiParams.top_p = top_p
		}
		if (frequency_penalty !== undefined) {
			aiParams.frequency_penalty = frequency_penalty
		}
		if (presence_penalty !== undefined) {
			aiParams.presence_penalty = presence_penalty
		}

		// Handle non-streaming response with Credits enforcement
		const response = await ai.run(model, aiParams)

		try {
			const promptTokens = response.usage?.prompt_tokens || 0
			const completionTokens = response.usage?.completion_tokens || 0

			await enforceCreditsLimit(c, {
				type: 'llm',
				tokensIn: promptTokens,
				tokensOut: completionTokens,
			})
		} catch (error) {
			if (error instanceof RateLimitError) {
				throw error
			}
			log.error('Failed to apply Credits-based limit for chat completion', {
				error: String(error),
			})
			throw error
		}

		// Transform Workers AI response to OpenAI format
		const openaiResponse = {
			id: `chatcmpl-${Date.now()}`,
			object: 'chat.completion',
			created: Math.floor(Date.now() / 1000),
			model: model,
			choices: [
				{
					index: 0,
					message: {
						role: 'assistant',
						content: response.response || '',
					},
					finish_reason: 'stop',
				},
			],
			usage: {
				prompt_tokens: response.usage?.prompt_tokens || 0,
				completion_tokens: response.usage?.completion_tokens || 0,
				total_tokens: response.usage?.total_tokens || 0,
			},
		}

		return c.json(openaiResponse)
	} catch (error) {
		return handleError(c, error, 'Failed to generate chat completion')
	}
})

export { chat }


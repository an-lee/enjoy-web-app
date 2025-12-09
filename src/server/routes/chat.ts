/**
 * Chat Completions API (OpenAI-compatible)
 * Uses Cloudflare Workers AI
 */

import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { UserProfile } from '@/api/auth'
import { createRateLimitMiddleware } from '../middleware/rate-limit'
import type { RateLimitResult, ServiceType } from '@/server/utils/rate-limit'
import { handleError } from '@/server/utils/errors'
import { streamSSE } from 'hono/streaming'

const chat = new Hono<{
	Bindings: Env
	Variables: {
		user: UserProfile
		rateLimit: RateLimitResult
		service: ServiceType
	}
}>()

// Apply authentication and rate limiting middleware
chat.use('/*', authMiddleware)
chat.use('/completions', createRateLimitMiddleware('translation'))

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
			model = env.WORKERS_AI_TEXT_MODEL || '@cf/meta/llama-3-8b-instruct-awq',
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

		// Handle streaming response
		if (stream) {
			aiParams.stream = true
			const aiStream = await ai.run(model, aiParams)

			return streamSSE(c, async (stream) => {
				const reader = aiStream.getReader()
				const decoder = new TextDecoder()

				try {
					while (true) {
						const { done, value } = await reader.read()
						if (done) break

						const chunk = decoder.decode(value, { stream: true })
						const lines = chunk.split('\n').filter((line) => line.trim() !== '')

						for (const line of lines) {
							if (line.startsWith('data: ')) {
								const data = line.slice(6)
								if (data === '[DONE]') {
									await stream.writeSSE({ data: '[DONE]' })
									continue
								}

								try {
									const parsed = JSON.parse(data)
									// Transform Workers AI response to OpenAI format
									const openaiChunk = {
										id: `chatcmpl-${Date.now()}`,
										object: 'chat.completion.chunk',
										created: Math.floor(Date.now() / 1000),
										model: model,
										choices: [
											{
												index: 0,
												delta: {
													content: parsed.response || '',
												},
												finish_reason: null,
											},
										],
									}
									await stream.writeSSE({ data: JSON.stringify(openaiChunk) })
								} catch (e) {
									// Skip invalid JSON lines
									console.warn('Failed to parse SSE data:', data)
								}
							}
						}
					}

					// Send final [DONE] message
					await stream.writeSSE({ data: '[DONE]' })
				} catch (error) {
					console.error('Streaming error:', error)
					await stream.writeSSE({
						data: JSON.stringify({ error: 'Stream processing failed' }),
					})
				}
			})
		}

		// Handle non-streaming response
		const response = await ai.run(model, aiParams)

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


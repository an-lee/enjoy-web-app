/**
 * Audio API (OpenAI-compatible)
 * Uses Cloudflare Workers AI for TTS
 */

import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { UserProfile } from '@/api/auth'
import { createRateLimitMiddleware } from '../middleware/rate-limit'
import type { RateLimitResult, ServiceType } from '@/server/utils/rate-limit'
import { handleError } from '@/server/utils/errors'

const audio = new Hono<{
	Bindings: Env
	Variables: {
		user: UserProfile
		rateLimit: RateLimitResult
		service: ServiceType
	}
}>()

// Apply authentication and rate limiting middleware
audio.use('/*', authMiddleware)
audio.use('/speech', createRateLimitMiddleware('tts'))

/**
 * Text-to-Speech API (OpenAI-compatible)
 * POST /audio/speech
 *
 * Compatible with OpenAI's TTS API format
 */
audio.post('/speech', async (c) => {
	try {
		const env = c.env
		const ai = (env as any).AI as Ai

		if (!ai) {
			return c.json({ error: 'Workers AI binding is not configured' }, 500)
		}

		const body = await c.req.json()
		const {
			input,
			model = env.WORKERS_AI_TTS_MODEL || '@cf/myshell-ai/melotts',
			voice = 'alloy', // OpenAI voice parameter (not used by MeloTTS but kept for compatibility)
			response_format = 'mp3',
			// speed is not used by MeloTTS but kept for OpenAI API compatibility
		} = body

		if (!input) {
			return c.json({ error: 'input text is required' }, 400)
		}

		// Map OpenAI voice to language (MeloTTS uses lang parameter)
		// This is a simple mapping, you can enhance this based on your needs
		const langMap: Record<string, string> = {
			alloy: 'en',
			echo: 'en',
			fable: 'en',
			onyx: 'en',
			nova: 'en',
			shimmer: 'en',
		}

		const lang = langMap[voice] || 'en'

		// Call Workers AI TTS
		const result = await ai.run(model, {
			prompt: input,
			lang: lang,
		})

		// The result contains base64 encoded audio in result.audio
		if (!result.audio) {
			return c.json({ error: 'Failed to generate audio' }, 500)
		}

		// Convert base64 to binary
		const audioBuffer = Uint8Array.from(atob(result.audio), (c) => c.charCodeAt(0))

		// Return audio with appropriate content type
		const contentType =
			response_format === 'opus'
				? 'audio/opus'
				: response_format === 'aac'
					? 'audio/aac'
					: response_format === 'flac'
						? 'audio/flac'
						: 'audio/mpeg'

		return new Response(audioBuffer, {
			headers: {
				'Content-Type': contentType,
				'Content-Length': audioBuffer.length.toString(),
			},
		})
	} catch (error) {
		return handleError(c, error, 'Failed to generate speech')
	}
})

export { audio }


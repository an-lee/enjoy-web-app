/**
 * Translations API
 * Uses Cloudflare Workers AI m2m100-1.2b model
 */

import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { UserProfile } from '@/api/auth'
import { createRateLimitMiddleware } from '../middleware/rate-limit'
import type { RateLimitResult, ServiceType } from '@/server/utils/rate-limit'
import { handleError } from '@/server/utils/errors'

const translations = new Hono<{
	Bindings: Env
	Variables: {
		user: UserProfile
		rateLimit: RateLimitResult
		service: ServiceType
	}
}>()

// Apply authentication and rate limiting middleware
translations.use('/*', authMiddleware)
translations.use('/', createRateLimitMiddleware('translation'))

/**
 * Translation API
 * POST /translations
 *
 * Uses Cloudflare Workers AI m2m100-1.2b model for multilingual translation
 *
 * Request body:
 * - text: string (required) - Text to translate
 * - source_lang: string (optional, default: "english") - Source language
 * - target_lang: string (required) - Target language
 *
 * Response:
 * - translated_text: string - The translated text
 */
translations.post('/', async (c) => {
	try {
		const env = c.env
		const ai = (env as any).AI as Ai

		if (!ai) {
			return c.json({ error: 'Workers AI binding is not configured' }, 500)
		}

		const body = await c.req.json()
		const { text, source_lang = 'english', target_lang } = body

		if (!text) {
			return c.json({ error: 'text is required' }, 400)
		}

		if (!target_lang) {
			return c.json({ error: 'target_lang is required' }, 400)
		}

		// Call Workers AI m2m100-1.2b model
		const response = (await ai.run('@cf/meta/m2m100-1.2b', {
			text,
			source_lang,
			target_lang,
		})) as { translated_text?: string }

		if (!response.translated_text) {
			return c.json({ error: 'Translation failed' }, 500)
		}

		return c.json({
			translated_text: response.translated_text,
		})
	} catch (error) {
		return handleError(c, error, 'Failed to translate text')
	}
})

export { translations }


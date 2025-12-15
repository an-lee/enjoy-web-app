/**
 * Translations API
 * Uses Cloudflare Workers AI m2m100-1.2b model
 * Implements KV caching for translation results
 */

import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { UserProfile } from '@/api/auth'
import { createRateLimitMiddleware } from '../middleware/rate-limit'
import type { RateLimitResult, ServiceType } from '@/server/utils/rate-limit'
import { handleError } from '@/server/utils/errors'
import { createLogger } from '@/lib/utils'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'translations' })

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
 * Generate a cache key for translation request
 * Uses SHA-256 hash of text + source_lang + target_lang
 */
async function generateCacheKey(
	text: string,
	source_lang: string,
	target_lang: string
): Promise<string> {
	const input = `${text}:${source_lang}:${target_lang}`
	const encoder = new TextEncoder()
	const data = encoder.encode(input)
	const hashBuffer = await crypto.subtle.digest('SHA-256', data)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
	return `translation:${hashHex}`
}

/**
 * Get cached translation result
 */
async function getCachedTranslation(
	kv: KVNamespace | undefined,
	cacheKey: string
): Promise<string | null> {
	if (!kv) {
		return null
	}

	try {
		const cached = await kv.get(cacheKey, 'text')
		if (cached) {
			log.debug('Translation cache hit', { cacheKey })
		}
		return cached
	} catch (error) {
		log.error('Failed to get cached translation', { error, cacheKey })
		return null
	}
}

/**
 * Store translation result in cache
 * Translations are cached permanently (no expiration)
 */
async function setCachedTranslation(
	kv: KVNamespace | undefined,
	cacheKey: string,
	translatedText: string
): Promise<void> {
	if (!kv) {
		return
	}

	try {
		// Store without expiration - translations are permanent
		await kv.put(cacheKey, translatedText)
		log.debug('Translation cached', { cacheKey })
	} catch (error) {
		log.error('Failed to cache translation', { error, cacheKey })
		// Don't throw - caching failure shouldn't break the request
	}
}

/**
 * Delete cached translation result
 * Used for force refresh functionality
 */
async function deleteCachedTranslation(
	kv: KVNamespace | undefined,
	cacheKey: string
): Promise<void> {
	if (!kv) {
		return
	}

	try {
		await kv.delete(cacheKey)
		log.debug('Translation cache deleted', { cacheKey })
	} catch (error) {
		log.error('Failed to delete cached translation', { error, cacheKey })
		// Don't throw - deletion failure shouldn't break the request
	}
}

/**
 * Translation API
 * POST /translations
 *
 * Uses Cloudflare Workers AI m2m100-1.2b model for multilingual translation
 * Implements permanent KV caching for translation results
 *
 * Request body:
 * - text: string (required) - Text to translate (will be trimmed)
 * - source_lang: string (optional, default: "en") - Source language code (ISO 639-1 or BCP-47 format, e.g., "en", "zh", "zh-CN")
 * - target_lang: string (required) - Target language code (ISO 639-1 or BCP-47 format, e.g., "es", "zh", "zh-CN")
 * - force_refresh: boolean (optional, default: false) - Force regenerate translation, bypassing cache
 *
 * Note: Frontend is responsible for ensuring language codes are in the correct format.
 * The API accepts language codes as-is without normalization.
 *
 * Response:
 * - translated_text: string - The translated text
 */
translations.post('/', async (c) => {
	try {
		const env = c.env
		const ai = (env as any).AI as Ai
		const kv = (env as any).TRANSLATION_CACHE_KV as KVNamespace | undefined

		if (!ai) {
			return c.json({ error: 'Workers AI binding is not configured' }, 500)
		}

		const body = await c.req.json()
		let { text, source_lang = 'en', target_lang, force_refresh = false } = body

		// Preprocess text: trim whitespace
		if (typeof text === 'string') {
			text = text.trim()
		}

		if (!text) {
			return c.json({ error: 'text is required' }, 400)
		}

		if (!target_lang) {
			return c.json({ error: 'target_lang is required' }, 400)
		}

		// Generate cache key using language codes as provided by frontend
		const cacheKey = await generateCacheKey(text, source_lang, target_lang)

		// If force_refresh is true, delete existing cache entry
		if (force_refresh) {
			await deleteCachedTranslation(kv, cacheKey)
		}

		// Check cache first (unless force_refresh is true)
		if (!force_refresh) {
			const cachedResult = await getCachedTranslation(kv, cacheKey)
			if (cachedResult) {
				return c.json({
					translated_text: cachedResult,
				})
			}
		}

		// Cache miss - call Workers AI m2m100-1.2b model
		// Use language codes as provided by frontend (should be ISO 639-1 or BCP-47 format)
		const response = (await ai.run('@cf/meta/m2m100-1.2b', {
			text,
			source_lang,
			target_lang,
		})) as { translated_text?: string }

		if (!response.translated_text) {
			return c.json({ error: 'Translation failed' }, 500)
		}

		// Store in cache (non-blocking)
		await setCachedTranslation(kv, cacheKey, response.translated_text)

		return c.json({
			translated_text: response.translated_text,
		})
	} catch (error) {
		return handleError(c, error, 'Failed to translate text')
	}
})

export { translations }


/**
 * AI Dictionary API
 * Uses Cloudflare Workers AI text model (LLM) to generate dictionary-style entries
 */

import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { UserProfile } from '@/api/auth'
import { handleError, RateLimitError } from '@/worker/utils/errors'
import { enforceCreditsLimit } from '../middleware/credits'
import {
	generateDictionaryAIEntry,
	type DictionaryAIResult,
	type DictionaryAIUsage,
	parseDictionaryResult,
} from '@/worker/services/dictionary-ai'

const dictionary = new Hono<{
	Bindings: Env
	Variables: {
		user: UserProfile
	}
}>()

// Apply authentication middleware
dictionary.use('/*', authMiddleware)

/**
 * AI Dictionary Lookup
 * POST /dictionary/query
 *
 * Request body:
 * - word: string (required) - The word to look up
 * - source_lang: string (required) - Source language code (e.g. "en")
 * - target_lang: string (required) - Target language code (e.g. "zh")
 * - force_refresh: boolean (optional, default: false) - Force regenerate dictionary entry, bypassing cache
 *
 * Response (JSON):
 * - result: DictionaryAIResult - LLM-generated dictionary-style entry
 *
 * This endpoint is intended for rich, AI-generated dictionary explanations
 * (multi-sense, usage notes, examples, etc). For the basic, non-AI dictionary
 * service, use `/api/v1/services/dictionary/basic`.
 */
dictionary.post('/query', async (c) => {
	try {
		const env = c.env
		const ai = (env as any).AI as Ai
		const kv = (env as any).DICTIONARY_CACHE_KV as
			| KVNamespace
			| undefined

		if (!ai) {
			return c.json({ error: 'Workers AI binding is not configured' }, 500)
		}

		const body = await c.req.json()
		let { word, source_lang, target_lang, force_refresh = false } = body as {
			word?: string
			source_lang?: string
			target_lang?: string
			force_refresh?: boolean
		}

		if (typeof word === 'string') {
			word = word.trim()
		}

		if (!word) {
			return c.json({ error: 'word is required' }, 400)
		}

		if (!source_lang) {
			return c.json({ error: 'source_lang is required' }, 400)
		}

		if (!target_lang) {
			return c.json({ error: 'target_lang is required' }, 400)
		}

		// --------------------------------------------------------------------
		// Cache key: based on word + source_lang + target_lang
		// Dictionary entries are cached permanently (no expiration).
		// NOTE: We check cache BEFORE Credits, so cache hits do not consume
		// Credits. Credits are enforced only when we actually call the LLM.
		// --------------------------------------------------------------------
		const cacheKey = await (async () => {
			const input = `${word}:${source_lang}:${target_lang}`
			const encoder = new TextEncoder()
			const data = encoder.encode(input)
			const hashBuffer = await crypto.subtle.digest('SHA-256', data)
			const hashArray = Array.from(new Uint8Array(hashBuffer))
			const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
			return `dictionary:${hashHex}`
		})()

		// If force_refresh is true, delete existing cache entry
		if (force_refresh && kv) {
			try {
				await kv.delete(cacheKey)
			} catch {
				// Ignore cache deletion errors
			}
		}

		// Check cache first (unless force_refresh is true)
		if (!force_refresh && kv) {
			try {
				const cached = await kv.get(cacheKey, 'text')
				if (cached) {
					const parsed = JSON.parse(cached) as unknown
					const cachedResult = parseDictionaryResult(parsed)
					return c.json({
						result: cachedResult,
					})
				}
			} catch {
				// Ignore cache read / parse errors and fall through to regeneration
			}
		}

		const {
			result,
			usage,
		}: { result: DictionaryAIResult; usage?: DictionaryAIUsage } =
			await generateDictionaryAIEntry(ai, {
				word,
				sourceLang: source_lang,
				targetLang: target_lang,
				model: env.WORKERS_AI_TEXT_MODEL,
			})

		// Credits-based quota check AFTER LLM call, using actual usage when available.
		try {
			await enforceCreditsLimit(c, {
				type: 'llm',
				tokensIn:
					usage?.prompt_tokens != null
						? usage.prompt_tokens
						: Math.max(word.length, 16),
				tokensOut:
					usage?.completion_tokens != null
						? usage.completion_tokens
						: 512,
			})
		} catch (error) {
			if (error instanceof RateLimitError) {
				// Do not cache if Credits limit is exceeded
				throw error
			}
			// Rethrow other errors to be handled by global error handler
			throw error
		}

		// Store in cache (non-expiring) - failure should not break the request
		if (kv) {
			try {
				await kv.put(cacheKey, JSON.stringify(result))
			} catch {
				// Ignore cache write errors
			}
		}

		return c.json({
			result,
		})
	} catch (error) {
		return handleError(c, error, 'Failed to generate AI dictionary result')
	}
})

export { dictionary }




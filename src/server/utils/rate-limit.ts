/**
 * Rate limiting utility for multiple services
 * Uses Cloudflare KV to track daily usage per user per service
 */

import { createLogger } from '@/lib/utils'
import type { SubscriptionTier } from '@/api/auth'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'rate-limit' })

export type ServiceType = 'translation' | 'dictionary' | 'asr' | 'tts' | 'assessment'

export interface RateLimitResult {
	allowed: boolean
	count: number
	limit: number
	resetAt: number // Unix timestamp when the limit resets
}

export interface ServiceRateLimit {
	free: number
	pro: number
	ultra: number
}

/**
 * Rate limit configuration for each service
 * Defines daily limits for free, pro, and ultra tiers
 *
 * Cost Analysis (per unit):
 * - Translation: ~$0.000068 per request (M2M100, cost is negligible)
 * - Dictionary: ~$0.000141 per request (LLM, ~500 tokens avg)
 * - ASR: ~$0.0005 per minute (Whisper)
 * - TTS: ~$0.0001 per request (MeloTTS, ~30 seconds avg)
 * - Assessment: ~$0.0217 per minute (Azure, $1.3/hour)
 *
 * Pricing Strategy (verified against Azure official pricing):
 * - Free: Basic experience, encourages local model usage
 *   Daily cost: ~$0.04, monthly cost: ~$1.20
 * - Pro ($9.99/month): Daily usage for moderate users
 *   Daily cost (100%): ~$0.32, monthly cost: ~$9.60 (at 100% usage)
 *   Daily cost (50%): ~$0.16, monthly cost: ~$4.80 (actual usage, 50% utilization)
 *   Margin: ~43% (based on 50% actual usage rate)
 * - Ultra ($29.99/month): Heavy usage for power users
 *   Daily cost (100%): ~$0.97, monthly cost: ~$29.10 (at 100% usage)
 *   Daily cost (60%): ~$0.58, monthly cost: ~$17.40 (actual usage, 60% utilization)
 *   Margin: ~42% (based on 60% actual usage rate)
 *
 * Reference: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/
 * Key: Azure Speech to Text charges per SECOND (one-second increments), not per minute
 *
 * Note: Assessment is tracked in MINUTES, not requests.
 * Azure charges per minute of audio processed, with minimum 1 minute per request.
 */
const SERVICE_RATE_LIMITS: Record<ServiceType, ServiceRateLimit> = {
	translation: {
		// Approximate daily caps based on Credits model (see doc/pricing-strategy.md)
		// Typical unit: 300 characters / request ≈ 30 Credits
		// Free:  1,000 / 30  ≈ 33 requests / day
		// Pro:  60,000 / 30  ≈ 2,000 requests / day
		// Ultra:150,000 / 30 ≈ 5,000 requests / day
		free: 33,
		pro: 2000,
		ultra: 5000,
	},
	dictionary: {
		// Typical unit: 250 tokens in + 120 tokens out ≈ 21 Credits
		// Free:  1,000 / 21  ≈   47 requests / day
		// Pro:  60,000 / 21  ≈ 2,857 requests / day
		// Ultra:150,000 / 21 ≈ 7,142 requests / day
		free: 47,
		pro: 2857,
		ultra: 7142,
	},
	asr: {
		// Tracked in "typical minutes" of audio (≈ 80 Credits / minute)
		// Free:  1,000 / 80  ≈   12 minutes / day
		// Pro:  60,000 / 80  ≈  750 minutes / day
		// Ultra:150,000 / 80 ≈ 1,875 minutes / day
		free: 12,
		pro: 750,
		ultra: 1875,
	},
	tts: {
		// IMPORTANT: Tracked in REQUESTS (count), but cost is per CHARACTER of text
		// Azure TTS: $15.00 per 1M characters = $0.000015 per character
		// Average text length: ~150 characters per request (a sentence)
		// Cost per request: ~$0.0015 (100 chars) to $0.003 (200 chars)
		// Assumed average: 150 characters per request = $0.00225 per request
		// Reference: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/
		// Limits below are approximated from character quotas using 150 chars / request:
		// - Free:  333 chars / 150 ≈   2 requests / day
		// - Pro:  20,000 chars / 150 ≈ 133 requests / day
		// - Ultra:50,000 chars / 150 ≈ 333 requests / day
		free: 2,
		pro: 133,
		ultra: 333,
	},
	assessment: {
		// IMPORTANT: Tracked in REQUESTS (count), not minutes
		// Azure charges per second (one-second increments) for Speech to Text
		// Pronunciation Assessment is charged as standard Speech to Text
		// Each assessment typically processes 5-15 seconds of audio (average 10 seconds)
		// Cost: ~$0.00361 per request (10 seconds × $0.000361/second)
		// Reference: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/
		// In Credits model, a typical 15-second assessment costs 750 Credits:
		// Free:  1,000 / 750  ≈   1 assessment / day
		// Pro:  60,000 / 750  ≈  80 assessments / day
		// Ultra:150,000 / 750 ≈ 200 assessments / day
		free: 1,
		pro: 80,
		ultra: 200,
	},
}

/**
 * Get daily rate limit for a service based on user subscription tier
 */
export function getDailyLimit(service: ServiceType, tier: SubscriptionTier): number {
	const limits = SERVICE_RATE_LIMITS[service]
	if (!limits) {
		throw new Error(`Invalid service type: ${service}`)
	}
	const limit = limits[tier]
	if (limit === undefined) {
		throw new Error(`Invalid subscription tier: ${tier}. Expected 'free', 'pro', or 'ultra'.`)
	}
	return limit
}

/**
 * Get KV key for storing daily count
 * Format: rate-limit:{service}:{userId}:{date}
 */
function getRateLimitKey(service: ServiceType, userId: string, date: string): string {
	return `rate-limit:${service}:${userId}:${date}`
}

/**
 * Get today's date string in YYYY-MM-DD format (UTC)
 */
function getTodayDateString(): string {
	const now = new Date()
	const year = now.getUTCFullYear()
	const month = String(now.getUTCMonth() + 1).padStart(2, '0')
	const day = String(now.getUTCDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

/**
 * Get tomorrow's date string for reset time calculation
 */
function getTomorrowDateString(): string {
	const tomorrow = new Date()
	tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
	tomorrow.setUTCHours(0, 0, 0, 0)
	return tomorrow.toISOString()
}

/**
 * Check rate limit for a user and service
 * Returns whether the request is allowed and current count
 */
export async function checkRateLimit(
	service: ServiceType,
	userId: string,
	tier: SubscriptionTier,
	kv: KVNamespace | undefined
): Promise<RateLimitResult> {
	const limit = getDailyLimit(service, tier)
	const today = getTodayDateString()
	const key = getRateLimitKey(service, userId, today)

	// If KV is not available (e.g., in development), allow the request
	// In production, KV should always be available
	if (!kv) {
		log.warn(`KV namespace not available for service ${service}, rate limiting disabled`)
		return {
			allowed: true,
			count: 0,
			limit,
			resetAt: new Date(getTomorrowDateString()).getTime(),
		}
	}

	// Get current count
	const countStr = await kv.get(key, 'text')
	const count = countStr ? parseInt(countStr, 10) : 0

	// Check if limit exceeded
	const allowed = count < limit

	// Calculate reset time (midnight UTC tomorrow)
	const resetAt = new Date(getTomorrowDateString()).getTime()

	return {
		allowed,
		count,
		limit,
		resetAt,
	}
}

/**
 * Increment rate limit counter for a user and service
 *
 * `amount` represents how many "typical units" to add (see comments above for
 * each service's unit definition). For most existing call sites this will be 1.
 */
export async function incrementRateLimit(
	service: ServiceType,
	userId: string,
	kv: KVNamespace | undefined,
	amount = 1
): Promise<void> {
	if (!kv) {
		log.warn(`KV namespace not available for service ${service}, cannot increment rate limit`)
		return
	}

	const today = getTodayDateString()
	const key = getRateLimitKey(service, userId, today)

	// Get current count
	const countStr = await kv.get(key, 'text')
	const count = countStr ? parseInt(countStr, 10) : 0

	// Increment and store
	// Set expiration to 2 days to ensure cleanup (TTL in seconds)
	const expirationTtl = 2 * 24 * 60 * 60 // 2 days
	await kv.put(key, String(count + amount), {
		expirationTtl,
	})
}

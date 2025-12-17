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
 *   Daily cost: ~$0.02, monthly cost: ~$0.60
 * - Pro ($9.99/month): Daily usage for moderate users
 *   Daily cost: ~$0.15, monthly cost: ~$4.50 (at 100% usage)
 *   Assumes 50-60% actual usage, margin: ~55%
 * - Ultra ($29.99/month): Heavy usage for power users
 *   Daily cost: ~$0.45, monthly cost: ~$13.50 (at 100% usage)
 *   Assumes 50-60% actual usage, margin: ~55%
 *
 * Reference: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/
 * Key: Azure Speech to Text charges per SECOND (one-second increments), not per minute
 *
 * Note: Assessment is tracked in MINUTES, not requests.
 * Azure charges per minute of audio processed, with minimum 1 minute per request.
 */
const SERVICE_RATE_LIMITS: Record<ServiceType, ServiceRateLimit> = {
	translation: {
		// Unlimited in practice (cost is negligible ~$0.000068/request)
		// Set high limit to prevent abuse while allowing free usage
		free: 10000,   // Effectively unlimited for normal usage
		pro: 10000,    // Effectively unlimited
		ultra: 10000,  // Effectively unlimited
	},
	dictionary: {
		free: 20,      // ~$0.00282/day, encourages local usage
		pro: 200,      // ~$0.0282/day, ~$0.85/month
		ultra: 500,    // ~$0.0705/day, ~$2.12/month
	},
	asr: {
		// Tracked in minutes
		free: 10,      // 10 minutes/day, ~$0.005/day
		pro: 60,       // 60 minutes/day, ~$0.03/day, ~$0.90/month
		ultra: 180,    // 180 minutes/day, ~$0.09/day, ~$2.70/month
	},
	tts: {
		free: 10,      // ~$0.001/day
		pro: 100,      // ~$0.01/day, ~$0.30/month
		ultra: 300,    // ~$0.03/day, ~$0.90/month
	},
	assessment: {
		// IMPORTANT: Tracked in REQUESTS (count), not minutes
		// Azure charges per second (one-second increments) for Speech to Text
		// Pronunciation Assessment is charged as standard Speech to Text
		// Each assessment typically processes 5-15 seconds of audio (average 10 seconds)
		// Cost: ~$0.00361 per request (10 seconds × $0.000361/second)
		// Reference: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/
		free: 3,       // 3 requests/day (~30 seconds), ~$0.01083/day, ~$0.33/month
		pro: 20,      // 20 requests/day (~200 seconds), ~$0.0722/day, ~$2.17/month
		ultra: 60,    // 60 requests/day (~600 seconds), ~$0.2166/day, ~$6.50/month
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
 */
export async function incrementRateLimit(
	service: ServiceType,
	userId: string,
	kv: KVNamespace | undefined
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
	await kv.put(key, String(count + 1), {
		expirationTtl,
	})
}

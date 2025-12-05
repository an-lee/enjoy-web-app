/**
 * Rate limiting utility for multiple services
 * Uses Cloudflare KV to track daily usage per user per service
 */

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
}

/**
 * Rate limit configuration for each service
 * Defines daily limits for free and pro tiers
 */
const SERVICE_RATE_LIMITS: Record<ServiceType, ServiceRateLimit> = {
	translation: {
		free: 50,
		pro: 1000,
	},
	dictionary: {
		free: 100,
		pro: 5000,
	},
	asr: {
		free: 20,
		pro: 500,
	},
	tts: {
		free: 30,
		pro: 1000,
	},
	assessment: {
		free: 5,
		pro: 100,
	},
}

/**
 * Get daily rate limit for a service based on user subscription tier
 */
export function getDailyLimit(service: ServiceType, tier: 'free' | 'pro'): number {
	const limits = SERVICE_RATE_LIMITS[service]
	if (!limits) {
		throw new Error(`Invalid service type: ${service}`)
	}
	const limit = limits[tier]
	if (limit === undefined) {
		throw new Error(`Invalid subscription tier: ${tier}. Expected 'free' or 'pro'.`)
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
	tier: 'free' | 'pro',
	kv: KVNamespace | undefined
): Promise<RateLimitResult> {
	const limit = getDailyLimit(service, tier)
	const today = getTodayDateString()
	const key = getRateLimitKey(service, userId, today)

	// If KV is not available (e.g., in development), allow the request
	// In production, KV should always be available
	if (!kv) {
		console.warn(`KV namespace not available for service ${service}, rate limiting disabled`)
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
		console.warn(`KV namespace not available for service ${service}, cannot increment rate limit`)
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

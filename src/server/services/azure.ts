/**
 * Azure Speech Service
 */

import { incrementRateLimit } from '../utils/rate-limit'
import { ConfigurationError, ServiceError } from '../utils/errors'
import type { UserProfile } from '@/api/auth'
import { createLogger } from '@/lib/utils'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'azure' })

export interface AzureTokenResponse {
	token: string
	region: string
	expiresIn: number
	rateLimit: {
		count: number
		limit: number
		resetAt: string
	}
}

export interface AzureConfig {
	subscriptionKey: string
	region: string
}

/**
 * Get Azure configuration from environment
 */
export function getAzureConfig(env: Env): AzureConfig {
	const subscriptionKey =
		(env as any).AZURE_SPEECH_SUBSCRIPTION_KEY ||
		(env as any).AZURE_SPEECH_SUBSCRIPTION_KEY_SECRET

	const region =
		(env as any).AZURE_SPEECH_REGION || (env as any).AZURE_SPEECH_SERVICE_REGION

	if (!subscriptionKey) {
		throw new ConfigurationError('Azure Speech subscription key is not configured')
	}

	if (!region) {
		throw new ConfigurationError('Azure Speech region is not configured')
	}

	return { subscriptionKey, region }
}

/**
 * Estimated usage per token (requests) based on tier
 * This is used to estimate actual Azure usage for cost tracking
 */
const ESTIMATED_USAGE_PER_TOKEN: Record<string, number> = {
	free: 5,   // Free tier: ~5 requests per token (10 minutes)
	pro: 10,  // Pro tier: ~10 requests per token
	ultra: 15, // Ultra tier: ~15 requests per token
}

/**
 * Get hourly rate limit key for token requests
 */
function getHourlyTokenKey(userId: string, date: string, hour: number): string {
	return `token-limit:hourly:${userId}:${date}:${hour}`
}

/**
 * Check hourly token rate limit
 */
async function checkHourlyTokenLimit(
	userId: string,
	tier: string,
	kv: KVNamespace | undefined
): Promise<{ allowed: boolean; count: number; limit: number }> {
	if (!kv) {
		return { allowed: true, count: 0, limit: Infinity }
	}

	const today = new Date().toISOString().split('T')[0]
	const hour = new Date().getUTCHours()

	// Hourly limits based on tier
	const hourlyLimits: Record<string, number> = {
		free: 1,   // Free: 1 token per hour
		pro: 3,    // Pro: 3 tokens per hour
		ultra: 6,  // Ultra: 6 tokens per hour
	}

	const limit = hourlyLimits[tier] || 1
	const key = getHourlyTokenKey(userId, today, hour)
	const countStr = await kv.get(key, 'text')
	const count = countStr ? parseInt(countStr, 10) : 0

	return {
		allowed: count < limit,
		count,
		limit,
	}
}

/**
 * Increment hourly token counter
 */
async function incrementHourlyTokenLimit(
	userId: string,
	kv: KVNamespace | undefined
): Promise<void> {
	if (!kv) return

	const today = new Date().toISOString().split('T')[0]
	const hour = new Date().getUTCHours()
	const key = getHourlyTokenKey(userId, today, hour)

	const countStr = await kv.get(key, 'text')
	const count = countStr ? parseInt(countStr, 10) : 0

	// Expire at end of hour (max 2 hours to ensure cleanup)
	const expirationTtl = 2 * 60 * 60 // 2 hours
	await kv.put(key, String(count + 1), { expirationTtl })
}

/**
 * Record estimated usage for cost tracking
 */
async function recordEstimatedUsage(
	userId: string,
	tier: string,
	kv: KVNamespace | undefined
): Promise<void> {
	if (!kv) return

	const today = new Date().toISOString().split('T')[0]
	const usageKey = `azure-usage:${userId}:${today}`
	const usageStr = await kv.get(usageKey, 'text')
	const usage = usageStr ? JSON.parse(usageStr) : { tokens: 0, estimatedUsage: 0 }

	const estimatedPerToken = ESTIMATED_USAGE_PER_TOKEN[tier] || 5
	usage.tokens = (usage.tokens || 0) + 1
	usage.estimatedUsage = (usage.estimatedUsage || 0) + estimatedPerToken
	usage.lastTokenTime = Date.now()

	// Expire after 2 days
	const expirationTtl = 2 * 24 * 60 * 60
	await kv.put(usageKey, JSON.stringify(usage), { expirationTtl })

	// Log warning if usage is high
	if (usage.tokens > 50) {
		log.warn('High Azure token usage detected', {
			userId,
			tier,
			tokens: usage.tokens,
			estimatedUsage: usage.estimatedUsage,
		})
	}
}

/**
 * Generate Azure Speech token
 * Includes rate limiting and usage tracking
 */
export async function generateAzureToken(
	config: AzureConfig,
	user: UserProfile,
	kv: KVNamespace | undefined,
	rateLimit: { count: number; limit: number; resetAt: number }
): Promise<AzureTokenResponse> {
	// Check hourly limit
	const hourlyLimit = await checkHourlyTokenLimit(user.id, user.subscriptionTier, kv)
	if (!hourlyLimit.allowed) {
		throw new ServiceError(
			`Hourly token limit exceeded. You can request ${hourlyLimit.limit} token(s) per hour. Please try again later.`,
			429
		)
	}

	const azureUrl = `https://${config.region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`

	const response = await fetch(azureUrl, {
		method: 'POST',
		headers: {
			'Ocp-Apim-Subscription-Key': config.subscriptionKey,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	})

	if (!response.ok) {
		const errorText = await response.text()
		log.error('Azure Speech token generation failed:', {
			status: response.status,
			statusText: response.statusText,
			error: errorText,
		})
		throw new ServiceError(
			`Failed to generate Azure Speech token: ${response.statusText}`,
			response.status
		)
	}

	const token = await response.text()

	// Increment daily rate limit counter (using assessment service type for Azure tokens)
	await incrementRateLimit('assessment', user.id, kv)

	// Increment hourly token limit
	await incrementHourlyTokenLimit(user.id, kv)

	// Record estimated usage for cost tracking
	await recordEstimatedUsage(user.id, user.subscriptionTier, kv)

	return {
		token,
		region: config.region,
		expiresIn: 600, // Azure tokens typically expire in 10 minutes
		rateLimit: {
			count: rateLimit.count + 1,
			limit: rateLimit.limit,
			resetAt: new Date(rateLimit.resetAt).toISOString(),
		},
	}
}


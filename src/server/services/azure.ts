/**
 * Azure Speech Service
 */

import { checkAndDeductCredits, calculateCredits } from '../utils/credits'
import { ConfigurationError, ServiceError, RateLimitError } from '../utils/errors'
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
 * Estimated usage factors based on real usage metrics.
 * These are used to estimate actual Azure usage for cost tracking.
 *
 * TTS: cost is per character
 * Assessment: cost is per second of audio
 *
 * The actual usage per request will be provided by the client.
 */
const TTS_COST_PER_CHARACTER = 0.000015 // $15 per 1M characters
const ASSESSMENT_COST_PER_SECOND = 0.000361 // Approximate cost per second

type AzureTokenUsagePurpose = 'tts' | 'assessment'

export interface AzureTokenUsagePayload {
	purpose: AzureTokenUsagePurpose
	tts?: {
		textLength: number // number of characters in the text
	}
	assessment?: {
		durationSeconds: number // duration of audio in seconds
	}
}

/**
 * Azure token cache entry
 */
interface AzureTokenCacheEntry {
	token: string
	region: string
	expiresAt: number // Unix timestamp (ms) when the token is considered expired
}

/**
 * Get KV key for caching Azure tokens per user
 */
function getAzureTokenCacheKey(userId: string): string {
	return `azure-token:${userId}`
}

// Note: Hourly token limits were removed in favor of daily limits only.

/**
 * Record estimated usage for cost tracking
 */
async function recordEstimatedUsage(
	userId: string,
	tier: string,
	kv: KVNamespace | undefined,
	usagePayload?: AzureTokenUsagePayload
): Promise<void> {
	if (!kv) return

	const today = new Date().toISOString().split('T')[0]
	const usageKey = `azure-usage:${userId}:${today}`
	const usageStr = await kv.get(usageKey, 'text')
	const usage =
		usageStr || '{}'
			? {
					tokens: 0,
					estimatedUsage: 0,
					ttsCharacters: 0,
					assessmentSeconds: 0,
					...(usageStr ? JSON.parse(usageStr) : {}),
			  }
			: {
					tokens: 0,
					estimatedUsage: 0,
					ttsCharacters: 0,
					assessmentSeconds: 0,
			  }

	usage.tokens = (usage.tokens || 0) + 1

	// Estimate usage based on payload
	if (usagePayload?.purpose === 'tts' && usagePayload.tts) {
		const textLength = Math.max(usagePayload.tts.textLength, 0)
		usage.ttsCharacters = (usage.ttsCharacters || 0) + textLength
		usage.estimatedUsage =
			(usage.estimatedUsage || 0) + textLength * TTS_COST_PER_CHARACTER
	} else if (usagePayload?.purpose === 'assessment' && usagePayload.assessment) {
		const durationSeconds = Math.max(usagePayload.assessment.durationSeconds, 0)
		usage.assessmentSeconds = (usage.assessmentSeconds || 0) + durationSeconds
		usage.estimatedUsage =
			(usage.estimatedUsage || 0) + durationSeconds * ASSESSMENT_COST_PER_SECOND
	}

	usage.lastTokenTime = Date.now()

	// Expire after 2 days
	const expirationTtl = 2 * 24 * 60 * 60
	await kv.put(usageKey, JSON.stringify(usage), { expirationTtl })

	// Log warning if estimated cost is high (thresholds by tier, in USD per day)
	const costWarningThresholds: Record<string, number> = {
		free: 0.3, // Free: very small daily budget
		pro: 6.0, // Pro: around expected monthly cost / 30
		ultra: 18.0, // Ultra: higher budget for heavy users
	}

	const threshold =
		costWarningThresholds[tier] ?? costWarningThresholds.free

	if ((usage.estimatedUsage || 0) > threshold) {
		log.warn('High Azure token cost detected', {
			userId,
			tier,
			tokens: usage.tokens,
			estimatedUsage: usage.estimatedUsage,
			threshold,
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
	usagePayload?: AzureTokenUsagePayload
): Promise<AzureTokenResponse> {
	// ------------------------------------------------------------------------
	// Credits-based daily quota check
	// ------------------------------------------------------------------------
	try {
		let requiredCredits = 0

		if (usagePayload?.purpose === 'tts' && usagePayload.tts) {
			requiredCredits = calculateCredits({
				type: 'tts',
				chars: usagePayload.tts.textLength,
			})
		} else if (usagePayload?.purpose === 'assessment' && usagePayload.assessment) {
			requiredCredits = calculateCredits({
				type: 'assessment',
				seconds: usagePayload.assessment.durationSeconds,
			})
		}

		// If we could not infer usage (missing payload), fall back to a minimal
		// but non-zero charge to avoid completely free usage.
		if (!requiredCredits && usagePayload) {
			requiredCredits = 1
		}

		if (requiredCredits > 0) {
			const creditsResult = await checkAndDeductCredits(
				user.id,
				user.subscriptionTier,
				requiredCredits,
				kv
			)

			if (!creditsResult.allowed) {
				throw new RateLimitError(
					'Daily Credits limit reached',
					'credits',
					creditsResult.limit,
					creditsResult.used,
					creditsResult.resetAt
				)
			}
		}
	} catch (error) {
		// Any unexpected error in Credits calculation should not expose internals
		// but should still block the request safely.
		if (error instanceof RateLimitError) {
			throw error
		}

		log.error('Failed to apply Credits-based limit for Azure token', {
			userId: user.id,
			error: String(error),
		})
		throw new ServiceError('Failed to apply Credits-based limit')
	}

	// Try to reuse cached token first (still counts against rate limits per request)
	let token: string | null = null

	if (kv) {
		const cacheKey = getAzureTokenCacheKey(user.id)
		const cachedStr = await kv.get(cacheKey, 'text')
		if (cachedStr) {
			try {
				const cached = JSON.parse(cachedStr) as AzureTokenCacheEntry

				// Consider token valid if:
				// - It matches the current region
				// - It has not expired (with a safety buffer)
				const safetyBufferMs = 60 * 1000 // 60 seconds
				if (
					cached.token &&
					cached.region === config.region &&
					cached.expiresAt > Date.now() + safetyBufferMs
				) {
					token = cached.token
				}
			} catch (error) {
				log.warn('Failed to parse Azure token cache entry', {
					userId: user.id,
					error: String(error),
				})
			}
		}
	}

	// If no valid cached token, request a new one from Azure and update cache
	if (!token) {
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

		token = await response.text()

		// Cache the token for reuse within its lifetime
		if (kv) {
			const cacheKey = getAzureTokenCacheKey(user.id)
			const expiresInSeconds = 600 // 10 minutes (Azure default)
			const safetySeconds = 90 // Shorter TTL for safety (token will expire earlier on our side)
			const ttlSeconds = Math.max(expiresInSeconds - safetySeconds, 60) // At least 60s
			const expiresAt = Date.now() + ttlSeconds * 1000

			const cacheEntry: AzureTokenCacheEntry = {
				token,
				region: config.region,
				expiresAt,
			}

			await kv.put(cacheKey, JSON.stringify(cacheEntry), {
				expirationTtl: ttlSeconds,
			})
		}
	}

	// Record estimated usage for cost tracking
	await recordEstimatedUsage(user.id, user.subscriptionTier, kv, usagePayload)

	return {
		token,
		region: config.region,
		expiresIn: 600, // Azure tokens typically expire in 10 minutes
	}
}


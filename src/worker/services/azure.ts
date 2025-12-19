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

/**
 * Generate Azure Speech token
 * Includes rate limiting and usage tracking
 */
export async function generateAzureToken(
	config: AzureConfig,
	user: UserProfile,
	kv: KVNamespace | undefined,
	usage: AzureTokenUsagePayload
): Promise<AzureTokenResponse> {

	// ------------------------------------------------------------------------
	// Credits-based daily quota check
	// ------------------------------------------------------------------------
	try {
		let requiredCredits = 0

		if (usage.purpose === 'tts' && usage.tts) {
			requiredCredits = calculateCredits({
				type: 'tts',
				chars: usage.tts.textLength,
			})
		} else if (usage.purpose === 'assessment' && usage.assessment) {
			requiredCredits = calculateCredits({
				type: 'assessment',
				seconds: usage.assessment.durationSeconds,
			})
		} else {
			throw new ServiceError('Invalid Azure usage payload')
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
					creditsResult.resetAt,
					'user_daily'
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

	return {
		token,
		region: config.region,
		expiresIn: 600, // Azure tokens typically expire in 10 minutes
	}
}


/**
 * Azure Speech Service
 */

import { checkAndDeductCredits, calculateCredits, getDailyCreditsLimit, getTodayDateString } from '../utils/credits'
import { ConfigurationError, ServiceError, RateLimitError } from '../utils/errors'
import type { UserProfile } from '../middleware/auth'
import { createLogger } from '@/shared/lib/utils'
import { recordCreditsAuditLog } from '../middleware/credits'
import type { CreditCalculationInput } from '../utils/credits'

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
	usage: AzureTokenUsagePayload,
	env?: Env
): Promise<AzureTokenResponse> {

	// ------------------------------------------------------------------------
	// Credits-based daily quota check
	// ------------------------------------------------------------------------
	let creditsInput: CreditCalculationInput | null = null
	let requiredCredits = 0
	let creditsResult: Awaited<ReturnType<typeof checkAndDeductCredits>> | null = null

	try {
		if (usage.purpose === 'tts' && usage.tts) {
			creditsInput = {
				type: 'tts',
				chars: usage.tts.textLength,
			}
			requiredCredits = calculateCredits(creditsInput)
		} else if (usage.purpose === 'assessment' && usage.assessment) {
			creditsInput = {
				type: 'assessment',
				seconds: usage.assessment.durationSeconds,
			}
			requiredCredits = calculateCredits(creditsInput)
		} else {
			throw new ServiceError('Invalid Azure usage payload')
		}

		if (requiredCredits > 0) {
			creditsResult = await checkAndDeductCredits(
				user.id,
				user.subscriptionTier,
				requiredCredits,
				kv
			)

			if (!creditsResult.allowed) {
				// Record audit log before throwing error
				if (creditsInput && env && creditsResult) {
					await recordCreditsAuditLog(env, user, creditsInput, creditsResult, requiredCredits).catch(
						(auditError) => {
							log.warn('Failed to record credits audit log for rejected Azure token request', {
								userId: user.id,
								error: String(auditError),
							})
						}
					)
				}

				throw new RateLimitError(
					'Daily Credits limit reached',
					'credits',
					creditsResult.limit,
					creditsResult.used,
					creditsResult.resetAt,
					'user_daily'
				)
			}
		} else if (requiredCredits <= 0 && creditsInput && env) {
			// Record audit log even for 0-credit operations (for audit trail)
			// Get current usage from KV if available
			let used = 0
			const limit = getDailyCreditsLimit(user.subscriptionTier)

			try {
				if (kv) {
					const today = getTodayDateString()
					const key = `credits:${user.id}:${today}`
					const stored = await kv.get(key, 'text')
					used = stored ? parseInt(stored, 10) || 0 : 0
				}
			} catch (error) {
				// Ignore errors when getting usage for 0-credit operations
			}

			// Calculate resetAt (next UTC midnight)
			const tomorrow = new Date()
			tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
			tomorrow.setUTCHours(0, 0, 0, 0)
			const resetAt = tomorrow.getTime()

			const mockResult = {
				allowed: true,
				used,
				limit,
				required: 0,
				resetAt,
			} as Awaited<ReturnType<typeof checkAndDeductCredits>>

			await recordCreditsAuditLog(env, user, creditsInput, mockResult, requiredCredits).catch(
				(auditError) => {
					log.warn('Failed to record credits audit log for 0-credit Azure token operation', {
						userId: user.id,
						error: String(auditError),
					})
				}
			)
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

	// Record audit log for successful credits check
	if (creditsInput && env && creditsResult) {
		await recordCreditsAuditLog(env, user, creditsInput, creditsResult, requiredCredits).catch(
			(auditError) => {
				log.warn('Failed to record credits audit log for Azure token', {
					userId: user.id,
					error: String(auditError),
				})
			}
		)
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


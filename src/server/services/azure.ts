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
 * Generate Azure Speech token
 */
export async function generateAzureToken(
	config: AzureConfig,
	user: UserProfile,
	kv: KVNamespace | undefined,
	rateLimit: { count: number; limit: number; resetAt: number }
): Promise<AzureTokenResponse> {
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

	// Increment rate limit counter (using assessment service type for Azure tokens)
	await incrementRateLimit('assessment', user.id, kv)

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


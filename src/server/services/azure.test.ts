import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateAzureToken, type AzureConfig, type AzureTokenUsagePayload } from './azure'
import { RateLimitError, ServiceError } from '../utils/errors'

import {
	calculateCredits,
	checkAndDeductCredits,
	type CreditsCheckResult,
} from '../utils/credits'

vi.mock('../utils/credits', () => {
	return {
		calculateCredits: vi.fn(),
		checkAndDeductCredits: vi.fn(),
	}
})

describe('generateAzureToken - Credits integration', () => {
	const mockConfig: AzureConfig = {
		subscriptionKey: 'test-key',
		region: 'eastus',
	}

	const mockUser = {
		id: 'user-1',
		subscriptionTier: 'free',
	} as any

	const kv = undefined as any as KVNamespace | undefined

	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2025-01-01T10:00:00Z'))

		globalThis.fetch = vi.fn(async () => {
			return {
				ok: true,
				status: 200,
				statusText: 'OK',
				text: async () => 'mock-token',
			} as any
		})

		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('should calculate credits for TTS usage payload and deduct credits', async () => {
		;(calculateCredits as any).mockReturnValueOnce(123)
		;(checkAndDeductCredits as any).mockResolvedValueOnce({
			allowed: true,
			used: 123,
			limit: 1_000,
			required: 123,
			resetAt: Date.now(),
		} satisfies CreditsCheckResult)

		const usagePayload: AzureTokenUsagePayload = {
			purpose: 'tts',
			tts: {
				textLength: 50,
			},
		}

		const result = await generateAzureToken(mockConfig, mockUser, kv, usagePayload)

		expect(calculateCredits).toHaveBeenCalledWith({
			type: 'tts',
			chars: 50,
		})

		expect(checkAndDeductCredits).toHaveBeenCalledWith(
			mockUser.id,
			mockUser.subscriptionTier,
			123,
			kv
		)

		// Should still return a valid token response
		expect(result.token).toBe('mock-token')
		expect(result.region).toBe(mockConfig.region)
	})

	it('should calculate credits for Assessment usage payload and deduct credits', async () => {
		;(calculateCredits as any).mockReturnValueOnce(750)
		;(checkAndDeductCredits as any).mockResolvedValueOnce({
			allowed: true,
			used: 750,
			limit: 1_000,
			required: 750,
			resetAt: Date.now(),
		} satisfies CreditsCheckResult)

		const usagePayload: AzureTokenUsagePayload = {
			purpose: 'assessment',
			assessment: {
				durationSeconds: 15,
			},
		}

		await generateAzureToken(mockConfig, mockUser, kv, usagePayload)

		expect(calculateCredits).toHaveBeenCalledWith({
			type: 'assessment',
			seconds: 15,
		})
		expect(checkAndDeductCredits).toHaveBeenCalled()
	})

	it('should throw RateLimitError when credits limit is reached', async () => {
		;(calculateCredits as any).mockReturnValueOnce(200)
		;(checkAndDeductCredits as any).mockResolvedValueOnce({
			allowed: false,
			used: 1_000,
			limit: 1_000,
			required: 200,
			resetAt: Date.now(),
		} satisfies CreditsCheckResult)

		const usagePayload: AzureTokenUsagePayload = {
			purpose: 'assessment',
			assessment: {
				durationSeconds: 5,
			},
		}

		await expect(
			generateAzureToken(mockConfig, mockUser, kv, usagePayload)
		).rejects.toBeInstanceOf(RateLimitError)
	})

	it('should throw ServiceError when usagePayload is invalid', async () => {
		// This payload is missing the required fields for its purpose
		const invalidPayload = {
			purpose: 'tts',
		} as any as AzureTokenUsagePayload

		await expect(
			generateAzureToken(mockConfig, mockUser, kv, invalidPayload)
		).rejects.toBeInstanceOf(ServiceError)

		await expect(
			generateAzureToken(mockConfig, mockUser, kv, invalidPayload)
		).rejects.toHaveProperty('message', 'Failed to apply Credits-based limit')
	})
})



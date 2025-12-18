import { describe, it, expect, vi, beforeEach } from 'vitest'
import { enforceCreditsLimit } from './credits'
import { RateLimitError } from '@/server/utils/errors'
import {
	calculateCredits,
	checkAndDeductCredits,
	type CreditsCheckResult,
} from '@/server/utils/credits'

vi.mock('@/server/utils/credits', () => {
	return {
		calculateCredits: vi.fn(() => 42),
		checkAndDeductCredits: vi.fn(async () => {
			const result: CreditsCheckResult = {
				allowed: true,
				used: 42,
				limit: 1_000,
				required: 42,
				resetAt: 1_736_068_800_000, // arbitrary timestamp
			}
			return result
		}),
	}
})

describe('credits middleware - enforceCreditsLimit', () => {
	const mockUser = {
		id: 'user-1',
		subscriptionTier: 'free',
	} as any

	const mockKv = {} as any

	function createMockContext() {
		return {
			env: {
				RATE_LIMIT_KV: mockKv,
			},
			get: (key: string) => {
				if (key === 'user') return mockUser
				return undefined
			},
		} as any
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should calculate and deduct credits successfully', async () => {
		const c = createMockContext()

		await expect(
			enforceCreditsLimit(c, {
				type: 'translation',
				chars: 100,
			})
		).resolves.toBeUndefined()

		expect(calculateCredits).toHaveBeenCalledTimes(1)
		expect(checkAndDeductCredits).toHaveBeenCalledTimes(1)

		const [, , requiredCredits, kvArg] = (checkAndDeductCredits as any).mock.calls[0]
		expect(requiredCredits).toBe(42)
		expect(kvArg).toBe(mockKv)
	})

	it('should throw RateLimitError when credits are exhausted', async () => {
		;(checkAndDeductCredits as any).mockResolvedValueOnce({
			allowed: false,
			used: 1_000,
			limit: 1_000,
			required: 42,
			resetAt: 1_736_068_800_000,
		} satisfies CreditsCheckResult)

		const c = createMockContext()

		await expect(
			enforceCreditsLimit(c, {
				type: 'translation',
				chars: 100,
			})
		).rejects.toBeInstanceOf(RateLimitError)
	})

	it('should rethrow unexpected errors from checkAndDeductCredits', async () => {
		const unexpected = new Error('Unexpected')
		;(checkAndDeductCredits as any).mockRejectedValueOnce(unexpected)

		const c = createMockContext()

		await expect(
			enforceCreditsLimit(c, {
				type: 'translation',
				chars: 100,
			})
		).rejects.toBe(unexpected)
	})
})



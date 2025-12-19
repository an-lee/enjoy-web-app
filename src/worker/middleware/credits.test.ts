import { describe, it, expect, vi, beforeEach } from 'vitest'
import { enforceCreditsLimit } from './credits'
import { RateLimitError } from '@/worker/utils/errors'
import {
	calculateCredits,
	checkAndDeductCredits,
	type CreditsCheckResult,
} from '@/worker/utils/credits'

const mockInsertCreditsUsageLog = vi.fn()
const mockGetD1Db = vi.fn()

vi.mock('@/worker/utils/credits', () => {
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
		getTodayDateString: vi.fn(() => '2025-01-01'),
	}
})

vi.mock('@/worker/db/client', () => ({
	getD1Db: (...args: unknown[]) => mockGetD1Db(...args),
}))

vi.mock('@/worker/db/credits-usage-logs-repository', () => ({
	insertCreditsUsageLog: (...args: unknown[]) => mockInsertCreditsUsageLog(...args),
}))

// Mock crypto.randomUUID
const mockRandomUUID = vi.fn(() => 'test-uuid-123')
Object.defineProperty(global, 'crypto', {
	value: {
		...global.crypto,
		randomUUID: mockRandomUUID,
	},
	writable: true,
	configurable: true,
})

describe('credits middleware - enforceCreditsLimit', () => {
	const mockUser = {
		id: 'user-1',
		subscriptionTier: 'free',
	} as any

	const mockKv = {} as any
	const mockDb = {} as any

	function createMockContext(includeDb = true) {
		return {
			env: {
				RATE_LIMIT_KV: mockKv,
				...(includeDb && { DB: {} as any }),
			},
			get: (key: string) => {
				if (key === 'user') return mockUser
				return undefined
			},
		} as any
	}

	beforeEach(() => {
		vi.clearAllMocks()
		mockGetD1Db.mockReturnValue(mockDb)
		mockInsertCreditsUsageLog.mockResolvedValue(undefined)
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

	it('should record audit log for successful credits check', async () => {
		const c = createMockContext()

		await enforceCreditsLimit(c, {
			type: 'translation',
			chars: 100,
		})

		expect(mockGetD1Db).toHaveBeenCalledWith(c.env)
		expect(mockInsertCreditsUsageLog).toHaveBeenCalledTimes(1)

		const [db, logEntry] = mockInsertCreditsUsageLog.mock.calls[0]
		expect(db).toBe(mockDb)
		expect(logEntry).toMatchObject({
			userId: 'user-1',
			date: '2025-01-01',
			serviceType: 'translation',
			tier: 'free',
			required: 42,
			usedBefore: 0,
			usedAfter: 42,
			allowed: true,
			meta: { chars: 100 },
		})
		expect(logEntry.id).toBe('test-uuid-123')
		expect(typeof logEntry.timestamp).toBe('number')
	})

	it('should record audit log even when request is rejected', async () => {
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

		// Should still record audit log for rejected request
		expect(mockGetD1Db).toHaveBeenCalled()
		expect(mockInsertCreditsUsageLog).toHaveBeenCalledTimes(1)

		const [, logEntry] = mockInsertCreditsUsageLog.mock.calls[0]
		expect(logEntry).toMatchObject({
			allowed: false,
			usedBefore: 1_000,
			usedAfter: 1_000,
		})
	})

	it('should skip audit log when D1 is not available', async () => {
		const c = createMockContext(false) // No DB in env

		await enforceCreditsLimit(c, {
			type: 'translation',
			chars: 100,
		})

		expect(mockGetD1Db).not.toHaveBeenCalled()
		expect(mockInsertCreditsUsageLog).not.toHaveBeenCalled()
	})

	it('should not fail request when audit log recording fails', async () => {
		const c = createMockContext()
		mockInsertCreditsUsageLog.mockRejectedValueOnce(new Error('DB error'))

		// Should not throw, just log warning
		await expect(
			enforceCreditsLimit(c, {
				type: 'translation',
				chars: 100,
			})
		).resolves.toBeUndefined()

		expect(mockGetD1Db).toHaveBeenCalled()
		expect(mockInsertCreditsUsageLog).toHaveBeenCalled()
	})

	it('should record correct metadata for TTS service', async () => {
		const c = createMockContext()

		await enforceCreditsLimit(c, {
			type: 'tts',
			chars: 500,
		})

		const [, logEntry] = mockInsertCreditsUsageLog.mock.calls[0]
		expect(logEntry).toMatchObject({
			serviceType: 'tts',
			meta: { chars: 500 },
		})
	})

	it('should record correct metadata for ASR service', async () => {
		const c = createMockContext()

		await enforceCreditsLimit(c, {
			type: 'asr',
			seconds: 30,
		})

		const [, logEntry] = mockInsertCreditsUsageLog.mock.calls[0]
		expect(logEntry).toMatchObject({
			serviceType: 'asr',
			meta: { seconds: 30 },
		})
	})

	it('should record correct metadata for Assessment service', async () => {
		const c = createMockContext()

		await enforceCreditsLimit(c, {
			type: 'assessment',
			seconds: 15,
		})

		const [, logEntry] = mockInsertCreditsUsageLog.mock.calls[0]
		expect(logEntry).toMatchObject({
			serviceType: 'assessment',
			meta: { seconds: 15 },
		})
	})

	it('should record correct metadata for LLM service with model', async () => {
		const c = createMockContext()

		await enforceCreditsLimit(c, {
			type: 'llm',
			tokensIn: 100,
			tokensOut: 50,
			model: '@cf/meta/llama-3.1-8b-instruct-fast',
		})

		const [, logEntry] = mockInsertCreditsUsageLog.mock.calls[0]
		expect(logEntry).toMatchObject({
			serviceType: 'llm',
			meta: {
				tokensIn: 100,
				tokensOut: 50,
				model: '@cf/meta/llama-3.1-8b-instruct-fast',
			},
		})
	})

	it('should record correct metadata for LLM service without model', async () => {
		const c = createMockContext()

		await enforceCreditsLimit(c, {
			type: 'llm',
			tokensIn: 100,
			tokensOut: 50,
		})

		const [, logEntry] = mockInsertCreditsUsageLog.mock.calls[0]
		expect(logEntry).toMatchObject({
			serviceType: 'llm',
			meta: {
				tokensIn: 100,
				tokensOut: 50,
			},
		})
		expect(logEntry.meta).not.toHaveProperty('model')
	})

	it('should calculate usedBefore and usedAfter correctly for allowed request', async () => {
		;(checkAndDeductCredits as any).mockResolvedValueOnce({
			allowed: true,
			used: 100, // used after deduction
			limit: 1_000,
			required: 42,
			resetAt: 1_736_068_800_000,
		} satisfies CreditsCheckResult)

		const c = createMockContext()

		await enforceCreditsLimit(c, {
			type: 'translation',
			chars: 100,
		})

		const [, logEntry] = mockInsertCreditsUsageLog.mock.calls[0]
		expect(logEntry.usedBefore).toBe(58) // 100 - 42
		expect(logEntry.usedAfter).toBe(100)
	})

	it('should calculate usedBefore and usedAfter correctly for rejected request', async () => {
		;(checkAndDeductCredits as any).mockResolvedValueOnce({
			allowed: false,
			used: 950, // used before (no deduction happened)
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

		const [, logEntry] = mockInsertCreditsUsageLog.mock.calls[0]
		expect(logEntry.usedBefore).toBe(950) // No deduction, so usedBefore = used
		expect(logEntry.usedAfter).toBe(950)
	})

	it('should skip audit log when requiredCredits is 0', async () => {
		;(calculateCredits as any).mockReturnValueOnce(0)

		const c = createMockContext()

		await enforceCreditsLimit(c, {
			type: 'translation',
			chars: 0,
		})

		expect(checkAndDeductCredits).not.toHaveBeenCalled()
		expect(mockGetD1Db).not.toHaveBeenCalled()
	})
})



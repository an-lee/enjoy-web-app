import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
	getDailyCreditsLimit,
	calculateCredits,
	checkAndDeductCredits,
	type CreditsCheckResult,
} from './credits'

describe('credits utils', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2025-01-01T10:00:00Z'))
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('should return correct daily credits limit per tier', () => {
		expect(getDailyCreditsLimit('free')).toBe(1_000)
		expect(getDailyCreditsLimit('pro')).toBe(60_000)
		expect(getDailyCreditsLimit('ultra')).toBe(150_000)
	})

	it('should calculate TTS credits based on characters', () => {
		expect(
			calculateCredits({
				type: 'tts',
				chars: 0,
			})
		).toBe(0)

		expect(
			calculateCredits({
				type: 'tts',
				chars: 10,
			})
		).toBe(30)
	})

	it('should calculate Assessment credits based on seconds', () => {
		expect(
			calculateCredits({
				type: 'assessment',
				seconds: 15,
			})
		).toBe(750)
	})

	it('should calculate ASR credits based on seconds (per minute pricing)', () => {
		// 60 seconds → 1 minute → 80 credits
		expect(
			calculateCredits({
				type: 'asr',
				seconds: 60,
			})
		).toBe(80)

		// 30 seconds → half a minute → 40 credits
		expect(
			calculateCredits({
				type: 'asr',
				seconds: 30,
			})
		).toBe(40)
	})

	it('should calculate Translation credits based on characters', () => {
		// 300 chars → 1 block of 1,000 → 15 + 15 = 30
		expect(
			calculateCredits({
				type: 'translation',
				chars: 300,
			})
		).toBe(30)

		// 2,000 chars → 2 blocks of 1,000 → 15 + 30 = 45
		expect(
			calculateCredits({
				type: 'translation',
				chars: 2_000,
			})
		).toBe(45)
	})

	it('should calculate LLM credits based on tokens', () => {
		// Example from pricing-strategy.md: 500 in + 300 out → 38 credits
		expect(
			calculateCredits({
				type: 'llm',
				tokensIn: 500,
				tokensOut: 300,
			})
		).toBe(38)
	})

	it('should fail closed when KV is unavailable', async () => {
		const result = await checkAndDeductCredits('user-1', 'free', 100, undefined as any)

		expect(result.allowed).toBe(false)
		expect(result.used).toBe(0)
		expect(result.limit).toBe(1_000)
		expect(result.required).toBe(100)
		// resetAt should be tomorrow's midnight UTC
		const expectedReset = new Date('2025-01-02T00:00:00.000Z').getTime()
		expect(result.resetAt).toBe(expectedReset)
	})

	it('should allow deduction when under daily limit and update KV', async () => {
		const store = new Map<string, string>()
		const kv = {
			get: vi.fn(async (key: string) => store.get(key) ?? null),
			put: vi.fn(async (key: string, value: string) => {
				store.set(key, value)
			}),
		} as any

		const result = await checkAndDeductCredits('user-1', 'free', 100, kv)

		expect(result.allowed).toBe(true)
		expect(result.used).toBe(100)
		expect(result.limit).toBe(1_000)
		expect(kv.get).toHaveBeenCalledTimes(1)
		expect(kv.put).toHaveBeenCalledTimes(1)
		const storedValue = Array.from(store.values())[0]
		expect(storedValue).toBe('100')
	})

	it('should reject when deduction would exceed daily limit and not update KV', async () => {
		const store = new Map<string, string>()
		store.set('credits:user-1:2025-01-01', '950')

		const kv = {
			get: vi.fn(async (key: string) => store.get(key) ?? null),
			put: vi.fn(async (key: string, value: string) => {
				store.set(key, value)
			}),
		} as any

		const result: CreditsCheckResult = await checkAndDeductCredits('user-1', 'free', 100, kv)

		expect(result.allowed).toBe(false)
		expect(result.used).toBe(950)
		expect(result.limit).toBe(1_000)
		// Should not perform a put when rejecting
		expect(kv.put).not.toHaveBeenCalled()
		// Stored KV value should remain unchanged
		expect(store.get('credits:user-1:2025-01-01')).toBe('950')
	})
})



import { describe, it, expect, vi, beforeEach } from 'vitest'
import { azureTokenRateLimitMiddleware } from './azure-rate-limit'
import { RateLimitError } from '@/worker/utils/errors'

describe('azureTokenRateLimitMiddleware', () => {
	const mockUser = {
		id: 'user-1',
		subscriptionTier: 'free',
	} as any

	const headers = new Map<string, string>()

	function createMockContext(kv: KVNamespace | undefined) {
		return {
			env: {
				RATE_LIMIT_KV: kv,
			},
			get: (key: string) => {
				if (key === 'user') return mockUser
				return undefined
			},
			req: {
				header: (name: string) => headers.get(name) ?? null,
			},
		} as any
	}

	beforeEach(() => {
		headers.clear()
		mockUser.subscriptionTier = 'free'
	})

	it('allows requests under the limit and calls next', async () => {
		const store = new Map<string, string>()
		const kv = {
			get: vi.fn(async (key: string) => store.get(key) ?? null),
			put: vi.fn(async (key: string, value: string) => {
				store.set(key, value)
			}),
		} as any

		headers.set('CF-Connecting-IP', '203.0.113.1')

		const c = createMockContext(kv)

		const next = vi.fn(async () => {})

		await expect(azureTokenRateLimitMiddleware(c, next)).resolves.toBeUndefined()
		expect(next).toHaveBeenCalledTimes(1)
	})

	it('throws RateLimitError when KV is unavailable', async () => {
		const kv = undefined as any as KVNamespace | undefined
		headers.set('CF-Connecting-IP', '203.0.113.2')

		const c = createMockContext(kv)
		const next = vi.fn(async () => {})

		await expect(azureTokenRateLimitMiddleware(c, next)).rejects.toBeInstanceOf(
			RateLimitError
		)
	})

	it('enforces per-user minute limit', async () => {
		const store = new Map<string, string>()
		const kv = {
			get: vi.fn(async (key: string) => store.get(key) ?? null),
			put: vi.fn(async (key: string, value: string) => {
				store.set(key, value)
			}),
		} as any

		headers.set('CF-Connecting-IP', '203.0.113.3')

		const c = createMockContext(kv)
		const next = vi.fn(async () => {})

		// Free tier per-user-per-minute limit is 5; perform 5 successful calls
		for (let i = 0; i < 5; i++) {
			await expect(azureTokenRateLimitMiddleware(c, next)).resolves.toBeUndefined()
		}

		// 6th call should exceed limit
		await expect(azureTokenRateLimitMiddleware(c, next)).rejects.toBeInstanceOf(
			RateLimitError
		)
	})

	it('allows more requests for pro users before hitting the limit', async () => {
		const store = new Map<string, string>()
		const kv = {
			get: vi.fn(async (key: string) => store.get(key) ?? null),
			put: vi.fn(async (key: string, value: string) => {
				store.set(key, value)
			}),
		} as any

		headers.set('CF-Connecting-IP', '203.0.113.4')

		// Set user to pro tier
		mockUser.subscriptionTier = 'pro'

		const c = createMockContext(kv)
		const next = vi.fn(async () => {})

		// Pro tier per-user-per-minute limit is 20; perform 10 successful calls
		for (let i = 0; i < 10; i++) {
			await expect(azureTokenRateLimitMiddleware(c, next)).resolves.toBeUndefined()
		}
	})
})



import type { Context, Next } from 'hono'
import type { UserProfile } from '@/api/auth'
import { createLogger } from '@/lib/utils'
import { RateLimitError } from '@/worker/utils/errors'

const log = createLogger({ name: 'azure-token-rate-limit' })

const USER_TIER_LIMITS = {
	free: {
		perUserPerMinute: 5,
		perUserPerHour: 60,
	},
	pro: {
		perUserPerMinute: 20,
		perUserPerHour: 240,
	},
	ultra: {
		perUserPerMinute: 40,
		perUserPerHour: 480,
	},
} as const

const IP_LIMITS = {
	perIpPerMinute: 10,
	perIpPerHour: 120,
} as const

interface LimitConfig {
	limit: number
	windowSeconds: number
}

interface LimitCheckResult {
	allowed: boolean
	used: number
	limit: number
	resetAt: number
}

function getUserLimits(tier?: string) {
	const limits = tier && tier in USER_TIER_LIMITS ? USER_TIER_LIMITS[tier as keyof typeof USER_TIER_LIMITS] : USER_TIER_LIMITS.free
	return limits
}

function getClientIp(c: Context): string | null {
	// Cloudflare Workers set CF-Connecting-IP
	const cfIp = c.req.header('CF-Connecting-IP') || c.req.header('cf-connecting-ip')
	if (cfIp) return cfIp

	// Fallback to X-Forwarded-For (first IP)
	const xff = c.req.header('X-Forwarded-For') || c.req.header('x-forwarded-for')
	if (xff) {
		const first = xff.split(',')[0].trim()
		if (first) return first
	}

	const realIp = c.req.header('X-Real-IP') || c.req.header('x-real-ip')
	if (realIp) return realIp

	return null
}

function getWindowInfo(windowSeconds: number): { windowId: string; resetAt: number } {
	const now = Date.now()
	const windowMs = windowSeconds * 1000
	const windowStart = Math.floor(now / windowMs) * windowMs
	const resetAt = windowStart + windowMs
	const windowId = String(windowStart)
	return { windowId, resetAt }
}

async function checkAndIncrementLimit(
	kv: KVNamespace | undefined,
	key: string,
	config: LimitConfig
): Promise<LimitCheckResult> {
	const { windowSeconds, limit } = config

	if (!kv) {
		// Fail closed when KV is unavailable to avoid abuse without metering
		const { resetAt } = getWindowInfo(windowSeconds)
		return {
			allowed: false,
			used: 0,
			limit,
			resetAt,
		}
	}

	const { windowId, resetAt } = getWindowInfo(windowSeconds)
	const storageKey = `${key}:${windowId}`

	const currentStr = await kv.get(storageKey, 'text')
	const current = currentStr ? Number(currentStr) || 0 : 0
	const next = current + 1

	if (next > limit) {
		return {
			allowed: false,
			used: current,
			limit,
			resetAt,
		}
	}

	await kv.put(storageKey, String(next), {
		expirationTtl: windowSeconds + 5,
	})

	return {
		allowed: true,
		used: next,
		limit,
		resetAt,
	}
}

export async function azureTokenRateLimitMiddleware(
	c: Context<{
		Bindings: Env
		Variables: {
			user: UserProfile
		}
	}>,
	next: Next
) {
	const env = c.env
	const kv = (env as any).RATE_LIMIT_KV as KVNamespace | undefined
	const user = c.get('user')
	const ip = getClientIp(c)

	const baseKey = 'azure-token'
	const limitsToCheck: Array<{ key: string; config: LimitConfig }> = []

	// Per-user limits (if authenticated user is available)
	if (user?.id) {
		const userLimits = getUserLimits((user as any).subscriptionTier)
		limitsToCheck.push(
			{
				key: `${baseKey}:user:${user.id}:minute`,
				config: { limit: userLimits.perUserPerMinute, windowSeconds: 60 },
			},
			{
				key: `${baseKey}:user:${user.id}:hour`,
				config: { limit: userLimits.perUserPerHour, windowSeconds: 60 * 60 },
			}
		)
	}

	// Per-IP limits (if we can resolve client IP)
	if (ip) {
		limitsToCheck.push(
			{
				key: `${baseKey}:ip:${ip}:minute`,
				config: { limit: IP_LIMITS.perIpPerMinute, windowSeconds: 60 },
			},
			{
				key: `${baseKey}:ip:${ip}:hour`,
				config: { limit: IP_LIMITS.perIpPerHour, windowSeconds: 60 * 60 },
			}
		)
	}

	try {
		for (const { key, config } of limitsToCheck) {
			const result = await checkAndIncrementLimit(kv, key, config)

			if (!result.allowed) {
				log.warn('Azure token rate limit exceeded', {
					userId: user?.id,
					ip,
					key,
					limit: result.limit,
					used: result.used,
					resetAt: result.resetAt,
				})

				const scope =
					key.includes(':user:') && key.includes(':minute')
						? 'user_minute'
						: key.includes(':user:') && key.includes(':hour')
							? 'user_hour'
							: key.includes(':ip:') && key.includes(':minute')
								? 'ip_minute'
								: key.includes(':ip:') && key.includes(':hour')
									? 'ip_hour'
									: undefined

				throw new RateLimitError(
					'Azure token rate limit exceeded',
					'azure_token',
					result.limit,
					result.used,
					result.resetAt,
					scope
				)
			}
		}
	} catch (error) {
		if (error instanceof RateLimitError) {
			throw error
		}

		log.error('Failed to enforce Azure token rate limiting', {
			userId: user?.id,
			ip,
			error: String(error),
		})

		// On unexpected errors, fail closed as well
		const windowSeconds = 60
		const { resetAt } = getWindowInfo(windowSeconds)
		throw new RateLimitError(
			'Azure token rate limit failed',
			'azure_token',
			0,
			0,
			resetAt,
			'unknown'
		)
	}

	await next()
}



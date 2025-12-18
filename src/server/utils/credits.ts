/**
 * Unified Credits-based quota utilities.
 *
 * This module implements the Credits model defined in `doc/pricing-strategy.md`.
 * All AI services (TTS / ASR / Assessment / Translation / LLM) should charge
 * against a single daily Credits pool per user, instead of per-service request
 * counters.
 */

import { createLogger } from '@/lib/utils'
import type { SubscriptionTier } from '@/api/auth'

const log = createLogger({ name: 'credits' })

export interface CreditsCheckResult {
	allowed: boolean
	used: number
	limit: number
	required: number
	resetAt: number // Unix timestamp when the limit resets (next UTC midnight)
}

/**
 * Daily Credits limit per subscription tier.
 *
 * See `doc/pricing-strategy.md`:
 * - Free:  1,000 Credits / day
 * - Pro:  60,000 Credits / day
 * - Ultra:150,000 Credits / day
 */
export function getDailyCreditsLimit(tier: SubscriptionTier): number {
	switch (tier) {
		case 'free':
			return 1_000
		case 'pro':
			return 60_000
		case 'ultra':
			return 150_000
		default:
			throw new Error(`Unsupported subscription tier for credits: ${tier}`)
	}
}

/**
 * Input for Credits calculation per request.
 *
 * All formulas are taken from `doc/pricing-strategy.md`.
 */
export type CreditCalculationInput =
	| {
			type: 'tts'
			chars: number
	  }
	| {
			type: 'assessment'
			seconds: number
	  }
	| {
			type: 'asr'
			seconds: number
	  }
	| {
			type: 'translation'
			chars: number
	  }
	| {
			type: 'llm'
			tokensIn: number
			tokensOut: number
	  }

/**
 * Calculate Credits for a single operation according to pricing-strategy.md.
 */
export function calculateCredits(input: CreditCalculationInput): number {
	let rawCredits = 0

	switch (input.type) {
		case 'tts': {
			// 2.1 TTS（按字符计）
			// 1 字符 TTS = 3 Credits
			const chars = Math.max(0, input.chars || 0)
			rawCredits = 3 * chars
			break
		}
		case 'assessment': {
			// 2.2 Assessment（按秒计费，建议前端限制每次 ≤ 30 秒）
			// AssessmentCredits = ceil(50 * seconds)
			const seconds = Math.max(0, input.seconds || 0)
			rawCredits = 50 * seconds
			break
		}
		case 'asr': {
			// 2.3 ASR（按分钟计）
			// ASRCredits = ceil(80 * (seconds / 60))
			const seconds = Math.max(0, input.seconds || 0)
			rawCredits = 80 * (seconds / 60)
			break
		}
		case 'translation': {
			// 2.4 基础翻译（Translation，按次 + 字符上限）
			// 每次请求基础消耗：15 Credits
			// 每 1,000 字符附加：15 Credits（按字符数向上取整到 1,000 的倍数）
			const chars = Math.max(0, input.chars || 0)
			const blocks = chars === 0 ? 0 : Math.ceil(chars / 1000)
			rawCredits = 15 + 15 * blocks
			break
		}
		case 'llm': {
			// 2.5 LLM 请求（Smart Translation / Dictionary / Chat 等，按 tokens 计）
			// LLMCredits = ceil(8 + 0.012 * tokensIn + 0.08 * tokensOut)
			const tokensIn = Math.max(0, input.tokensIn || 0)
			const tokensOut = Math.max(0, input.tokensOut || 0)
			rawCredits = 8 + 0.012 * tokensIn + 0.08 * tokensOut
			break
		}
		default: {
			const neverInput: never = input
			throw new Error(`Unsupported credit calculation input: ${JSON.stringify(neverInput)}`)
		}
	}

	// Apply ceil and minimum 1 Credit when there is any non-zero usage
	const credits = Math.ceil(rawCredits)
	if (credits <= 0 && rawCredits > 0) {
		return 1
	}
	return credits
}

function getTodayDateString(): string {
	const now = new Date()
	const year = now.getUTCFullYear()
	const month = String(now.getUTCMonth() + 1).padStart(2, '0')
	const day = String(now.getUTCDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

function getTomorrowMidnightTimestamp(): number {
	const tomorrow = new Date()
	tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
	tomorrow.setUTCHours(0, 0, 0, 0)
	return tomorrow.getTime()
}

function getCreditsKey(userId: string, date: string): string {
	return `credits:${userId}:${date}`
}

/**
 * Check and deduct Credits from the user's daily pool.
 *
 * - If KV is unavailable, the check FAILS CLOSED (we log and return allowed: false).
 * - If the deduction would exceed the daily limit, `allowed` is false and no
 *   write is performed.
 */
export async function checkAndDeductCredits(
	userId: string,
	tier: SubscriptionTier,
	requiredCredits: number,
	kv: KVNamespace | undefined
): Promise<CreditsCheckResult> {
	const limit = getDailyCreditsLimit(tier)
	const today = getTodayDateString()
	const key = getCreditsKey(userId, today)
	const resetAt = getTomorrowMidnightTimestamp()

	if (!kv) {
		log.error('KV namespace not available for credits, blocking Credits-based request', {
			userId,
			tier,
			requiredCredits,
		})
		return {
			allowed: false,
			used: 0,
			limit,
			required: requiredCredits,
			resetAt,
		}
	}

	const stored = await kv.get(key, 'text')
	const used = stored ? parseInt(stored, 10) || 0 : 0
	const nextUsed = used + requiredCredits

	if (nextUsed > limit) {
		// Do not update KV when rejecting
		return {
			allowed: false,
			used,
			limit,
			required: requiredCredits,
			resetAt,
		}
	}

	// Persist updated usage with a small TTL buffer for cleanup (2 days)
	const expirationTtl = 2 * 24 * 60 * 60 // seconds
	await kv.put(key, String(nextUsed), { expirationTtl })

	return {
		allowed: true,
		used: nextUsed,
		limit,
		required: requiredCredits,
		resetAt,
	}
}



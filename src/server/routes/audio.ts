/**
 * Audio API (OpenAI-compatible)
 * Uses Cloudflare Workers AI for ASR (Whisper)
 */

import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { UserProfile } from '@/api/auth'
import { createRateLimitMiddleware } from '../middleware/rate-limit'
import type { RateLimitResult, ServiceType } from '@/server/utils/rate-limit'
import { handleError, RateLimitError } from '@/server/utils/errors'
import { calculateCredits, checkAndDeductCredits } from '@/server/utils/credits'

const audio = new Hono<{
	Bindings: Env
	Variables: {
		user: UserProfile
		rateLimit: RateLimitResult
		service: ServiceType
	}
}>()

// Apply authentication and rate limiting middleware
audio.use('/*', authMiddleware)
audio.use('/transcriptions', createRateLimitMiddleware('asr'))

/**
 * Audio Transcription API (OpenAI-compatible)
 * POST /audio/transcriptions
 *
 * Compatible with OpenAI's Whisper API format
 * Uses Cloudflare Workers AI Whisper model
 */
audio.post('/transcriptions', async (c) => {
	try {
		const env = c.env
		const ai = (env as any).AI as Ai
		const rateKv = (env as any).RATE_LIMIT_KV as KVNamespace | undefined

		if (!ai) {
			return c.json({ error: 'Workers AI binding is not configured' }, 500)
		}

		// Parse multipart/form-data request
		const formData = await c.req.formData()
		const file = formData.get('file') as File | null

		if (!file) {
			return c.json({ error: 'file is required' }, 400)
		}

		// Extract optional parameters
		const model = (formData.get('model') as string) || env.WORKERS_AI_ASR_MODEL || '@cf/openai/whisper-large-v3-turbo'
		const language = formData.get('language') as string | null
		const prompt = formData.get('prompt') as string | null
		const responseFormat = (formData.get('response_format') as string) || 'json'

		// Optional: duration in seconds provided by frontend for more accurate Credits
		const durationSecondsRaw = formData.get('duration_seconds') as string | null
		const durationSeconds =
			durationSecondsRaw != null ? Number(durationSecondsRaw) || 0 : 0

		// Credits-based quota check for ASR
		try {
			const user = c.get('user')
			// If duration is missing, we conservatively assume 60 seconds
			const secondsForBilling = durationSeconds > 0 ? durationSeconds : 60
			const credits = calculateCredits({
				type: 'asr',
				seconds: secondsForBilling,
			})

			const result = await checkAndDeductCredits(
				user.id,
				user.subscriptionTier,
				credits,
				rateKv
			)

			if (!result.allowed) {
				throw new RateLimitError(
					'Daily Credits limit reached',
					'credits',
					result.limit,
					result.used,
					result.resetAt
				)
			}
		} catch (error) {
			if (error instanceof RateLimitError) {
				throw error
			}
			return handleError(c, error, 'Failed to apply Credits-based limit for ASR')
		}

		// Convert file to base64 string for Cloudflare Workers AI
		// According to Cloudflare docs, audio should be base64 encoded string
		const arrayBuffer = await file.arrayBuffer()
		const audioData = new Uint8Array(arrayBuffer)

		// Convert to base64 string
		const base64Audio = btoa(
			String.fromCharCode(...audioData)
		)

		// Prepare input for Cloudflare Workers AI
		const aiInput: any = {
			audio: base64Audio, // Base64 encoded string as per Cloudflare docs
			task: 'transcribe', // 'transcribe' or 'translate'
		}

		if (language) {
			aiInput.language = language
		}

		if (prompt) {
			aiInput.initial_prompt = prompt
		}

		// Optional parameters (not currently used, but available per Cloudflare docs):
		// - vad_filter: boolean (preprocess audio with voice activity detection)
		// - prefix: string (prefix appended to transcription output)

		// Call Cloudflare Workers AI Whisper model
		const result = await ai.run(model as any, aiInput)

		// Type assertion for the result
		// According to Cloudflare docs, the output format is:
		// - text: string (required, complete transcription)
		// - word_count?: number
		// - segments?: array (each segment contains words array)
		// - transcription_info?: object
		// - vtt?: string (optional VTT format)
		type WhisperOutput = {
			text: string
			word_count?: number
			segments?: Array<{
				start: number // seconds
				end: number // seconds
				text: string
				temperature?: number
				avg_logprob?: number
				compression_ratio?: number
				no_speech_prob?: number
				words?: Array<{
					word: string
					start: number // seconds
					end: number // seconds
				}>
			}>
			transcription_info?: {
				language?: string
				language_probability?: number
				duration?: number
				duration_after_vad?: number
			}
			vtt?: string
		}

		const whisperResult = result as WhisperOutput

		if (!whisperResult.text) {
			return c.json({ error: 'Failed to transcribe audio' }, 500)
		}

		// Return Cloudflare AI result directly
		// Frontend ASR service will handle format conversion
		if (responseFormat === 'text') {
			// Return plain text
			return new Response(whisperResult.text, {
				headers: {
					'Content-Type': 'text/plain',
				},
			})
		} else if (responseFormat === 'vtt' && whisperResult.vtt) {
			// Return VTT if available
			return new Response(whisperResult.vtt, {
				headers: {
					'Content-Type': 'text/vtt',
				},
			})
		} else {
			// Return JSON with all Cloudflare data (direct passthrough)
			// Note: words are inside segments[].words, not at top level
			return c.json(whisperResult)
		}
	} catch (error) {
		return handleError(c, error, 'Failed to transcribe audio')
	}
})

export { audio }


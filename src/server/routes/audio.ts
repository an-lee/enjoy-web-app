/**
 * Audio API (OpenAI-compatible)
 * Uses Cloudflare Workers AI for TTS
 */

import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { UserProfile } from '@/api/auth'
import { createRateLimitMiddleware } from '../middleware/rate-limit'
import type { RateLimitResult, ServiceType } from '@/server/utils/rate-limit'
import { handleError } from '@/server/utils/errors'

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
audio.use('/speech', createRateLimitMiddleware('tts'))
audio.use('/transcriptions', createRateLimitMiddleware('asr'))

/**
 * Text-to-Speech API (OpenAI-compatible)
 * POST /audio/speech
 *
 * Compatible with OpenAI's TTS API format
 */
audio.post('/speech', async (c) => {
	try {
		const env = c.env
		const ai = (env as any).AI as Ai

		if (!ai) {
			return c.json({ error: 'Workers AI binding is not configured' }, 500)
		}

		const body = await c.req.json()
		const {
			input,
			model = env.WORKERS_AI_TTS_MODEL || '@cf/myshell-ai/melotts',
			voice = 'alloy', // OpenAI voice parameter (not used by MeloTTS but kept for compatibility)
			response_format = 'mp3',
			// speed is not used by MeloTTS but kept for OpenAI API compatibility
		} = body

		if (!input) {
			return c.json({ error: 'input text is required' }, 400)
		}

		// Map OpenAI voice to language (MeloTTS uses lang parameter)
		// This is a simple mapping, you can enhance this based on your needs
		const langMap: Record<string, string> = {
			alloy: 'en',
			echo: 'en',
			fable: 'en',
			onyx: 'en',
			nova: 'en',
			shimmer: 'en',
		}

		const lang = langMap[voice] || 'en'

		// Call Workers AI TTS
		const result = await ai.run(model, {
			prompt: input,
			lang: lang,
		})

		// The result contains base64 encoded audio in result.audio
		if (!result.audio) {
			return c.json({ error: 'Failed to generate audio' }, 500)
		}

		// Convert base64 to binary
		const audioBuffer = Uint8Array.from(atob(result.audio), (c) => c.charCodeAt(0))

		// Return audio with appropriate content type
		const contentType =
			response_format === 'opus'
				? 'audio/opus'
				: response_format === 'aac'
					? 'audio/aac'
					: response_format === 'flac'
						? 'audio/flac'
						: 'audio/mpeg'

		return new Response(audioBuffer, {
			headers: {
				'Content-Type': contentType,
				'Content-Length': audioBuffer.length.toString(),
			},
		})
	} catch (error) {
		return handleError(c, error, 'Failed to generate speech')
	}
})

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


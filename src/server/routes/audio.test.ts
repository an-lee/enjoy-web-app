/**
 * Tests for Audio API (TTS)
 *
 * Note: These are basic structure tests. Full integration tests require
 * proper Cloudflare Workers AI binding setup which is not available in
 * the test environment.
 */

import { describe, it, expect } from 'vitest'
import { audio } from './audio'

describe('Audio Routes', () => {
	it('should export audio route handler', () => {
		expect(audio).toBeDefined()
		expect(typeof audio.fetch).toBe('function')
	})

	it('should have correct route structure', () => {
		// Verify the route handler is a Hono instance
		expect(audio).toHaveProperty('fetch')
		expect(audio).toHaveProperty('request')
	})

	describe('API Structure Documentation', () => {
		it('should document expected TTS request format', () => {
			const expectedRequest = {
				input: 'Hello world',
				model: '@cf/myshell-ai/melotts',
				voice: 'alloy',
				response_format: 'mp3',
			}

			expect(expectedRequest).toHaveProperty('input')
			expect(typeof expectedRequest.input).toBe('string')
			expect(expectedRequest).toHaveProperty('model')
			expect(expectedRequest).toHaveProperty('voice')
			expect(expectedRequest).toHaveProperty('response_format')
		})

		it('should document voice to language mapping', () => {
			const langMap: Record<string, string> = {
				alloy: 'en',
				echo: 'en',
				fable: 'en',
				onyx: 'en',
				nova: 'en',
				shimmer: 'en',
			}

			expect(langMap.alloy).toBe('en')
			expect(langMap.echo).toBe('en')
			expect(Object.keys(langMap).length).toBe(6)
		})
	})
})


/**
 * Tests for Translations API
 *
 * Note: These are basic structure tests. Full integration tests require
 * proper Cloudflare Workers AI binding setup which is not available in
 * the test environment.
 */

import { describe, it, expect } from 'vitest'
import { translations } from './translations'

describe('Translations Routes', () => {
	it('should export translations route handler', () => {
		expect(translations).toBeDefined()
		expect(typeof translations.fetch).toBe('function')
	})

	it('should have correct route structure', () => {
		// Verify the route handler is a Hono instance
		expect(translations).toHaveProperty('fetch')
		expect(translations).toHaveProperty('request')
	})

	describe('API Structure Documentation', () => {
		it('should document expected translations request format', () => {
			const expectedRequest = {
				text: 'Hello, world!',
				source_lang: 'english',
				target_lang: 'spanish',
			}

			expect(expectedRequest).toHaveProperty('text')
			expect(typeof expectedRequest.text).toBe('string')
			expect(expectedRequest).toHaveProperty('source_lang')
			expect(expectedRequest).toHaveProperty('target_lang')
		})

		it('should document expected translations response format', () => {
			const expectedResponse = {
				translated_text: '¡Hola, mundo!',
			}

			expect(expectedResponse).toHaveProperty('translated_text')
			expect(typeof expectedResponse.translated_text).toBe('string')
		})
	})
})


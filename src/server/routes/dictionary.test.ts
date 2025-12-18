/**
 * Tests for AI Dictionary API
 *
 * Note: These are basic structure tests. Full integration tests require
 * proper Cloudflare Workers AI binding setup which is not available in
 * the test environment.
 */

import { describe, it, expect } from 'vitest'
import { dictionary } from './dictionary'

describe('AI Dictionary Routes', () => {
	it('should export dictionary route handler', () => {
		expect(dictionary).toBeDefined()
		expect(typeof dictionary.fetch).toBe('function')
	})

	it('should have correct route structure', () => {
		// Verify the route handler is a Hono instance
		expect(dictionary).toHaveProperty('fetch')
		expect(dictionary).toHaveProperty('request')
	})

	describe('API Structure Documentation', () => {
		it('should document expected AI dictionary request format', () => {
			const expectedRequest = {
				word: 'run',
				source_lang: 'en',
				target_lang: 'zh',
				force_refresh: false,
			}

			expect(expectedRequest).toHaveProperty('word')
			expect(typeof expectedRequest.word).toBe('string')
			expect(expectedRequest).toHaveProperty('source_lang')
			expect(expectedRequest).toHaveProperty('target_lang')
		})

		it('should document expected AI dictionary response format', () => {
			const expectedResponse = {
				result: {
					word: 'run',
					sourceLanguage: 'en',
					targetLanguage: 'zh',
					lemma: 'run',
					ipa: '/rʌn/',
					senses: [
						{
							definition: 'To move quickly on foot.',
							translation: '跑步；奔跑',
							partOfSpeech: 'verb',
							examples: [
								{
									source: 'She runs every morning.',
									target: '她每天早上跑步。',
								},
							],
							notes: 'Common in everyday speech; often used for exercise.',
						},
					],
				},
			}

			expect(expectedResponse).toHaveProperty('result')
			expect(typeof expectedResponse.result.word).toBe('string')
			expect(expectedResponse.result).toHaveProperty('sourceLanguage')
			expect(expectedResponse.result).toHaveProperty('targetLanguage')
			expect(expectedResponse.result).toHaveProperty('lemma')
			expect(expectedResponse.result).toHaveProperty('ipa')
			expect(Array.isArray(expectedResponse.result.senses)).toBe(true)
			expect(expectedResponse.result.senses[0]).toHaveProperty('definition')
			expect(expectedResponse.result.senses[0]).toHaveProperty('translation')
		})
	})
})



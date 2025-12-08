/**
 * Tests for Models API
 *
 * Note: These are basic structure tests. Full integration tests require
 * proper Cloudflare Workers AI binding setup which is not available in
 * the test environment.
 */

import { describe, it, expect } from 'vitest'
import { models } from './models'

describe('Models Routes', () => {
	it('should export models route handler', () => {
		expect(models).toBeDefined()
		expect(typeof models.fetch).toBe('function')
	})

	it('should have correct route structure', () => {
		// Verify the route handler is a Hono instance
		expect(models).toHaveProperty('fetch')
		expect(models).toHaveProperty('request')
	})

	describe('API Structure Documentation', () => {
		it('should document expected models response format', () => {
			const expectedResponse = {
				object: 'list',
				data: [
					{
						id: '@cf/meta/llama-3-8b-instruct-awq',
						object: 'model',
						created: 1234567890,
						owned_by: 'cloudflare',
						permission: [],
						root: '@cf/meta/llama-3-8b-instruct-awq',
						parent: null,
					}
				]
			}

			expect(expectedResponse).toHaveProperty('object', 'list')
			expect(expectedResponse).toHaveProperty('data')
			expect(Array.isArray(expectedResponse.data)).toBe(true)
			expect(expectedResponse.data[0]).toHaveProperty('id')
			expect(expectedResponse.data[0]).toHaveProperty('object', 'model')
			expect(expectedResponse.data[0]).toHaveProperty('owned_by', 'cloudflare')
		})
	})
})


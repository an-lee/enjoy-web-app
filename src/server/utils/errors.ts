/**
 * Error handling utilities for Hono API
 */

import type { Context } from 'hono'
import { createLogger } from '@/lib/utils'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'errors' })

export interface ApiError {
	error: string
	message: string
	code?: string
	details?: unknown
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
	error: string,
	message: string,
	code?: string,
	details?: unknown
): ApiError {
	const response: ApiError = {
		error,
		message,
	}
	if (code) {
		response.code = code
	}
	if (details !== undefined && details !== null) {
		response.details = details
	}
	return response
}

/**
 * Handle errors and return appropriate HTTP response
 */
export function handleError(c: Context, error: unknown, defaultMessage = 'Internal server error') {
	log.error('API Error:', error)

	if (error instanceof RateLimitError) {
		return c.json(
			{
				message: 'Rate limit exceeded',
				limitInfo: {
					label: error.label,
					used: error.used,
					limit: error.limit,
					resetsAt: new Date(error.resetAt).toISOString(),
					window: 'daily',
				},
			},
			429
		)
	}

	if (error instanceof ConfigurationError) {
		return c.json(createErrorResponse('Configuration error', error.message, 'CONFIG_ERROR'), 500)
	}

	if (error instanceof ServiceError) {
		const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 502
		return c.json(createErrorResponse('Service error', error.message, 'SERVICE_ERROR'), statusCode as any)
	}

	if (error instanceof Error) {
		// Generic error
		return c.json(createErrorResponse('Internal server error', error.message), 500)
	}

	// Unknown error type
	return c.json(createErrorResponse('Internal server error', defaultMessage), 500)
}

/**
 * Service type to human-readable label mapping
 */
const SERVICE_LABELS: Record<string, string> = {
	translation: 'Daily translations',
	dictionary: 'Daily dictionary lookups',
	asr: 'Daily speech recognitions',
	tts: 'Daily text-to-speech',
	assessment: 'Daily assessments',
	credits: 'Daily Credits',
}

/**
 * Custom error classes
 */
export class RateLimitError extends Error {
	constructor(
		message: string,
		public readonly service: string,
		public readonly limit: number,
		public readonly used: number,
		public readonly resetAt: number
	) {
		super(message)
		this.name = 'RateLimitError'
	}

	get label(): string {
		return SERVICE_LABELS[this.service] || `Daily ${this.service}`
	}
}

export class ConfigurationError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'ConfigurationError'
	}
}

export class ServiceError extends Error {
	constructor(message: string, public readonly statusCode?: number) {
		super(message)
		this.name = 'ServiceError'
	}
}


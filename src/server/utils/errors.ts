/**
 * Error handling utilities for Hono API
 */

import type { Context } from 'hono'

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
	console.error('API Error:', error)

	if (error instanceof RateLimitError) {
		return c.json(
			{
				...createErrorResponse('Rate limit exceeded', error.message, 'RATE_LIMIT_EXCEEDED'),
				limit: error.limit,
				count: error.count,
				resetAt: new Date(error.resetAt).toISOString(),
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
 * Custom error classes
 */
export class RateLimitError extends Error {
	constructor(message: string, public readonly limit: number, public readonly count: number, public readonly resetAt: number) {
		super(message)
		this.name = 'RateLimitError'
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


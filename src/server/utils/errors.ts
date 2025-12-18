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
		const limit = {
			label: error.label,
			used: error.used,
			limit: error.limit,
			resetAt: new Date(error.resetAt).toISOString(),
			window: error.window,
			scope: error.scope ?? null,
		}

		return c.json(
			{
				error: 'rate_limit_exceeded',
				message: error.message,
				code: error.code,
				category: error.category,
				kind: error.kind,
			limit,
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

export type RateLimitKind = 'credits' | 'azure_token'

export type RateLimitCategory = 'business_limit' | 'infrastructure_limit'

/**
 * Custom error classes
 */
export class RateLimitError extends Error {
	constructor(
		message: string,
		public readonly kind: RateLimitKind,
		public readonly limit: number,
		public readonly used: number,
		public readonly resetAt: number,
		public readonly scope?: string
	) {
		super(message)
		this.name = 'RateLimitError'
	}

	get code(): string {
		if (this.kind === 'credits') return 'CREDITS_EXHAUSTED'
		if (this.kind === 'azure_token') return 'AZURE_TOKEN_RATE_LIMITED'
		return 'RATE_LIMIT_EXCEEDED'
	}

	get category(): RateLimitCategory {
		return this.kind === 'credits' ? 'business_limit' : 'infrastructure_limit'
	}

	get window(): string {
		// Derive a simple window label from scope; fall back to 'daily'
		if (!this.scope) return this.kind === 'credits' ? 'daily' : 'unknown'
		if (this.scope.includes('daily')) return 'daily'
		if (this.scope.includes('hour')) return 'hour'
		if (this.scope.includes('minute')) return 'minute'
		return this.kind === 'credits' ? 'daily' : 'unknown'
	}

	get label(): string {
		if (this.kind === 'credits') return 'Daily Credits'
		if (this.kind === 'azure_token') return 'Azure token requests'
		return 'Rate limit'
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


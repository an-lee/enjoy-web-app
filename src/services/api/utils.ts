/**
 * Shared utilities for API layer
 * Used by both client and server-side code
 */

/**
 * Convert snake_case string to camelCase
 */
export function snakeToCamel(str: string): string {
	return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Recursively convert object keys from snake_case to camelCase
 * Handles nested objects and arrays
 *
 * Note: This only converts plain objects. Special objects like Date, RegExp, etc. are preserved as-is.
 */
export function convertSnakeToCamel<T>(obj: unknown): T {
	if (obj === null || obj === undefined) {
		return obj as T
	}

	// Handle arrays
	if (Array.isArray(obj)) {
		return obj.map((item) => convertSnakeToCamel(item)) as T
	}

	// Handle plain objects only (not Date, RegExp, etc.)
	if (typeof obj === 'object' && obj.constructor === Object) {
		const converted: Record<string, unknown> = {}
		for (const [key, value] of Object.entries(obj)) {
			const camelKey = snakeToCamel(key)
			converted[camelKey] = convertSnakeToCamel(value)
		}
		return converted as T
	}

	// Return primitive values and special objects as-is
	return obj as T
}


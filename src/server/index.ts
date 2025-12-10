import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import { router } from './router'
import { createLogger } from '@/lib/utils'

// Env type is declared globally in worker-configuration.d.ts
// No need to import it

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'server' })

/**
 * Custom server entry point that integrates Hono API with TanStack Start
 *
 * Request flow:
 * 1. Check if request path starts with /api/
 * 2. If yes, handle with Hono API
 * 3. Otherwise, delegate to TanStack Start SSR handler
 */

// Create the TanStack Start server entry with default handler
const tanstackHandler = createServerEntry({
	fetch: handler.fetch,
})

// Export the Worker fetch function
// This is the entry point for Cloudflare Workers
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url)

		// Handle API routes with Hono
		if (url.pathname.startsWith('/api/')) {
			// Remove /api prefix from pathname
			const apiPath = url.pathname.replace(/^\/api/, '') || '/'

			// Create a new URL with the modified path
			const apiUrl = new URL(apiPath + url.search, url.origin)

			// Create a new request with the modified URL
			const apiRequest = new Request(apiUrl, {
				method: request.method,
				headers: request.headers,
				body: request.method !== 'GET' && request.method !== 'HEAD'
					? request.body
					: undefined,
				redirect: request.redirect,
				signal: request.signal,
			})

			try {
				return await router.fetch(apiRequest, env, ctx)
			} catch (error) {
				log.error('API handler error:', error)
				return new Response(
					JSON.stringify({ error: 'Internal Server Error' }),
					{
						status: 500,
						headers: { 'Content-Type': 'application/json' },
					}
				)
			}
		}

		// Delegate all other requests to TanStack Start SSR handler
		// TanStack Start's handler expects only request
		return tanstackHandler.fetch(request)
	},
}

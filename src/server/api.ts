import { Hono } from 'hono'
import type { Context } from 'hono'

// Env type is declared globally in worker-configuration.d.ts
// You can extend it in wrangler.jsonc when adding bindings

const api = new Hono<{ Bindings: Env }>()

// Health check endpoint
api.get('/health', (c: Context<{ Bindings: Env }>) => {
	return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Example API endpoint
api.get('/hello', (c: Context<{ Bindings: Env }>) => {
	return c.json({ message: 'Hello from Hono API!' })
})

// Example endpoint with Cloudflare Bindings access
api.get('/env', async (c: Context<{ Bindings: Env }>) => {
	// Access Cloudflare Bindings if available
	// Example: const value = await c.env.KV?.get('key')
	return c.json({
		message: 'Environment info',
		// Add your bindings info here
	})
})

// You can add more API routes here
// api.post('/users', async (c) => { ... })
// api.get('/users/:id', async (c) => { ... })

export { api }

